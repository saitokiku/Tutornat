import { supportedLocales } from './locales';

export type Locale = (typeof supportedLocales)[number]['code'];

// KAIZEN: the product is English-first, and its board tile renders upstream's
// whiteboard canvas, whose two strings would otherwise paint in Chinese on the
// server render and flip after hydration. The public flag is inlined into the
// client bundle at build time, so server and client agree on the default.
const productOn =
  process.env.NEXT_PUBLIC_TUTOR_MODE === '1' || process.env.NEXT_PUBLIC_TUTOR_MODE === 'true';
export const defaultLocale: Locale = productOn ? 'en-US' : 'zh-CN';
