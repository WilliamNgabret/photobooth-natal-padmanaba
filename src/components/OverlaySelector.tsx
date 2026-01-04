import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface OverlayInfo {
  name: string;
  path: string;
}

interface OverlaySelectorProps {
  overlays: OverlayInfo[];
  selectedOverlay: string;
  onSelect: (path: string) => void;
}

export function OverlaySelector({ overlays, selectedOverlay, onSelect }: OverlaySelectorProps) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-card/50 rounded-xl border border-border">
      <h3 className="text-sm font-medium text-foreground">Select Overlay</h3>
      <div className="flex flex-wrap gap-2">
        {overlays.map((overlay) => {
          const isSelected = overlay.path === selectedOverlay;
          return (
            <Button
              key={overlay.path}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelect(overlay.path)}
              className="gap-2 capitalize"
            >
              {isSelected && <Check className="w-3 h-3" />}
              {overlay.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
