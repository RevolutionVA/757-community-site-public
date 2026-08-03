import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

/**
 * Create a Bento broadcast DRAFT for the 757Tech Weekly newsletter.
 *
 * Reads the current week's weekly-meetups/<monday>-weekly-meetups-slack.txt
 * (or a file passed as the first argument), pulls Featured Events from
 * src/data/newsletter-featured.json, and renders the branded raw-HTML template.
 *
 * The broadcast is created as a draft (no `approved` flag) — review and send it
 * from the Bento dashboard.
 *
 * Usage (secrets resolved by 1Password CLI, see .env.example):
 *   op run --account revolutionva.1password.com --env-file .env -- \
 *     node scripts/create-bento-broadcast.js [slack.txt] [--exclude <url-substring>]... [--dry-run] [--html-out <file>]
 *
 * --exclude drops events whose Meetup URL contains the given substring
 *   (use for cancelled/unverifiable events found during link verification).
 * --preheader sets the inbox preview text (default: auto-generated from event titles).
 * --dry-run prints the payload without calling the API (no credentials needed).
 * --html-out writes the rendered HTML to a file for browser preview.
 *
 * Required env vars: BENTO_PUBLISHABLE_KEY, BENTO_SECRET_KEY, BENTO_SITE_UUID,
 * BENTO_FROM_EMAIL (must be an authorized author in Bento),
 * BENTO_SEGMENT_ID (audience segment, e.g. "757Tech Weekly Subscribed").
 * Optional: BENTO_FROM_NAME (default "757tech").
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const API_BASE = 'https://app.bentonow.com/api/v1';
const USER_AGENT = '757tech-site/1.0 (https://757tech.org)';

// Brand palette — matches the 757tech.org v3 redesign (design-reference/757tech-org-v3)
const BRAND = {
  deep: '#07314A', // header / headings
  tide: '#0AB6D6', // card accents
  coral: '#FF6F59', // links / CTAs
  ink: '#0c2536', // body text
  muted: '#5b7280',
  cardBg: '#FBF6EC', // sand-soft
  pageBg: '#F2E6CE', // sand
  line: '#e7ded0',
};

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) fail(`Missing required environment variable ${name} (run via: op run --account revolutionva.1password.com --env-file .env -- node scripts/create-bento-broadcast.js)`);
  return value;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stripEmoji(text) {
  return text.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

function dropLeadingZero(time) {
  return time.replace(/^0(\d:)/, '$1');
}

// Current week's Monday in Eastern Time (matches generate-weekly-meetups.js)
function currentMonday() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return monday;
}

// "757Tech Weekly - Week of July 13th, 2026" — matches existing Bento naming
function broadcastName(monday) {
  const day = monday.getDate();
  const suffix = [11, 12, 13].includes(day % 100) ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th';
  const month = monday.toLocaleString('en-US', { month: 'long' });
  return `757Tech Weekly - Week of ${month} ${day}${suffix}, ${monday.getFullYear()}`;
}

function defaultSourceFile(monday) {
  const iso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  return path.join(rootDir, 'weekly-meetups', `${iso}-weekly-meetups-slack.txt`);
}

// Parse the generator's slack.txt: day headings `*Tuesday, July 14*`, then per event
// `• *Title* - 04:30 PM` / group name / `<url> (Event Link)`.
function parseWeeklyFile(filePath) {
  if (!fs.existsSync(filePath)) fail(`Weekly file not found: ${filePath} — run: node scripts/generate-weekly-meetups.js`);
  const lines = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').split('\n');

  const days = [];
  let day = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const dayMatch = line.match(/^\*([A-Z][a-z]+, [A-Z][a-z]+ \d{1,2})\*$/);
    if (dayMatch && !dayMatch[1].startsWith('Meetups')) {
      day = { heading: dayMatch[1], events: [] };
      days.push(day);
      continue;
    }
    const eventMatch = line.match(/^• \*(.+)\* - (\d{2}:\d{2} [AP]M)$/);
    if (eventMatch && day) {
      const group = (lines[i + 1] || '').trim();
      const url = ((lines[i + 2] || '').trim().match(/^(\S+)/) || [])[1] || '';
      day.events.push({ title: stripEmoji(eventMatch[1]), time: dropLeadingZero(eventMatch[2]), group, url });
      i += 2;
    }
  }
  return days.filter((d) => d.events.length > 0);
}

// Featured Events = upcoming calendar entries flagged featuredEvent: true
// Optional weekly recap. Absent file just means nobody wrote one this week.
function loadRecap() {
  const file = path.join(rootDir, 'src', 'data', 'newsletter-recap.json');
  if (!fs.existsSync(file)) return null;
  try {
    const recap = JSON.parse(fs.readFileSync(file, 'utf8'));
    return recap.body?.length ? recap : null;
  } catch (err) {
    fail(`Could not parse src/data/newsletter-recap.json: ${err.message}`);
  }
}

function loadFeatured() {
  const file = path.join(rootDir, 'src', 'data', 'calendar-events.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const events = data.events || data;
  const now = new Date();

  const ordinal = (n) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
  const formatWhen = (startIso, endIso) => {
    const start = new Date(startIso);
    const month = start.toLocaleString('en-US', { month: 'long', timeZone: 'America/New_York' });
    const year = start.getFullYear();
    if (endIso) {
      const end = new Date(endIso);
      if (end.getDate() !== start.getDate()) return `${month} ${start.getDate()}-${ordinal(end.getDate())}, ${year}`;
    }
    return `${month} ${ordinal(start.getDate())}, ${year}`;
  };

  return events
    .filter((e) => e.featuredEvent && new Date(e.endDate || e.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((e) => ({
      name: stripEmoji(e.title),
      when: formatWhen(e.date, e.endDate),
      where: e.location || e.group || '',
      url: e.link,
    }));
}

/* ---------- template ---------- */

