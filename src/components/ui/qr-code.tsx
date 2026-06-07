"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { generateQr, qrToSvg, downloadQrPng, type QrEcc, type QrSvgOptions } from "@/lib/qr-generator";
import { cn } from "@/lib/utils";

export interface QrCodeProps {
  /** The URL or text to encode */
  value: string;
  /** Error correction level (default "M") */
  ecc?: QrEcc;
  /** Size in pixels for the rendered element (default 200) */
  size?: number;
  /** Quiet-zone margin in modules (default 4) */
  margin?: number;
  /** Dark module color */
  dark?: string;
  /** Light module color */
  light?: string;
  className?: string;
  /** Called after the QR renders (passes canvas element) */
  onRender?: (canvas: HTMLCanvasElement) => void;
}

/**
 * Renders a QR code as a <canvas> element using our pure-TS generator.
 * Supports programmatic PNG download via the `downloadPng` helper.
 */
export function QrCode({
  value,
  ecc = "M",
  size = 200,
  margin = 4,
  dark = "#000000",
  light = "#ffffff",
  className,
  onRender,
}: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const matrix = useMemo(() => {
    try {
      return generateQr(value, ecc);
    } catch {
      return null;
    }
  }, [value, ecc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matrix) return;

    const n = matrix.length;
    // margin is in QR modules (not pixels); compute pixel size from total modules
    const totalModules = n + margin * 2;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const moduleSize = size / totalModules;

    // Physical pixel resolution (sharp on Retina)
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = dark;

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(
            (c + margin) * moduleSize,
            (r + margin) * moduleSize,
            moduleSize,
            moduleSize,
          );
        }
      }
    }

    onRender?.(canvas);
  }, [matrix, size, margin, dark, light, onRender]);

  if (!matrix) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground text-xs rounded",
          className,
        )}
        style={{ width: size, height: size }}
      >
        QR error
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn("rounded", className)}
      style={{ width: size, height: size }}
    />
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns a `download` function that saves the QR code as PNG.
 * Use with a ref on QrCode's onRender callback.
 */
export function useQrDownload(value: string, ecc: QrEcc = "M") {
  const download = useCallback(
    (filename?: string) => {
      try {
        const matrix = generateQr(value, ecc);
        downloadQrPng(matrix, filename ?? "qr-code.png");
      } catch (e) {
        console.error("QR download failed", e);
      }
    },
    [value, ecc],
  );

  return download;
}

// ─── SVG variant (for print / server rendering) ───────────────────────────────

export interface QrSvgProps extends QrSvgOptions {
  value: string;
  ecc?: QrEcc;
  className?: string;
}

/**
 * Renders the QR code as an inline <svg> element — ideal for server components and print.
 */
export function QrSvg({ value, ecc = "M", className, ...opts }: QrSvgProps) {
  const svgString = useMemo(() => {
    try {
      const matrix = generateQr(value, ecc);
      return qrToSvg(matrix, opts);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ecc, opts.dark, opts.light, opts.margin, opts.moduleSize]);

  if (!svgString) return null;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}
