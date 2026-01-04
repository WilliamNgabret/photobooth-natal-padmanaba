interface CountdownOverlayProps {
  countdown: number;
  currentPhotoIndex: number;
}

export function CountdownOverlay({ countdown, currentPhotoIndex }: CountdownOverlayProps) {
  if (countdown === 0) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-30">
      <p className="text-lg mb-4" style={{ color: "#000" }}>
        Photo {currentPhotoIndex + 1} of 3
      </p>

      <div
        key={countdown}
        className="text-[150px] font-bold animate-countdown"
        style={{
          color: "#000",
          textShadow: "0 0 40px rgba(0,0,0,0.6)",
        }}
      >
        {countdown}
      </div>

      <p className="mt-4 text-xl" style={{ color: "#000" }}>
        Get ready!
      </p>
    </div>
  );
}
