import { PhotoData } from '@/types/photo';
import { Button } from '@/components/ui/button';
import { PHOTO_FILTERS } from '@/lib/filters';
import { ArrowRight, RotateCcw } from 'lucide-react';

interface FiltersPageProps {
  photos: PhotoData[];
  selectedFilter: string;
  onFilterChange: (filterId: string) => void;
  onNext: () => void;
  onRetake: () => void;
}

export function FiltersPage({
  photos,
  selectedFilter,
  onFilterChange,
  onNext,
  onRetake,
}: FiltersPageProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-center text-foreground">
        Choose a Filter
      </h2>

      {/* Photos Grid - 2x3 layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="aspect-[4/3] rounded-xl overflow-hidden border-2 border-border shadow-lg"
          >
            {photo.src ? (
              <img
                src={photo.src}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
                style={{
                  filter: PHOTO_FILTERS.find(f => f.id === selectedFilter)?.cssFilter || 'none',
                }}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                No photo
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filter Selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {PHOTO_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedFilter === filter.id
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            {filter.name}
          </button>
        ))}
      </div>

      {/* Preview with selected filter */}
      <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted/50">
        <span className="text-sm text-muted-foreground">Preview:</span>
        <span className="font-medium text-foreground">
          {PHOTO_FILTERS.find(f => f.id === selectedFilter)?.name}
        </span>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={onRetake} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Retake Photos
        </Button>
        <Button onClick={onNext} className="gap-2">
          Next: Layout
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
