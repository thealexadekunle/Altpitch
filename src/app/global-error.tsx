"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
            {/* Inline hex, not a theme token, deliberately (AUDIT_REPORT.md K2-1 considered and
                exempted this file): this boundary replaces the entire <html>, including root
                layout, so it can't assume globals.css loaded — the crash it's catching may be
                exactly why it didn't. */}
            <p style={{ color: "#888" }}>The error has been reported. Try refreshing the page.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
