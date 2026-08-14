import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

/**
 * Create a Bento broadcast DRAFT for the 757tech Monthly newsletter.
 *
 * Sibling to create-bento-broadcast.js (the weekly). The weekly is derived from
 * calendar data; the monthly is editorial, so its content comes from a
 * hand-authored social/newsletter/<issue>/content.json instead. Both share the
 * same brand palette and card vocabulary so the two emails read as one family.
 *
 * The broadcast is created as a draft (no `approved` flag) — review and send it
 * from the Bento dashboard.
 *
 * Usage (secrets resolved by 1Password CLI, see .env.example):
 *   op run --account revolutionva.1password.com --env-file .env -- \
 *     node scripts/create-monthly-broadcast.js [issue] [--dry-run] [--html-out <file>] [--preheader <text>]
 *
 * `issue` is a folder name under social/newsletter/ (default: the newest one).
 * --preheader overrides the inbox preview text from content.json.
 * --dry-run prints the payload without calling the API (no credentials needed).
 * --html-out writes the rendered HTML to a file for browser preview.
 *
 * Required env vars: BENTO_PUBLISHABLE_KEY, BENTO_SECRET_KEY, BENTO_SITE_UUID,
 * BENTO_FROM_EMAIL (must be an authorized author in Bento),
 * BENTO_MONTHLY_SEGMENT_ID (audience segment — the monthly goes to all
 * RevolutionVA contacts, NOT the weekly's subscriber segment).
 * Optional: BENTO_FROM_NAME (default "757tech").
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const API_BASE = 'https://app.bentonow.com/api/v1';
const USER_AGENT = '757tech-site/1.0 (https://757tech.org)';

// Brand palette — kept in sync with create-bento-broadcast.js
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

// Email content width: 600px shell minus 32px padding on each side.
const CONTENT_WIDTH = 536;

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) fail(`Missing required environment variable ${name} (run via: op run --account revolutionva.1password.com --env-file .env -- node scripts/create-monthly-broadcast.js)`);
  return value;
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------- content ---------- */

// Newest issue folder under social/newsletter/ that has a content.json.
function defaultIssue() {
  const dir = path.join(rootDir, 'social', 'newsletter');
  if (!fs.existsSync(dir)) fail(`No newsletter directory at ${dir}`);
  const issues = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'content.json')))
    .map((d) => d.name)
    .sort();
  if (!issues.length) fail(`No issue folder under ${dir} contains a content.json`);
  return issues[issues.length - 1];
}

function loadContent(issue) {
  const file = path.join(rootDir, 'social', 'newsletter', issue, 'content.json');
  if (!fs.existsSync(file)) fail(`Content file not found: ${file}`);
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const key of ['broadcastName', 'subject', 'happening']) {
    if (!content[key]) fail(`content.json is missing required field "${key}"`);
  }
  return content;
}

// Social URLs live in src/data/community.ts so the newsletter can't drift from
// the site. Parsed rather than imported — the file is TypeScript and this script
// runs as plain ESM under node with no build step.
function loadCommunityLinks() {
  const file = path.join(rootDir, 'src', 'data', 'community.ts');
  if (!fs.existsSync(file)) fail(`Community links not found: ${file}`);
  const source = fs.readFileSync(file, 'utf8');
  const links = {};
  for (const [, key, url] of source.matchAll(/(\w+):\s*"([^"]+)"/g)) links[key] = url;
  for (const key of ['slack', 'discord', 'linkedin', 'bluesky', 'x', 'instagram', 'threads']) {
    if (!links[key]) fail(`community.ts is missing the "${key}" URL`);
  }
  return links;
}

/* ---------- template ---------- */

// v3 fonts with email-safe fallbacks: Baloo 2 / DM Sans load in Apple Mail via
// the @import below; Gmail and Outlook fall back to the system stack.
const bodyFont = `font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const headFont = `font-family:'Baloo 2','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;

const link = (url, text) =>
  `<a href="${url}" style="color:${BRAND.coral};font-weight:bold;text-decoration:underline;">${text || url}</a>`;

// Rewrite markdown-style [text](url) into branded anchors. Content files use the
// short form so link styling lives here rather than being copy-pasted into every
// issue — change the palette once and past issues re-render correctly.
function inlineLinks(html) {
  return html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, text, url) => link(url, text));
}

// Body copy in content.json is trusted HTML — the file is hand-authored, not
// scraped — so entity escaping would mangle the intended <em>/<strong> markup.
function paragraph(html) {
  return `<p style="${bodyFont};font-size:16px;line-height:1.5;color:${BRAND.ink};margin:0 0 14px 0;">${inlineLinks(html)}</p>`;
}

