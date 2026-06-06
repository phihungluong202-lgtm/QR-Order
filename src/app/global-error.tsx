"use client";

import { useEffect } from "react";

/**
 * global-error.tsx catches errors thrown in the root layout itself.
 * It MUST include its own <html> and <body> since it replaces the root layout.
 */
interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "3rem",
              lineHeight: 1,
            }}
          >
            ⚠️
          </div>

          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
              Critical error
            </h1>
            <p style={{ marginTop: "0.5rem", color: "#6b7280", fontSize: "0.875rem" }}>
              A critical error prevented the app from loading.
            </p>
            {error.digest && (
              <code
                style={{
                  display: "block",
                  marginTop: "0.75rem",
                  padding: "0.25rem 0.75rem",
                  background: "#f3f4f6",
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                  color: "#6b7280",
                }}
              >
                {error.digest}
              </code>
            )}
          </div>

          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              background: "#e85d3a",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
