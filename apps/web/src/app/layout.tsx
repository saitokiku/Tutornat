import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Schibsted_Grotesk } from "next/font/google";
import { LangSync } from "@/components/LangSync";
import "./globals.css";

const brand = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"] });
const body = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "KaizenEDU", template: "%s · KaizenEDU" },
  description: "Courses built around what your child wants to learn, taught with things they can see and touch.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${brand.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <LangSync />
        {children}
      </body>
    </html>
  );
}
