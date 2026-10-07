import type { TutorThread } from "@/planner/types";
import { update, type StoreState } from "./store";

// Tutor conversations are kept so a grown-up can read them (and so the record says when the tutor helped).

const MAX_THREADS = 200;

export function saveThread(thread: TutorThread) {
  if (thread.lines.length < 2) return; // the tutor's opening alone is not a conversation
  update((s) => {
    const i = s.threads.findIndex((x) => x.id === thread.id);
    if (i >= 0) s.threads[i] = thread;
    else s.threads.push(thread);
    if (s.threads.length > MAX_THREADS) s.threads.splice(0, s.threads.length - MAX_THREADS);
  });
}

export const threadsOf = (s: StoreState, profileId: string) =>
  s.threads.filter((x) => x.profileId === profileId).sort((a, b) => b.startedAt - a.startedAt);
