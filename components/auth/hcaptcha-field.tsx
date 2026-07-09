"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

interface HcaptchaFieldProps {
  onTokenChange: (token: string | null) => void;
}

export function HcaptchaField({ onTokenChange }: HcaptchaFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    let cancelled = false;

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.hcaptcha) {
        return;
      }

      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey: siteKey!,
        callback: (token: string) => onTokenChange(token),
        "expired-callback": () => onTokenChange(null),
      });
    }

    if (window.hcaptcha) {
      renderWidget();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
    script.async = true;
    script.onload = () => renderWidget();
    script.onerror = () => setLoadError("Could not load CAPTCHA. Refresh and try again.");
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.remove();
    };
  }, [onTokenChange, siteKey]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className="space-y-2" data-testid="auth-captcha">
      <div ref={containerRef} />
      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}
    </div>
  );
}

export function isAuthCaptchaEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY);
}
