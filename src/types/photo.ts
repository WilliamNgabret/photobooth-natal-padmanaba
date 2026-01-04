export interface PhotoTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface PhotoData {
  src: string | null;
  transform: PhotoTransform;
}

export const defaultTransform: PhotoTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

export const createEmptyPhoto = (): PhotoData => ({
  src: null,
  transform: { ...defaultTransform },
});

export interface TemplatePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateConfig {
  name: string;
  width: number;
  height: number;
  overlayImage?: string;
  placements: TemplatePlacement[];
  header?: {
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
  };
  footer?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
