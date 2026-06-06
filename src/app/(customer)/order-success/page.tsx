"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, ChefHat, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

// ─── Canvas confetti burst ────────────────────────────────────────────────────

function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const COLORS = [
      "#ff6b35", "#ff9e1b", "#ffce00", "#00c851",
      "#33b5e5", "#aa66cc", "#ff4444", "#ff69b4",
    ];

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      color: string; r: number;
      spin: number; dSpin: number;
      rect: boolean;
      alpha: number;
    };

    const cx = W * 0.5;
    const cy = H * 0.38;

    const particles: Particle[] = Array.from({ length: 130 }, () => {
      const angle = (Math.random() * Math.PI * 2);
      const speed = Math.random() * 9 + 3;
      return {
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        r: Math.random() * 5 + 3,
        spin: Math.random() * Math.PI * 2,
        dSpin: (Math.random() - 0.5) * 0.35,
        rect: Math.random() > 0.45,
        alpha: 1,
      };
    });

    let raf: number;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      let alive = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;   // gravity
        p.vx *= 0.98;  // air drag
        p.spin += p.dSpin;
        p.alpha = Math.max(0, p.alpha - 0.008);

        if (p.alpha > 0.02 && p.y < H + 40) alive = true;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.fillStyle = p.color;

        if (p.rect) {
          ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (alive) raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden="true"
    />
  );
}

// ─── Progress steps ───────────────────────────────────────────────────────────

const STEPS = [
  { icon: CheckCircle2, label: "Order received", done: true },
  { icon: ChefHat, label: "Kitchen preparing", done: false },
  { icon: UtensilsCrossed, label: "Ready for you", done: false },
] as const;

// ─── Main content ─────────────────────────────────────────────────────────────

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");

  return (
    <>
      <ConfettiBurst />

      <div className="mx-auto flex min-h-[85dvh] max-w-sm flex-col items-center justify-center px-6 py-10 text-center">
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 16, delay: 0.1 }}
          className="relative mb-6 flex h-28 w-28 items-center justify-center"
        >
          {/* Ripple rings */}
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border-2 border-emerald-400"
              initial={{ opacity: 0.7, scale: 1 }}
              animate={{ opacity: 0, scale: 2.5 }}
              transition={{
                duration: 1.4,
                delay: i * 0.3 + 0.2,
                repeat: Infinity,
                repeatDelay: 1,
                ease: "easeOut",
              }}
            />
          ))}
          {/* Circle background */}
          <div className="absolute inset-0 rounded-full bg-emerald-50 dark:bg-emerald-950" />
          <CheckCircle2
            className="relative h-16 w-16 text-emerald-500"
            strokeWidth={1.5}
          />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-extrabold tracking-tight"
        >
          Order sent! 🎉
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="mt-2 text-base text-muted-foreground"
        >
          Sit back and relax — we&apos;ll bring it right to your table.
        </motion.p>

        {/* Order ID badge */}
        {orderId && orderId !== "unknown" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.54, type: "spring" }}
            className="mt-3 rounded-full bg-muted px-4 py-1.5 text-xs font-mono font-semibold text-muted-foreground"
          >
            Order #{orderId.slice(0, 8).toUpperCase()}
          </motion.div>
        )}

        {/* Progress steps */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-10 flex w-full items-start justify-center"
        >
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const active = i === 0;
            const dim = i > 1;
            return (
              <div key={step.label} className="flex flex-1 flex-col items-center">
                {/* Connector + circle */}
                <div className="flex w-full items-center">
                  {i > 0 && (
                    <div
                      className={`h-0.5 flex-1 transition-colors ${i === 1 ? "bg-emerald-200 dark:bg-emerald-800" : "bg-muted"}`}
                    />
                  )}
                  <motion.div
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.62 + i * 0.12, type: "spring" }}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                        : dim
                        ? "border-muted bg-muted/30 text-muted-foreground/40"
                        : "border-muted bg-muted/50 text-muted-foreground/60"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.div>
                  {i < STEPS.length - 1 && <div className="h-0.5 flex-1 bg-muted" />}
                </div>
                <p
                  className={`mt-2 px-1 text-center text-xs font-medium leading-tight ${
                    active ? "text-foreground" : "text-muted-foreground/60"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </motion.div>

        {/* Estimated time hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-5 rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
        >
          ⏱ Estimated preparation: 10–20 minutes
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="mt-8 flex w-full flex-col gap-3"
        >
          <Button size="lg" className="press h-12 w-full shadow-md shadow-primary/20" asChild>
            <Link href="/menu">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Order more items
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link href="/menu">Back to menu</Link>
          </Button>
        </motion.div>
      </div>
    </>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
