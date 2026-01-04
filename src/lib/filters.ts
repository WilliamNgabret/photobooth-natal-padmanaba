export interface PhotoFilter {
  id: string;
  name: string;
  cssFilter: string;
  canvasFilter?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
}

export const PHOTO_FILTERS: PhotoFilter[] = [
  {
    id: 'original',
    name: 'Original',
    cssFilter: 'none',
  },
  {
    id: 'warm-insta',
    name: 'Warm Instagram',
    cssFilter: 'sepia(0.25) contrast(1.1) brightness(1.1) saturate(1.2)',
  },
  {
    id: 'rio',
    name: 'Rio de Janeiro',
    cssFilter: 'contrast(1.15) brightness(1.15) sepia(0.2) hue-rotate(-5deg) saturate(1.3)',
  },
  {
    id: 'bw',
    name: 'Black & White',
    cssFilter: 'grayscale(100%)',
  },
];

export function applyFilterToCanvas(
  sourceImage: HTMLImageElement,
  filter: PhotoFilter
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.width;
  canvas.height = sourceImage.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Apply CSS filter
  ctx.filter = filter.cssFilter === 'none' ? '' : filter.cssFilter;
  ctx.drawImage(sourceImage, 0, 0);

  // Apply custom canvas filter if exists
  if (filter.canvasFilter) {
    filter.canvasFilter(ctx, canvas);
  }

  return canvas;
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
