"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const ENABLED = process.env.NODE_ENV === "production";
const DOCKED_GAP_THRESHOLD_PX = 72;
const POLL_MS = 200;

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

function detectDockedInspector(): boolean {
  const widthGap = window.outerWidth - window.innerWidth;
  const heightGap = window.outerHeight - window.innerHeight;
  return widthGap > DOCKED_GAP_THRESHOLD_PX || heightGap > DOCKED_GAP_THRESHOLD_PX;
}

function detectConsoleInspector(): boolean {
  let open = false;

  const probe = new Image();
  Object.defineProperty(probe, "id", {
    get() {
      open = true;
      return "";
    },
    configurable: true,
  });

  const log = Function.prototype.bind.call(console.log, console);
  log(probe);

  const styled = /./;
  styled.toString = () => {
    open = true;
    return "";
  };
  console.log("%c", styled);

  console.clear();
  return open;
}

function isInspectorOpen(): boolean {
  return detectDockedInspector() || detectConsoleInspector();
}

function setPageBlocked(blocked: boolean) {
  const root = document.documentElement;
  if (blocked) {
    root.dataset.inspectorBlocked = "true";
    document.body.style.overflow = "hidden";
  } else {
    delete root.dataset.inspectorBlocked;
    document.body.style.overflow = "";
  }
}

export function ClientHardening() {
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  useLayoutEffect(() => {
    setPageBlocked(devtoolsOpen);
    return () => setPageBlocked(false);
  }, [devtoolsOpen]);

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
      setDevtoolsOpen(isInspectorOpen());
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    window.addEventListener("resize", checkDevtools);
    window.addEventListener("focus", checkDevtools);

    const interval = window.setInterval(checkDevtools, POLL_MS);
    checkDevtools();

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("resize", checkDevtools);
      window.removeEventListener("focus", checkDevtools);
      window.clearInterval(interval);
      setPageBlocked(false);
    };
  }, []);

  if (!ENABLED || !devtoolsOpen) {
    return null;
  }

  return (
    <div
      data-inspector-guard
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-background p-8 text-center"
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
