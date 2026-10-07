"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { EventForm } from "@/components/calendar/EventForm";
import { ImportPanel } from "@/components/calendar/ImportPanel";
import { SchoolSection } from "@/components/calendar/SchoolSection";
import { WeekView } from "@/components/calendar/WeekView";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconPlus, IconRefresh } from "@/components/icons";
import { Avatar } from "@/components/profiles/Avatar";
import { Button, Notice } from "@/components/ui";
import { useT } from "@/i18n";
import { statusesOf } from "@/lib/practice";
import { currentLearner, learnersOf } from "@/lib/profiles";
import { classesOf, eventsOf } from "@/lib/school";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { addDays, localDate, weekStart } from "@/planner/dates";
import { toIcs } from "@/planner/ics";
import type { SchoolEvent } from "@/planner/types";

export default function CalendarPage() {
  return (
    <Guard need="selected">
      <Calendar />
    </Guard>
  );
}

type Panel = { mode: "add"; date?: string; kind?: "test" } | { mode: "edit"; event: SchoolEvent } | { mode: "import" } | null;

function Calendar() {
  const t = useT();
  useTitle(t("calendar.title"));
  const learner = useStore(currentLearner);
  const learners = useStore(learnersOf);
  const [childId, setChildId] = useState<string | undefined>(() => learner?.id ?? learners[0]?.id);
  const profile = learner ?? learners.find((p) => p.id === childId) ?? learners[0];
  const [now] = useState(() => Date.now());
  const today = localDate(now);
  const [start, setStart] = useState(() => weekStart(today));
  const params = useSearchParams();
  const [panel, setPanel] = useState<Panel>(() => (params.get("add") ? { mode: "add", kind: params.get("add") === "test" ? "test" : undefined } : null));
  const [message, setMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const events = useStore((s) => (profile ? eventsOf(s, profile.id) : []));
  const classes = useStore((s) => (profile ? classesOf(s, profile.id) : []));
  const statuses = useStore((s) => (profile ? statusesOf(s, profile.id, now) : {}));

  if (!profile)
    return (
      <div className="space-y-4">
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("calendar.title")}</h1>
        <p className="text-muted">{t("calendar.noLearners")}</p>
      </div>
    );

  const open = (p: Panel) => {
    setPanel(p);
    setMessage(null);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  const exportIcs = () => {
    const upcoming = events.filter((e) => e.date >= addDays(today, -7));
    const blob = new Blob([toIcs(upcoming, `KaizenEDU · ${profile.nickname}`)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kaizenedu-${profile.nickname.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("calendar.title")}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{t("calendar.intro")}</p>
        </div>
        <Button onClick={() => open({ mode: "add" })}>
          <IconPlus size={16} /> {t("calendar.add")}
        </Button>
        <Button variant="secondary" onClick={() => open({ mode: "import" })}>
          <IconRefresh size={16} /> {t("calendar.import")}
        </Button>
      </header>

      {!learner && learners.length > 1 && (
        <div role="tablist" aria-label={t("calendar.whose")} className="flex flex-wrap gap-2">
          {learners.map((p: Profile) => (
            <button key={p.id} role="tab" aria-selected={p.id === profile.id} onClick={() => (setChildId(p.id), setPanel(null))} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-panel py-1 pl-1 pr-4 text-sm font-medium text-muted aria-selected:border-ink aria-selected:text-ink">
              <Avatar profile={p} size="sm" /> {p.nickname}
            </button>
          ))}
        </div>
      )}

      {message && <Notice tone="good">{message}</Notice>}
      <div ref={panelRef} className="scroll-mt-6">
        {panel?.mode === "add" && <EventForm key={`add:${panel.date}`} profileId={profile.id} date={panel.date ?? today} kind={panel.kind} classes={classes} locale={profile.locale} onDone={() => setPanel(null)} />}
        {panel?.mode === "edit" && <EventForm key={panel.event.id} profileId={profile.id} event={panel.event} classes={classes} locale={profile.locale} onDone={() => setPanel(null)} />}
        {panel?.mode === "import" && (
          <ImportPanel
            profileId={profile.id}
            classes={classes}
            locale={profile.locale}
            grade={profile.grade}
            onDone={(msg) => {
              setPanel(null);
              setMessage(msg);
            }}
          />
        )}
      </div>

      <WeekView start={start} onWeek={setStart} events={events} classes={classes} statuses={statuses} locale={profile.locale} today={today} onOpen={(e) => open({ mode: "edit", event: e })} onAdd={(d) => open({ mode: "add", date: d })} />

      <p className="text-sm text-muted">
        {t("calendar.exportWhy")}{" "}
        <button type="button" onClick={exportIcs} disabled={!events.length} className="font-medium text-ink underline underline-offset-4 hover:text-accent disabled:text-muted disabled:no-underline">
          {t("calendar.export")}
        </button>
      </p>

      <SchoolSection profile={profile} classes={classes} now={now} />
    </div>
  );
}
