"use client";

import { Guard } from "@/components/gate";
import { Draft } from "@/components/generation/Draft";

export default function DraftPage() {
  return (
    <Guard need="learner">
      <Draft />
    </Guard>
  );
}
