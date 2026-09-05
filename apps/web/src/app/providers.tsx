"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      // Calls happen in the dark; the light theme is the deliberate choice.
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
