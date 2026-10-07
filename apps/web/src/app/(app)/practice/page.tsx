"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconArrowRight, IconCheckCircle, IconLayers } from "@/components/icons";
import { SkillMap, SkillRow } from "@/components/practice/SkillMap";
import { checkOpen, STATUS_DOT, statusLine } from "@/components/practice/status";
import { StandardCode } from "@/components/practice/StandardText";
import { SkillResources } from "@/components/resources/ResourceList";
import { Hear, HearContext } from "@/components/stage/hear";
import { Badge, Button, SubjectDot } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import { setSize } from "@/learning/engine";
import { useAiMode } from "@/lib/ai/client";
import { aiQuestions, nextSkillFor, settingsOf, startAiSet, startOf, startSet, statusesOf } from "@/lib/practice";
import { currentLearner } from "@/lib/profiles";
import { isReviewed } from "@/lib/review";
import { read, useStore } from "@/lib/store";
import type { Profile, Subject } from "@/lib/types";
import { getSkill, skillsFor } from "@/practice/skills";

export default function PracticePage() {
  return (
    <Guard need="learner">
      <Practice />
    </Guard>
  );
}

const SUBJECTS: Subject[] = ["math", "english", "science"];
const young = (p: Profile) => ["K", "1", "2"].includes(p.grade);

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
    const fromAgain = again ? getSkill(again)?.subject : undefined;
    if (fromAgain && SUBJECTS.includes(fromAgain)) return fromAgain;
    return settings.subjects.find((s) => SUBJECTS.includes(s)) ?? "math";
  });
  const statuses = useStore((s) => statusesOf(s, learner.id, now));
  const next = useStore((s) => nextSkillFor(s, learner, subject, now));
  const [query, setQuery] = useState("");
  const ai = useAiMode();
  const [making, setMaking] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);
  const locale = learner.locale;
  const small = young(learner);
  const skills = skillsFor(subject);

  const go = (kind: "pick" | "check" | "placement", skillId: string) => {
    const id = startSet(read(), { profile: learner, kind, skillIds: [skillId], now });
    if (id) router.push(`/practice/${id}`);
  };
  const makeQuestions = async () => {
    setMaking(true);
    setAiFailed(false);
    const qs = await aiQuestions(query.trim(), learner.grade, learner.locale);
    setMaking(false);
    const id = qs && startAiSet(learner, query.trim(), qs, now);
    if (id) router.push(`/practice/${id}`);
    else setAiFailed(true);
  };

  const open = skills.filter((s) => checkOpen(statuses[s.id], now));
  const upNext = skills.find((s) => s.id === (again ?? next));
  const upNextReviewed = useStore((s) => (upNext ? isReviewed(s, upNext) : true));
  // Skills first: this subject, then the others. Open topics come after, from AI when it is on.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return skillsFor(subject)
      .concat(SUBJECTS.filter((x) => x !== subject).flatMap(skillsFor))
      .filter((s) => s.title.en.toLowerCase().includes(q) || s.title.es.toLowerCase().includes(q) || s.standard?.toLowerCase().includes(q) || s.id.includes(q))
      .slice(0, 8);
  }, [query, subject]);
  const searching = query.trim().length >= 2;
  const aiOn = ai !== null && ai !== "demo";

  return (
    <HearContext.Provider value={{ hear: small, young: small, locale }}>
      <div className="space-y-10">
        <header className="space-y-5">
          <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("practice.title")}</h1>
          <SubjectTabs subject={subject} onChange={setSubject} />
        </header>

        <div role="tabpanel" id="practice-panel" aria-labelledby={`tab-${subject}`} className="space-y-10">
          {open.length > 0 && (
            <section aria-labelledby="checks" className="space-y-3">
              <h2 id="checks" className="font-brand text-t2 font-semibold text-ink">
                {t("practice.checksReady")}
              </h2>
              <p className="text-sm text-muted">{t("practice.checksWhy")}</p>
              <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
                {open.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                    <IconCheckCircle size={18} className="text-accent" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{s.title[locale]}</span>
                      <span className="block text-xs text-muted">{statusLine(statuses[s.id], now, locale)}</span>
                    </span>
                    <Button onClick={() => go("check", s.id)} aria-label={`${t("practice.startCheck")}: ${s.title[locale]}`}>
                      {t("practice.startCheck")}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {upNext && (
            <section aria-labelledby="up-next" className="rounded-lg border border-border bg-panel p-5 shadow-lift sm:p-7">
              <h2 id="up-next" className="text-sm font-medium text-muted">
                {again ? t("practice.again") : t("practice.upNext")}
              </h2>
              <div className="mt-1 flex items-start gap-3">
                <p className="min-w-0 flex-1 font-brand text-t1 font-semibold text-ink">{upNext.title[locale]}</p>
                <Hear text={upNext.title[locale]} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[statuses[upNext.id]?.state ?? "new"]}`} />
                <span>{statusLine(statuses[upNext.id], now, locale)}</span>
                <span aria-hidden="true">·</span>
                <span className="font-opmono">{gradeLabel(locale, upNext.grade)}</span>
                {upNext.standard && (
                  <>
                    <span aria-hidden="true">·</span>
                    <StandardCode code={upNext.standard} locale={locale} />
                  </>
                )}
                {!upNextReviewed && <Badge>{t("practice.draft")}</Badge>}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button onClick={() => go("pick", upNext.id)} className={small ? "min-h-14 px-7 text-base" : ""}>
                  {t("practice.start")} <IconArrowRight size={16} />
                </Button>
                <span className="text-xs text-muted">{t("practice.setSize", { n: setSize(learner.grade) })}</span>
              </div>
              {!small && (
                <div className="mt-6 border-t border-border pt-5">
                  <SkillResources skillId={upNext.id} locale={locale} max={2} />
                </div>
              )}
            </section>
          )}

          <section aria-labelledby="anything" className="space-y-3">
            <h2 id="anything" className="font-brand text-t2 font-semibold text-ink">
              {t("practice.anything")}
            </h2>
            <label htmlFor="skill-search" className="sr-only">
              {t("practice.searchLabel")}
            </label>
            <input id="skill-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("practice.searchPlaceholder")} className="k-input" />
            {searching && (
              <div aria-live="polite" className="space-y-3">
                {matches.length > 0 && (
                  <ul aria-label={t("pr.search.skills")} className="divide-y divide-border rounded-lg border border-border bg-panel">
                    {matches.map((s) => (
                      <SkillRow key={s.id} skill={s} statuses={statuses} now={now} locale={locale} onPractice={() => go("pick", s.id)} />
                    ))}
                  </ul>
                )}
                {aiOn ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-panel px-4 py-3.5 sm:px-5">
                    <span className="min-w-0 flex-1 text-sm text-ink">
                      {matches.length ? t("pr.search.orTopic", { topic: query.trim() }) : t("practice.makeQuestions", { topic: query.trim() })}
                      <span className="block text-xs text-muted">{aiFailed ? t("practice.aiFailed") : t("practice.aiNote")}</span>
                    </span>
                    <Button variant="secondary" loading={making} onClick={makeQuestions}>
                      {t("practice.make")}
                    </Button>
                  </div>
                ) : (
                  matches.length === 0 && ai !== null && <p className="rounded-lg border border-border bg-panel px-4 py-3.5 text-sm text-muted">{t("practice.noMatch")}</p>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="text-sm text-muted">{t("practice.placementPrompt")}</span>
              <Button variant="secondary" onClick={() => go("placement", startOf(learner, subject) ?? skills[0].id)}>
                {t("practice.placementLink")}
              </Button>
            </div>
          </section>

          <section aria-labelledby="map" className="space-y-4">
            <div className="flex items-center gap-2">
              <IconLayers size={18} className="text-muted" />
              <h2 id="map" className="font-brand text-t2 font-semibold text-ink">
                {t("practice.map", { subject: t(`subject.${subject}`) })}
              </h2>
            </div>
            <p className="text-sm text-muted">{t("practice.mapWhy")}</p>
            <SkillMap skills={skills} statuses={statuses} now={now} locale={locale} near={learner.grade} onPractice={(id) => go("pick", id)} />
          </section>
        </div>
      </div>
    </HearContext.Provider>
  );
}

/** Subject tabs: one tab stop, arrow keys move between subjects (WAI-ARIA tabs, selection follows focus). */
function SubjectTabs({ subject, onChange }: { subject: Subject; onChange: (s: Subject) => void }) {
  const t = useT();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? SUBJECTS.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const k = (to + SUBJECTS.length) % SUBJECTS.length;
    onChange(SUBJECTS[k]);
    refs.current[k]?.focus();
  };
  return (
    <div role="tablist" aria-label={t("practice.subjects")} className="inline-flex max-w-full flex-wrap rounded-full border border-border bg-panel2 p-1">
      {SUBJECTS.map((s, i) => (
        <button
          key={s}
          ref={(el) => void (refs.current[i] = el)}
          id={`tab-${s}`}
          role="tab"
          type="button"
          aria-selected={subject === s}
          aria-controls="practice-panel"
          tabIndex={subject === s ? 0 : -1}
          onClick={() => onChange(s)}
          onKeyDown={(e) => onKey(e, i)}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted transition-colors aria-selected:bg-panel aria-selected:text-ink aria-selected:shadow-soft"
        >
          <SubjectDot subject={s} /> {t(`subject.${s}`)}
        </button>
      ))}
    </div>
  );
}
