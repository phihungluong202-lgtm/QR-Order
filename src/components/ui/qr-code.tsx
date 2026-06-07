"use client";

import { useCallback } from "react";
import QRCodeSVG from "react-qr-code";
import { cn } from "@/lib/utils";

export type QrEcc = "L" | "M" | "Q" | "H";

export interface QrCodeProps {
  value: string;
  ecc?: QrEcc;
  size?: number;
  dark?: string;
  light?: string;
  className?: string;
}

/**
 * Renders a QR code as SVG using react-qr-code (battle-tested, no canvas issues).
 */
export function QrCode({
  value,
  ecc = "M",
  size = 200,
  dark = "#000000",
  light = "#ffffff",
  className,
}: QrCodeProps) {
  return (
    <div
      className={cn("flex items-center justify-center bg-white", className)}
      style={{ width: size, height: size, padding: Math.round(size * 0.05) }}
    >
      <QRCodeSVG
        value={value}
        size={size - Math.round(size * 0.1)}
        level={ecc}
        fgColor={dark}
        bgColor={light}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}

// ─── Download helper ──────────────────────────────────────────────────────────

/**
 * Returns a function that downloads the QR code as PNG.
 * Renders to an off-screen canvas at 4× resolution for sharp output.
 */
export function useQrDownload(value: string, _ecc: QrEcc = "M") {
  const download = useCallback(
    async (filename = "qr-code.png") => {
      try {
        const { toCanvas } = await import("qrcode");
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 1200;
        await toCanvas(canvas, value, {
          width: 1200,
          margin: 4,
          errorCorrectionLevel: "H",
          color: { dark: "#000000", light: "#ffffff" },
        });
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (e) {
        console.error("QR download failed", e);
      }
    },
    [value],
  );
  return download;
}

// ─── SVG variant ──────────────────────────────────────────────────────────────

export interface QrSvgOptions {
  dark?: string;
  light?: string;
  margin?: number;
  moduleSize?: number;
}

export interface QrSvgProps extends QrSvgOptions {
  value: string;
  ecc?: QrEcc;
  className?: string;
}

export function QrSvg({ value, ecc = "M", className, dark = "#000", light = "#fff" }: QrSvgProps) {
  return (
    <div className={className}>
      <QRCodeSVG value={value} level={ecc} fgColor={dark} bgColor={light} />
    </div>
  );
}
