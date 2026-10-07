import type { Metadata } from "next";
import { TermsOfUse } from "../policies";

export const metadata: Metadata = { title: "Terms of use", description: "The rules for using KaizenEDU, in plain words. Draft, pending legal review." };

export default function TermsPage() {
  return <TermsOfUse />;
}
