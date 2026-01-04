import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EmailDeliveryModalProps {
  photoUrl: string;
  photoId: string;
  onClose: () => void;
}

export function EmailDeliveryModal({ photoUrl, photoId, onClose }: EmailDeliveryModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendEmail = async () => {
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        'https://pdstlonykoeehwhyzcpy.supabase.co/functions/v1/send-photo-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            photoUrl,
            photoId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setIsSent(true);
      toast.success('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Your Photos
          </DialogTitle>
          <DialogDescription>
            Enter your email address to receive your photobooth photos directly in your inbox.
          </DialogDescription>
        </DialogHeader>

        {isSent ? (
          <div className="flex flex-col items-center py-6 gap-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Email Sent!</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Check your inbox at <span className="font-medium">{email}</span>
              </p>
            </div>
            <Button onClick={onClose} className="mt-2">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isLoading || !email}
                className="flex-1 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              We'll send you a beautiful email with a link to download your photos.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
