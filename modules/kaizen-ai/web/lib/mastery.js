// SuperMemo 2 (SM-2) spaced-repetition engine.
// One ConceptState object per concept the student is learning.
// This is the real differentiator vs. a plain chatbot: understanding is
// scored and scheduled, not just talked about.

export function newConcept(name) {
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2),
    name,
    repetitions: 0, // consecutive successful reviews
    easeFactor: 2.5, // how "easy" the concept is (floor 1.3)
    interval: 0, // days until the next review
    dueDate: new Date().toISOString(),
    lastQuality: null, // most recent 0-5 score
    history: [], // [{ quality, at }]
  };
}

// Apply one graded review (quality 0-5) and return the updated state.
export function reviewConcept(state, quality) {
  let { repetitions, easeFactor, interval } = state;

  if (quality < 3) {
    // failed recall: reset the streak, review again tomorrow
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  // adjust ease by how well it went
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const dueDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString();

  return {
    ...state,
    repetitions,
    easeFactor: Number(easeFactor.toFixed(2)),
    interval,
    dueDate,
    lastQuality: quality,
    history: [...state.history, { quality, at: new Date().toISOString() }],
  };
}

// 0-100 display score derived from the SM-2 internals, for the meter UI.
export function masteryPercent(state) {
  if (state.lastQuality === null) return 0;
  const qualityPart = (state.lastQuality / 5) * 60; // up to 60 from last recall
  const streakPart = (Math.min(state.repetitions, 4) / 4) * 25; // up to 25 from consistency
  const easePart = ((state.easeFactor - 1.3) / (2.5 - 1.3)) * 15; // up to 15 from ease
  return Math.round(Math.max(0, Math.min(100, qualityPart + streakPart + easePart)));
}

export function isDue(state) {
  return new Date(state.dueDate).getTime() <= Date.now();
}

export function statusOf(pct) {
  if (pct >= 75) return 'good';
  if (pct >= 40) return 'warn';
  return 'bad';
}
