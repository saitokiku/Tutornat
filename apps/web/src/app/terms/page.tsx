import type { Metadata } from "next";
import { Legal } from "@/components/landing/Legal";
import en from "@/i18n/en";

export const instant = true;

export const metadata: Metadata = {
  title: en["land.terms.title"],
  description: en["land.terms.intro"],
};

export default function Page() {
  return <Legal kind="terms" />;
}