function sectionHeading(text) {
  return `<h2 style="${headFont};font-size:22px;font-weight:bold;color:${BRAND.deep};border-bottom:2px solid ${BRAND.line};padding:0 0 6px 0;margin:28px 0 14px 0;">${escapeHtml(text)}</h2>`;
}

function itemHeading(text) {
  return `<h3 style="${headFont};font-size:18px;font-weight:bold;color:${BRAND.deep};margin:22px 0 10px 0;">${escapeHtml(text)}</h3>`;
}

// Full-width image, optionally wrapped in a link. Width/height are set as
// attributes as well as CSS because Outlook's Word engine ignores the latter.
function image({ src, alt, href, height }) {
  const tag = `<img src="${src}" alt="${escapeHtml(alt || '')}" width="${CONTENT_WIDTH}"${height ? ` height="${height}"` : ''}
           style="display:block;width:100%;max-width:${CONTENT_WIDTH}px;height:auto;border-radius:6px;border:0;outline:none;text-decoration:none;margin:0 0 14px 0;">`;
  return href ? `<a href="${href}" style="text-decoration:none;">${tag}</a>` : tag;
}

// When / price / CTA block for a featured event. Italic date line matches the
// draft; the CTA is a bold coral link rather than a button so it survives
// Outlook without VML.
function eventDetails({ when, price, url, ctaLabel }) {
  const priceLine = price
    ? `<div style="${bodyFont};font-size:15px;color:${BRAND.ink};margin:0 0 8px 0;">${escapeHtml(price)}</div>`
    : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px 0;">
      <tr>
        <td style="background:${BRAND.cardBg};border:1px solid ${BRAND.line};border-left:4px solid ${BRAND.tide};border-radius:0 6px 6px 0;padding:12px 16px;">
          <div style="${bodyFont};font-size:15px;font-style:italic;color:${BRAND.muted};margin:0 0 4px 0;">${escapeHtml(when)}</div>
          ${priceLine}
          ${link(url, `${escapeHtml(ctaLabel || 'Learn more')} &rarr;`)}
        </td>
      </tr>
    </table>`;
}

function happeningItem(item) {
  return (
    itemHeading(item.title) +
    (item.lead ? paragraph(item.lead) : '') +
    (item.image ? image({ src: item.image, alt: item.imageAlt, href: item.imageLink }) : '') +
    eventDetails(item) +
    (item.body || []).map(paragraph).join('') +
    (item.videoLink ? paragraph(link(item.videoLink.url, `${escapeHtml(item.videoLink.label)} &rarr;`)) : '')
  );
}

function missedSection(missed) {
  if (!missed) return '';
  return (
    sectionHeading(missed.heading) +
    (missed.title ? itemHeading(missed.title) : '') +
    (missed.body || []).map(paragraph).join('') +
    (missed.photo ? image({ src: missed.photo, alt: missed.photoAlt }) : '') +
    (missed.bodyAfterPhoto || []).map(paragraph).join('') +
    (missed.video
      ? image({ src: missed.video.image, alt: missed.video.imageAlt, href: missed.video.url }) +
        paragraph(link(missed.video.url, `${escapeHtml(missed.video.label)} &rarr;`))
      : '')
  );
}

// Bulleted social list. The "social" row is a single line of four links, matching
// the draft, so the secondary platforms don't each claim a full bullet.
function stayInTouch(section, links) {
  if (!section) return '';
  const urlFor = {
    slack: links.slack,
    discord: links.discord,
    linkedin: links.linkedin,
    site: 'https://757tech.org',
  };
  const socialRow = [
    link(links.bluesky, 'Bluesky'),
    link(links.x, 'X'),
    link(links.instagram, 'Instagram'),
    link(links.threads, 'Threads'),
  ].join(' &middot; ');

  const rows = section.items.map((item) => {
    const label = item.key === 'social' ? socialRow : link(urlFor[item.key], escapeHtml(item.label));
    const note = item.note ? ` &mdash; ${escapeHtml(item.note)}` : '';
    return `<li style="${bodyFont};font-size:16px;line-height:1.5;color:${BRAND.ink};margin:0 0 8px 0;">${label}${note}</li>`;
  });

  return (
    sectionHeading(section.heading) +
    (section.lead ? paragraph(escapeHtml(section.lead)) : '') +
    `<ul style="margin:0 0 14px 0;padding:0 0 0 22px;">${rows.join('')}</ul>`
  );
}

const HEADSHOT = 'https://757tech.org/images/kevin-griffin-headshot.jpg';

function headshot(size) {
  return `<img src="${HEADSHOT}" width="${size}" height="${size}" alt="Kevin Griffin"
           style="display:block;width:${size}px;height:${size}px;border-radius:${size / 2}px;border:0;outline:none;text-decoration:none;">`;
}

// Avatar beside text. Two-cell table rather than a float — Outlook's Word engine
// ignores float/border-radius, so it degrades to a square avatar next to the text
// instead of collapsing the layout. Shared by the intro and the sign-off so the
// two portraits stay visually consistent.
function avatarBlock({ size, body, margin }) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:${margin};">
  <tr>
    <td width="${size}" valign="top" style="padding-right:14px;">
      ${headshot(size)}
    </td>
    <td valign="middle" style="${bodyFont};font-size:16px;line-height:1.5;color:${BRAND.ink};">
      ${body}
    </td>
  </tr>
</table>`;
}

