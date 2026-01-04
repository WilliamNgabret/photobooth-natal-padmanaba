import { useState, useCallback, useRef } from 'react';
import { PhotoData, createEmptyPhoto } from '@/types/photo';

const TOTAL_PHOTOS = 3;

// Shutter sound as base64 (short click sound)
const SHUTTER_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7v////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

type CaptureState = 'idle' | 'countdown' | 'preview' | 'confirm';

interface UsePhotoCaptureReturn {
  photos: PhotoData[];
  currentSlot: number;
  captureState: CaptureState;
  countdown: number;
  previewPhoto: string | null;
  showFlash: boolean;
  startCapture: (slot: number, captureFunction: () => string | null) => void;
  confirmPhoto: () => void;
  retakePhoto: () => void;
  updatePhotoTransform: (index: number, transform: PhotoData['transform']) => void;
  resetPhotos: () => void;
  allPhotosCaptured: boolean;
}

export function usePhotoCapture(): UsePhotoCaptureReturn {
  const [photos, setPhotos] = useState<PhotoData[]>(
    Array(TOTAL_PHOTOS).fill(null).map(() => createEmptyPhoto())
  );
  const [currentSlot, setCurrentSlot] = useState<number>(0);
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const [countdown, setCountdown] = useState(0);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const captureFunctionRef = useRef<(() => string | null) | null>(null);

  const playShutterSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(SHUTTER_SOUND);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => { });
    } catch { }
  }, []);

  const triggerFlash = useCallback(() => {
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);
  }, []);

  const startCapture = useCallback((slot: number, captureFunction: () => string | null) => {
    setCurrentSlot(slot);
    captureFunctionRef.current = captureFunction;
    setCaptureState('countdown');

    let count = 5;
    setCountdown(count);

    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);

      if (count === 0) {
        clearInterval(countdownInterval);

        // Capture photo
        const photo = captureFunction();
        if (photo) {
          playShutterSound();
          triggerFlash();
          setPreviewPhoto(photo);
          setCaptureState('preview');

          // Show preview for 2 seconds, then show confirm/retake
          setTimeout(() => {
            setCaptureState('confirm');
          }, 2000);
        } else {
          setCaptureState('idle');
        }
      }
    }, 1000);
  }, [playShutterSound, triggerFlash]);

  const confirmPhoto = useCallback(() => {
    if (previewPhoto) {
      setPhotos(prev => {
        const newPhotos = [...prev];
        newPhotos[currentSlot] = {
          src: previewPhoto,
          transform: { offsetX: 0, offsetY: 0, scale: 1 },
        };
        return newPhotos;
      });
    }
    setPreviewPhoto(null);
    setCaptureState('idle');
  }, [previewPhoto, currentSlot]);

  const retakePhoto = useCallback(() => {
    setPreviewPhoto(null);
    if (captureFunctionRef.current) {
      startCapture(currentSlot, captureFunctionRef.current);
    }
  }, [currentSlot, startCapture]);

  const updatePhotoTransform = useCallback((index: number, transform: PhotoData['transform']) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      if (newPhotos[index]) {
        newPhotos[index] = { ...newPhotos[index], transform };
      }
      return newPhotos;
    });
  }, []);

  const resetPhotos = useCallback(() => {
    setPhotos(Array(TOTAL_PHOTOS).fill(null).map(() => createEmptyPhoto()));
    setCurrentSlot(0);
    setCaptureState('idle');
    setCountdown(0);
    setPreviewPhoto(null);
  }, []);

  const allPhotosCaptured = photos.every(p => p.src !== null);

  return {
    photos,
    currentSlot,
    captureState,
    countdown,
    previewPhoto,
    showFlash,
    startCapture,
    confirmPhoto,
    retakePhoto,
    updatePhotoTransform,
    resetPhotos,
    allPhotosCaptured,
  };
}
