import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Trash2, Move } from 'lucide-react';
import { api } from '@/lib/api';

export interface PlacedSticker {
  id: string;
  stickerId: string;
  filename: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  photoIndex: number;
}

interface LayoutStickerEditorProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  stickers: PlacedSticker[];
  onStickersChange: (stickers: PlacedSticker[]) => void;
  isVisible: boolean;
  zoomLevel?: number;
}

export function LayoutStickerEditor({
  canvasRef,
  stickers,
  onStickersChange,
  isVisible,
  zoomLevel = 1,
}: LayoutStickerEditorProps) {
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragTarget = useRef<string | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });

  // Clear selection if clicking outside
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setSelectedSticker(null);
    }
  };

  const getCanvasScale = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return 1;
    // Use getBoundingClientRect to correctly account for any CSS transforms (like Zoom)
    const displayWidth = containerRef.current.getBoundingClientRect().width;
    const canvasWidth = canvasRef.current.width;
    return canvasWidth / displayWidth;
  }, [canvasRef, zoomLevel]); // Re-calculate when zoom changes

  const handleMouseDown = (e: React.MouseEvent, stickerId: string) => {
    e.stopPropagation();
    isDragging.current = true;
    dragTarget.current = stickerId;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setSelectedSticker(stickerId);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !dragTarget.current) return;

    const scale = getCanvasScale();
    const deltaX = (e.clientX - lastPos.current.x) * scale;
    const deltaY = (e.clientY - lastPos.current.y) * scale;

    onStickersChange(stickers.map(s =>
      s.id === dragTarget.current
        ? { ...s, x: s.x + deltaX, y: s.y + deltaY, photoIndex: -1 }
        : s
    ));

    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [stickers, onStickersChange, getCanvasScale]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    dragTarget.current = null;
  }, []);

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isVisible, handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = (e: React.TouchEvent, stickerId: string) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      isDragging.current = true;
      dragTarget.current = stickerId;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setSelectedSticker(stickerId);
    }
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || e.touches.length !== 1 || !dragTarget.current) return;

    const scale = getCanvasScale();
    const deltaX = (e.touches[0].clientX - lastPos.current.x) * scale;
    const deltaY = (e.touches[0].clientY - lastPos.current.y) * scale;

    onStickersChange(stickers.map(s =>
      s.id === dragTarget.current
        ? { ...s, x: s.x + deltaX, y: s.y + deltaY, photoIndex: -1 }
        : s
    ));

    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, [stickers, onStickersChange, getCanvasScale]);

  const handleTouchEnd = () => {
    isDragging.current = false;
    dragTarget.current = null;
  };

  const handleDeleteSticker = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onStickersChange(stickers.filter(s => s.id !== id));
    if (selectedSticker === id) {
      setSelectedSticker(null);
    }
  };

  const handleStickerScale = (id: string, scale: number) => {
    onStickersChange(stickers.map(s =>
      s.id === id ? { ...s, scale, photoIndex: -1 } : s
    ));
  };

  const handleStickerRotate = (id: string, delta: number) => {
    onStickersChange(stickers.map(s =>
      s.id === id ? { ...s, rotation: (s.rotation + delta) % 360, photoIndex: -1 } : s
    ));
  };

  const selectedStickerData = stickers.find(s => s.id === selectedSticker);

  // Calculate display scale to render stickers at correct size relative to canvas display
  // Use state to ensure re-render when dimensions change
  const [displayScale, setDisplayScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (canvasRef.current) {
        // Use canvas displayed size vs internal size
        const canvasDisplayWidth = canvasRef.current.getBoundingClientRect().width;
        const canvasInternalWidth = canvasRef.current.width;
        const scale = canvasDisplayWidth / canvasInternalWidth;
        console.log('Display scale:', { canvasDisplayWidth, canvasInternalWidth, scale });
        setDisplayScale(scale || 1);
      }
    };

    updateScale();

    // Update on resize
    window.addEventListener('resize', updateScale);

    return () => window.removeEventListener('resize', updateScale);
  }, [canvasRef, isVisible, zoomLevel]);

  if (!isVisible) return null;

  return (
    // Overlay Interaction Layer - pointer-events-none so drops pass through, stickers will have pointer-events-auto
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 rounded-lg pointer-events-none"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {stickers.map((sticker) => {
        const stickerSize = 100 * sticker.scale * displayScale;
        const isSelected = selectedSticker === sticker.id;

        return (
          <div
            key={sticker.id}
            className={`absolute cursor-move group pointer-events-auto ${isSelected ? 'z-30' : 'z-20'}`}
            style={{
              left: sticker.x * displayScale,
              top: sticker.y * displayScale,
              width: stickerSize,
              height: stickerSize,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
            }}
            onMouseDown={(e) => handleMouseDown(e, sticker.id)}
            onTouchStart={(e) => handleTouchStart(e, sticker.id)}
          >
            {/* Visual Boundary Box */}
            <div className={`w-full h-full relative ${isSelected
              ? 'ring-2 ring-primary ring-offset-1 rounded-sm'
              : 'hover:ring-1 hover:ring-primary/40 rounded-sm'
              }`}>
              <img
                src={api.getStickerUrl(sticker.filename)}
                alt="Sticker"
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />

              {/* Controls - Only show when selected */}
              {isSelected && (
                <>
                  {/* Delete Handle (Top Right) */}
                  <button
                    className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:scale-110 transition-transform"
                    onClick={(e) => handleDeleteSticker(sticker.id, e)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Floating Toolbar for Selected Sticker - Fixed position to avoid cropping */}
      {selectedStickerData && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-background/95 backdrop-blur shadow-2xl border-2 border-primary/20 rounded-xl p-3 flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in pointer-events-auto min-w-[300px] justify-center">
          <div className="flex items-center gap-3 px-2">
            <ZoomOut className="w-5 h-5 text-muted-foreground" />
            <Slider
              value={[selectedStickerData.scale]}
              onValueChange={(v) => handleStickerScale(selectedStickerData.id, v[0])}
              min={0.3}
              max={5}
              step={0.1}
              className="w-32"
            />
            <ZoomIn className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="w-px h-6 bg-border mx-1" />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10 btn-touch" onClick={() => handleStickerRotate(selectedStickerData.id, -45)}>
              <RotateCcw className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 btn-touch" onClick={() => handleStickerRotate(selectedStickerData.id, 45)}>
              <RotateCw className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}