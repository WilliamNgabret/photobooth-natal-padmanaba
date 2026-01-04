import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PhotoData, TemplateConfig, PhotoTransform } from '@/types/photo';
import { PhotoEditor } from './PhotoEditor';
import { OverlaySelector } from './OverlaySelector';
import { ShareModal } from './ShareModal';
import { EmailDeliveryModal } from './EmailDeliveryModal';
import { GifGenerator } from './GifGenerator';
import { LayoutStickerEditor, PlacedSticker } from './LayoutStickerEditor'; // Keeping for type defs, but will refactor usage
import { StickerSidePanel } from '@/components/StickerSidePanel';
import { PHOTO_FILTERS, loadImage } from '@/lib/filters';
import { drawImageCover } from './drawImageCover';
import { config } from '@/lib/config';
import { api } from '@/lib/api';
import { ArrowLeft, Download, Move, Share2, Image, Loader2, Mail, Film, Sticker, Check, Printer, ZoomIn, ZoomOut } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface OverlayInfo {
  name: string;
  path: string;
}

interface LayoutGeneratorProps {
  photos: PhotoData[];
  selectedFilter: string;
  overlays: OverlayInfo[];
  selectedOverlay: string;
  onOverlayChange: (path: string) => void;
  hasMultipleOverlays: boolean;
  onBack: () => void;
  onDownloadPDF: (canvas: HTMLCanvasElement) => void;
  onUpdateTransform: (index: number, transform: PhotoTransform) => void;
}

const DEFAULT_TEMPLATE: TemplateConfig = {
  name: "Default A6 Template",
  width: 850,
  height: 2656,
  overlayImage: "/templates/default-a6-overlay.png",
  placements: [
    { x: 65, y: 80, width: 720, height: 540 },
    { x: 65, y: 810, width: 720, height: 540 },
    { x: 65, y: 1542, width: 720, height: 540 },
  ],
  header: { x: 0, y: 1320, width: 1240, height: 80, text: "📸 Photobooth Studio" },
  footer: { x: 0, y: 1420, width: 1240, height: 200 }
};

