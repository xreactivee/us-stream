"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Minimal typing for the Document Picture-in-Picture API.
 *
 * It is Chromium-only and not in the DOM lib yet, so it is declared here rather
 * than reached for through `any`. Everything that uses it is behind a feature
 * check, never a browser check.
 */
interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

/** Copies the page's styles into the new window; it starts with none of its own. */
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
      // A cross-origin stylesheet cannot be read; link to it instead.
      if (sheet.href) {
        const link = target.document.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        target.document.head.append(link);
      }
    }
  }

  // The theme lives on the root element, so the window needs the same class.
  target.document.documentElement.className = document.documentElement.className;
  target.document.body.className = document.body.className;
}

/**
 * Keeps the call visible in a small always-on-top window while the person is
 * looking at something else.
 *
 * `supported` is false everywhere the API is missing, and the button that uses
 * this hook is not rendered at all in that case — an offer the browser cannot
 * honour is worse than no offer.
 */
export function useDocumentPip() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [supported, setSupported] = useState(false);

  // Checked after mount: the server has no window to ask.
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
      // The request needs a user gesture and can be refused; staying put is
      // the right outcome.
      setPipWindow(null);
    }
  }, []);

  const close = useCallback(() => {
    pipWindow?.close();
    setPipWindow(null);
  }, [pipWindow]);

  // A page navigating away with the window still open leaves it orphaned.
  useEffect(() => {
    return () => pipWindow?.close();
  }, [pipWindow]);

  return { supported, pipWindow, open, close };
}
