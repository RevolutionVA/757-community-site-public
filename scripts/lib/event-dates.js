const ordinal = (n) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;

// Date parts in Eastern time — getDate() would use the runner's zone (UTC in CI),
// pushing evening events that end after 8 PM ET onto the next day.
const easternParts = (iso) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric',
  }).formatToParts(new Date(iso));
  const get = (type) => parts.find((p) => p.type === type).value;
  return { year: get('year'), month: get('month'), day: Number(get('day')) };
};

// "October 22nd, 2026", "October 22-23rd, 2026", or "October 31st-November 1st, 2026".
export function formatEventWhen(startIso, endIso) {
  const start = easternParts(startIso);
  if (endIso) {
    const end = easternParts(endIso);
    if (end.month !== start.month) return `${start.month} ${ordinal(start.day)}-${end.month} ${ordinal(end.day)}, ${end.year}`;
    if (end.day !== start.day) return `${start.month} ${start.day}-${ordinal(end.day)}, ${start.year}`;
  }
  return `${start.month} ${ordinal(start.day)}, ${start.year}`;
}
