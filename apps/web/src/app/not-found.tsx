import type { Metadata } from "next";
import { NotFoundBody } from "@/components/kit/not-found";
import en from "@/i18n/en";

// English on the server; the body retitles the tab in the family's language once the store is read.
export const metadata: Metadata = { title: en["ds.notFound.docTitle"] };

export default function NotFound() {
  return <NotFoundBody />;
}
