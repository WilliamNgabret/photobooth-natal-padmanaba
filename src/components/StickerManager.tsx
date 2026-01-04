import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Upload, Trash2, GripVertical, Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StickerEntry {
  id: string;
  name: string;
  path: string;
  sort_order: number;
  created_at: string;
}

export function StickerManager() {
  const [stickers, setStickers] = useState<StickerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    loadStickers();
  }, []);

  const loadStickers = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getStickers();
      setStickers(data);
    } catch (err) {
      toast.error('Failed to load stickers');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }

    setUploading(true);
    try {
      const label = newLabel.trim() || file.name.replace(/\.[^.]+$/, '');
      await api.admin.uploadSticker(file, label);
      toast.success('Sticker uploaded');
      setNewLabel('');
      loadStickers();
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }, [newLabel]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleDelete = async (id: string) => {
    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;
    
    setDeleting(id);
    try {
      await api.admin.deleteSticker(id, sticker.path);
      setStickers(prev => prev.filter(s => s.id !== id));
      toast.success('Sticker deleted');
    } catch (err) {
      toast.error('Failed to delete sticker');
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newStickers = [...stickers];
    const draggedIndex = newStickers.findIndex(s => s.id === draggedId);
    const targetIndex = newStickers.findIndex(s => s.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [dragged] = newStickers.splice(draggedIndex, 1);
      newStickers.splice(targetIndex, 0, dragged);
      setStickers(newStickers);
    }
  };

  const handleDragEnd = async () => {
    if (!draggedId) return;
    setDraggedId(null);

    try {
      await api.admin.reorderStickers(stickers.map(s => s.id));
    } catch (err) {
      toast.error('Failed to save order');
      loadStickers();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="sticker-upload"
          disabled={uploading}
        />
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Input
              placeholder="Sticker label (optional)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="max-w-xs"
            />
          </div>
          
          <label htmlFor="sticker-upload">
            <Button 
              variant="outline" 
              className="cursor-pointer btn-touch" 
              disabled={uploading}
              asChild
            >
              <span>
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" /> Upload Sticker
                  </>
                )}
              </span>
            </Button>
          </label>
          
          <p className="text-sm text-muted-foreground">
            Drag & drop an image here, or click to select
          </p>
        </div>
      </div>

      {/* Sticker List */}
      {stickers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No stickers yet. Upload some!</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground mb-4">
            Drag to reorder • {stickers.length} sticker{stickers.length !== 1 ? 's' : ''}
          </p>
          
          {stickers.map((sticker) => (
            <div
              key={sticker.id}
              draggable
              onDragStart={() => handleDragStart(sticker.id)}
              onDragOver={(e) => handleDragOver(e, sticker.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-4 p-3 bg-card rounded-lg border border-border transition-all ${
                draggedId === sticker.id ? 'opacity-50 scale-95' : ''
              }`}
            >
              {/* Drag Handle */}
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* Preview */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={api.getStickerUrl(sticker.path)}
                  alt={sticker.name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{sticker.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{sticker.id}</p>
              </div>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirm(sticker.id)}
                disabled={deleting === sticker.id}
              >
                {deleting === sticker.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sticker?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The sticker will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
