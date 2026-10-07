"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconArrowRight, IconCheckCircle, IconLayers } from "@/components/icons";
import { checkOpen, STATUS_DOT, statusLine } from "@/components/practice/status";
import { Badge, Button, SubjectDot } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import { gradeIndex, skillsFor } from "@/practice/skills";
import { nextSkillFor, settingsOf, startOf, startSet, statusesOf } from "@/lib/practice";
import { currentLearner } from "@/lib/profiles";
import { read, useStore } from "@/lib/store";
import type { Grade, Profile, Subject } from "@/lib/types";
import type { Skill } from "@/practice/types";

export default function PracticePage() {
  return (
    <Guard need="learner">
      <Practice />
    </Guard>
  );
}

const SUBJECTS: Subject[] = ["math", "english", "science"];

function Practice() {
  const t = useT();
  useTitle(t("practice.title"));
  const router = useRouter();
  const params = useSearchParams();
  const learner = useStore(currentLearner) as Profile;
  const settings = settingsOf(learner);
  const [now] = useState(() => Date.now());
  const again = params.get("again");
  const [subject, setSubject] = useState<Subject>(() => {
    const fromParam = params.get("subject") as Subject | null;
    if (fromParam && SUBJECTS.includes(fromParam)) return fromParam;
    return settings.subjects.find((s) => SUBJECTS.includes(s)) ?? "math";
  });
  const statuses = useStore((s) => statusesOf(s, learner.id, now));
  const next = useStore((s) => nextSkillFor(s, learner, subject, now));
  const [query, setQuery] = useState("");
  const skills = skillsFor(subject);
  const locale = learner.locale;

  const go = (kind: "pick" | "check" | "placement", skillId: string) => {
    const id = startSet(read(), { profile: learner, kind, skillIds: [skillId], now });
    if (id) router.push(`/practice/${id}`);
  };

  const open = skills.filter((s) => checkOpen(statuses[s.id], now));
  const nextSkill = skills.find((s) => s.id === (again ?? next));
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return skillsFor(subject)
      .concat(SUBJECTS.filter((x) => x !== subject).flatMap(skillsFor))
      .filter((s) => s.title.en.toLowerCase().includes(q) || s.title.es.toLowerCase().includes(q) || s.standard?.toLowerCase().includes(q) || s.id.includes(q))
      .slice(0, 8);
  }, [query, subject]);

  const byGrade = new Map<Grade, Skill[]>();
  for (const s of skills) byGrade.set(s.grade, [...(byGrade.get(s.grade) ?? []), s]);
  const near = (g: Grade) => Math.abs(gradeIndex(g) - gradeIndex(learner.grade === "adult" ? "6" : learner.grade)) <= 1;

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("practice.title")}</h1>
        <div role="tablist" aria-label={t("practice.subjects")} className="inline-flex rounded-full border border-border bg-panel2 p-1">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={subject === s}
              onClick={() => setSubject(s)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted transition-colors aria-selected:bg-panel aria-selected:text-ink aria-selected:shadow-soft"
            >
              <SubjectDot subject={s} /> {t(`subject.${s}`)}
            </button>
          ))}
        </div>
      </header>

      {open.length > 0 && (
        <section aria-labelledby="checks" className="space-y-3">
          <h2 id="checks" className="font-brand text-t2 font-semibold text-ink">
            {t("practice.checksReady")}
          </h2>
          <p className="text-sm text-muted">{t("practice.checksWhy")}</p>
          <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
            {open.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                <IconCheckCircle size={18} className="text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{s.title[locale]}</span>
                  <span className="block text-xs text-muted">{statusLine(statuses[s.id], now, locale)}</span>
                </span>
                <Button size="sm" onClick={() => go("check", s.id)}>
                  {t("practice.startCheck")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {nextSkill && (
        <section aria-labelledby="up-next" className="rounded-lg border border-border bg-panel p-5 shadow-lift sm:p-7">
          <h2 id="up-next" className="text-sm font-medium text-muted">
            {again ? t("practice.again") : t("practice.upNext")}
          </h2>
          <p className="mt-1 font-brand text-t1 font-semibold text-ink">{nextSkill.title[locale]}</p>
          <p className="mt-1.5 text-sm text-muted">
            {statusLine(statuses[nextSkill.id], now, locale)} · <span className="font-opmono">{gradeLabel(locale, nextSkill.grade)}</span>
            {nextSkill.standard && <span className="font-opmono"> · {nextSkill.standard}</span>}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={() => go("pick", nextSkill.id)}>
              {t("practice.start")} <IconArrowRight size={16} />
            </Button>
            <span className="text-xs text-muted">{t("practice.setSize", { n: ["K", "1", "2"].includes(learner.grade) ? 6 : 10 })}</span>
          </div>
        </section>
      )}

      <section aria-labelledby="anything" className="space-y-3">
        <h2 id="anything" className="font-brand text-t2 font-semibold text-ink">
          {t("practice.anything")}
        </h2>
        <label htmlFor="skill-search" className="sr-only">
          {t("practice.searchLabel")}
        </label>
        <input
          id="skill-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("practice.searchPlaceholder")}
          className="k-input"
        />
        {query.trim().length >= 2 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-panel" aria-live="polite">
            {matches.length === 0 && <li className="px-4 py-3.5 text-sm text-muted">{t("practice.noMatch")}</li>}
            {matches.map((s) => (
              <SkillRow key={s.id} skill={s} status={statusLine(statuses[s.id], now, locale)} dot={STATUS_DOT[statuses[s.id]?.state ?? "new"]} locale={locale} onPractice={() => go("pick", s.id)} />
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">
          {t("practice.placementPrompt")}{" "}
          <button type="button" onClick={() => go("placement", startOf(learner, subject) ?? skills[0].id)} className="font-medium text-ink underline underline-offset-4 hover:text-accent">
            {t("practice.placementLink")}
          </button>
        </p>
      </section>

      <section aria-labelledby="map" className="space-y-4">
        <div className="flex items-center gap-2">
          <IconLayers size={18} className="text-muted" />
          <h2 id="map" className="font-brand text-t2 font-semibold text-ink">
            {t("practice.map", { subject: t(`subject.${subject}`) })}
          </h2>
        </div>
        <p className="text-sm text-muted">{t("practice.mapWhy")}</p>
        {[...byGrade.entries()].map(([grade, list]) => (
          <details key={grade} open={near(grade)} className="group rounded-lg border border-border bg-panel">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 sm:px-5">
              <span className="font-medium text-ink">{gradeLabel(locale, grade)}</span>
              <span className="font-opmono text-xs text-muted">
                {t("practice.provedCount", { n: list.filter((s) => statuses[s.id]?.state === "proved").length, total: list.length })}
              </span>
              <span aria-hidden="true" className="ml-auto text-muted transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>
            <ul className="divide-y divide-border border-t border-border">
              {list.map((s) => (
                <SkillRow key={s.id} skill={s} status={statusLine(statuses[s.id], now, locale)} dot={STATUS_DOT[statuses[s.id]?.state ?? "new"]} locale={locale} onPractice={() => go("pick", s.id)} />
              ))}
            </ul>
          </details>
        ))}
      </section>
    </div>
  );
}

function SkillRow({ skill, status, dot, locale, onPractice }: { skill: Skill; status: string; dot: string; locale: Profile["locale"]; onPractice: () => void }) {
  const t = useT();
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${dot}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{skill.title[locale]}</span>
        <span className="block text-xs text-muted">
          {status}
          {skill.standard && <span className="font-opmono"> · {skill.standard}</span>}
        </span>
      </span>
      {skill.content === "draft" && <Badge>{t("practice.draft")}</Badge>}
      <Button size="sm" variant="secondary" onClick={onPractice} aria-label={`${t("practice.practiceThis")}: ${skill.title[locale]}`}>
        {t("practice.practiceThis")}
      </Button>
    </li>
  );
}
