"use client";

import { Guard } from "@/components/gate";
import { ReviewTool } from "./ReviewTool";

// Grown-up only: the Parent view is reached through the grown-up gate or a fresh sign-in.
export default function ReviewPage() {
  return (
    <Guard need="parent">
      <ReviewTool />
    </Guard>
  );
}
