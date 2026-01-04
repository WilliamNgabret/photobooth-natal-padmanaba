import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { isPhotoExpired } from '@/lib/expiryUtils';
import { ExpiryCountdown } from '@/components/ExpiryCountdown';
import { toast } from 'sonner';
import { Loader2, Download, Trash2, Copy, ExternalLink, RefreshCw } from 'lucide-react';
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

interface PhotoEntry {
  id: string;
  file_url: string;
  created_at: string;
  width: number | null;
  height: number | null;
  layout_name: string | null;
}

export function GalleryGrid() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getGallery(0, 100);
      // Filter out expired photos
      const validPhotos = data.photos.filter(p => !isPhotoExpired(p.created_at));
      setPhotos(validPhotos);
      setTotal(validPhotos.length);
    } catch (err) {
      toast.error('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.admin.deletePhoto(id);
      setPhotos(prev => prev.filter(p => p.id !== id));
      setTotal(prev => prev - 1);
      toast.success('Photo deleted');
    } catch (err) {
      toast.error('Failed to delete photo');
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success('ID copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          {photos.length} photos (24-hour auto-expiry)
        </p>
        <Button variant="outline" size="sm" onClick={loadPhotos}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No photos yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div 
              key={photo.id} 
              className="bg-card rounded-xl overflow-hidden border border-border shadow-sm transition-all hover:shadow-md"
            >
              {/* Image */}
              <div className="aspect-[3/4] bg-muted">
                <img
                  src={api.getPhotoUrl(photo.id)}
                  alt={`Photo ${photo.id}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-mono truncate" title={photo.id}>{photo.id}</p>
                  <p>{formatDate(photo.created_at)}</p>
                </div>

                {/* Expiry Countdown */}
                <ExpiryCountdown 
                  createdAt={photo.created_at} 
                  variant="compact"
                  onExpired={() => {
                    setPhotos(prev => prev.filter(p => p.id !== photo.id));
                  }}
                />

                {/* Actions */}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopyId(photo.id)}
                    title="Copy ID"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                    title="Open"
                  >
                    <a href={`/p/${photo.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                    title="Download"
                  >
                    <a href={api.getPhotoUrl(photo.id)} download={`photo-${photo.id}.png`}>
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(photo.id)}
                    disabled={deleting === photo.id}
                    title="Delete"
                  >
                    {deleting === photo.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The photo will be permanently deleted.
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
