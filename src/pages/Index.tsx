import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/hooks/useCamera';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import { useOverlayDetection } from '@/hooks/useOverlayDetection';
import { CameraFeed } from '@/components/CameraFeed';
import { CountdownOverlay } from '@/components/CountdownOverlay';
import { PhotoGrid } from '@/components/PhotoGrid';
import { ShutterButton } from '@/components/ShutterButton';
import { ConfirmRetakeDialog } from '@/components/ConfirmRetakeDialog';
import { FiltersPage } from '@/components/FiltersPage';
import { LayoutGenerator } from '@/components/LayoutGenerator';
import { ConfettiEffect } from '@/components/ConfettiEffect';
import { ThemeToggle } from '@/components/ThemeToggle';
import { exportToPDF } from '@/components/PDFExporter';
import { Sparkles, ArrowRight, Settings, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SnowEffect } from '@/components/SnowEffect';
import { api } from '@/lib/api';

type AppScreen = 'camera' | 'filters' | 'layout';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('camera');
  const [selectedFilter, setSelectedFilter] = useState('original');
  const [showConfetti, setShowConfetti] = useState(false);
  const camera = useCamera();
  const capture = usePhotoCapture();
  const overlayDetection = useOverlayDetection();

  // Find the next empty slot
  const nextEmptySlot = useMemo(() => {
    return capture.photos.findIndex(p => p.src === null);
  }, [capture.photos]);

  // Handle slot click - same countdown flow for both new and retake
  const handleSlotClick = useCallback((index: number) => {
    if (capture.captureState !== 'idle') return;
    // Always use the full countdown capture flow
    capture.startCapture(index, camera.capturePhoto);
  }, [capture, camera.capturePhoto]);

  const handleShutterClick = useCallback(() => {
    if (capture.captureState !== 'idle') return;
    const slot = nextEmptySlot >= 0 ? nextEmptySlot : 0;
    capture.startCapture(slot, camera.capturePhoto);
  }, [capture, camera.capturePhoto, nextEmptySlot]);

  const handleProceedToFilters = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      setCurrentScreen('filters');
    }, 1500);
  }, []);

  const handleRetake = useCallback(() => {
    capture.resetPhotos();
    setCurrentScreen('camera');
  }, [capture]);

  // Keyboard shortcuts (Spacebar to capture)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if in camera mode and idle
      if (e.code === 'Space' && currentScreen === 'camera' && capture.captureState === 'idle') {
        e.preventDefault(); // Prevent scrolling
        handleShutterClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen, capture.captureState, handleShutterClick]);

  const handleDownloadPDF = useCallback((canvas: HTMLCanvasElement) => {
    exportToPDF(canvas);
  }, []);

  // Background Sync
  useEffect(() => {
    // Initial Sync
    api.syncPendingPhotos();

    // Periodic Sync
    const interval = setInterval(() => {
      api.syncPendingPhotos();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const capturedCount = capture.photos.filter(p => p.src !== null).length;
  const isCountingDown = capture.captureState === 'countdown';
  const showingPreview = capture.captureState === 'preview';
  const showingConfirm = capture.captureState === 'confirm' && capture.previewPhoto;

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden christmas-gradient transition-colors duration-1000">
      {/* Subtle Falling Snow - Paused during capture for focus */}
      {!isCountingDown && !showingConfirm && <SnowEffect intensity="subtle" />}

      {/* Subtle Christmas Background Glow - Enhanced */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-gentle-float" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-gentle-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Confetti Effect */}
      <ConfettiEffect trigger={showConfetti} />

      {/* Header */}
      <header className="relative z-10 py-6 text-center">
        <div className="flex items-center justify-between px-4 max-w-3xl mx-auto">
          <div className="w-10" /> {/* Spacer */}
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              {/* Elegant Star Accent */}
              <Star className="absolute -top-3 -right-4 w-4 h-4 text-accent animate-pulse" fill="currentColor" />
              <img
                src="/assets/ChristmasLogoPadma.png"
                alt="Christmas Photobooth"
                className="h-16 md:h-20 w-auto drop-shadow-md"
              />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2 font-serif">
              <span className="text-primary">Christmas</span> <span className="text-foreground">Photobooth</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/manage">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center px-4 pb-8">
        {currentScreen === 'camera' && (
          <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-2 p-2 items-center justify-center min-h-[calc(100vh-100px)]">
            {/* Left Column: Camera Feed */}
            <div className="w-full lg:flex-[2] relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 bg-black/40 backdrop-blur-sm self-stretch flex items-center">
              <CameraFeed
                videoRef={camera.videoRef}
                devices={camera.devices}
                selectedDevice={camera.selectedDevice}
                onDeviceChange={camera.setSelectedDevice}
                isReady={camera.isReady}
                error={camera.error}
                showFlash={capture.showFlash}
                onRequestPermission={camera.requestPermission}
              />

              {/* Countdown Overlay - Positioned over camera */}
              {isCountingDown && (
                <CountdownOverlay
                  countdown={capture.countdown}
                  currentPhotoIndex={capture.currentSlot}
                />
              )}

              {/* Preview Overlay */}
              {showingPreview && capture.previewPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
                  <div className="text-center">
                    <img
                      src={capture.previewPhoto}
                      alt="Preview"
                      className="max-w-[80%] max-h-[80%] rounded-xl border-4 border-primary shadow-2xl mx-auto object-contain"
                    />
                    <p className="mt-4 text-white text-lg font-medium animate-pulse">Reviewing photo...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Grid & Controls */}
            <div className="w-full lg:flex-1 lg:max-w-[180px] flex flex-col gap-4 self-stretch">
              <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-xl flex flex-col justify-between">
                {/* Photo Grid */}
                <div className="flex-1 flex flex-col justify-center">
                  <PhotoGrid
                    photos={capture.photos}
                    onSlotClick={handleSlotClick}
                    disabled={capture.captureState !== 'idle'}
                  />
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center justify-end gap-3 mt-4 pt-4 border-t border-white/10">
                  {camera.isReady && capture.captureState === 'idle' && (
                    <>
                      {!capture.allPhotosCaptured && (
                        <>
                          <div className="transform hover:scale-105 transition-transform">
                            <ShutterButton
                              onClick={handleShutterClick}
                              slotNumber={nextEmptySlot >= 0 ? nextEmptySlot + 1 : undefined}
                            />
                          </div>
                          <p className="text-center text-muted-foreground text-xs font-medium">
                            {capturedCount}/3 captured
                          </p>
                        </>
                      )}

                      {capture.allPhotosCaptured && (
                        <div className="w-full animate-fade-in">
                          <Button
                            size="lg"
                            onClick={handleProceedToFilters}
                            className="w-full gap-2 text-sm font-bold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all btn-touch animate-scale-in bg-gradient-to-r from-green-600 to-emerald-600 border border-white/20"
                          >
                            Next Step
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Instructions */}
                  {capture.captureState === 'idle' && !capture.allPhotosCaptured && (
                    <p className="text-center text-muted-foreground/[0.7] text-[10px] uppercase tracking-wider">
                      Tap shutter or slot
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentScreen === 'filters' && (
          <FiltersPage
            photos={capture.photos}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            onNext={() => setCurrentScreen('layout')}
            onRetake={handleRetake}
          />
        )}

        {currentScreen === 'layout' && (
          <LayoutGenerator
            photos={capture.photos}
            selectedFilter={selectedFilter}
            overlays={overlayDetection.overlays}
            selectedOverlay={overlayDetection.selectedOverlay}
            onOverlayChange={overlayDetection.setSelectedOverlay}
            hasMultipleOverlays={overlayDetection.hasMultipleOverlays}
            onBack={() => setCurrentScreen('filters')}
            onDownloadPDF={handleDownloadPDF}
            onUpdateTransform={capture.updatePhotoTransform}
          />
        )}
      </main>

      {/* Confirm/Retake Dialog */}
      {showingConfirm && (
        <ConfirmRetakeDialog
          photoSrc={capture.previewPhoto!}
          onConfirm={capture.confirmPhoto}
          onRetake={capture.retakePhoto}
        />
      )}
    </div>
  );
};

export default Index;
