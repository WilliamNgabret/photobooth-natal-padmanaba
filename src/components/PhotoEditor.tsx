import { useState, useRef, useCallback, useEffect } from 'react';
import { PhotoData, PhotoTransform } from '@/types/photo';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ZoomIn, ZoomOut, RotateCcw, Sticker, Trash2, Target } from 'lucide-react';
import { StickerPicker } from './StickerPicker';
import { api } from '@/lib/api';

interface PlacedSticker {
  id: string;
  stickerId: string;
  filename: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface PhotoEditorProps {
  photo: PhotoData;
  placement: { width: number; height: number };
  onSave: (transform: PhotoTransform, stickers?: PlacedSticker[]) => void;
  onClose: () => void;
}

export function PhotoEditor({ photo, placement, onSave, onClose }: PhotoEditorProps) {
  const [transform, setTransform] = useState<PhotoTransform>(photo.transform);
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragTarget = useRef<'photo' | string | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });

  const aspectRatio = placement.width / placement.height;

  const handleMouseDown = (e: React.MouseEvent, target: 'photo' | string = 'photo') => {
    isDragging.current = true;
    dragTarget.current = target;
    lastPos.current = { x: e.clientX, y: e.clientY };
    
    if (target !== 'photo') {
      setSelectedSticker(target);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !dragTarget.current) return;
    
    const deltaX = e.clientX - lastPos.current.x;
    const deltaY = e.clientY - lastPos.current.y;
    
    if (dragTarget.current === 'photo') {
      setTransform(prev => ({
        ...prev,
        offsetX: prev.offsetX + deltaX,
        offsetY: prev.offsetY + deltaY,
      }));
    } else {
      setStickers(prev => prev.map(s => 
        s.id === dragTarget.current 
          ? { ...s, x: s.x + deltaX, y: s.y + deltaY }
          : s
      ));
    }
    
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    dragTarget.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleTouchStart = (e: React.TouchEvent, target: 'photo' | string = 'photo') => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      dragTarget.current = target;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      
      if (target !== 'photo') {
        setSelectedSticker(target);
      }
    }
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || e.touches.length !== 1 || !dragTarget.current) return;
    
    const deltaX = e.touches[0].clientX - lastPos.current.x;
    const deltaY = e.touches[0].clientY - lastPos.current.y;
    
    if (dragTarget.current === 'photo') {
      setTransform(prev => ({
        ...prev,
        offsetX: prev.offsetX + deltaX,
        offsetY: prev.offsetY + deltaY,
      }));
    } else {
      setStickers(prev => prev.map(s => 
        s.id === dragTarget.current 
          ? { ...s, x: s.x + deltaX, y: s.y + deltaY }
          : s
      ));
    }
    
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = () => {
    isDragging.current = false;
    dragTarget.current = null;
  };

  const handleScaleChange = (value: number[]) => {
    setTransform(prev => ({ ...prev, scale: value[0] }));
  };

  const resetTransform = () => {
    setTransform({ offsetX: 0, offsetY: 0, scale: 1 });
  };

  const snapToCenter = () => {
    setTransform(prev => ({ ...prev, offsetX: 0, offsetY: 0 }));
  };

  const handleAddSticker = (sticker: { id: string; filename: string }) => {
    const newSticker: PlacedSticker = {
      id: `placed-${Date.now()}`,
      stickerId: sticker.id,
      filename: sticker.filename,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    };
    setStickers(prev => [...prev, newSticker]);
    setSelectedSticker(newSticker.id);
  };

  const handleDeleteSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
    if (selectedSticker === id) {
      setSelectedSticker(null);
    }
  };

  const handleStickerScale = (id: string, scale: number) => {
    setStickers(prev => prev.map(s => 
      s.id === id ? { ...s, scale } : s
    ));
  };

  const handleSave = () => {
    onSave(transform, stickers);
    onClose();
  };

  if (!photo.src) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="flex flex-col items-center gap-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <h3 className="text-lg font-semibold text-white">Edit Photo</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Editor Area */}
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-xl border-2 border-primary cursor-move bg-muted/20"
          style={{ 
            width: '100%', 
            maxWidth: 400,
            aspectRatio: aspectRatio,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'photo')}
          onTouchStart={(e) => handleTouchStart(e, 'photo')}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Photo */}
          <img
            src={photo.src}
            alt="Edit"
            className="absolute select-none pointer-events-none"
            style={{
              width: `${100 * transform.scale}%`,
              height: `${100 * transform.scale}%`,
              objectFit: 'cover',
              left: `calc(50% + ${transform.offsetX}px - ${50 * transform.scale}%)`,
              top: `calc(50% + ${transform.offsetY}px - ${50 * transform.scale}%)`,
            }}
            draggable={false}
          />

          {/* Placed Stickers */}
          {stickers.map((sticker) => (
            <div
              key={sticker.id}
              className={`absolute cursor-move ${selectedSticker === sticker.id ? 'ring-2 ring-primary' : ''}`}
              style={{
                left: `calc(50% + ${sticker.x}px)`,
                top: `calc(50% + ${sticker.y}px)`,
                transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, sticker.id);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                handleTouchStart(e, sticker.id);
              }}
            >
              <img
                src={api.getStickerUrl(sticker.filename)}
                alt="Sticker"
                className="w-16 h-16 object-contain pointer-events-none"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Photo Scale Controls */}
        <div className="flex items-center gap-4 w-full max-w-sm">
          <ZoomOut className="w-5 h-5 text-white/70" />
          <Slider
            value={[transform.scale]}
            onValueChange={handleScaleChange}
            min={1}
            max={2}
            step={0.05}
            className="flex-1"
          />
          <ZoomIn className="w-5 h-5 text-white/70" />
        </div>

        {/* Selected Sticker Controls */}
        {selectedSticker && (
          <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
            <span className="text-sm text-white/70 mr-2">Sticker size:</span>
            <Slider
              value={[stickers.find(s => s.id === selectedSticker)?.scale || 1]}
              onValueChange={(v) => handleStickerScale(selectedSticker, v[0])}
              min={0.5}
              max={2}
              step={0.1}
              className="w-24"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteSticker(selectedSticker)}
              className="text-destructive hover:bg-destructive/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" onClick={snapToCenter} className="gap-2">
            <Target className="w-4 h-4" />
            Center
          </Button>
          <Button variant="outline" onClick={resetTransform} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Sticker className="w-4 h-4" />
                Add Sticker
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="center">
              <StickerPicker onSelect={handleAddSticker} />
            </PopoverContent>
          </Popover>
          <Button onClick={handleSave} className="gap-2 px-8">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
