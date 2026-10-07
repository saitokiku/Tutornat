'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import LoginPage from '@/components/LoginPage';
import SetupFlow from '@/components/SetupFlow';
import TodayView from '@/components/TodayView';
import CalendarView from '@/components/CalendarView';
import StudyView from '@/components/StudyView';
import ProgressView from '@/components/ProgressView';
import GradesView from '@/components/GradesView';
import StudySession from '@/components/StudySession';
import DevDash from '@/components/DevDash';
import IntakeBox from '@/components/IntakeBox';
import PracticeModal from '@/components/PracticeModal';
import ChecksDueCard from '@/components/ChecksDueCard';
import { KaizenMark, KaizenLogo } from '@/components/Brand';
import {
  IconSun, IconCalendar, IconBook, IconSprout, IconGrades,
  IconCheck, IconClock, IconRefresh, IconSpark, IconUndo,
} from '@/components/Icons';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import AppFooter from '@/components/ui/AppFooter';
import { gpa } from '@/lib/grades';
import { loadAppState, saveAppState, touchStreak, resetAppState, defaultAppState, clearLocalData, getLocalOwner, setLocalOwner } from '@/lib/appState';
import { loadConcepts, saveConcepts } from '@/lib/store';
import { loadFiles, saveFiles, relevantFiles } from '@/lib/files';
import { newConcept, reviewConcept, masteryPercent } from '@/lib/mastery';
import { applyIntake } from '@/lib/intake';
import { onLimit } from '@/lib/limits';
import { logEvent } from '@/lib/devlog';
import { supabase, cloudConfigured, authedFetch } from '@/lib/supabaseClient';
import { pullState, pushApp, pushConcepts, pushChats, pushFiles, deleteDocument, deleteHomeworkItem, debounced } from '@/lib/cloud';
import { useTabHistory, useHistoryLayer } from '@/lib/historyNav';

// One cohesive learning system: Today (act) · Plan (see ahead) ·
// Learn (go deeper) · Growth (watch it compound).
const TABS = [
  { id: 'today',    label: 'Today',  Icon: IconSun },
  { id: 'calendar', label: 'Plan',   Icon: IconCalendar },
  { id: 'study',    label: 'Learn',  Icon: IconBook },
  { id: 'grades',   label: 'Grades', Icon: IconGrades },
  { id: 'progress', label: 'Growth', Icon: IconSprout },
];
const TAB_IDS = TABS.map((t) => t.id);
// The "Engine Room" debug overlay + "Reset device" are internal tools — never
// ship them to end users (audit: they rendered for every paying student).
const DEV = process.env.NODE_ENV !== 'production';

