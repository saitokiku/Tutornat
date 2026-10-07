"use client";

import { useParams } from "next/navigation";
import { Guard } from "@/components/gate";
import { SchoolItem } from "@/components/school/SchoolItem";

export default function SchoolItemPage() {
  const { eventId } = useParams<{ eventId: string }>();
  return (
    <Guard need="selected">
      <SchoolItem eventId={eventId} />
    </Guard>
  );
}
