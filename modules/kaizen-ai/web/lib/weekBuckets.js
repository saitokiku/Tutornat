// Pure day-bucketing for the WeekStrip: 7 buckets starting today, each
// session dropped into its local day. No I/O and no timezone database: the
// strip renders in the server's zone, which matches how session times are
// shown everywhere else on the storefront (toLocaleString over ISO strings).
export function bucketWeek(sessions = [], now = new Date()) {
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const today = startOfDay(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() + i * 86400000);
    return {
      key: date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date,
      isToday: i === 0,
      sessions: [],
    };
  });
  const sorted = [...sessions].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  for (const s of sorted) {
    // Calendar-day distance, DST-safe: compare day starts, round the quotient.
    const idx = Math.round((startOfDay(new Date(s.start)).getTime() - today.getTime()) / 86400000);
    if (idx >= 0 && idx < 7) days[idx].sessions.push(s);
  }
  return days;
}
