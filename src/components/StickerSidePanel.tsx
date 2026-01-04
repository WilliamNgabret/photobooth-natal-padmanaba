import { useEffect, useState } from 'react';
import { Sticker } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface StickerSidePanelProps {
    onDragStart: (sticker: { id: string; filename: string }) => void;
    isOpen?: boolean;
}

export function StickerSidePanel({ onDragStart, isOpen = true }: StickerSidePanelProps) {
    const [stickers, setStickers] = useState<{ id: string; filename: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStickers();
    }, []);

    const loadStickers = async () => {
        try {
            const list = await api.getStickersList();
            setStickers(list.map(s => ({ id: s.id, filename: s.path })));
        } catch (err) {
            console.error('Failed to load stickers:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="w-full md:w-64 flex flex-col bg-card border-l border-border h-[calc(100vh-100px)] md:h-auto min-h-[300px] shadow-lg animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-border flex items-center gap-2">
                <Sticker className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Stickers</h3>
            </div>

            <ScrollArea className="flex-1 p-4">
                {loading ? (
                    <div className="flex justify-center p-4">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : stickers.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm p-4">
                        No stickers found. Upload some in the Admin panel!
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {stickers.map((sticker) => (
                            <div
                                key={sticker.id}
                                className="aspect-square bg-muted/30 rounded-lg p-2 cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/20"
                                draggable
                                onDragStart={(e) => {
                                    // Set drag data
                                    e.dataTransfer.setData('application/json', JSON.stringify(sticker));
                                    // Create a ghost image
                                    const ghost = document.createElement('div');
                                    ghost.innerHTML = '🎄';
                                    ghost.style.fontSize = '24px';
                                    ghost.style.position = 'absolute';
                                    ghost.style.top = '-1000px';
                                    document.body.appendChild(ghost);
                                    e.dataTransfer.setDragImage(ghost, 0, 0);
                                    setTimeout(() => document.body.removeChild(ghost), 0);

                                    onDragStart(sticker);
                                }}
                            >
                                <img
                                    src={api.getStickerUrl(sticker.filename)}
                                    alt="Sticker"
                                    className="w-full h-full object-contain pointer-events-none"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            <div className="p-4 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground text-center">
                    Drag & Drop onto a photo
                </p>
            </div>
        </div>
    );
}
