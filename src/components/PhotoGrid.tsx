import { PhotoData } from '@/types/photo';
import { Camera, Check } from 'lucide-react';

interface PhotoGridProps {
  photos: PhotoData[];
  onSlotClick: (index: number) => void;
  disabled?: boolean;
}

export function PhotoGrid({ photos, onSlotClick, disabled }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 w-full max-w-md lg:max-w-none mx-auto">
      {photos.slice(0, 3).map((photo, index) => (
        <button
          key={index}
          onClick={() => onSlotClick(index)}
          disabled={disabled}
          className={`
            relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all duration-300
            ${photo.src
              ? 'christmas-border-glow shadow-lg scale-[1.02]'
              : 'border-dashed border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/40'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {photo.src ? (
            <>
              <img
                src={photo.src}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="w-3 h-3" />
              </div>
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="text-white opacity-0 hover:opacity-100 text-xs font-medium">
                  Click to retake
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{index + 1}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
