import { LegalFrame } from "./legal";

// Public pages: no account and no saved data needed, so they prerender and open instantly.
export const instant = true;

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return <LegalFrame>{children}</LegalFrame>;
}
