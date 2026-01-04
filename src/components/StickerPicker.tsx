import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface Sticker {
  id: string;
  name: string;
  path: string;
}

interface StickerPickerProps {
  onSelect: (sticker: { id: string; filename: string }) => void;
}

export function StickerPicker({ onSelect }: StickerPickerProps) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStickers();
  }, []);

  const loadStickers = async () => {
    try {
      const data = await api.getStickersList();
      setStickers(data);
    } catch (err) {
      console.error('Failed to load stickers:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (stickers.length === 0) {
    return (
      <div className="text-center p-6 text-sm text-muted-foreground">
        <p>No stickers available</p>
        <p className="text-xs mt-1">Upload stickers in Admin → Stickers</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 p-2">
      {stickers.map((sticker) => (
        <button
          key={sticker.id}
          onClick={() => onSelect({ id: sticker.id, filename: sticker.path })}
          className="w-14 h-14 rounded-lg bg-muted/50 hover:bg-muted transition-colors flex items-center justify-center p-2"
          title={sticker.name}
        >
          <img
            src={api.getStickerUrl(sticker.path)}
            alt={sticker.name}
            className="w-full h-full object-contain"
            draggable={false}
          />
        </button>
      ))}
    </div>
  );
}
