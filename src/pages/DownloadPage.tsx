import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, ArrowLeft, Loader2, AlertCircle, Clock, TreePine } from 'lucide-react';
import { api } from '@/lib/api';
import { getExpiryInfo, isPhotoExpired } from '@/lib/expiryUtils';
import { ExpiryCountdown } from '@/components/ExpiryCountdown';
import { toast } from 'sonner';

interface PhotoMeta {
  id: string;
  file_url: string;
  created_at: string;
  width: number;
  height: number;
  layout_name: string | null;
}

export default function DownloadPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [meta, setMeta] = useState<PhotoMeta | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [expired, setExpired] = useState(false);

  const photoUrl = meta?.file_url || (id ? api.getPhotoUrl(id) : '');
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/${id}` : '';

  useEffect(() => {
    if (!id) {
      setError('Invalid photo ID');
      setLoading(false);
      return;
    }

    api.getPhotoMeta(id)
      .then((data) => {
        // Check if photo is expired
        if (isPhotoExpired(data.created_at)) {
          setExpired(true);
        } else {
          setMeta(data);
        }
      })
      .catch((err) => {
        setError(err.message || 'Photo not found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    if (!photoUrl) return;
    
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `photo-${id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Download started!');
    } catch (err) {
      toast.error('Failed to download photo');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out my photo!',
          url: publicUrl,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      setShowQR(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link copied to clipboard!');
    } catch (e) {
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading photo...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <Clock className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Photo Expired</h1>
          <p className="mt-2 text-muted-foreground">
            This photo has expired and is no longer available. Photos are automatically deleted after 24 hours.
          </p>
          <Link to="/">
            <Button className="mt-6">
              <ArrowLeft className="w-4 h-4 mr-2" /> Take New Photos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Photo Not Found</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Link to="/">
            <Button className="mt-6">
              <ArrowLeft className="w-4 h-4 mr-2" /> Go to Photobooth
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Subtle Christmas Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="p-4 border-b border-border bg-card/80 backdrop-blur-sm relative z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <TreePine className="w-5 h-5 text-secondary" />
            <h1 className="text-lg font-semibold text-foreground">Your Photo</h1>
            <TreePine className="w-5 h-5 text-secondary" />
          </div>
          <div className="w-5" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col items-center relative z-10">
        <div className="w-full max-w-2xl space-y-6">
          {/* Photo Preview */}
          <div className="christmas-card overflow-hidden">
            <img
              src={photoUrl}
              alt="Your photo"
              className="w-full h-auto"
              onError={() => setError('Photo could not be loaded')}
            />
          </div>

          {/* Expiry Countdown */}
          {meta && (
            <div className="flex justify-center">
              <ExpiryCountdown 
                createdAt={meta.created_at} 
                onExpired={() => setExpired(true)}
              />
            </div>
          )}

          {/* Download Button */}
          <Button 
            onClick={handleDownload} 
            size="lg" 
            className="w-full py-6 text-lg btn-touch"
          >
            <Download className="w-6 h-6 mr-2" /> Download Photo
          </Button>

          {/* iOS Instructions */}
          <p className="text-center text-sm text-muted-foreground">
            <strong>iOS:</strong> Long-press the image above and select "Save Image"
          </p>

          {/* Share Options */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleShare} 
              className="flex-1 btn-touch"
            >
              <Share2 className="w-5 h-5 mr-2" /> Share
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCopyLink} 
              className="flex-1 btn-touch"
            >
              Copy Link
            </Button>
          </div>

          {/* QR Code for sharing */}
          {showQR && (
            <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-xl border border-border">
              <p className="text-sm text-muted-foreground">Scan to share this photo</p>
              <div className="bg-white p-3 rounded-lg">
                <QRCodeSVG value={publicUrl} size={180} level="M" />
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowQR(false)}>
                Hide QR
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <Link to="/">
          <Button variant="outline" className="btn-touch">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Booth
          </Button>
        </Link>
      </footer>
    </div>
  );
}