export default function Dashboard() {
  const [auth, setAuth] = useState(null);         // null loading | false | 'cloud'
  const [userId, setUserId] = useState(null);
  const [cloudUser, setCloudUser] = useState(null); // Supabase user (for email verification gate)
  const [app, setApp] = useState(null);
  const [concepts, setConcepts] = useState([]);
  const [files, setFiles] = useState([]);
  const [tab, setTab] = useState('today');
  const [session, setSession] = useState(null);   // { concept, assignment?, mode, documents }
  const [devOpen, setDevOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [practiceConcept, setPracticeConcept] = useState(null);
  const [toast, setToast] = useState('');
  const [undo, setUndo] = useState(null);          // { message, revert } for optimistic actions
  const [limitHit, setLimitHit] = useState(null);  // { path, message } when a 429 fires
  // Sync health. Non-empty = the cloud read or a write failed. While set, we do
  // NOT push: a device that couldn't read the record must not overwrite it.
  const [syncError, setSyncError] = useState('');
  // Two-tier mastery from the evidence ledger. `confirmed` counts only concepts
  // demonstrated unassisted, on a delayed check or under a tutor's eye — it is
  // the primary progress metric and the only figure that leaves the product.
  const [engineSummary, setEngineSummary] = useState(null);

  // Browser navigation that behaves: Back/Forward moves between tabs, and Back
  // closes the study session / modals instead of leaving the site. The active
  // tab lives in the URL (?tab=) and survives refreshes.
  // Back-button close for the study session routes through closeSession (which
  // persists the chat) via a ref, since closeSession is defined below render.
  const closeSessionRef = useRef(() => setSession(null));
  useTabHistory(tab, setTab, TAB_IDS);
  useHistoryLayer(Boolean(session), useCallback(() => closeSessionRef.current(), []), 'session');
  useHistoryLayer(intakeOpen, useCallback(() => setIntakeOpen(false), []), 'intake');
  useHistoryLayer(Boolean(practiceConcept), useCallback(() => setPracticeConcept(null), []), 'practice');

  // Mirror app in a ref so callbacks can capture prior state for undo without
  // re-binding on every render.
  const appRef = useRef(null);
  useEffect(() => { appRef.current = app; }, [app]);
  // Concepts + files refs so the intake batch can fold each file's patch over
  // the freshest state (React state lags within a rapid multi-file batch).
  const conceptsRef = useRef([]);
  useEffect(() => { conceptsRef.current = concepts; }, [concepts]);
  const filesRef = useRef([]);
  useEffect(() => { filesRef.current = files; }, [files]);

  // A failed background write must reach the user — it used to be swallowed
  // while the sidebar kept saying "synced". setSyncError is stable, so it's
  // safe to close over inside these once-initialised refs.
  const onWriteFail = useRef((e) =>
    setSyncError(`Your latest changes didn’t save (${e?.message || 'network error'}). They’re safe on this device. Reconnect to sync.`)
  ).current;
  const pushAppD = useRef(debounced((uid, a) => pushApp(uid, a).catch(onWriteFail), 1500)).current;
  const pushConceptsD = useRef(debounced((uid, c) => pushConcepts(uid, c).catch(onWriteFail), 1500)).current;
  const pushFilesD = useRef(debounced((uid, f) => pushFiles(uid, f).catch(onWriteFail), 1500)).current;

  // ── Bootstrap: local state + auth session ──────────────────────────────────
  useEffect(() => {
    const localApp = loadAppState();
    const localConcepts = loadConcepts();
    const localFiles = loadFiles();
    setApp(localApp);
    setConcepts(localConcepts);
    setFiles(localFiles);

    if (!cloudConfigured) {
      // No database configured — accounts can't be created. LoginPage shows
      // a clear "not configured" message. No demo/local fallback.
      setAuth(false);
      return;
    }

    let unsub = () => {};
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        await enterCloud(data.session.user, localApp, localConcepts, localFiles);
      } else {
        setAuth(false);
      }
      const sub = supabase.auth.onAuthStateChange(async (event, sess) => {
        if (event === 'SIGNED_IN' && sess?.user) {
          await enterCloud(sess.user, loadAppState(), loadConcepts(), loadFiles());
        }
        if (event === 'SIGNED_OUT') {
          // Wipe local learning data so nothing leaks to the next person on this
          // browser (audit: shared-device data bleed).
          clearLocalData();
          setApp(defaultAppState()); setConcepts([]); setFiles([]); setSession(null);
          setUserId(null); setCloudUser(null); setAuth(false);
        }
      });
      unsub = () => sub.data.subscription.unsubscribe();
    })();
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A visitor sent here only to sign in (from /schedule, a tutor profile, or
  // /family) goes straight back once authenticated — tutoring-only customers
  // never have to touch dashboard onboarding. Local paths only.
  useEffect(() => {
    if (auth !== 'cloud' || typeof window === 'undefined') return;
    let dest = null;
    try { dest = sessionStorage.getItem('kaizen.returnTo'); } catch { /* private mode */ }
    if (dest && /^\/[a-z0-9/\-?=&]*$/i.test(dest) && !dest.startsWith('//')) {
      try { sessionStorage.removeItem('kaizen.returnTo'); } catch { /* ignore */ }
      window.location.assign(dest);
    }
  }, [auth]);

  async function enterCloud(user, localApp, localConcepts, localFiles) {
    setSyncing(true);
    setUserId(user.id);
    setCloudUser(user);
    try {
      let cloud;
      try {
        cloud = await pullState(user.id);
      } catch (err) {
        // The read FAILED — that is not the same as "this account is empty".
        // Treating it as empty would wipe the local working copy and re-run
        // onboarding over a populated account. Keep local, tell the user, and
        // block cloud writes so a partial view can't overwrite good data.
        console.error('[sync] cloud pull failed', err?.message);
        setSyncError('We couldn’t load your saved work just now. You can keep working. We’ll retry when the connection is back.');
        setSyncing(false);
        setAuth('cloud');
        return;
      }
      // Who does the local cache belong to? On a shared device it may be another
      // account's leftover data — which must NEVER migrate into this account.
      const localOwner = getLocalOwner();
      const localIsMine = !localOwner || localOwner === user.id;
      if (cloud) {
        // cloud is the record — replace local
        setApp(cloud.app); saveAppState(cloud.app);
        setConcepts(cloud.concepts); saveConcepts(cloud.concepts);
        setFiles(cloud.files); saveFiles(cloud.files);
        logEvent('store', 'Cloud state pulled', `${cloud.app.courses.length} courses · ${cloud.concepts.length} concepts`);
      } else if (localApp?.setupDone && localIsMine) {
        // Genuine anonymous-demo → account upgrade (or my own device): keep it.
        // These throw now, so a half-finished migration reports instead of
        // leaving the account looking empty on the next device.
        try {
          await pushApp(user.id, localApp);
          await pushConcepts(user.id, localConcepts);
          await pushFiles(user.id, localFiles);
          await pushChats(user.id);
          logEvent('store', 'Local demo state migrated to account', user.email || user.id);
        } catch (err) {
          console.error('[sync] migration push failed', err?.message);
          setSyncError(`We couldn’t upload your existing work (${err?.message || 'network error'}). It’s still on this device. Use Retry to try again.`);
        }
      } else if (!cloud) {
        // New account with no cloud record, and the local cache isn't ours
        // (someone else used this browser) — start clean, don't leak their data.
        clearLocalData();
        setApp(defaultAppState()); saveAppState(defaultAppState());
        setConcepts([]); saveConcepts([]);
        setFiles([]); saveFiles([]);
      }
      setLocalOwner(user.id); // stamp ownership for next time on this device
    } finally {
      setSyncing(false);
      setAuth('cloud');
    }
  }

  // ── Persist local + mirror to cloud ─────────────────────────────────────────
  // `canPush` gates every write: if the pull failed we hold a partial view of
  // the account, and pushing it would clobber the durable record.
  const canPush = auth === 'cloud' && userId && !syncError;
  useEffect(() => { if (app) { saveAppState(app); if (canPush) pushAppD(userId, app); } }, [app, canPush, userId, pushAppD]);
  useEffect(() => { if (app) { saveConcepts(concepts); if (canPush) pushConceptsD(userId, concepts); } }, [concepts, app, canPush, userId, pushConceptsD]);
  useEffect(() => { if (app) { saveFiles(files); if (canPush) pushFilesD(userId, files); } }, [files, app, canPush, userId, pushFilesD]);

  // ── Setup ─────────────────────────────────────────────────────────────────
  // Cloud sign-in arrives via onAuthStateChange (no client handler needed).

  // Setup completes with an AI intake `patch`: everything the student paste/
  // uploaded, organized by Claude into courses, topics, and assignments.
  const handleSetupComplete = useCallback(({ name, goal, learningStyle, patch }) => {
    const base = {
      setupDone: true,
      profile: { name, goal: goal || '', learningStyle: learningStyle || 'mix' },
      school: null,
      courses: [],
      assignments: [],
      streak: { count: 0, lastDate: null },
      activity: [],
      masteryHistory: [],
      gradeHistory: [],
    };
    const merged = applyIntake({ app: base, concepts: [], patch: patch || { courses: [], assignments: [] } });
    setConcepts(merged.concepts);
    setApp((prev) => ({ ...(prev || {}), ...merged.app }));
    logEvent('store', 'Concepts seeded', `${merged.concepts.length} from intake (${merged.app.courses.length} courses)`);
  }, []);

  // ── Universal intake (dashboard omnibox) ────────────────────────────────────
  // Called once for pasted text and once per file in a batch. Folds each patch
  // over the freshest state via refs so files created moments apart don't
  // duplicate courses; a per-file `document` is added to the library (and
  // auto-tagged to its course when the patch touched exactly one).
  const applyIntakeToState = useCallback((patch, document) => {
    const prevApp = appRef.current || { courses: [], assignments: [] };
    const prevConcepts = conceptsRef.current || [];
    const merged = applyIntake({ app: prevApp, concepts: prevConcepts, patch: patch || {} });
    appRef.current = merged.app;
    conceptsRef.current = merged.concepts;
    setApp(merged.app);
    setConcepts(merged.concepts);

    if (document) {
      const tagged = merged.touchedCourseIds?.length === 1
        ? { ...document, courseId: document.courseId || merged.touchedCourseIds[0] }
        : document;
      const prevFiles = filesRef.current || [];
      const nextFiles = prevFiles.some((f) => f.id === tagged.id)
        ? prevFiles.map((f) => (f.id === tagged.id ? tagged : f))
        : [...prevFiles, tagged];
      filesRef.current = nextFiles;
      setFiles(nextFiles);
    }

    if (patch?.summary || (patch?.courses || []).length || (patch?.assignments || []).length) {
      setToast(patch.summary || 'Added to your dashboard.');
    }
  }, []);

  const getExistingCoursesLive = useCallback(
    () => (appRef.current?.courses || []).map((c) => ({ id: c.id, name: c.name, topics: c.topics || [] })),
    [],
  );

  // toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // undo auto-dismiss
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);

  // 429 anywhere → friendly upgrade prompt
  useEffect(() => onLimit((detail) => setLimitHit(detail)), []);

  // Engine state. Read-only and best-effort: the ledger lives server-side, so a
  // failure here degrades the headline rather than the app.
  const refreshEngine = useCallback(async () => {
    if (auth !== 'cloud') return;
    try {
      const res = await authedFetch('/api/engine/state');
      if (!res.ok) return;
      const d = await res.json();
      setEngineSummary(d.summary || null);
    } catch { /* headline is optional */ }
  }, [auth]);
  useEffect(() => { refreshEngine(); }, [refreshEngine]);

  // ── Assignments ─────────────────────────────────────────────────────────────
  const completeAssignment = useCallback((id) => {
    const prior = appRef.current?.assignments.find((a) => a.id === id);
    setApp((prev) => {
      const assignments = prev.assignments.map((a) =>
        a.id === id ? { ...a, status: 'done', completedAt: new Date().toISOString() } : a
      );
      logEvent('store', 'Assignment completed', assignments.find((a) => a.id === id)?.title || id);
      return { ...prev, assignments, ...touchStreak(prev) };
    });
    if (prior) setUndo({
      message: 'Marked done',
      revert: () => setApp((p) => ({ ...p, assignments: p.assignments.map((a) => (a.id === id ? prior : a)) })),
    });
  }, []);

  const deleteAssignment = useCallback((id) => {
    const removed = appRef.current?.assignments.find((a) => a.id === id);
    setApp((prev) => ({ ...prev, assignments: prev.assignments.filter((a) => a.id !== id) }));
    // Explicit server delete (audit REL-004 — pushApp no longer prunes, so a
    // stale device can't wipe rows). Undo re-adds via the normal upsert path.
    if (canPush) deleteHomeworkItem(userId, id).catch((e) => setSyncError(`Couldn’t delete that on the server (${e?.message || 'network error'}). It may come back on refresh.`));
    if (removed) setUndo({
      message: 'Task deleted',
      revert: () => setApp((p) => ({ ...p, assignments: [...p.assignments, removed] })),
    });
  }, [canPush, userId]);

  // Move an assignment to a new due date (drag-to-reschedule on the calendar).
  const rescheduleAssignment = useCallback((id, dateStr) => {
    const due = new Date(dateStr + 'T23:59:00');
    if (Number.isNaN(due.getTime())) return;
    setApp((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) => (a.id === id ? { ...a, due: due.toISOString() } : a)),
    }));
  }, []);

  const addTask = useCallback((task) => {
    setApp((prev) => ({ ...prev, assignments: [...prev.assignments, task] }));
    logEvent('store', 'Task added', `${task.title} · due ${task.due.slice(0, 10)}`);
  }, []);

  // Update an assignment (e.g. gradebook score entry) and snapshot GPA for the trend.
  const updateAssignment = useCallback((id, patch) => {
    setApp((prev) => {
      const assignments = prev.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a));
      const g = gpa(prev.courses, (cid) => assignments.filter((a) => a.courseId === cid));
      const gradeHistory = g == null
        ? (prev.gradeHistory || [])
        : [...(prev.gradeHistory || []), { at: new Date().toISOString(), gpa: g }].slice(-60);
      logEvent('store', 'Grade updated', assignments.find((a) => a.id === id)?.title || id);
      return { ...prev, assignments, gradeHistory };
    });
  }, []);

  // ── Files ───────────────────────────────────────────────────────────────────
  const addFiles = useCallback((records) => setFiles((prev) => [...prev, ...records]), []);
  const removeFile = useCallback((id) => {
    const doc = (filesRef.current || []).find((f) => f.id === id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (canPush) deleteDocument(userId, id, doc?.storagePath).catch((e) => setSyncError(`Couldn’t remove that file on the server (${e?.message || 'network error'}).`));
  }, [canPush, userId]);
  const tagFile = useCallback((id, courseId) => setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, courseId } : f))), []);

  // ── Sessions ────────────────────────────────────────────────────────────────
  function docsFor(conceptName) {
    const course = app.courses.find((c) => c.topics.includes(conceptName));
    return relevantFiles(files, { concept: conceptName, courseId: course?.id }).filter((f) => f.text);
  }

  const studyAssignment = useCallback((assignment) => {
    let target = concepts.find((c) => c.name === assignment.concept);
    if (!target) {
      target = newConcept(assignment.concept);
      setConcepts((prev) => [...prev, target]);
    }
    const documents = docsFor(assignment.concept);
    logEvent('input', 'Tutor opened from assignment', assignment.title);
    setSession({ concept: target, assignment, mode: 'study', documents });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concepts, files, app]);

  const studyConcept = useCallback((concept) => {
    setSession({ concept, assignment: null, mode: 'study', documents: docsFor(concept.name) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, app]);

  const startCurious = useCallback((topic) => {
    logEvent('input', 'Curiosity dive started', topic);
    setSession({ concept: newConcept(topic), assignment: null, mode: 'curious', documents: [] });
  }, []);

  const adoptTopic = useCallback((name) => {
    setConcepts((prev) => (prev.some((c) => c.name === name) ? prev : [...prev, newConcept(name)]));
  }, []);

  const handleGraded = useCallback((conceptId, quality) => {
    setConcepts((prev) => {
      const exists = prev.some((c) => c.id === conceptId);
      const base = exists ? prev : [...prev, session?.concept].filter(Boolean);
      const next = base.map((c) => (c.id === conceptId ? reviewConcept(c, quality) : c));
      const avg = next.length ? Math.round(next.reduce((s, c) => s + masteryPercent(c), 0) / next.length) : 0;
      setApp((prevApp) => ({
        ...prevApp,
        ...touchStreak(prevApp),
        masteryHistory: [...prevApp.masteryHistory, { at: new Date().toISOString(), avg }].slice(-60),
      }));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const closeSession = useCallback(() => {
    setSession(null);
    if (canPush) pushChats(userId).catch((e) => setSyncError(`Couldn’t save this conversation (${e?.message || 'network error'}).`));
  }, [canPush, userId]);
  // Keep the latest closeSession reachable from the back-button history layer
  // (declared above render) so exiting a session by ANY path persists the chat.
  useEffect(() => { closeSessionRef.current = closeSession; }, [closeSession]);

  // Fire any pending debounced cloud writes immediately (before navigation or
  // unload) so an edit made within the debounce window is never lost.
  const flushPending = useCallback(() => {
    try {
      // Each flushed push already carries its own .catch(onWriteFail); the
      // extra catch here keeps a rejection from becoming an unhandled promise
      // during beforeunload.
      return Promise.all(
        [pushAppD.flush?.(), pushConceptsD.flush?.(), pushFilesD.flush?.()].filter(Boolean)
      ).catch(() => {});
    } catch { return Promise.resolve(); }
  }, [pushAppD, pushConceptsD, pushFilesD]);

  // Full-page nav (Billing/Settings) unmounts us and would drop a pending push —
  // flush first, then go.
  const navigateWithFlush = useCallback((href) => (e) => {
    e.preventDefault();
    Promise.resolve(flushPending()).finally(() => { window.location.href = href; });
  }, [flushPending]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushPending(); };
    window.addEventListener('beforeunload', flushPending);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', flushPending);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flushPending]);

  // Resume a plan chosen on /pricing before signing in: once verified, send them
  // back to billing to complete checkout (audit: the paid funnel dead-ended).
  useEffect(() => {
    if (auth !== 'cloud' || !cloudUser) return;
    if (!(cloudUser.email_confirmed_at || cloudUser.confirmed_at)) return;
    try { if (sessionStorage.getItem('kaizen.intendedPlan')) window.location.href = '/billing'; } catch { /* noop */ }
  }, [auth, cloudUser]);

  // A ?bookTutor=<id> deep-link (from a public tutor profile) opens booking,
  // which lives on the Growth tab — switch to it so TutorBooking picks up the
  // param and opens the modal (audit: 'Book a session' was a dead button).
  useEffect(() => {
    if (auth !== 'cloud' || !app?.setupDone) return;
    try { if (new URLSearchParams(window.location.search).get('bookTutor')) setTab('progress'); } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, app?.setupDone]);

  // Returning from a group-seat checkout (?dropin=paid|cancelled): VERIFY with
  // reconcile rather than trusting the redirect — the webhook may be slow or
  // never fire (same posture as /billing?status=success).
  const [dropinNotice, setDropinNotice] = useState('');
  useEffect(() => {
    if (auth !== 'cloud') return;
    let outcome = null;
    try {
      outcome = new URLSearchParams(window.location.search).get('dropin');
      if (outcome) {
        const url = new URL(window.location.href);
        url.searchParams.delete('dropin');
        window.history.replaceState({}, '', url);
      }
    } catch { /* noop */ }
    if (!outcome) return;
    if (outcome === 'cancelled') { setDropinNotice('Checkout cancelled. Your seat was released.'); return; }
    setDropinNotice('Confirming your seat…');
    (async () => {
      try { await authedFetch('/api/billing/reconcile', { method: 'POST' }); } catch { /* best effort */ }
      setDropinNotice('Seat confirmed. See “My sessions” in the schedule.');
    })();
  }, [auth]);

  async function handleLogout() {
    flushPending();                          // persist pending edits before wiping local
    if (auth === 'cloud' && supabase) await supabase.auth.signOut();
    clearLocalData();
    setApp(defaultAppState()); setConcepts([]); setFiles([]); setSession(null);
    setUserId(null); setCloudUser(null);
    setAuth(false);
  }

  function handleReset() {
    if (!confirm('Clear local cache on this device? Your synced account data is untouched.')) return;
    resetAppState();
    window.location.reload();
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (auth === null || app === null || syncing) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-5">
        <div className="text-center">
          <KaizenMark size={52} className="mx-auto block animate-breathe" />
          <div className="mt-5 text-sm text-muted">{syncing ? 'Gathering your progress…' : 'One moment…'}</div>
        </div>
      </div>
    );
  }

  if (!auth) return <LoginPage />;

  // Unverified accounts don't enter the app — verify first (resend available).
  if (auth === 'cloud' && cloudUser && !cloudUser.email_confirmed_at && !cloudUser.confirmed_at) {
    return <VerifyEmailGate email={cloudUser.email} onSignOut={handleLogout} />;
  }

  if (!app.setupDone) {
    return <SetupFlow onComplete={handleSetupComplete} />;
  }

  if (session) {
    const live = concepts.find((c) => c.id === session.concept.id) || session.concept;
    return (
      <>
        <StudySession
          concept={live}
          assignment={session.assignment}
          mode={session.mode}
          documents={session.documents}
          studentName={app.profile.name}
          learningStyle={app.profile.learningStyle || 'mix'}
          onGraded={handleGraded}
          onAdopt={session.mode === 'curious' ? adoptTopic : undefined}
          onBack={closeSession}
        />
        {DEV && <DevButton onOpen={() => setDevOpen(true)} />}
        {DEV && <DevDash open={devOpen} onClose={() => setDevOpen(false)} />}
      </>
    );
  }

  const view = (
    <>
      {tab === 'today' && (
        <>
        {/* A released seat is not a confirmation, so it never renders in the
            success channel: the tone is read off the message the effect set. */}
        {dropinNotice && (
          <Notice kind={dropinNotice.includes('cancelled') ? 'warn' : 'ok'} className="mb-4">
            {dropinNotice}
          </Notice>
        )}
        <div className="mb-5"><ChecksDueCard onConfirmed={refreshEngine} /></div>
        <TodayView app={app} concepts={concepts}
          onCompleteAssignment={completeAssignment} onDeleteAssignment={deleteAssignment}
          onAddTask={addTask} onStudyAssignment={studyAssignment} onCurious={startCurious}
          onOpenIntake={() => setIntakeOpen(true)} />
        </>
      )}
      {tab === 'calendar' && (
        <CalendarView app={app}
          onCompleteAssignment={completeAssignment} onDeleteAssignment={deleteAssignment}
          onAddTask={addTask} onStudyAssignment={studyAssignment}
          onRescheduleAssignment={rescheduleAssignment} />
      )}
      {tab === 'study' && (
        <StudyView app={app} concepts={concepts} files={files}
          onStudy={studyConcept} onPractice={setPracticeConcept} onAddFiles={addFiles} onRemoveFile={removeFile} onTagFile={tagFile} />
      )}
      {tab === 'grades' && <GradesView app={app} onUpdateAssignment={updateAssignment} onUploadGraded={() => setIntakeOpen(true)} />}
      {tab === 'progress' && <ProgressView app={app} concepts={concepts} />}
    </>
  );

  return (
    <div className="min-h-screen bg-paper">
      {/* The rail. It sits on panel2 so the chrome reads as furniture and the
          work reads as paper; the active section is the one lifted, ruled tile.
          Rose marks the selection, ink stays the action color, which is why
          crossing from here into /billing never changes what a button means. */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-panel2 border-r border-border z-20">
        <div className="px-5 pt-6 pb-5">
          <KaizenLogo size={32} href="/" caption="small steps, every day" />
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} aria-current={on ? 'page' : undefined}
                className={`group relative w-full flex items-center gap-3 rounded-sm pl-4 pr-3 py-2.5 text-sm font-medium transition-colors ${
                  on ? 'bg-panel text-ink shadow-soft' : 'text-muted hover:bg-panel/70 hover:text-ink'}`}>
                <span aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full ${on ? 'bg-accent' : 'bg-transparent'}`} />
                <t.Icon size={18} className={on ? 'text-accent' : 'text-muted group-hover:text-ink'} />
                {t.label}
              </button>
            );
          })}
        </nav>
        <div className="px-3 pt-3 pb-4 border-t border-border space-y-3">
          {/* Primary progress metric: concepts confirmed WITHOUT help. The
              streak used to live here; it is a neutral history now, not the
              headline, and it is never framed as something to lose. Given the
              record's own card, set in mono, because this is the one figure
              the product asserts about a student. */}
          {engineSummary && engineSummary.total > 0 && (
            <div className="rounded-sm bg-panel border border-border px-3 py-2.5">
              <p className="k-label">Confirmed</p>
              <p className="mt-1 font-opmono text-t3 font-semibold tabular-nums text-ink">
                {engineSummary.confirmed}
                <span className="font-normal text-muted"> of {engineSummary.total}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">on your own, unaided</p>
            </div>
          )}
          <div className="px-1 space-y-2.5">
            {/* Never claim "synced" without knowing it — the old copy was a
                hardcoded string that stayed put through every failed write.
                The dot only ever restates what the words already say. */}
            <div className="flex items-center gap-2 text-xs">
              <span aria-hidden="true"
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${syncError ? 'bg-bad' : 'bg-good'}`} />
              <span className="truncate font-medium text-ink">{app.profile.name}</span>
              {syncError
                ? <span className="shrink-0 text-bad">not saved</span>
                : <span className="shrink-0 text-muted">synced</span>}
            </div>
            {/* Account chrome. 'Family' is here because /family — where the
                payer adds teens, books for them and reads their progress — was
                reachable from nowhere inside the signed-in app; a parent who
                signs in (the family page sends them here to do it) landed in the
                student syllabus with no way back. Same flush-then-navigate as
                its neighbours: these are full page loads, so a pending sync has
                to land before we leave. */}
            <div className="flex items-center gap-3 text-xs">
              <a href="/billing" onClick={navigateWithFlush('/billing')} className="text-muted hover:text-accent transition-colors">Billing</a>
              <a href="/settings" onClick={navigateWithFlush('/settings')} className="text-muted hover:text-accent transition-colors">Settings</a>
              <a href="/family" onClick={navigateWithFlush('/family')} className="text-muted hover:text-accent transition-colors">Family</a>
            </div>
            <button onClick={handleLogout} className="text-xs text-muted hover:text-bad transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:pl-60">
        {syncError && (
          <div className="bg-bad/10 border-b border-bad/25">
            <div className="max-w-lg lg:max-w-4xl mx-auto flex items-center gap-3 px-4 lg:px-8 py-2.5 text-xs text-ink">
              <span className="flex-1">{syncError}</span>
              <button
                onClick={() => { setSyncError(''); window.location.reload(); }}
                className="k-btn-secondary shrink-0 px-3 py-1.5 text-xs"
              >
                <IconRefresh size={13} />
                Retry
              </button>
            </div>
          </div>
        )}
        <div className="max-w-lg lg:max-w-4xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8">{view}</div>
        {/* The interior used to end in raw background. The extra bottom room on
            small screens clears the fixed tab bar so the entity line and the
            legal links are never parked underneath it. */}
        <AppFooter className="mt-12 pb-20 lg:pb-0" />
      </main>

      {/* The same selection language as the rail, one rose rule per tab, so a
          student moving between phone and laptop is reading one product. */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-panel/90 backdrop-blur-xl border-t border-border z-20">
        <div className="max-w-lg mx-auto grid grid-cols-5">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} aria-current={on ? 'page' : undefined}
                className="relative py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-1">
                <span aria-hidden="true"
                  className={`absolute top-0 inset-x-6 h-0.5 rounded-full ${on ? 'bg-accent' : 'bg-transparent'}`} />
                <t.Icon size={21} strokeWidth={on ? 2.1 : 1.8}
                  className={`transition-colors ${on ? 'text-accent' : 'text-muted/60'}`} />
                <span className={`text-micro font-medium ${on ? 'text-accent' : 'text-muted'}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {DEV && <DevButton onOpen={() => setDevOpen(true)} onReset={handleReset} />}
      {DEV && <DevDash open={devOpen} onClose={() => setDevOpen(false)} />}

      {intakeOpen && (
        <IntakeBox
          variant="modal"
          getExistingCourses={getExistingCoursesLive}
          onResult={applyIntakeToState}
          onClose={() => setIntakeOpen(false)}
        />
      )}

      {practiceConcept && (
        <PracticeModal
          conceptId={practiceConcept.id}
          conceptName={practiceConcept.name}
          courseId={(app.courses.find((c) => (c.topics || []).includes(practiceConcept.name)) || {}).id || null}
          mastery={masteryPercent(practiceConcept)}
          onGraded={handleGraded}
          onClose={() => setPracticeConcept(null)}
        />
      )}

      {toast && !undo && (
        <div className="fixed bottom-20 lg:bottom-8 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="max-w-md flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-lift">
            <IconCheck size={14} className="shrink-0" />
            <span className="truncate">{toast}</span>
          </div>
        </div>
      )}

      {undo && (
        <div className="fixed bottom-20 lg:bottom-8 inset-x-0 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full bg-ink pl-4 pr-2 py-2 text-sm font-medium text-paper shadow-lift animate-fadeUp">
            <span>{undo.message}</span>
            {/* Ember, not accent, and no fill behind it. This is the recovery
                affordance after a destructive tap — the one control on the
                screen that must be legible at a glance — and the day rose on
                ink measures ~3.5:1, the worst text on the page. Ember is the
                same rose tuned for dark ground: 5.1:1 here. The chip that used
                to sit behind it (white/10) lifted the background enough to pull
                even ember back under 4.5, so the outline carries the button
                shape instead and the fill stays out of the contrast math. */}
            <button
              onClick={() => { undo.revert(); setUndo(null); }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-ember ring-1 ring-ember/40 hover:ring-ember transition-colors"
            >
              <IconUndo size={13} />
              Undo
            </button>
          </div>
        </div>
      )}

      {limitHit && (
        <LimitModal detail={limitHit} isCloud={auth === 'cloud'} onClose={() => setLimitHit(null)} />
      )}
    </div>
  );
}

function VerifyEmailGate({ email, onSignOut }) {
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  async function resend() {
    if (resent) return;
    setError('');
    try {
      // supabase-js returns {error} rather than throwing — check it explicitly
      const { error: err } = await supabase.auth.resend({ type: 'signup', email });
      if (err) throw err;
      setResent(true);
    } catch (err) {
      setError(err.message || 'Could not resend the email.');
    }
  }

  async function recheck() {
    setChecking(true);
    // The cached JWT predates the confirmation — force a fresh session so
    // email_confirmed_at is current, THEN reload into the app.
    try { await supabase.auth.refreshSession(); } catch { /* offline — reload anyway */ }
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-5">
      <div className="w-full max-w-sm k-card p-8 text-center space-y-5">
        <KaizenMark size={44} className="mx-auto block" />
        <div>
          <h1 className="font-brand text-t2 font-semibold text-ink">Verify your email</h1>
          <p className="text-sm text-muted mt-2">
            We sent a confirmation link to <span className="font-medium text-ink">{email}</span>.
            Click it, then come back here.
          </p>
        </div>
        {/* Ink pill, like every other primary action in the product. */}
        <Button block onClick={recheck} disabled={checking}>
          {checking ? 'Checking…' : 'I’ve verified, let me in'}
        </Button>
        <button onClick={resend} disabled={resent} className="w-full text-xs font-semibold text-accent disabled:opacity-50">
          {resent
            ? <span className="inline-flex items-center gap-1.5"><IconCheck size={13} />Sent, check your inbox</span>
            : 'Resend the email'}
        </button>
        {/* A failed resend is a failure, so it renders in the error channel. */}
        {error && <Notice kind="bad" className="text-left">{error}</Notice>}
        <button onClick={onSignOut} className="text-xs text-muted hover:text-ink transition-colors">Sign out</button>
      </div>
    </div>
  );
}

function LimitModal({ detail, isCloud, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm px-5" onClick={onClose}>
      <div className="w-full max-w-sm k-card shadow-lift p-6 text-center space-y-5"
        onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-panel2 text-muted">
          <IconClock size={20} />
        </span>
        <div>
          <h2 className="font-brand text-t2 font-semibold text-ink">You&apos;ve hit today&apos;s limit</h2>
          <p className="text-sm text-muted mt-2">
            {detail?.message || 'You reached the daily cap on your current plan.'}
          </p>
        </div>
        {/* Stays a plain anchor: leaving the dashboard has to be a full page
            load so the debounced cloud writes flush before we unmount. */}
        {isCloud ? (
          <a href="/billing" className="k-btn-primary w-full py-3 text-sm">
            Upgrade to keep going
          </a>
        ) : (
          <p className="text-xs text-muted">Give it a few seconds and try again, or come back tomorrow.</p>
        )}
        <button onClick={onClose} className="text-xs text-muted hover:text-ink transition-colors">Not now</button>
      </div>
    </div>
  );
}

function DevButton({ onOpen, onReset }) {
  return (
    <div className="fixed right-4 bottom-20 lg:bottom-6 z-30 flex flex-col gap-2 items-end">
      {onReset && (
        <button onClick={onReset} title="Reset device"
          className="w-8 h-8 rounded-full bg-panel border border-border shadow-soft flex items-center justify-center text-muted hover:text-bad transition-colors">
          <IconUndo size={14} />
        </button>
      )}
      <button onClick={onOpen} title="Engine room (dev view)"
        className="w-10 h-10 rounded-full bg-ink text-paper shadow-lift flex items-center justify-center hover:scale-105 transition-transform">
        <IconSpark size={18} />
      </button>
    </div>
  );
}
