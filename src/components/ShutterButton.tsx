import { Camera } from 'lucide-react';

interface ShutterButtonProps {
  onClick: () => void;
  disabled?: boolean;
  slotNumber?: number;
}

export function ShutterButton({ onClick, disabled, slotNumber }: ShutterButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-16 h-16 rounded-full transition-all duration-300
        bg-gradient-to-br from-primary to-primary/90 hover:scale-105 active:scale-95
        shadow-lg hover:shadow-xl christmas-glow
        flex items-center justify-center
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer animate-pulse-slow'}
      `}
    >
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-primary-foreground/30" />

      {/* Inner button */}
      <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
        <Camera className="w-6 h-6 text-primary-foreground" />
      </div>

      {/* Slot indicator */}
      {slotNumber !== undefined && (
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-sm font-bold flex items-center justify-center">
          {slotNumber}
        </span>
      )}
    </button>
  );
}
