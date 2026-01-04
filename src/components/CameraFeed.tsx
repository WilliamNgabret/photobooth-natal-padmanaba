import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  devices: CameraDevice[];
  selectedDevice: string;
  onDeviceChange: (deviceId: string) => void;
  isReady: boolean;
  error: string | null;
  showFlash: boolean;
  onRequestPermission: () => void;
}

export function CameraFeed({
  videoRef,
  devices,
  selectedDevice,
  onDeviceChange,
  isReady,
  error,
  showFlash,
  onRequestPermission,
}: CameraFeedProps) {
  const needsPermission = devices.length === 0 && !isReady && !error;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-3xl mx-auto">
      {/* Device Selector */}
      {devices.length > 1 && (
        <div className="w-full max-w-xs">
          <Select value={selectedDevice} onValueChange={onDeviceChange}>
            <SelectTrigger className="glass-effect">
              <Camera className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Camera Preview */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-border/50 shadow-lg christmas-glow transition-shadow duration-500">
        {/* Flash Overlay */}
        {showFlash && (
          <div className="absolute inset-0 bg-card z-20 animate-flash" />
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
          style={{ display: isReady ? 'block' : 'none' }}
        />

        {/* Permission Request State */}
        {needsPermission && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 backdrop-blur-sm">
            <Camera className="w-16 h-16 text-primary" />
            <p className="mt-4 text-foreground font-medium">Camera access required</p>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
              Please allow camera access to use the photobooth
            </p>
            <Button
              onClick={onRequestPermission}
              className="mt-4 btn-touch"
            >
              Allow Camera Access
            </Button>
          </div>
        )}

        {/* Loading State */}
        {!isReady && !error && !needsPermission && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 backdrop-blur-sm">
            <Camera className="w-16 h-16 text-primary animate-pulse" />
            <p className="mt-4 text-muted-foreground">Connecting to camera...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-sm p-6">
            <Camera className="w-16 h-16 text-destructive" />
            <p className="mt-4 text-center text-foreground font-medium">{error}</p>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Please check your browser settings and allow camera access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
