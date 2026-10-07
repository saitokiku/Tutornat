import type { Metadata } from "next";
import { PrivacyPolicy } from "../policies";

export const metadata: Metadata = { title: "Privacy", description: "What KaizenEDU keeps, where, who else sees it, and what you can do about it. Draft, pending legal review." };

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
