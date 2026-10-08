"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconArrowRight, IconCheckCircle, IconChevronDown, IconLayers, IconTest } from "@/components/icons";
import { SkillMap, SkillRow, SkillTiles, TilePicture } from "@/components/practice/SkillMap";
import { checkOpen, STATUS_DOT, statusLine, whenLabel } from "@/components/practice/status";
import { StandardPanel } from "@/components/practice/StandardText";
import { HEAR } from "@/components/practice/targets";
import { SkillResources } from "@/components/resources/ResourceList";
import { Hear, HearContext } from "@/components/stage/hear";
import { Badge, Button, SubjectDot } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import { setSize } from "@/learning/engine";
import { useAiMode } from "@/lib/ai/client";
import { aiQuestions, nextSkillFor, settingsOf, startAiSet, startOf, startSet, statusesOf } from "@/lib/practice";
import { currentLearner } from "@/lib/profiles";
import { isReviewed } from "@/lib/review";
import { read, useStore, type StoreState } from "@/lib/store";
import type { Profile, Subject } from "@/lib/types";
import { daysBetween, fromLocalDate, localDate } from "@/planner/dates";
import { getSkill, gradeIndex, skillsFor } from "@/practice/skills";
import type { Skill } from "@/practice/types";

export default function PracticePage() {
  return (
    <Guard need="learner">
      <Practice />
    </Guard>
  );
}

const SUBJECTS: Subject[] = ["math", "english", "science"];
const young = (p: Profile) => ["K", "1", "2"].includes(p.grade);
/** How far ahead a test shows above Up next: the week before it. */
const TEST_DAYS = 7;

