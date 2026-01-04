import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiEffectProps {
  trigger: boolean;
}

export function ConfettiEffect({ trigger }: ConfettiEffectProps) {
  useEffect(() => {
    if (trigger) {
      // First burst - center
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7EC8E3', '#BEE9F7', '#E6F9FF', '#FFFFFF', '#A8D8EA'],
      });

      // Second burst - left side
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#7EC8E3', '#BEE9F7', '#E6F9FF', '#FFFFFF'],
        });
      }, 200);

      // Third burst - right side
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#7EC8E3', '#BEE9F7', '#E6F9FF', '#FFFFFF'],
        });
      }, 400);
    }
  }, [trigger]);

  return null;
}