// v3 fonts with email-safe fallbacks: Baloo 2 / DM Sans load in Apple Mail via the
// @import below; Gmail and Outlook fall back to the system stack.
const bodyFont = `font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const headFont = `font-family:'Baloo 2','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;

function card({ title, metaLine, url, cta }) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px 0;">
      <tr>
        <td style="background:${BRAND.cardBg};border:1px solid ${BRAND.line};border-left:4px solid ${BRAND.tide};border-radius:0 6px 6px 0;padding:12px 16px;">
          <div style="${bodyFont};font-size:16px;font-weight:bold;color:${BRAND.ink};margin:0 0 2px 0;">${escapeHtml(title)}</div>
          <div style="${bodyFont};font-size:14px;color:${BRAND.muted};margin:0 0 6px 0;">${metaLine}</div>
          <a href="${url}" style="${bodyFont};font-size:14px;font-weight:bold;color:${BRAND.coral};text-decoration:underline;">${cta} &rarr;</a>
        </td>
      </tr>
    </table>`;
}

const eventCard = ({ title, time, group, url }) =>
  card({ title, metaLine: `${escapeHtml(time)} &middot; ${escapeHtml(group)}`, url, cta: 'View event' });

const featuredCard = ({ name, when, where, url }) =>
  card({ title: name, metaLine: `${escapeHtml(when)} &middot; ${escapeHtml(where)}`, url, cta: 'Learn more' });

function sectionHeading(text) {
  return `<h2 style="${headFont};font-size:22px;font-weight:bold;color:${BRAND.deep};border-bottom:2px solid ${BRAND.line};padding:0 0 6px 0;margin:28px 0 14px 0;">${escapeHtml(text)}</h2>`;
}

function dayHeading(text) {
  return `<h3 style="${headFont};font-size:16px;font-weight:bold;color:${BRAND.deep};text-transform:uppercase;letter-spacing:0.5px;margin:20px 0 10px 0;">${escapeHtml(text)}</h3>`;
}

function paragraph(html) {
  return `<p style="${bodyFont};font-size:16px;line-height:1.5;color:${BRAND.ink};margin:0 0 14px 0;">${html}</p>`;
}

// Attributed pull quote. Keeps the organizer's own words visibly theirs rather
// than absorbed into the newsletter's voice.
function quoteBlock({ text, attribution, role }) {
  const byline = [attribution, role].filter(Boolean).map(escapeHtml).join(', ');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
  <tr>
    <td style="background:${BRAND.cardBg};border-left:4px solid ${BRAND.tide};border-radius:0 6px 6px 0;padding:14px 18px;">
      <div style="${bodyFont};font-size:16px;line-height:1.55;color:${BRAND.ink};font-style:italic;margin:0 0 8px 0;">&ldquo;${escapeHtml(text)}&rdquo;</div>
      <div style="${bodyFont};font-size:14px;font-weight:bold;color:${BRAND.muted};">&mdash; ${byline}</div>
    </td>
  </tr>
</table>`;
}

