import type { Metadata } from "next";
import { landingData } from "@/components/landing/data";
import { Landing } from "@/components/landing/Landing";
import en from "@/i18n/en";

export const instant = true;

// Static shell: the hero problems, skill map and catalogue titles are computed here from the engine, so
// the browser gets plain data and the answer checker, not the generators or lesson bodies.
export const metadata: Metadata = {
  title: { absolute: en["land.meta.title"] },
  description: en["land.meta.description"],
};

export default function Page() {
  return <Landing data={landingData()} />;
}
