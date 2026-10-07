"use client";

import { useState } from "react";
import { Catalogue } from "@/components/courses/Catalogue";
import { CourseRow } from "@/components/courses/CourseRow";
import { SubjectPath } from "@/components/courses/Path";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { MagicBox } from "@/components/magic-box/MagicBox";
import { useT } from "@/i18n";
import { PATH_SUBJECTS } from "@/lib/courses";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

export default function CoursesPage() {
  return (
    <Guard need="learner">
      <Learn />
    </Guard>
  );
}

/** Learn: ask for anything, then the path one subject at a time, then everything ready-made. */
function Learn() {
  const t = useT();
  useTitle(t("crs.title"));
  const learner = useStore(currentLearner) as Profile;
  const [now] = useState(() => Date.now());
  // "Other" only appears once the learner has a course outside the three school subjects.
  const hasOther = useStore((s) => s.courses.some((c) => c.profileId === learner.id && c.subject === "other" && c.status === "ready"));
  const drafts = useStore((s) => s.courses.filter((c) => c.profileId === learner.id && c.status === "outlining"));
  const events = useStore((s) => s.activity.filter((e) => e.profileId === learner.id));
  const subjects = PATH_SUBJECTS.filter((s) => s !== "other" || hasOther);

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("crs.title")}</h1>
        <MagicBox learner={learner} mode="course" />
      </div>

      <section aria-labelledby="path" className="space-y-8">
        <div>
          <h2 id="path" className="font-brand text-t2 font-semibold text-ink">
            {t("crs.path")}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted">{t("crs.pathBody")}</p>
        </div>
        {subjects.map((subject) => (
          <SubjectPath key={subject} subject={subject} learner={learner} now={now} />
        ))}
      </section>

      {drafts.length > 0 && (
        <section aria-labelledby="drafts" className="space-y-3">
          <h2 id="drafts" className="font-brand text-t2 font-semibold text-ink">
            {t("crs.drafts")}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-panel">
            {drafts.map((c) => (
              <CourseRow key={c.id} course={c} events={events} />
            ))}
          </ul>
        </section>
      )}

      <Catalogue learner={learner} />
    </div>
  );
}