// "What You Missed Last Week" recap, driven by src/data/newsletter-recap.json.
// Returns '' when the file is absent or empty so the newsletter degrades to the
// plain intro on weeks nobody writes one. Body entries are trusted HTML — this
// file is hand-authored, not scraped.
function recapSection(recap) {
  if (!recap || !recap.body?.length) return '';
  const meta = [recap.group, recap.date].filter(Boolean).map(escapeHtml).join(' &middot; ');
  const photos = (recap.photos || [])
    .map(
      (p) => `<img src="${p.src}" alt="${escapeHtml(p.alt || '')}" width="536"
           style="display:block;width:100%;max-width:536px;height:auto;border-radius:6px;border:0;margin:0 0 10px 0;">`
    )
    .join('');
  const credit = recap.photoCredit
    ? `<div style="${bodyFont};font-size:13px;color:${BRAND.muted};margin:0 0 14px 0;">${escapeHtml(recap.photoCredit)}</div>`
    : '';
  return (
    // Heading is optional — without one the recap reads as a casual intro
    // rather than a formal section.
    (recap.heading ? sectionHeading(recap.heading) : '') +
    (recap.eventTitle
      ? paragraph(
          `<strong>${escapeHtml(recap.eventTitle)}</strong>${meta ? `<br><span style="font-size:14px;color:${BRAND.muted};">${meta}</span>` : ''}`
        )
      : '') +
    photos +
    credit +
    // Quote sits after the opening paragraph so the lead sets context first.
    paragraph(recap.body[0]) +
    (recap.quote ? quoteBlock(recap.quote) : '') +
    recap.body.slice(1).map(paragraph).join('') +
    (recap.url ? paragraph(link(recap.url, 'See the event page')) : '')
  );
}

const link = (url, text) => `<a href="${url}" style="color:${BRAND.coral};font-weight:bold;text-decoration:underline;">${text || url}</a>`;

// Sign-off with headshot. Two-cell table rather than a float — Outlook's Word
// engine ignores float/border-radius, so it degrades to a square avatar beside
// the text instead of collapsing the layout.
function signature() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0 0;">
  <tr>
    <td width="72" valign="top" style="padding-right:14px;">
      <img src="https://757tech.org/images/kevin-griffin-headshot.jpg" width="72" height="72" alt="Kevin Griffin"
           style="display:block;width:72px;height:72px;border-radius:36px;border:0;outline:none;text-decoration:none;">
    </td>
    <td valign="middle" style="${bodyFont};font-size:16px;line-height:1.5;color:${BRAND.ink};">
      <strong>Kevin Griffin</strong><br>
      President, ${link('https://revolutionva.org', 'RevolutionVA')}
    </td>
  </tr>