export function LayoutGenerator({
  photos,
  selectedFilter,
  overlays,
  selectedOverlay,
  onOverlayChange,
  hasMultipleOverlays,
  onBack,
  onDownloadPDF,
  onUpdateTransform,
}: LayoutGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [template] = useState<TemplateConfig>(DEFAULT_TEMPLATE);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showGifGenerator, setShowGifGenerator] = useState(false);
  const [showStickerEditor, setShowStickerEditor] = useState(false); // Used to toggle the side panel
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [hasStickersAvailable, setHasStickersAvailable] = useState(false);
  const [draggedSticker, setDraggedSticker] = useState<{ id: string; filename: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isZoomActive, setIsZoomActive] = useState(false);

  const handleZoomToggle = () => {
    if (isZoomActive) {
      setIsZoomActive(false);
      setZoomLevel(1);
    } else {
      setIsZoomActive(true);
      setZoomLevel(0.5); // Default start zoom
    }
  };

  const handleZoomIn = () => isZoomActive && setZoomLevel(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => isZoomActive && setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  const handleZoomReset = () => isZoomActive && setZoomLevel(1);

  // Handle Drop on Canvas
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedSticker || !canvasRef.current || !template) return;

    // Use canvas bounding rect
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Adjust for Zoom level
    const displayWidth = rect.width / zoomLevel;
    const displayHeight = rect.height / zoomLevel;

    const scaleX = template.width / displayWidth;
    const scaleY = template.height / displayHeight;

    // Adjust drop coordinates for zoom
    const dropX = (e.clientX - rect.left) / zoomLevel * scaleX;
    const dropY = (e.clientY - rect.top) / zoomLevel * scaleY;

    console.log('Drop coordinates:', { dropX, dropY, scaleX, scaleY });

    // Find which photo slot was dropped on
    const placementIndex = template.placements.findIndex(p =>
      dropX >= p.x && dropX <= p.x + p.width &&
      dropY >= p.y && dropY <= p.y + p.height
    );

    if (placementIndex !== -1) {
      // Valid drop on a photo
      const newSticker: PlacedSticker = {
        id: `sticker-${Date.now()}`,
        stickerId: draggedSticker.id,
        filename: draggedSticker.filename,
        x: dropX,
        y: dropY,
        scale: 1.5,
        rotation: 0,
        photoIndex: placementIndex
      };
      setPlacedStickers([...placedStickers, newSticker]);
    }
    setDraggedSticker(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  // Check if stickers are available
  useEffect(() => {
    api.getStickersList().then(stickers => {
      setHasStickersAvailable(stickers.length > 0);
    });
  }, []);

  useEffect(() => {
    generateLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, selectedFilter, selectedOverlay, showStickerEditor]);

  // Separate effect for stickers to allow "Frozen" editing
  useEffect(() => {
    if (!showStickerEditor) {
      generateLayout();
    }
  }, [placedStickers]);

  const applyFilter = async (
    src: string,
    filterCss: string,
    targetW: number,
    targetH: number
  ): Promise<HTMLImageElement> => {
    const img = await loadImage(src);
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;

    const offCanvas = document.createElement('canvas');
    offCanvas.width = Math.ceil(targetW);
    offCanvas.height = Math.ceil(targetH);
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return img;

    offCtx.imageSmoothingEnabled = true;
    offCtx.imageSmoothingQuality = 'high';
    offCtx.filter = filterCss === 'none' ? 'none' : filterCss;

    const imgRatio = srcW / srcH;
    const targetRatio = offCanvas.width / offCanvas.height;

    let sX = 0, sY = 0, sW = srcW, sH = srcH;

    if (imgRatio > targetRatio) {
      sW = srcH * targetRatio;
      sX = (srcW - sW) / 2;
    } else {
      sH = srcW / targetRatio;
      sY = (srcH - sH) / 2;
    }

    offCtx.drawImage(img, sX, sY, sW, sH, 0, 0, offCanvas.width, offCanvas.height);
    return await loadImage(offCanvas.toDataURL('image/png'));
  };

  const generateLayout = async () => {
    if (!canvasRef.current) return;

    const validPhotos = photos.filter(p => p.src !== null);
    if (validPhotos.length < 3) {
      console.warn('LayoutGenerator: need 3 photos');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = template.width;
    canvas.height = template.height;

    // Clear canvas with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, template.width, template.height);

    const filter = PHOTO_FILTERS.find(f => f.id === selectedFilter);
    const filterCss = filter?.cssFilter || 'none';

    try {
      // Draw photos with transforms
      for (let i = 0; i < template.placements.length; i++) {
        const placement = template.placements[i];
        const photoData = photos[i];

        if (photoData?.src) {
          setProgress(((i + 1) / template.placements.length) * 80);

          const processedImg = await applyFilter(
            photoData.src,
            filterCss,
            placement.width,
            placement.height
          );

          // White border
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 6;
          ctx.strokeRect(placement.x, placement.y, placement.width, placement.height);

          // Draw photo with transform
          drawImageCover(
            ctx,
            processedImg,
            placement.x,
            placement.y,
            placement.width,
            placement.height,
            photoData.transform
          );
        }
      }

      setProgress(90);

      // Draw selected overlay PNG on top of photos
      if (selectedOverlay) {
        try {
          const overlayImg = await loadImage(selectedOverlay);
          ctx.drawImage(overlayImg, 0, 0, template.width, template.height);
        } catch (overlayErr) {
          console.warn('Selected overlay not found:', selectedOverlay);
        }
      }

      setProgress(95);

      // Draw stickers on top of everything (only if not editing)
      // When editing, stickers are shown as DOM overlays
      if (!showStickerEditor) {
        console.log('Drawing stickers to canvas:', placedStickers.length, placedStickers);
        for (const sticker of placedStickers) {
          try {
            const stickerImg = await loadImage(api.getStickerUrl(sticker.filename));
            const stickerSize = 100 * sticker.scale;
            console.log(`Sticker ${sticker.id}: scale=${sticker.scale}, size=${stickerSize}, rotation=${sticker.rotation}`);

            // Enforce per-tile clipping if photoIndex is valid
            if (typeof sticker.photoIndex === 'number' && template.placements[sticker.photoIndex]) {
              const placement = template.placements[sticker.photoIndex];

              ctx.save();
              // Clip to the photo area
              ctx.beginPath();
              ctx.rect(placement.x, placement.y, placement.width, placement.height);
              ctx.clip();

              ctx.translate(sticker.x, sticker.y);
              ctx.rotate((sticker.rotation * Math.PI) / 180);
              ctx.drawImage(
                stickerImg,
                -stickerSize / 2,
                -stickerSize / 2,
                stickerSize,
                stickerSize
              );
              ctx.restore();
            } else {
              // Fallback for global stickers (if any legacy ones exist)
              ctx.save();
              ctx.translate(sticker.x, sticker.y);
              ctx.rotate((sticker.rotation * Math.PI) / 180);
              ctx.drawImage(
                stickerImg,
                -stickerSize / 2,
                -stickerSize / 2,
                stickerSize,
                stickerSize
              );
              ctx.restore();
            }
          } catch (err) {
            console.warn('Failed to draw sticker:', sticker.filename);
          }
        }
      }

      setProgress(100);
    } catch (err) {
      console.error('Error generating layout:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPNG = () => {
    console.log('handleDownloadPNG called, canvasRef.current:', canvasRef.current);
    if (!canvasRef.current) {
      console.log('Canvas ref is null!');
      return;
    }

    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `photobooth-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download PNG:', err);
      alert('Failed to generate image. Please try again.');
    }
  };

  const handleNativePrint = () => {
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.toDataURL('image/png');
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Print Photo</title>
            <style>
              @page { size: auto; margin: 0; }
              body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
              img { width: 100%; height: 100%; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" onload="setTimeout(() => { window.print(); }, 500);" />
          </body>
        </html>
      `);
      doc.close();

      // Clean up after 1 minute (giving ample time for print dialog)
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 60000);
    }
  };

  const handleShare = () => {
    if (canvasRef.current) {
      setShowShareModal(true);
    }
  };

  const handleEditPhoto = (index: number) => {
    if (photos[index]?.src) {
      setEditingIndex(index);
    }
  };

  const handleSaveTransform = (transform: PhotoTransform) => {
    if (editingIndex !== null) {
      onUpdateTransform(editingIndex, transform);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto p-4">
      {/* Main Preview Area */}
      <div className="flex-1 space-y-6">
        <h2 className="text-2xl font-bold text-center text-foreground">
          Your Photo Strip
        </h2>

        {/* Overlay Selector - only show if multiple overlays and not in sticker mode */}
        {hasMultipleOverlays && !showStickerEditor && (
          <OverlaySelector
            overlays={overlays}
            selectedOverlay={selectedOverlay}
            onSelect={onOverlayChange}
          />
        )}

        {/* Photo Thumbnails for Editing - hide in sticker mode */}
        {!showStickerEditor && (
          <div className="grid grid-cols-6 gap-2">
            {photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => handleEditPhoto(index)}
                className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors"
                title="Click to adjust position"
              >
                {photo.src && (
                  <>
                    <img
                      src={photo.src}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Move className="w-4 h-4 text-white opacity-0 hover:opacity-100" />
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">
              Generating layout... {Math.round(progress)}%
            </p>
          </div>
        )}

        <div
          className={`flex justify-center p-4 relative transition-all duration-300 ${isZoomActive ? 'overflow-auto max-h-[75vh] bg-muted/10 border border-border/50 rounded-xl' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Zoom Controls Overlay */}
          <div className="absolute top-4 right-4 z-40 bg-background/80 backdrop-blur rounded-lg shadow-lg border border-border flex flex-col p-1 gap-1">
            <Button
              variant={isZoomActive ? "secondary" : "ghost"}
              size="icon"
              onClick={handleZoomToggle}
              className={`h-8 w-8 ${isZoomActive ? 'text-primary' : 'text-muted-foreground'}`}
              title={isZoomActive ? "Exit Zoom Mode" : "Enter Zoom Mode"}
            >
              {isZoomActive ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </Button>

            {isZoomActive && (
              <>
                <div className="h-px w-full bg-border my-0.5" />
                <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <span className="text-xs text-center font-mono">{Math.round(zoomLevel * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleZoomReset} className="h-8 w-8" title="Reset Zoom">
                  <Move className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>

          {/* Canvas wrapper - overlay is positioned relative to this */}
          <div
            className={`relative inline-block transition-transform duration-200 ease-out origin-top ${!isZoomActive ? 'max-h-[65vh]' : ''}`}
            style={isZoomActive ? { transform: `scale(${zoomLevel})`, marginBottom: `${(zoomLevel - 1) * 100}px` } : {}}
          >
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm rounded-lg z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            <canvas
              ref={canvasRef}
              className={`rounded-lg shadow-xl border-2 border-border block ${!isZoomActive ? 'max-w-full h-auto max-h-[65vh] w-auto' : ''}`}
              style={isZoomActive ? { maxHeight: 'none', width: 'auto', maxWidth: 'none' } : {}}
            />

            {/* Direct Sticker Overlay - positioned exactly over canvas */}
            {showStickerEditor && (
              <LayoutStickerEditor
                canvasRef={canvasRef}
                stickers={placedStickers}
                onStickersChange={setPlacedStickers}
                isVisible={showStickerEditor}
                zoomLevel={zoomLevel}
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {/* STICKER MODE CONTROLS */}
          {showStickerEditor ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  // Cancel: exit sticker mode without rendering (keep stickers for next time)
                  setShowStickerEditor(false);
                }}
                className="gap-2 btn-touch"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </Button>

              <Button
                onClick={() => {
                  // Done: exit sticker mode - useEffect will trigger regeneration with stickers
                  setShowStickerEditor(false);
                }}
                className="gap-2 btn-touch bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="w-4 h-4" />
                Done - Apply Stickers
              </Button>
            </>
          ) : (
            <>
              {/* NORMAL MODE CONTROLS */}
              <Button variant="outline" onClick={onBack} className="gap-2 btn-touch">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              {/* Edit Stickers Button - always available if stickers exist or can be added */}
              {hasStickersAvailable && (
                <Button
                  variant={placedStickers.length > 0 ? "default" : "outline"}
                  onClick={() => setShowStickerEditor(true)}
                  className="gap-2 btn-touch"
                >
                  <Sticker className="w-4 h-4" />
                  {placedStickers.length > 0 ? 'Edit Stickers' : 'Add Stickers'}
                  {placedStickers.length > 0 && (
                    <span className="ml-1 bg-background text-foreground text-xs px-1.5 py-0.5 rounded-full">
                      {placedStickers.length}
                    </span>
                  )}
                </Button>
              )}

              <Button onClick={handleNativePrint} className="gap-2 btn-touch bg-indigo-600 hover:bg-indigo-700 text-white">
                <Printer className="w-4 h-4" />
                Print
              </Button>

              <Button
                onClick={() => {
                  console.log('Download PDF clicked! showStickerEditor:', showStickerEditor, 'canvasRef:', canvasRef.current);
                  if (canvasRef.current) {
                    try {
                      onDownloadPDF(canvasRef.current);
                    } catch (err) {
                      console.error('Failed to export PDF:', err);
                      alert('Failed to generate PDF. Please try again.');
                    }
                  }
                }}
                className="gap-2 btn-touch"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button variant="secondary" onClick={handleDownloadPNG} className="gap-2 btn-touch">
                <Image className="w-4 h-4" />
                Download PNG
              </Button>
              <Button variant="secondary" onClick={handleShare} className="gap-2 btn-touch">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              {config.ENABLE_EMAIL_SENDING && (
                <Button variant="secondary" onClick={() => setShowEmailModal(true)} className="gap-2 btn-touch">
                  <Mail className="w-4 h-4" />
                  Email
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowGifGenerator(true)} className="gap-2 btn-touch">
                <Film className="w-4 h-4" />
                GIF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Right Side Panel - Stickers */}
      {showStickerEditor && (
        <div className="fixed inset-x-0 bottom-0 z-50 lg:static lg:w-72 lg:h-auto animate-in slide-in-from-bottom lg:slide-in-from-right duration-300">
          <StickerSidePanel
            onDragStart={(s) => setDraggedSticker(s)}
            isOpen={true}
          />
        </div>
      )}

      {/* Photo Editor Modal */}
      {editingIndex !== null && photos[editingIndex]?.src && (
        <PhotoEditor
          photo={photos[editingIndex]}
          placement={template.placements[editingIndex]}
          onSave={handleSaveTransform}
          onClose={() => setEditingIndex(null)}
        />
      )}

      {/* Share Modal */}
      {showShareModal && canvasRef.current && (
        <ShareModal
          canvas={canvasRef.current}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Email Modal */}
      {showEmailModal && canvasRef.current && (
        <EmailDeliveryModal
          photoUrl={canvasRef.current.toDataURL('image/png')}
          photoId={`photo-${Date.now()}`}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {/* Email Modal was duplicated in target content logic, ensuring single instance via overwrite */}
    </div>
  );
}
