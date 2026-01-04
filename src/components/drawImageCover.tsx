import { PhotoTransform } from '@/types/photo';

export const defaultTransform: PhotoTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

/**
 * Draws an image into the destination rectangle with "cover" behavior (crop to fill).
 * Supports optional transform for offset and scale.
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  transform: PhotoTransform = defaultTransform
): void {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  if (!imgW || !imgH) return;

  const { offsetX, offsetY, scale } = transform;

  // Calculate base cover dimensions
  const imgRatio = imgW / imgH;
  const targetRatio = w / h;

  let sWidth: number;
  let sHeight: number;

  if (imgRatio > targetRatio) {
    // Image is wider than target -> crop sides
    sHeight = imgH / scale;
    sWidth = sHeight * targetRatio;
  } else {
    // Image is taller than target -> crop top/bottom
    sWidth = imgW / scale;
    sHeight = sWidth / targetRatio;
  }

  // Center crop with offset
  let sx = (imgW - sWidth) / 2 - offsetX * (imgW / w);
  let sy = (imgH - sHeight) / 2 - offsetY * (imgH / h);

  // Clamp to valid ranges
  sx = Math.max(0, Math.min(imgW - sWidth, sx));
  sy = Math.max(0, Math.min(imgH - sHeight, sy));

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
  ctx.restore();
}

/**
 * Load an image from a URL and return a promise that resolves to the HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