</table>`;
}

// Default preheader if --preheader isn't passed: first few event titles + count
function defaultPreheader(days) {
  const events = days.flatMap((d) => d.events);
  const names = events.slice(0, 3).map((e) => e.title.split(/[|:—-]/)[0].trim());
  return `${names.join(', ')}, and more — ${events.length} meetups this week.`;
}

function renderHtml({ days, featured, recap }) {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700&family=DM+Sans:wght@400;700&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.pageBg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.pageBg};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:${BRAND.deep};padding:24px 32px;">
            <div style="${headFont};font-size:28px;font-weight:bold;color:#ffffff;">757tech</div>
            <div style="${bodyFont};font-size:14px;color:${BRAND.tide};">Your weekly round-up of tech events in the 757</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            ${paragraph('Happy Monday!')}
            ${recap ? recapSection(recap) : paragraph(`Thanks for subscribing to 757Tech Weekly. ${link('https://revolutionva.org', 'RevolutionVA')}, the organizers behind Hampton Roads DevFest and RevolutionConf, support this weekly round-up of local tech events.`)}
            ${featured.length ? sectionHeading('Featured Events') + paragraph('Keep these events on your radar!') + featured.map(featuredCard).join('') : ''}
            ${sectionHeading('This Week in the 757')}
            ${days.map((d) => dayHeading(d.heading) + d.events.map(eventCard).join('')).join('')}
            ${sectionHeading('Are we missing something?')}
            ${paragraph(`These events are listed on ${link('https://757tech.org', '757tech.org')}, the front door for developers and technologists in Hampton Roads. We source our events directly from local meetups and our local Slack channel. Please reply if you know of an event we should add to our list!`)}
            ${paragraph(`This round-up is supported by ${link('https://revolutionva.org', 'RevolutionVA')}, the organizers behind Hampton Roads DevFest and RevolutionConf. If you have a meetup idea you'd like to try out, hit reply — we have the resources to help you get it off the ground.`)}
            ${paragraph('Have a great week!')}
            ${signature()}
          </td>
        </tr>
        <tr>
          <td style="background:${BRAND.cardBg};border-top:1px solid ${BRAND.line};padding:20px 32px;">
            <div style="${bodyFont};font-size:13px;line-height:1.5;color:${BRAND.muted};">
              You're receiving this because you subscribed at <a href="https://757tech.org" style="color:${BRAND.muted};text-decoration:underline;">757tech.org</a>.<br>
              RevolutionVA &middot; 109 G Gainsborough Square BOX 262, Chesapeake, VA 23320<br>
              <a href="{{ visitor.unsubscribe_url }}" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ---------- main ---------- */

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const htmlOutIdx = args.indexOf('--html-out');
  const htmlOut = htmlOutIdx !== -1 ? args[htmlOutIdx + 1] : null;
  const preheaderIdx = args.indexOf('--preheader');
  const preheaderArg = preheaderIdx !== -1 ? args[preheaderIdx + 1] : null;
  const excludes = [];
  for (let i = 0; i < args.length; i++) if (args[i] === '--exclude') excludes.push(args[++i]);
  const flagsWithValues = ['--exclude', '--html-out', '--preheader'];
  const positional = args.filter((a, i) => !a.startsWith('--') && !flagsWithValues.includes(args[i - 1]));

  const monday = currentMonday();
  const sourceFile = positional[0] || defaultSourceFile(monday);

  let days = parseWeeklyFile(sourceFile);
  for (const ex of excludes) {
    days = days.map((d) => ({ ...d, events: d.events.filter((e) => !e.url.includes(ex)) })).filter((d) => d.events.length > 0);
  }
  const eventCount = days.reduce((n, d) => n + d.events.length, 0);
  if (eventCount === 0) fail(`No events left after parsing/exclusions in ${sourceFile}`);

  const preheader = preheaderArg || defaultPreheader(days);
  const html = renderHtml({ days, featured: loadFeatured(), recap: loadRecap() });
  console.log(`Preview text: ${preheader}`);
  if (htmlOut) {
    fs.writeFileSync(htmlOut, html);
    console.log(`HTML preview written to ${htmlOut}`);
  }

  const name = broadcastName(monday);
  const payload = {
    broadcasts: [
      {
        name,
        subject: name,
        content: html,
        type: 'raw',
        from: {
          email: dryRun ? (process.env.BENTO_FROM_EMAIL || 'dry-run@example.com') : requireEnv('BENTO_FROM_EMAIL'),
          name: process.env.BENTO_FROM_NAME || '757tech',
        },
        inbox_snippet: preheader,
        segment_id: dryRun ? (process.env.BENTO_SEGMENT_ID || '') : requireEnv('BENTO_SEGMENT_ID'),
        batch_size_per_hour: 100,
        // no `approved` flag: broadcast is created as a DRAFT for manual review
      },
    ],
  };

  console.log(`${eventCount} events across ${days.length} days from ${path.basename(sourceFile)}${excludes.length ? ` (excluded: ${excludes.join(', ')})` : ''}`);

  if (dryRun) {
    console.log(`Dry run — would create draft "${name}" (${Math.round(html.length / 1024)} KB HTML). Use --html-out to preview.`);
    return;
  }

  const auth = Buffer.from(`${requireEnv('BENTO_PUBLISHABLE_KEY')}:${requireEnv('BENTO_SECRET_KEY')}`).toString('base64');
  const response = await fetch(`${API_BASE}/batch/broadcasts?site_uuid=${encodeURIComponent(requireEnv('BENTO_SITE_UUID'))}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) fail(`Bento API returned ${response.status}: ${text}`);

  let result;
  try {
    result = JSON.parse(text);
  } catch {
    fail(`Unexpected non-JSON response from Bento: ${text}`);
  }
  if (result.failed > 0 || (result.failures && result.failures.length > 0)) {
    fail(`Bento rejected the broadcast: ${JSON.stringify(result.failures || result)}`);
  }

  console.log('✅ Broadcast draft created — review and send it from the Bento dashboard.');
  console.log(text);
}

main().catch((err) => fail(err.message));
