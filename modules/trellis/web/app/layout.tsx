import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "KaizenEdu",
  description: "Homework help that keeps an honest record. Trellis tutors; the record tells the truth.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2f6b3f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <header className="topbar">
            <Link href="/" className="wordmark">Kaizen<span>Edu</span></Link>
            <nav className="nav">
              <Link href="/learn">Learn</Link>
              <Link href="/parent">Parent</Link>
            </nav>
          </header>
          {children}
          <p className="footer">Synthetic content and names. Practice with help counts as progress, never as mastery. Nothing here certifies that no one else helped.</p>
        </div>
      </body>
    </html>
  );
}
