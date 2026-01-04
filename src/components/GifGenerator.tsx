import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PhotoData } from '@/types/photo';
import { Loader2, Download, Play, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface GifGeneratorProps {
  photos: PhotoData[];
  onClose: () => void;
}

export function GifGenerator({ photos, onClose }: GifGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [frameDelay, setFrameDelay] = useState(500);
  const [isBoomerang, setIsBoomerang] = useState(true);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [previewFrame, setPreviewFrame] = useState(0);

  const validPhotos = photos.filter(p => p.src !== null);

  // Preview animation
  useEffect(() => {
    if (gifUrl || isGenerating) return;

    const frames = isBoomerang
      ? [...validPhotos, ...validPhotos.slice(1, -1).reverse()]
      : validPhotos;

    let frameIndex = 0;
    const interval = setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      setPreviewFrame(frameIndex);
    }, frameDelay);

    return () => clearInterval(interval);
  }, [validPhotos, frameDelay, isBoomerang, gifUrl, isGenerating]);

  const generateGif = async () => {
    if (validPhotos.length < 2) {
      toast.error('Need at least 2 photos to create a GIF');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Dynamic import of gif.js to avoid SSR issues
      const GIF = (await import('gif.js')).default;

      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: 400,
        height: 300,
        workerScript: '/gif.worker.js',
      });

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      canvas.width = 400;
      canvas.height = 300;

      // Create frames array (with boomerang effect if enabled)
      const frames = isBoomerang
        ? [...validPhotos, ...validPhotos.slice(1, -1).reverse()]
        : validPhotos;

      // Load and add each frame
      for (let i = 0; i < frames.length; i++) {
        const photo = frames[i];
        if (!photo.src) continue;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = photo.src!;
        });

        // Draw image to canvas with cover fit
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgRatio > canvasRatio) {
          drawHeight = canvas.height;
          drawWidth = drawHeight * imgRatio;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        } else {
          drawWidth = canvas.width;
          drawHeight = drawWidth / imgRatio;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        gif.addFrame(ctx, { copy: true, delay: frameDelay });
        setProgress(((i + 1) / frames.length) * 80);
      }

      gif.on('progress', (p: number) => {
        setProgress(80 + p * 20);
      });

      gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        setGifUrl(url);
        setIsGenerating(false);
        setProgress(100);
        toast.success('GIF created successfully!');
      });

      gif.render();
    } catch (error) {
      console.error('Error generating GIF:', error);
      toast.error('Failed to generate GIF. Please try again.');
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!gifUrl) return;

    const link = document.createElement('a');
    link.href = gifUrl;
    link.download = `photobooth-${isBoomerang ? 'boomerang' : 'gif'}-${Date.now()}.gif`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('GIF downloaded!');
  };

  const handleReset = () => {
    if (gifUrl) {
      URL.revokeObjectURL(gifUrl);
    }
    setGifUrl(null);
    setProgress(0);
  };

  const frames = isBoomerang
    ? [...validPhotos, ...validPhotos.slice(1, -1).reverse()]
    : validPhotos;
  const currentFrame = frames[previewFrame % frames.length];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Create Animated GIF / Boomerang
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview / Result */}
          <div 
            ref={previewRef}
            className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden border"
          >
            {gifUrl ? (
              <img
                src={gifUrl}
                alt="Generated GIF"
                className="w-full h-full object-contain"
              />
            ) : currentFrame?.src ? (
              <img
                src={currentFrame.src}
                alt="Preview"
                className="w-full h-full object-cover transition-opacity duration-100"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No photos to preview
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  Generating... {Math.round(progress)}%
                </p>
              </div>
            )}
          </div>

          {/* Hidden canvas for GIF generation */}
          <canvas ref={canvasRef} className="hidden" />

          {!gifUrl && (
            <>
              {/* Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="boomerang" className="cursor-pointer">
                    Boomerang Effect
                  </Label>
                  <Switch
                    id="boomerang"
                    checked={isBoomerang}
                    onCheckedChange={setIsBoomerang}
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Frame Duration</Label>
                    <span className="text-sm text-muted-foreground">{frameDelay}ms</span>
                  </div>
                  <Slider
                    value={[frameDelay]}
                    onValueChange={([val]) => setFrameDelay(val)}
                    min={100}
                    max={1000}
                    step={50}
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Faster = shorter delay, Slower = longer delay
                  </p>
                </div>
              </div>

              <Button
                onClick={generateGif}
                disabled={isGenerating || validPhotos.length < 2}
                className="w-full gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Generate {isBoomerang ? 'Boomerang' : 'GIF'}
                  </>
                )}
              </Button>
            </>
          )}

          {gifUrl && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Create New
              </Button>
              <Button
                onClick={handleDownload}
                className="flex-1 gap-2"
              >
                <Download className="w-4 h-4" />
                Download GIF
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
