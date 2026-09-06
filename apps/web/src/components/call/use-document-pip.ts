"use client";

import { useCallback, useEffect, useState } from "react";

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

function cloneStyles(target: Window) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join("");
      const style = target.document.createElement("style");
      style.textContent = rules;
      target.document.head.append(style);
    } catch {
      if (sheet.href) {
        const link = target.document.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        target.document.head.append(link);
      }
    }
  }

  target.document.documentElement.className = document.documentElement.className;
  target.document.body.className = document.body.className;
}

export function useDocumentPip() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "documentPictureInPicture" in window);
  }, []);

  const open = useCallback(async () => {
    if (!window.documentPictureInPicture) {
      return;
    }

    try {
      const opened = await window.documentPictureInPicture.requestWindow({
        width: 420,
        height: 260,
      });

      cloneStyles(opened);
      opened.addEventListener("pagehide", () => setPipWindow(null));
      setPipWindow(opened);
    } catch {
      setPipWindow(null);
    }
  }, []);

  const close = useCallback(() => {
    pipWindow?.close();
    setPipWindow(null);
  }, [pipWindow]);

  useEffect(() => {
    return () => pipWindow?.close();
  }, [pipWindow]);

  return { supported, pipWindow, open, close };
}
