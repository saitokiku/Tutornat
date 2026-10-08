"use client";

import { useParams, useSearchParams } from "next/navigation";
import { NotFound } from "@/components/courses/NotFound";
import { Runner } from "@/components/practice/Runner";
import { TutorDrawer } from "@/components/tutor/TutorDrawer";
import { getSet } from "@/lib/practice";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

export default function PracticeSetPage() {
  const { setId } = useParams<{ setId: string }>();
  const from = useSearchParams().get("from");
  const learner = useStore(currentLearner) as Profile;
  const set = useStore((s) => getSet(s, setId, learner.id));
  if (!set)
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <NotFound />
      </main>
    );
  return (
    <TutorDrawer learner={learner} surface="practice">
      <Runner key={set.id} set={set} learner={learner} from={from} />
    </TutorDrawer>
  );
}
