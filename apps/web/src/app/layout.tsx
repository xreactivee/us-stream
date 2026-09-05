import type { Metadata, Viewport } from "next";
import { Archivo, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  variable: "--font-archivo",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "us-stream",
    template: "%s · us-stream",
  },
  description:
    "Rooms for video, audio, screen sharing, chat, a shared whiteboard and breakout rooms.",
  applicationName: "us-stream",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1016" },
  ],
  width: "device-width",
  initialScale: 1,
  // A call fills the viewport; letting the browser zoom it fights the layout.
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${bricolage.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh antialiased grain">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
