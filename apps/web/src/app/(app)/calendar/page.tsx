"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EventForm, type FormDone } from "@/components/calendar/EventForm";
import { refreshText } from "@/components/calendar/feed";
import { IMPORT_TABS, ImportPanel, type FeedReview } from "@/components/calendar/ImportPanel";
import { SchoolSection } from "@/components/calendar/SchoolSection";
import { WeekView } from "@/components/calendar/WeekView";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconPlus, IconRefresh } from "@/components/icons";
import { Avatar } from "@/components/profiles/Avatar";
import { ParentGate } from "@/components/profiles/ParentGate";
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

type Message = { tone: "good" | "warn"; lines: string[]; reviews?: (FeedReview & { name: string })[] };

// Which panel is open lives in the URL, so other screens can link straight to it and Back closes it:
//   ?add=homework|test|quiz|project|other (&date=YYYY-MM-DD)   the add form, that kind (and day) chosen
//   ?import=paste|file|link|photo (&class=<classId>)            the import panel on that tab
//   ?import=review&class=<classId>                               new items a class calendar refresh found
// The browser's own history API keeps this on the page (Next keeps useSearchParams in step). A panel
// opened here is one history entry, so closing it goes back to the plain calendar; one reached by a
// link closes in place and Back returns to where the link was.
const PANEL = "kzCalendarPanel";
const go = (query: string) => {
  const url = `/calendar?${query}`;
  if (window.history.state?.[PANEL]) window.history.replaceState({ [PANEL]: true }, "", url);
  else window.history.pushState({ [PANEL]: true }, "", url);
};
const close = () => {
  if (window.history.state?.[PANEL]) window.history.back();
  else if (window.location.search) window.history.replaceState(null, "", "/calendar");
};

const YOUNG = ["K", "1", "2"];

