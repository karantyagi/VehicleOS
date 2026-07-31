"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Crop, RotateCcw, RotateCw, ScanLine, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  MAX_CROP_ZOOM,
  MIN_CROP_ZOOM,
  RECEIPT_CROP_HEIGHT,
  RECEIPT_CROP_WIDTH,
  buildCroppedReceiptFileName,
  normalizeQuarterTurn,
  resolveReceiptCropTransform,
  type QuarterTurn,
} from "@/lib/photo-crop";

type ReceiptPhotoEditorProps = {
  file: File;
  disabled?: boolean;
  onUseEdited: (file: File) => void;
  onUseOriginal: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

type CropOffset = { x: number; y: number };
type DragState = { pointerId: number; clientX: number; clientY: number };

export function ReceiptPhotoEditor({
  file,
  disabled = false,
  onUseEdited,
  onUseOriginal,
  onCancel,
  onError,
}: ReceiptPhotoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [rotation, setRotation] = useState<QuarterTurn>(0);
  const [zoom, setZoom] = useState(MIN_CROP_ZOOM);
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reader = new FileReader();
    const nextImage = new Image();
    nextImage.decoding = "async";
    nextImage.onload = () => {
      if (cancelled) return;
      setImage(nextImage);
      setLoadError(false);
    };
    nextImage.onerror = () => {
      if (cancelled) return;
      setImage(null);
      setLoadError(true);
    };
    reader.onload = () => {
      if (!cancelled && typeof reader.result === "string") nextImage.src = reader.result;
    };
    reader.onerror = () => {
      if (cancelled) return;
      setImage(null);
      setLoadError(true);
    };
    reader.readAsDataURL(file);

    return () => {
      cancelled = true;
      if (reader.readyState === FileReader.LOADING) reader.abort();
      reader.onload = null;
      reader.onerror = null;
      nextImage.onload = null;
      nextImage.onerror = null;
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const transform = resolveReceiptCropTransform({
      sourceWidth: image.naturalWidth,
      sourceHeight: image.naturalHeight,
      rotation,
      zoom,
      offsetX: offset.x,
      offsetY: offset.y,
    });

    context.clearRect(0, 0, RECEIPT_CROP_WIDTH, RECEIPT_CROP_HEIGHT);
    context.fillStyle = "#151716";
    context.fillRect(0, 0, RECEIPT_CROP_WIDTH, RECEIPT_CROP_HEIGHT);
    context.save();
    context.translate(
      RECEIPT_CROP_WIDTH / 2 + transform.offsetX,
      RECEIPT_CROP_HEIGHT / 2 + transform.offsetY,
    );
    context.rotate((rotation * Math.PI) / 180);
    context.scale(transform.scale, transform.scale);
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    context.restore();
  }, [image, offset.x, offset.y, rotation, zoom]);

  const clampOffset = (next: CropOffset, nextZoom = zoom, nextRotation = rotation): CropOffset => {
    if (!image) return next;
    const transform = resolveReceiptCropTransform({
      sourceWidth: image.naturalWidth,
      sourceHeight: image.naturalHeight,
      rotation: nextRotation,
      zoom: nextZoom,
      offsetX: next.x,
      offsetY: next.y,
    });
    return { x: transform.offsetX, y: transform.offsetY };
  };

  const resetEditor = () => {
    setRotation(0);
    setZoom(MIN_CROP_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  const rotate = (degrees: number) => {
    const nextRotation = normalizeQuarterTurn(rotation + degrees);
    setRotation(nextRotation);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || !image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !image) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = (event.clientX - drag.clientX) * (RECEIPT_CROP_WIDTH / rect.width);
    const deltaY = (event.clientY - drag.clientY) * (RECEIPT_CROP_HEIGHT / rect.height);
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    setOffset((current) => clampOffset({ x: current.x + deltaX, y: current.y + deltaY }));
  };

  const stopDragging = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const useCroppedPhoto = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    setIsPreparing(true);
    onError("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error("Could not prepare the cropped photo."));
          },
          "image/jpeg",
          0.9,
        );
      });
      onUseEdited(
        new File([blob], buildCroppedReceiptFileName(file.name), {
          type: "image/jpeg",
          lastModified: Date.now(),
        }),
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not prepare the cropped photo.");
      setIsPreparing(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-4" data-testid="receipt-photo-editor">
        <Alert>
          This photo format cannot be edited in this browser. You can upload the original, or take
          another photo in JPEG format.
        </Alert>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" disabled={disabled} onClick={onCancel}>
            Take another
          </Button>
          <Button type="button" disabled={disabled} onClick={onUseOriginal}>
            Use original
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-card p-4 shadow-sm" data-testid="receipt-photo-editor">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Crop className="h-4 w-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold text-foreground">Review photo</p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Drag to position the receipt. Everything inside the frame is uploaded.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Take another photo"
          disabled={disabled || isPreparing}
          onClick={onCancel}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="relative mx-auto max-h-[52vh] w-full max-w-sm overflow-hidden rounded-lg bg-neutral-950 shadow-inner aspect-[3/4]">
        <canvas
          ref={canvasRef}
          width={RECEIPT_CROP_WIDTH}
          height={RECEIPT_CROP_HEIGHT}
          className="block h-full w-full touch-none cursor-move object-contain"
          aria-label="Receipt crop preview. Drag the photo to reposition it."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        />
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-x-0 top-1/3 border-t border-white/25" />
          <div className="absolute inset-x-0 top-2/3 border-t border-white/25" />
          <div className="absolute inset-y-0 left-1/3 border-l border-white/25" />
          <div className="absolute inset-y-0 left-2/3 border-l border-white/25" />
          <div className="absolute inset-2 rounded border border-white/75 shadow-[0_0_0_999px_rgba(0,0,0,0.08)]" />
          {!image ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
              Preparing photo…
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="receipt-crop-zoom" className="text-xs font-medium text-foreground">
            Zoom
          </label>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {zoom.toFixed(1)}×
          </span>
        </div>
        <input
          id="receipt-crop-zoom"
          type="range"
          min={MIN_CROP_ZOOM}
          max={MAX_CROP_ZOOM}
          step="0.05"
          value={zoom}
          disabled={disabled || isPreparing || !image}
          className="h-2 w-full cursor-pointer accent-primary"
          onChange={(event) => {
            const nextZoom = Number(event.target.value);
            setZoom(nextZoom);
            setOffset((current) => clampOffset(current, nextZoom));
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isPreparing || !image}
          onClick={() => rotate(-90)}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Left
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isPreparing || !image}
          onClick={() => rotate(90)}
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          Right
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isPreparing || !image}
          onClick={resetEditor}
        >
          Reset
        </Button>
      </div>

      <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ScanLine className="h-3.5 w-3.5 text-primary" aria-hidden />
          Crop and rotation happen on this device before upload.
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isPreparing || !image}
          onClick={onUseOriginal}
        >
          Use original
        </Button>
        <Button
          type="button"
          disabled={disabled || isPreparing || !image}
          onClick={() => void useCroppedPhoto()}
        >
          {isPreparing ? "Preparing…" : "Use cropped photo"}
        </Button>
      </div>
    </div>
  );
}
