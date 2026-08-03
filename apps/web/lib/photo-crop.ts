export const RECEIPT_CROP_WIDTH = 1200;
export const RECEIPT_CROP_HEIGHT = 1600;
export const MIN_CROP_ZOOM = 1;
export const MAX_CROP_ZOOM = 3;

export type QuarterTurn = 0 | 90 | 180 | 270;

export type CropTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
  maxOffsetX: number;
  maxOffsetY: number;
  rotatedWidth: number;
  rotatedHeight: number;
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const normalizeQuarterTurn = (degrees: number): QuarterTurn => {
  const normalized = ((degrees % 360) + 360) % 360;
  if (normalized === 90 || normalized === 180 || normalized === 270) return normalized;
  return 0;
};

export const rotatedImageSize = (input: {
  width: number;
  height: number;
  rotation: QuarterTurn;
}): { width: number; height: number } =>
  input.rotation === 90 || input.rotation === 270
    ? { width: input.height, height: input.width }
    : { width: input.width, height: input.height };

export const resolveReceiptCropTransform = (input: {
  sourceWidth: number;
  sourceHeight: number;
  frameWidth?: number;
  frameHeight?: number;
  rotation: QuarterTurn;
  zoom: number;
  offsetX: number;
  offsetY: number;
}): CropTransform => {
  const frameWidth = input.frameWidth ?? RECEIPT_CROP_WIDTH;
  const frameHeight = input.frameHeight ?? RECEIPT_CROP_HEIGHT;
  const rotated = rotatedImageSize({
    width: Math.max(1, input.sourceWidth),
    height: Math.max(1, input.sourceHeight),
    rotation: input.rotation,
  });
  const zoom = clamp(input.zoom, MIN_CROP_ZOOM, MAX_CROP_ZOOM);
  const baseScale = Math.max(frameWidth / rotated.width, frameHeight / rotated.height);
  const scale = baseScale * zoom;
  const maxOffsetX = Math.max(0, (rotated.width * scale - frameWidth) / 2);
  const maxOffsetY = Math.max(0, (rotated.height * scale - frameHeight) / 2);

  return {
    scale,
    offsetX: maxOffsetX === 0 ? 0 : clamp(input.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: maxOffsetY === 0 ? 0 : clamp(input.offsetY, -maxOffsetY, maxOffsetY),
    maxOffsetX,
    maxOffsetY,
    rotatedWidth: rotated.width,
    rotatedHeight: rotated.height,
  };
};

export const buildCroppedReceiptFileName = (fileName: string): string => {
  const base = fileName.replace(/\.[^.]+$/, "").trim() || "receipt";
  return `${base}-cropped.jpg`;
};
