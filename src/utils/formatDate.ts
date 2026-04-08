export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'America/New_York' });
  const dayNum = date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'America/New_York' });
  return `${day} ${month} ${dayNum}`;
}

export function formatConfDate(dateString: string): string {
  const d = new Date(dateString.includes('T') ? dateString : `${dateString}T12:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
