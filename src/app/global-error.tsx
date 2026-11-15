"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f4fa",
          color: "#2e3338",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#B91C1C",
            }}
          >
            Something went wrong
          </p>
          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "32px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            The store could not start
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: "14px",
              lineHeight: 1.7,
              color: "#5c5e66",
            }}
          >
            Reload the page to try again. If it keeps happening, email
            support@genericpcs.com and we will sort it out.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "28px",
              height: "44px",
              padding: "0 20px",
              borderRadius: "12px",
              border: 0,
              background: "#5865F2",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload the store
          </button>
        </div>
      </body>
    </html>
  );
}
