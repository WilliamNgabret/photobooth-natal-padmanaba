import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share2, Loader2, Check, Download, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ShareModalProps {
  canvas: HTMLCanvasElement;
  onClose: () => void;
}

export function ShareModal({ canvas, onClose }: ShareModalProps) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [fileSize, setFileSize] = useState<number>(0);

  const handleShare = async () => {
    setLoading(true);
    setError('');
    try {
      // Convert canvas to data URL (PNG)
      const dataUrl = canvas.toDataURL('image/png');
      
      // Calculate approximate file size
      const base64Length = dataUrl.split(',')[1]?.length || 0;
      const sizeBytes = Math.round((base64Length * 3) / 4);
      setFileSize(sizeBytes);

      // Upload to Supabase
      const { id } = await api.shareCreate(dataUrl, canvas.width, canvas.height);

      // Build public URL
      const shareUrl = `${window.location.origin}/p/${id}`;
      setUrl(shareUrl);
      toast.success('Photo uploaded successfully!');
    } catch (err: any) {
      console.error('Share error', err);
      setError(err?.message || 'Upload failed');
      toast.error('Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('copy failed', e);
      toast.error('Failed to copy link');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl border border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2 text-card-foreground">
            <Share2 className="w-5 h-5" /> Share to Phone
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-col items-center gap-4">
          {!url ? (
            <>
              <p className="text-center text-muted-foreground">
                Generate a QR code to download this photo on your phone.
              </p>

              <Button 
                onClick={handleShare} 
                disabled={loading} 
                className="mt-2 btn-touch"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Uploading...
                  </>
                ) : (
                  <>
                    <Share2 className="w-5 h-5 mr-2" /> Generate QR Code
                  </>
                )}
              </Button>

              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </>
          ) : (
            <>
              <div className="bg-white p-4 rounded-xl shadow-inner">
                <QRCodeSVG value={url} size={200} level="M" includeMargin />
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with your phone
                </p>
                {fileSize > 0 && (
                  <p className="text-xs text-muted-foreground">
                    File size: {formatFileSize(fileSize)}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
                <Button onClick={handleCopy} variant="outline" className="flex-1 btn-touch">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" /> Copy Link
                    </>
                  )}
                </Button>
                <Button asChild className="flex-1 btn-touch">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" /> Open Link
                  </a>
                </Button>
              </div>

              <div className="mt-2 p-3 bg-muted rounded-lg w-full">
                <p className="text-xs text-muted-foreground break-all text-center">
                  {url}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
