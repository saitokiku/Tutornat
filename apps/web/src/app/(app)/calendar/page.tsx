"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { EventForm, type FormDone } from "@/components/calendar/EventForm";
import { refreshText } from "@/components/calendar/feed";
import { IMPORT_TABS, ImportPanel } from "@/components/calendar/ImportPanel";
import { SchoolSection } from "@/components/calendar/SchoolSection";
import { WeekView } from "@/components/calendar/WeekView";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconPlus, IconRefresh } from "@/components/icons";
import { Avatar } from "@/components/profiles/Avatar";
import { Button, Notice } from "@/components/ui";
import { useT } from "@/i18n";
import { currentLearner, learnersOf } from "@/lib/profiles";
import { classesOf } from "@/lib/school";
import { read, useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { addRequest, calendarFile, linkedClasses, refreshAll } from "@/lib/week";
import { addDays, localDate, weekStart } from "@/planner/dates";

export default function CalendarPage() {
  return (
    <Guard need="selected">
      <Calendar />
    </Guard>
  );
}

type Message = { tone: "good" | "warn"; lines: string[] };

// Which panel is open lives in the URL, so other screens can link straight to it and Back closes it:
//   ?add=homework|test|quiz|project|other (&date=YYYY-MM-DD)   the add form, that kind (and day) chosen
//   ?edit=<eventId>                                             the edit form for one item
//   ?import=paste|file|link|photo (&class=<classId>)            the import panel on that tab
// The browser's own history API keeps this on the page (Next keeps useSearchParams in step).
const go = (query: string) => window.history.pushState(null, "", `/calendar${query ? `?${query}` : ""}`);
const close = () => window.history.replaceState(null, "", "/calendar");

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
  const [message, setMessage] = useState<Message | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const params = useSearchParams();
  const classes = useStore((s) => (profile ? classesOf(s, profile.id) : []));
  const linked = useStore((s) => (profile ? linkedClasses(s, profile.id).length : 0));
  const exportable = useStore((s) => (profile ? s.events.filter((e) => e.profileId === profile.id && e.date >= addDays(today, -7)).length : 0));
  const editId = params.get("edit");
  const editing = useStore((s) => (editId && profile ? s.events.find((e) => e.id === editId && e.profileId === profile.id) : undefined));

  if (!profile)
    return (
      <div className="space-y-4">
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("calendar.title")}</h1>
        <p className="text-muted">{t("calendar.noLearners")}</p>
      </div>
    );

  const add = addRequest(params.get("add"), params.get("date"));
  const importTab = IMPORT_TABS.find((x) => x === params.get("import"));
  const formDone = (done: FormDone) => {
    close();
    if (!done) return;
    setMessage({ tone: "good", lines: [done.message] });
    if (done.date) setStart(weekStart(done.date));
  };
  const refresh = async () => {
    setRefreshing(true);
    setMessage(null);
    const results = await refreshAll(profile.id, today);
    setRefreshing(false);
    setMessage({
      tone: results.every((r) => r.ok) ? "good" : "warn",
      lines: results.map((r) => `${r.name}: ${refreshText(r, t)}`),
    });
  };
  const download = () => {
    const file = calendarFile(read(), profile, today);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([file.text], { type: "text/calendar" }));
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto min-w-0">
          <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("calendar.title")}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{t("calendar.intro")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => (setMessage(null), go("add="))}>
            <IconPlus size={16} /> {t("calendar.add")}
          </Button>
          <Button variant="secondary" onClick={() => (setMessage(null), go("import=paste"))}>
            {t("calendar.import")}
          </Button>
          {linked > 0 && (
            <Button variant="secondary" loading={refreshing} onClick={refresh}>
              <IconRefresh size={16} /> {t("cal.refreshAll")}
            </Button>
          )}
        </div>
      </header>

      {!learner && learners.length > 1 && (
        <div role="group" aria-label={t("calendar.whose")} className="flex flex-wrap gap-2">
          {learners.map((p: Profile) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === profile.id}
              onClick={() => (setChildId(p.id), setMessage(null), close())}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-panel py-1 pl-1 pr-4 text-sm font-medium text-muted hover:text-ink aria-pressed:border-ink aria-pressed:text-ink"
            >
              <Avatar profile={p} size="sm" /> {p.nickname}
            </button>
          ))}
        </div>
      )}

      {message && (
        <Notice tone={message.tone}>
          {message.lines.length === 1 ? (
            message.lines[0]
          ) : (
            <ul className="space-y-0.5">
              {message.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}

      {add ? (
        <EventForm key={`add:${profile.id}:${add.kind}:${add.date}`} profileId={profile.id} date={add.date ?? today} kind={add.kind} classes={classes} locale={profile.locale} onDone={formDone} />
      ) : editing ? (
        <EventForm key={`edit:${editing.id}`} profileId={profile.id} event={editing} classes={classes} locale={profile.locale} onDone={formDone} />
      ) : importTab ? (
        <ImportPanel
          key={`import:${profile.id}:${importTab}:${params.get("class")}`}
          profile={profile}
          classes={classes}
          initialTab={importTab}
          initialClassId={params.get("class") ?? undefined}
          onDone={(msg, first) => {
            close();
            if (msg) setMessage({ tone: "good", lines: [msg] });
            if (first) setStart(weekStart(first));
          }}
        />
      ) : null}

      <WeekView profile={profile} now={now} start={start} onWeek={setStart} onAdd={(date) => (setMessage(null), go(new URLSearchParams({ add: "", date }).toString()))} />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-panel px-4 py-3 sm:px-5">
        <p className="min-w-0 flex-1 text-sm text-muted">{t("calendar.exportWhy")}</p>
        <Button variant="secondary" onClick={download} disabled={!exportable}>
          {t("cal.download")}
        </Button>
      </div>

      <SchoolSection profile={profile} classes={classes} now={now} onLinkCalendar={(id) => (setMessage(null), go(`import=link&class=${encodeURIComponent(id)}`))} />
    </div>
  );
}
