// KAIZEN: `heic-convert` (already in package.json) ships no TypeScript types,
// and `lib/tutor/extract` needs it to turn an iPhone HEIC photo of homework
// into a JPEG the vision model accepts (spec R3). Same shim pattern as
// types/web-extraction-vendors.d.ts. Only the surface we call is declared.
declare module 'heic-convert' {
  interface HeicConvertOptions {
    buffer: Uint8Array;
    format: 'JPEG' | 'PNG';
    /** 0–1; only honoured for JPEG. */
    quality?: number;
  }

  export default function convert(options: HeicConvertOptions): Promise<ArrayBuffer>;
}
