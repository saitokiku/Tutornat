import './globals.css';
import { Schibsted_Grotesk, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';

// One type system (spec: 2026-08-22-one-system-rebuild). Schibsted Grotesk carries
// every display moment, Instrument Sans carries every sentence, IBM Plex Mono carries
// every time, price, and percentage — the things the record actually asserts, set in
// the one face that lines its digits up.
//
// The legacy --font-display/--font-sans/--font-mono aliases stay mapped in
// tailwind.config.js so no surface can silently re-font mid-migration.
const brand = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-brand',
  weight: ['400', '500', '600', '700', '800'],
});

const body = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const opmono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-opmono',
  weight: ['400', '500', '600'],
});

export const metadata = {
  title: 'Kaizen: real tutors on a schedule, an AI companion in every gap',
  description: 'Real tutors on a weekly schedule and an AI study companion that never does the work for them. For students 13 and up; free to start, with daily limits.',
};

// No maximumScale: pinch-zoom is an accessibility right, and the layout is fluid
// enough that it never needed the lock.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAFAF9',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${brand.variable} ${body.variable} ${opmono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