function Calendar() {
  const t = useT();
  useTitle(t("calendar.title"));
  const learner = useStore(currentLearner);
  const learners = useStore(learnersOf);
  const unlocked = useStore((s) => Boolean(s.session.unlocked));
  const [childId, setChildId] = useState<string | undefined>(() => learner?.id ?? learners[0]?.id);
  const profile = learner ?? learners.find((p) => p.id === childId) ?? learners[0];
  const [now] = useState(() => Date.now());
  const today = localDate(now);
  const [start, setStart] = useState(() => weekStart(today));
  const [message, setMessage] = useState<Message | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [review, setReview] = useState<FeedReview | null>(null);
  const [gate, setGate] = useState(false);
  const params = useSearchParams();
  const classes = useStore((s) => (profile ? classesOf(s, profile.id) : []));
  const linked = useStore((s) => (profile ? linkedClasses(s, profile.id).length : 0));
  const exportable = useStore((s) => (profile ? s.events.filter((e) => e.profileId === profile.id && e.date >= addDays(today, -7)).length : 0));
  const title = useRef<HTMLHeadingElement>(null);
  const notice = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const focusNotice = useRef(false);

  // A result (saved, refreshed, deleted) takes focus so it is heard, and the next Tab continues from it.
  useEffect(() => {
    if (!message || !focusNotice.current) return;
    focusNotice.current = false;
    notice.current?.focus();
  }, [message]);

  if (!profile)
    return (
      <div className="space-y-4">
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("calendar.title")}</h1>
        <p className="text-muted">{t("calendar.noLearners")}</p>
      </div>
    );

  // Little ones see their week; adding, importing and the school records are for a grown-up.
  const young = !!learner && YOUNG.includes(learner.grade);
  const grownUp = !young || unlocked;
  const add = addRequest(params.get("add"), params.get("date"));
  const importParam = params.get("import");
  const importTab = IMPORT_TABS.find((x) => x === importParam);
  const reviewing = importParam === "review" && review?.drafts.length ? review : null;

  const show = (m: Message) => {
    focusNotice.current = true;
    setMessage(m);
  };
  const open = (query: string) => {
    const at = document.activeElement;
    opener.current = at instanceof HTMLElement && at !== document.body ? at : null;
    setMessage(null);
    go(query);
  };
  /** A panel closed: show what it did, or give focus back to whatever opened it. */
  const done = (m?: Message) => {
    close();
    if (m) show(m);
    else (opener.current?.isConnected ? opener.current : title.current)?.focus();
    opener.current = null;
  };
  const formDone = (d: FormDone) => {
    done(d && { tone: "good", lines: [d.message] });
    if (d?.date) setStart(weekStart(d.date));
  };
  const openReview = (r: FeedReview) => {
    open(`import=review&class=${encodeURIComponent(r.classId)}`);
    setReview(r);
  };
  const refresh = async () => {
    setRefreshing(true);
    setMessage(null);
    const results = await refreshAll(profile.id, today);
    setRefreshing(false);
    show({
      tone: results.every((r) => r.ok) ? "good" : "warn",
      lines: results.map((r) => `${r.name}: ${refreshText(r, t)}`),
      reviews: results.flatMap((r) => (r.ok && r.fresh.length ? [{ classId: r.classId, name: r.name, drafts: r.fresh }] : [])),
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

  let panel = null;
  if ((add || importTab) && !grownUp) panel = <ParentGate onPass={() => {}} onCancel={() => done()} />;
  else if (add) panel = <EventForm key={`add:${profile.id}:${add.kind}:${add.date}`} profileId={profile.id} date={add.date ?? today} kind={add.kind} classes={classes} locale={profile.locale} onDone={formDone} />;
  else if (reviewing)
    panel = (
      <ImportPanel
        key={`review:${reviewing.classId}`}
        profile={profile}
        classes={classes}
        review={reviewing}
        onDone={(msg) => {
          setReview(null);
          done(msg ? { tone: "good", lines: [msg] } : undefined);
        }}
      />
    );
  else if (importTab)
    panel = (
      <ImportPanel
        key={`import:${profile.id}:${importTab}:${params.get("class")}`}
        profile={profile}
        classes={classes}
        initialTab={importTab}
        initialClassId={params.get("class") ?? undefined}
        onDone={(msg, first) => {
          done(msg ? { tone: "good", lines: [msg] } : undefined);
          if (first) setStart(weekStart(first));
        }}
      />
    );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto min-w-0">
          <h1 ref={title} tabIndex={-1} className="font-brand text-t1 font-semibold text-ink outline-none sm:text-d3">
            {t("calendar.title")}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{t("calendar.intro")}</p>
        </div>
        {grownUp && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => open("add=")}>
              <IconPlus size={16} /> {t("calendar.add")}
            </Button>
            <Button variant="secondary" onClick={() => open("import=paste")}>
              {t("calendar.import")}
            </Button>
            {linked > 0 && (
              <Button variant="secondary" loading={refreshing} onClick={refresh}>
                <IconRefresh size={16} /> {t("cal.refreshAll")}
              </Button>
            )}
          </div>
        )}
      </header>

      {!learner && learners.length > 1 && (
        <div role="group" aria-label={t("calendar.whose")} className="flex flex-wrap gap-2">
          {learners.map((p: Profile) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === profile.id}
              onClick={() => (setChildId(p.id), setMessage(null), setReview(null), close())}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-panel py-1 pl-1 pr-4 text-sm font-medium text-muted hover:text-ink aria-pressed:border-ink aria-pressed:text-ink"
            >
              <Avatar profile={p} size="sm" /> {p.nickname}
            </button>
          ))}
        </div>
      )}

      {message && (
        <div ref={notice} tabIndex={-1} className="outline-none">
          <Notice tone={message.tone}>
            {message.lines.length === 1 ? (
              <p>{message.lines[0]}</p>
            ) : (
              <ul className="space-y-0.5">
                {message.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
            {message.reviews && message.reviews.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.reviews.map((r) => (
                  <Button key={r.classId} variant="secondary" onClick={() => openReview(r)}>
                    {t("cal.reviewFrom", { n: r.drafts.length, name: r.name })}
                  </Button>
                ))}
              </div>
            )}
          </Notice>
        </div>
      )}

      {panel}

      <WeekView
        profile={profile}
        now={now}
        start={start}
        onWeek={setStart}
        onAdd={grownUp ? (date) => open(new URLSearchParams({ add: "", date }).toString()) : undefined}
        young={young}
        learner={!!learner}
        scrollToToday={!panel}
      />

      {grownUp ? (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-panel px-4 py-3 sm:px-5">
            <p className="min-w-0 flex-1 text-sm text-muted">{t("calendar.exportWhy")}</p>
            <Button variant="secondary" onClick={download} disabled={!exportable}>
              {t("cal.download")}
            </Button>
          </div>
          <SchoolSection profile={profile} classes={classes} now={now} onLinkCalendar={(id) => open(`import=link&class=${encodeURIComponent(id)}`)} onReview={(classId, drafts) => openReview({ classId, drafts })} />
        </>
      ) : gate ? (
        <ParentGate onPass={() => setGate(false)} onCancel={() => setGate(false)} />
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-panel px-4 py-3 sm:px-5">
          <p className="min-w-0 flex-1 text-sm text-muted">{t("cal.grownUpsWhy")}</p>
          <Button variant="secondary" onClick={() => setGate(true)}>
            {t("cal.grownUps")}
          </Button>
        </div>
      )}
    </div>
  );
}
