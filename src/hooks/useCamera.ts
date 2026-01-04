import { useState, useEffect, useRef, useCallback } from 'react';

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  devices: CameraDevice[];
  selectedDevice: string;
  setSelectedDevice: (deviceId: string) => void;
  isReady: boolean;
  error: string | null;
  capturePhoto: () => string | null;
  requestPermission: () => Promise<void>;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get list of video devices
  const getDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
        }));

      setDevices(videoDevices);

      // Auto-select first camera if none selected
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting devices:', err);
    }
  }, [selectedDevice]);

  // Request camera permission
  const requestPermission = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      // Now get the device list with labels
      await getDevices();
    } catch (err) {
      console.error('Permission error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access to use the photobooth.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      }
    }
  }, [getDevices]);

  // Start camera stream
  const startCamera = useCallback(async (deviceId: string) => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setIsReady(false);
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user',
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsReady(true);
      }

      // Refresh device list after getting permission
      await getDevices();
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access to use the photobooth.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      }
    }
  }, [getDevices]);

  // Capture photo from video
  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !isReady) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Mirror the image for selfie-style
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.95);
  }, [isReady]);

  // Initialize - try to get permission immediately to populate device list with labels
  useEffect(() => {
    // Check if we already have permission by looking at labels
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const hasLabels = devices.some(d => d.kind === 'videoinput' && d.label);
      if (hasLabels) {
        getDevices();
      } else {
        // If no labels, we likely need permission. accessing getUserMedia triggers prompt.
        requestPermission();
      }
    });
  }, [getDevices, requestPermission]);

  // Start camera when device is selected
  useEffect(() => {
    if (selectedDevice) {
      startCamera(selectedDevice);
    }
  }, [selectedDevice, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    devices,
    selectedDevice,
    setSelectedDevice,
    isReady,
    error,
    capturePhoto,
    requestPermission,
  };
}
