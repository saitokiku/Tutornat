import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Schibsted_Grotesk } from "next/font/google";
import { LangSync } from "@/components/LangSync";
import { Announcer, Toaster } from "@/components/kit/announce";
import { BandSync } from "@/components/kit/band";
import "./globals.css";

// Only the weights in use, swapped in over next/font's metric-matched fallbacks (no invisible text, little
// reflow; don't pass `fallback`, it replaces them — system fallbacks follow in the --font-* tokens):
// the brand face is set at 600 only; body text is one variable file for 400–700; mono is 400/500/600.
// The latin subset covers Spanish (á é í ó ú ü ñ ¿ ¡) and the math signs − × ÷.
const brand = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});
const body = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});
const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "KaizenEDU", template: "%s · KaizenEDU" },
  description: "Courses built around what your child wants to learn, taught with things they can see and touch.",
  applicationName: "KaizenEDU",
  // Practice is full of numbers; phones must not turn "555 1234" into a phone link.
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fafaf9",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" className={`${brand.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <LangSync />
        <BandSync />
        {children}
        <Toaster />
        <Announcer />
      </body>
    </html>
  );
}