function signature() {
  return avatarBlock({
    size: 72,
    margin: '22px 0 0 0',
    body: `<strong>${link('https://www.linkedin.com/in/1kevgriff/', 'Kevin Griffin')}</strong><br>
      President, ${link('https://revolutionva.org', 'RevolutionVA')}`,
  });
}

function renderHtml(content, links, preheader) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700&family=DM+Sans:wght@400;700&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.pageBg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.pageBg};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:${BRAND.deep};padding:24px 32px;">
            <div style="${headFont};font-size:28px;font-weight:bold;color:#ffffff;">757tech Monthly</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
              <tr>
                <td style="border-left:3px solid ${BRAND.line};padding:2px 0 2px 14px;">
                  <div style="${bodyFont};font-size:14px;line-height:1.5;color:${BRAND.muted};">${escapeHtml(content.disclaimer || '')}</div>
                </td>
              </tr>
            </table>
            ${avatarBlock({
              size: 80,
              margin: '0 0 18px 0',
              body: (content.greeting || []).map((p) => paragraph(escapeHtml(p))).join(''),
            })}
            ${sectionHeading(content.happening.heading)}
            ${content.happening.items.map(happeningItem).join('')}
            ${missedSection(content.missed)}
            ${stayInTouch(content.stayInTouch, links)}
            ${paragraph(escapeHtml(content.signoff || ''))}
            ${signature()}
          </td>
        </tr>
        <tr>
          <td style="background:${BRAND.cardBg};border-top:1px solid ${BRAND.line};padding:20px 32px;">
            <div style="${bodyFont};font-size:13px;line-height:1.5;color:${BRAND.muted};">
              ${escapeHtml(content.footerReason || '')}<br>
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
  const flagsWithValues = ['--html-out', '--preheader'];
  const valueOf = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  const htmlOut = valueOf('--html-out');
  const preheaderOverride = valueOf('--preheader');
  const positional = args.filter((a, i) => !a.startsWith('--') && !flagsWithValues.includes(args[i - 1]));

  const issue = positional[0] || defaultIssue();
  const content = loadContent(issue);
  const links = loadCommunityLinks();
  const preheader = preheaderOverride || content.preheader || '';
  const html = renderHtml(content, links, preheader);

  if (htmlOut) {
    fs.writeFileSync(htmlOut, html);
    console.log(`📄 Wrote preview HTML to ${htmlOut}`);
  }

  const payload = {
    broadcasts: [
      {
        name: content.broadcastName,
        subject: content.subject,
        content: html,
        type: 'plain',
        from: {
          email: dryRun ? process.env.BENTO_FROM_EMAIL || '' : requireEnv('BENTO_FROM_EMAIL'),
          name: process.env.BENTO_FROM_NAME || '757tech',
        },
        inclusive_tags: '',
        exclusive_tags: '',
        segment_id: dryRun ? process.env.BENTO_MONTHLY_SEGMENT_ID || '' : requireEnv('BENTO_MONTHLY_SEGMENT_ID'),
        batch_size_per_hour: 100,
      },
    ],
  };

  console.log(`📰 Issue ${issue} — "${content.subject}"`);
  console.log(`   ${content.happening.items.length} featured item(s), ${Math.round(html.length / 1024)} KB HTML`);

  if (dryRun) {
    console.log(`Dry run — would create draft "${content.broadcastName}". No API call made.`);
    if (!htmlOut) console.log('Use --html-out <file> to write a browser preview.');
    return;
  }

  const siteUuid = requireEnv('BENTO_SITE_UUID');
  const auth = Buffer.from(`${requireEnv('BENTO_PUBLISHABLE_KEY')}:${requireEnv('BENTO_SECRET_KEY')}`).toString('base64');
  const response = await fetch(`${API_BASE}/batch/broadcasts?site_uuid=${siteUuid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) fail(`Bento API ${response.status}: ${text}`);
  console.log(`✅ Created draft "${content.broadcastName}" — review and send it from the Bento dashboard.`);
  console.log(text);
}

main().catch((error) => fail(error.message));
