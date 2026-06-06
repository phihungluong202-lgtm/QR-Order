"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Forward to your error tracking service here
    // Example: Sentry.captureException(error);
    console.error("[App Error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <motion.div
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10"
      >
        <AlertTriangle className="h-10 w-10 text-destructive" strokeWidth={1.5} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h1 className="text-2xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. It has been logged and our team will look into it.
        </p>

        {/* Error digest for support reference */}
        {error.digest && (
          <p className="mx-auto mt-3 w-fit rounded-lg bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Button variant="outline" onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button asChild>
          <Link href="/menu">
            <Home className="mr-2 h-4 w-4" />
            Back to menu
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
