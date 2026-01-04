import { useState, useEffect } from 'react';

const OVERLAY_PATTERNS = [
  'main-a6-overlay.png',
  'second-a6-overlay.png',
  // 'third-a6-overlay.png',
  // 'fourth-a6-overlay.png',
  // 'fifth-a6-overlay.png',
];

const TEMPLATES_PATH = '/templates/';

interface OverlayInfo {
  name: string;
  path: string;
}

export function useOverlayDetection() {
  const [overlays, setOverlays] = useState<OverlayInfo[]>([]);
  const [selectedOverlay, setSelectedOverlay] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    detectOverlays();
  }, []);

  const detectOverlays = async () => {
    setIsLoading(true);
    const detectedOverlays: OverlayInfo[] = [];

    // Check each potential overlay file
    for (const filename of OVERLAY_PATTERNS) {
      const path = `${TEMPLATES_PATH}${filename}`;
      try {
        const response = await fetch(path, { method: 'HEAD' });
        if (response.ok) {
          detectedOverlays.push({
            name: filename.replace('-a6-overlay.png', '').replace('-', ' '),
            path: path,
          });
        }
      } catch {
        // File doesn't exist, skip
      }
    }

    // If no overlays found, try the default
    if (detectedOverlays.length === 0) {
      try {
        const defaultPath = `${TEMPLATES_PATH}default-a6-overlay.png`;
        const response = await fetch(defaultPath, { method: 'HEAD' });
        if (response.ok) {
          detectedOverlays.push({
            name: 'default',
            path: defaultPath,
          });
        }
      } catch {
        // No overlays available
      }
    }

    setOverlays(detectedOverlays);
    
    // Auto-select first overlay
    if (detectedOverlays.length > 0) {
      setSelectedOverlay(detectedOverlays[0].path);
    }
    
    setIsLoading(false);
  };

  return {
    overlays,
    selectedOverlay,
    setSelectedOverlay,
    isLoading,
    hasMultipleOverlays: overlays.length > 1,
  };
}
