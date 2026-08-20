"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";

/** Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset (current state, everywhere) —
 * the widget slot exists on signup/login but is invisible and has zero effect until a real site
 * key is added. Verification itself (lib/turnstile.ts) also fails open until a secret key is
 * set, so adding just the site key without the secret key would show a widget nothing checks. */
export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;

    function render() {
      if (containerRef.current && window.turnstile && !widgetId.current) {
        widgetId.current = window.turnstile.render(containerRef.current, { sitekey: siteKey as string, callback: onVerify });
      }
    }

    if (window.turnstile) {
      render();
    } else {
      const existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        existing.addEventListener("load", render);
      } else {
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.defer = true;
        script.onload = render;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onVerify is expected to be stable per mount
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="flex justify-center" />;
}
