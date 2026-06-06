/**
 * Structured logger — thin wrapper around console that can be wired to
 * any error-tracking service (Sentry, Axiom, Datadog, etc.) in production.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("Order placed", { orderId, tableId });
 *   logger.error("Payment failed", error, { userId });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

// ─── Transport ────────────────────────────────────────────────────────────────

function emit(entry: LogEntry): void {
  const { level, message, context, error } = entry;

  if (process.env.NODE_ENV === "development") {
    // Pretty output during local development
    const prefix = `[${level.toUpperCase()}]`;
    if (level === "error") {
      console.error(prefix, message, ...(error ? [error] : []), context ?? "");
    } else if (level === "warn") {
      console.warn(prefix, message, context ?? "");
    } else {
      console.log(prefix, message, context ?? "");
    }
    return;
  }

  // Production: structured JSON (visible in Vercel / server logs)
  const payload = {
    level,
    message,
    timestamp: entry.timestamp,
    ...(context && { context }),
    ...(error && { error: { message: error.message, stack: error.stack, name: error.name } }),
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    // ── Sentry integration (uncomment after installing @sentry/nextjs) ──────
    // if (typeof window !== "undefined") {
    //   import("@sentry/nextjs").then(({ captureException }) => {
    //     captureException(error ?? new Error(message), { extra: context });
    //   });
    // }
  } else if (level === "warn") {
    console.warn(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "production") return; // strip debug in prod
    emit({ level: "debug", message, timestamp: new Date().toISOString(), context });
  },

  info(message: string, context?: Record<string, unknown>): void {
    emit({ level: "info", message, timestamp: new Date().toISOString(), context });
  },

  warn(message: string, context?: Record<string, unknown>): void {
    emit({ level: "warn", message, timestamp: new Date().toISOString(), context });
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const err =
      error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    emit({ level: "error", message, timestamp: new Date().toISOString(), context, error: err });
  },
};

// ─── Helper: safe async wrapper ───────────────────────────────────────────────

/**
 * Wraps an async function; catches and logs any unhandled rejection.
 *
 * @example
 *   export const GET = safeRoute(async (req) => { ... });
 */
export function safeRoute<T extends (...args: never[]) => Promise<Response>>(
  handler: T,
  routeName?: string,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (err) {
      logger.error(`Unhandled error in ${routeName ?? "route"}`, err);
      const { NextResponse } = await import("next/server");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  }) as T;
}
