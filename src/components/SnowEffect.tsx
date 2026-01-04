import { useEffect, useRef } from 'react';

interface SnowEffectProps {
  intensity?: 'subtle' | 'medium';
}

export function SnowEffect({ intensity = 'subtle' }: SnowEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; radius: number; speed: number; opacity: number; sway: number }[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const particleCount = intensity === 'subtle' ? 50 : 100; // Lightweight particle count
      particles = [];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1, // Small flakes
          speed: Math.random() * 0.5 + 0.2, // Slow falling
          opacity: Math.random() * 0.3 + 0.1, // Low opacity
          sway: Math.random() * 0.02 - 0.01 // Gentle horizontal sway
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        // Use Christmas Gold color (approx match to --christmas-gold / accent)
        // RGB for HSL(42, 85%, 55%) is roughly 233, 166, 21
        ctx.fillStyle = `rgba(215, 168, 30, ${p.opacity})`;
        ctx.fill();

        // Update position
        p.y += p.speed;
        p.x += p.sway;

        // Reset if out of view
        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x > canvas.width) {
          p.x = 0;
        } else if (p.x < 0) {
          p.x = canvas.width;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    // Initialize
    resizeCanvas();
    createParticles();
    draw();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
