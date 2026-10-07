import type { Metadata } from "next";
import { RetentionPolicy } from "../policies";

export const metadata: Metadata = { title: "Data retention", description: "How long KaizenEDU keeps each kind of data, today and once accounts move to its server. Draft, pending legal review." };

export default function RetentionPage() {
  return <RetentionPolicy />;
}
