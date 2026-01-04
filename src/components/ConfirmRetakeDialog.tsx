import { Button } from '@/components/ui/button';
import { Check, RotateCcw } from 'lucide-react';

interface ConfirmRetakeDialogProps {
  photoSrc: string;
  onConfirm: () => void;
  onRetake: () => void;
}

export function ConfirmRetakeDialog({ photoSrc, onConfirm, onRetake }: ConfirmRetakeDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex flex-col items-center gap-6 max-w-lg w-full">
        {/* Preview Image */}
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-4 border-primary shadow-2xl">
          <img
            src={photoSrc}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={onRetake}
            className="gap-2 px-6"
          >
            <RotateCcw className="w-5 h-5" />
            Retake
          </Button>
          <Button
            size="lg"
            onClick={onConfirm}
            className="gap-2 px-6"
          >
            <Check className="w-5 h-5" />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
