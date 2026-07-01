"use client";

import { useEffect, useState } from "react";

const ENABLED = process.env.NODE_ENV === "production";

function shouldBlockShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase();

  if (key === "f12") {
    return true;
  }

  const mod = event.ctrlKey || event.metaKey;
  if (!mod) {
    return false;
  }

  if (event.shiftKey && ["i", "j", "c", "k"].includes(key)) {
    return true;
  }

  if (key === "u") {
    return true;
  }

  if (event.metaKey && event.altKey && ["i", "j", "c"].includes(key)) {
    return true;
  }

  return false;
}

function isDevToolsLikelyOpen() {
  const widthGap = window.outerWidth - window.innerWidth;
  const heightGap = window.outerHeight - window.innerHeight;
  return widthGap > 160 || heightGap > 160;
}

export function ClientHardening() {
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  useEffect(() => {
    if (!ENABLED) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldBlockShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const onDragStart = (event: DragEvent) => {
      if (event.target instanceof HTMLImageElement) {
        event.preventDefault();
      }
    };

    const checkDevtools = () => {
      setDevtoolsOpen(isDevToolsLikelyOpen());
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    window.addEventListener("resize", checkDevtools);

    const interval = window.setInterval(checkDevtools, 500);
    checkDevtools();

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("resize", checkDevtools);
      window.clearInterval(interval);
    };
  }, []);

  if (!ENABLED || !devtoolsOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-background/95 p-8 text-center backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label="Developer tools are not permitted"
    >
      <div className="max-w-md space-y-3 rounded-xl border bg-card p-6 shadow-lg">
        <p className="text-lg font-semibold">Developer tools are not allowed</p>
        <p className="text-sm text-muted-foreground">
          Close the browser inspector to continue. This protects application
          data and intellectual property.
        </p>
      </div>
    </div>
  );
}
