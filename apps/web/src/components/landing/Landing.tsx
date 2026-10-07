"use client";

import Link from "next/link";
import { CATALOGUE } from "@/catalogue";
import { KaizenLogo } from "@/components/brand";
import { CourseArt } from "@/components/courses/CourseArt";
import { IconArrowRight, IconPaperclip } from "@/components/icons";
import { FractionBar } from "@/components/stage/widgets/FractionBar";
import { LangToggle } from "@/components/LangToggle";
import { MoonVisual } from "@/components/stage/visuals";
import { SubjectDot, btn } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import { useStore } from "@/lib/store";

export function Landing() {
  const t = useT();
  const signedIn = useStore((s) => Boolean(s.session.accountId));

  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex max-w-wide items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <KaizenLogo size={34} href="/" />
        <nav aria-label={t("nav.main")} className="flex items-center gap-2 sm:gap-3">
          <LangToggle />
          {signedIn ? (
            <Link href="/profiles" className={btn("primary", "sm")}>
              {t("landing.openApp")}
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className={btn("ghost", "sm", "hidden sm:inline-flex")}>
                {t("landing.signIn")}
              </Link>
              <Link href="/sign-up" className={btn("primary", "sm")}>
                {t("landing.cta")}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-wide items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pt-16">
          <div className="animate-fade-up">
            <h1 className="max-w-[12ch] font-brand text-d3 font-semibold text-balance text-ink sm:text-d2 lg:text-d1">{t("landing.title")}</h1>
            <p className="mt-6 max-w-[34rem] text-t3 font-normal text-muted">{t("landing.body")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={signedIn ? "/profiles" : "/sign-up"} className={btn("primary", "md", "px-6")}>
                {signedIn ? t("landing.openApp") : t("landing.cta")}
                <IconArrowRight size={18} />
              </Link>
              {!signedIn && (
                <Link href="/sign-in" className={btn("secondary")}>
                  {t("landing.signIn")}
                </Link>
              )}
            </div>
            <p className="mt-6 text-sm text-muted">{t("landing.facts")}</p>
          </div>

          <HeroStage />
        </section>

        <section aria-labelledby="how" className="border-t border-border bg-panel">
          <div className="mx-auto max-w-wide px-5 py-20 sm:px-8">
            <h2 id="how" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
              {t("landing.how")}
            </h2>
            <div className="mt-12 space-y-16">
              <Row title={t("landing.step1.title")} body={t("landing.step1.body")} art={<BoxArt />} />
              <Row title={t("landing.step2.title")} body={t("landing.step2.body")} art={<OutlineArt />} flip />
              <Row title={t("landing.step3.title")} body={t("landing.step3.body")} art={<MoonArt />} />
            </div>
          </div>
        </section>

        <Inside signedIn={signedIn} />

        <section aria-labelledby="parents" className="mx-auto grid max-w-wide items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 id="parents" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
              {t("landing.parents.title")}
            </h2>
            <p className="mt-4 max-w-[34rem] text-body text-muted">{t("landing.parents.body")}</p>
          </div>
          <FamilyArt />
        </section>

        <section aria-labelledby="subjects" className="border-t border-border">
          <div className="mx-auto max-w-wide px-5 py-20 sm:px-8">
            <h2 id="subjects" className="max-w-[24ch] font-brand text-t1 font-semibold text-ink sm:text-d3">
              {t("landing.subjects.title")}
            </h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {(["math", "science", "english"] as const).map((s) => (
                <li key={s} className="border-t border-ink pt-4">
                  <p className="flex items-center gap-2 font-brand text-t2 font-semibold text-ink">
                    <SubjectDot subject={s} />
                    {t(`subject.${s}` as const)}
                  </p>
                  <p className="mt-2 text-sm text-muted">{t(`landing.subjects.${s}` as const)}</p>
                </li>
              ))}
            </ul>

            <div className="mt-16 rounded-lg bg-panel2 px-6 py-6 sm:px-8">
              <p className="font-brand text-t3 font-semibold text-ink">{t("landing.honest.title")}</p>
              <p className="mt-2 max-w-[62ch] text-sm text-muted">{t("landing.honest.body")}</p>
            </div>
          </div>
        </section>

        <section className="bg-ink text-paper">
          <div className="mx-auto flex max-w-wide flex-col items-start gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-center md:justify-between">
            <p className="max-w-[20ch] font-brand text-t1 font-semibold sm:text-d3">{t("home.prompt")}</p>
            <Link href={signedIn ? "/profiles" : "/sign-up"} className="k-btn bg-paper px-6 text-ink hover:bg-paper/90">
              {signedIn ? t("landing.openApp") : t("landing.cta")}
              <IconArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-muted sm:px-8">
        <KaizenLogo size={26} />
        <span>{t("landing.footer")}</span>
      </footer>
    </div>
  );
}

function HeroStage() {
  const t = useT();
  return (
    <figure className="rounded-lg bg-panel shadow-lift ring-1 ring-ink/[0.04]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 text-xs text-muted">
        <span className="flex items-center gap-2 font-medium text-ink">
          <SubjectDot subject="math" />
          {t("subject.math")} · {t("grade.n", { n: 3 })}
        </span>
        <span className="font-opmono tabular-nums">{t("stage.sceneOf", { n: 3, total: 6 })}</span>
      </div>
      <div className="space-y-6 px-5 py-7 sm:px-8">
        <p className="font-brand text-t2 font-semibold text-ink">{t("landing.demo.prompt")}</p>
        <FractionBar widget={{ kind: "fraction-bar", parts: 2, shaded: 1, target: { parts: 4, shaded: 3 } }} />
      </div>
      <figcaption className="border-t border-border px-5 py-3 text-xs text-muted sm:px-8">{t("landing.try")}</figcaption>
    </figure>
  );
}

function Row({ title, body, art, flip }: { title: string; body: string; art: React.ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
      <div className={`min-w-0 ${flip ? "md:order-2" : ""}`}>
        <h3 className="font-brand text-t2 font-semibold text-ink">{title}</h3>
        <p className="mt-3 max-w-[30rem] text-body text-muted">{body}</p>
      </div>
      <div className={`min-w-0 ${flip ? "md:order-1" : ""}`}>{art}</div>
    </div>
  );
}

// Illustrations of real screens, built from the same components and tokens. Decorative: the copy
// beside each one carries the meaning.
function BoxArt() {
  const t = useT();
  return (
    <div aria-hidden="true" className="rounded-lg border border-border bg-panel p-5 shadow-soft">
      <p className="font-brand text-t3 font-semibold text-ink">{t("box.label")}</p>
      <div className="mt-3 text-t3 text-ink">
        {t("landing.demo.goal")}
        <span className="ml-0.5 inline-block h-5 w-px translate-y-1 animate-pulse bg-ink" />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <span className="inline-flex items-center gap-2 text-xs text-muted">
          <IconPaperclip size={16} /> {t("box.attach")}
        </span>
        <span className={btn("primary", "sm")}>{t("box.submit")}</span>
      </div>
    </div>
  );
}

function OutlineArt() {
  const t = useT();
  const lessons = [t("landing.demo.l1"), t("landing.demo.l2"), t("landing.demo.l3"), t("landing.demo.l4")];
  return (
    <ol aria-hidden="true" className="divide-y divide-border rounded-md border border-border bg-paper shadow-soft">
      {lessons.map((l, i) => (
        <li key={l} className="flex items-center gap-4 px-5 py-3.5 animate-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
          <span className="font-opmono text-xs tabular-nums text-muted">{i + 1}</span>
          <span className="text-sm font-medium text-ink">{l}</span>
          <span className="ml-auto font-opmono text-xs text-muted">{t("common.minutes", { n: 10 })}</span>
        </li>
      ))}
    </ol>
  );
}

function MoonArt() {
  const phases = [0.12, 0.25, 0.38, 0.5, 0.75];
  return (
    <div aria-hidden="true" className="grid grid-cols-5 items-end gap-2 rounded-md border border-border bg-paper px-4 py-6 shadow-soft sm:gap-4 sm:px-6">
      {phases.map((p) => (
        <MoonVisual key={p} phase={p} alt="" />
      ))}
    </div>
  );
}

function FamilyArt() {
  const t = useT();
  return (
    <div aria-hidden="true" className="rounded-lg border border-border bg-panel p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-math font-brand text-sm font-semibold text-paper">M</span>
        <div>
          <p className="font-brand text-t3 font-semibold text-ink">Maya</p>
          <p className="text-xs text-muted">{t("landing.demo.child")}</p>
        </div>
      </div>
      <p className="mt-5 text-sm text-ink">{t("landing.demo.week")}</p>
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs font-semibold text-muted">{t("family.neededHelp")}</p>
        <p className="mt-1 text-sm text-ink">{t("landing.demo.help")}</p>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-semibold text-muted">{t("landing.demo.noteLabel")}</p>
        <p className="mt-1 text-sm italic text-ink">{t("landing.demo.note")}</p>
      </div>
    </div>
  );
}

const SHOWCASE = ["english-story-order", "science-matter", "math-fractions", "science-moon", "english-argument", "math-slope"];

/** The real catalogue, not mock-ups: one course per grade band and subject. */
function Inside({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const locale = useLocale();
  const shown = SHOWCASE.map((id) => CATALOGUE.find((c) => c.id === (locale === "es" && id === "math-fractions" ? "math-fractions-es" : id))!).filter(Boolean);
  return (
    <section aria-labelledby="inside" className="mx-auto max-w-wide px-5 py-20 sm:px-8">
      <h2 id="inside" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
        {t("landing.inside.title")}
      </h2>
      <p className="mt-3 max-w-[34rem] text-body text-muted">{t("landing.inside.body")}</p>
      <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
        {shown.map((c) => (
          <li key={c.id}>
            <Link href={signedIn ? "/profiles" : "/sign-up"} className="group block rounded-md border border-border bg-panel p-3 transition-shadow hover:shadow-soft">
              <CourseArt lessons={c.lessons} subject={c.subject} />
              <p className="mt-3 px-1 text-sm font-semibold text-ink" lang={c.locale}>
                {c.title}
              </p>
              <p className="px-1 pb-1 font-opmono text-xs text-muted">
                {gradeLabel(locale, c.grade)} · {t(`subject.${c.subject}` as const)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