/** The nearest open test or quiz this week with a linked skill in this subject. */
function nextTest(s: StoreState, profileId: string, subject: Subject, now: number) {
  const today = localDate(now);
  return s.events
    .filter((e) => e.profileId === profileId && !e.done && (e.kind === "test" || e.kind === "quiz") && e.date >= today && daysBetween(today, e.date) <= TEST_DAYS)
    .filter((e) => e.skillIds.some((id) => getSkill(id)?.subject === subject))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))[0];
}

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
  const test = useStore((s) => nextTest(s, learner.id, subject, now));
  // Today's box sends a topic here (?q=): the search starts with it.
  const [query, setQuery] = useState(() => params.get("q")?.slice(0, 120) ?? "");
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
  const prep = () => {
    if (!test) return;
    // The plan key Today and the item page use, so a prep set started here is the same set there.
    const id = startSet(read(), { profile: learner, kind: "prep", skillIds: test.skillIds, eventId: test.id, planKey: `${localDate(now)}:prep:${test.id}`, now });
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
  // "Practice this again" names a skill of one subject; on the other tabs, Up next is that tab's own.
  const againSkill = skills.find((s) => s.id === again);
  const upNext = againSkill ?? skills.find((s) => s.id === next);
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
                      <span className="k-meta block">{statusLine(statuses[s.id], now, locale)}</span>
                    </span>
                    <Button variant="secondary" onClick={() => go("check", s.id)} aria-label={`${t("practice.startCheck")}: ${s.title[locale]}`}>
                      {t("practice.startCheck")}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="space-y-3">
            {test && <TestLine test={test} subject={subject} now={now} onPrep={prep} />}
            {upNext && <UpNext skill={upNext} again={!!againSkill} learner={learner} statuses={statuses} now={now} onStart={() => go("pick", upNext.id)} />}
          </div>

          {small ? (
            <YoungSkills skills={skills} learner={learner} statuses={statuses} now={now} onPractice={(id) => go("pick", id)} />
          ) : (
            <>
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
                      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-panel px-4 py-3.5 sm:px-5">
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
            </>
          )}
          {small && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted">{t("practice.placementPrompt")}</span>
              <Button variant="secondary" onClick={() => go("placement", startOf(learner, subject) ?? skills[0].id)} className="min-h-14 px-6 text-base">
                {t("pp.findLevel")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </HearContext.Provider>
  );
}

/** A test this week on a skill of this subject, one line above Up next, with its prep one tap away. */
function TestLine({ test, subject, now, onPrep }: { test: NonNullable<ReturnType<typeof nextTest>>; subject: Subject; now: number; onPrep: () => void }) {
  const t = useT();
  const learner = useStore(currentLearner) as Profile;
  const locale = learner.locale;
  const when = whenLabel(fromLocalDate(test.date).getTime(), now, locale);
  const kind = t(`event.${test.kind as "test" | "quiz"}`);
  const on = test.skillIds.map(getSkill).filter((k) => k?.subject === subject).map((k) => k!.title[locale]);
  const spoken = `${test.title}. ${kind} · ${when}`;
  return (
    <section aria-labelledby="test-line" className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-panel px-4 py-3.5 sm:px-5">
      <IconTest size={20} className="shrink-0 text-muted" />
      <p className="min-w-0 flex-1 basis-48">
        <span id="test-line" className="block font-medium text-ink">
          {test.title}
        </span>
        <span className="k-meta block">{[kind, when, ...on].join(" · ")}</span>
      </p>
      <span className="flex items-center gap-2">
        <Hear text={spoken} className={HEAR} />
        <Button variant="secondary" onClick={onPrep} aria-label={t("pp.test.prepFor", { title: test.title })}>
          {t("pp.test.prep")}
        </Button>
      </span>
    </section>
  );
}

/**
 * The suggested next skill. It is the one thing to do next, so it carries the lift; no label sits over
 * its title (the region is named for screen readers). Standards stay out of a learner's way: older
 * learners can open the standard's wording here; K–2 never see codes.
 */
function UpNext({
  skill,
  again,
  learner,
  statuses,
  now,
  onStart,
}: {
  skill: Skill;
  again: boolean;
  learner: Profile;
  statuses: ReturnType<typeof statusesOf>;
  now: number;
  onStart: () => void;
}) {
  const t = useT();
  const locale = learner.locale;
  const small = young(learner);
  const reviewed = useStore((s) => isReviewed(s, skill));
  const [standard, setStandard] = useState(false);
  const title = skill.title[locale];
  const status = statuses[skill.id];
  return (
    <section aria-label={again ? t("practice.again") : t("practice.upNext")} className="rounded-lg border border-border bg-panel p-5 shadow-lift sm:p-7">
      <div className="flex items-center gap-4 sm:gap-6">
        {small && (
          <div className="w-24 shrink-0 sm:w-40">
            <TilePicture skill={skill} locale={locale} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <h2 className="min-w-0 flex-1 font-brand text-t1 font-semibold text-ink">{title}</h2>
            <Hear text={title} className={HEAR} />
          </div>
          <p className="k-meta mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[status?.state ?? "new"]}`} />
            <span>{statusLine(status, now, locale)}</span>
            {!small && (
              <>
                <span aria-hidden="true">·</span>
                <span>{gradeLabel(locale, skill.grade)}</span>
              </>
            )}
            {!reviewed && !small && <Badge>{t("practice.draft")}</Badge>}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={onStart} className={small ? "min-h-14 px-7 text-base" : ""}>
          {t("practice.start")} <IconArrowRight size={16} />
        </Button>
        <span className="k-meta">{t("practice.setSize", { n: setSize(learner.grade) })}</span>
      </div>
      {!small && (
        <div className="mt-6 space-y-4 border-t border-border pt-5">
          <SkillResources skillId={skill.id} locale={locale} max={2} />
          {skill.standard && (
            <details onToggle={(e) => setStandard(e.currentTarget.open)} className="group">
              <summary className="k-tap k-meta w-fit cursor-pointer list-none gap-1.5 rounded-sm hover:text-ink">
                {t("pp.standard")}
                <IconChevronDown size={16} className="transition-transform group-open:rotate-180" />
              </summary>
              {standard && (
                <div className="mt-2">
                  <StandardPanel code={skill.standard} locale={locale} id={`std-${skill.id}`} />
                </div>
              )}
            </details>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * K–2: the skills of the learner's grade as picture tiles, each drawn from its own first problem, each
 * read aloud; the next grade's wait behind one disclosure. No codes, no search, no minutes. Whether any
 * questions here are drafts is said once, quietly, for the grown-up.
 */
function YoungSkills({ skills, learner, statuses, now, onPractice }: { skills: Skill[]; learner: Profile; statuses: ReturnType<typeof statusesOf>; now: number; onPractice: (id: string) => void }) {
  const t = useT();
  const locale = learner.locale;
  const grades = [...new Set(skills.map((s) => s.grade))].sort((a, b) => gradeIndex(a) - gradeIndex(b));
  const own = grades.find((g) => gradeIndex(g) >= gradeIndex(learner.grade)) ?? grades[grades.length - 1];
  const after = grades[grades.indexOf(own) + 1];
  const mine = skills.filter((s) => s.grade === own);
  const later = after ? skills.filter((s) => s.grade === after) : [];
  const draft = useStore((s) => mine.some((k) => !isReviewed(s, k)));
  const tiles = (list: Skill[]) => <SkillTiles skills={list} statuses={statuses} now={now} locale={locale} onPractice={onPractice} />;
  return (
    <section aria-labelledby="all-skills" className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 id="all-skills" className="font-brand text-t2 font-semibold text-ink">
          {t("pp.young.title")}
        </h2>
        <Hear text={t("pp.young.title")} className={HEAR} />
      </div>
      {tiles(mine)}
      {later.length > 0 && (
        <details className="group rounded-lg border border-border bg-panel">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-lg px-4 text-base font-medium text-ink sm:px-5">
            <span className="flex-1">{gradeLabel(locale, after)}</span>
            <IconChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border p-3 sm:p-4">{tiles(later)}</div>
        </details>
      )}
      {draft && <p className="k-meta">{t("pp.draftNote")}</p>}
    </section>
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
          className="inline-flex min-h-target items-center gap-2 rounded-full px-4 text-sm font-medium text-muted transition-colors aria-selected:bg-panel aria-selected:text-ink aria-selected:shadow-soft"
        >
          <SubjectDot subject={s} /> {t(`subject.${s}`)}
        </button>
      ))}
    </div>
  );
}
