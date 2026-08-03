#!/usr/bin/env node
/**
 * Generate a social image carousel (1080x1350) for the week's meetups.
 *
 * Reads the curated weekly file: weekly-meetups/<monday>-weekly-meetups.md
 * Renders one cover slide + one slide per event onto the wave background,
 * keeping all text inside the cross-platform safe zone.
 *
 * Usage:
 *   npm run generate-carousel                    # current week's Monday
 *   npm run generate-carousel -- --week 2026-07-20
 *
 * Output: social/exports/<monday>/slide-NN-*.png
 */

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKGROUND = path.join(ROOT, 'social', 'backgrounds', 'connect-the-waves.png');

// Canvas + safe zone (see social/backgrounds — master is 2160x2160; the
// center 16:9 band is y 475-1685, the 4:5 crop keeps x 216-1944)
const SIZE = 2160;
const CROP_4x5 = { left: 216, top: 0, width: 1728, height: 2160 };
const OUT_W = 1080;
const OUT_H = 1350;

const NAVY = '#12344a';
const TEAL = '#176f82';
const NAVY_SOFT = 'rgba(18,52,74,0.78)';
const FONT = "'Segoe UI', Arial, sans-serif";

// ---------- CLI ----------

function getMonday(arg) {
  if (arg) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
      console.error(`❌ Invalid --week date: ${arg} (expected YYYY-MM-DD)`);
      process.exit(1);
    }
    return arg;
  }
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  const pad = (n) => String(n).padStart(2, '0');
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

// ---------- Parsing ----------

function stripEmoji(text) {
  return text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseWeeklyFile(markdown) {
  const events = [];
  let currentDay = null;
  let current = null;

  for (const line of markdown.split('\n')) {
    const dayMatch = line.match(/^### (\w+), (.+)$/);
    if (dayMatch) {
      currentDay = { weekday: dayMatch[1], date: dayMatch[2].trim() };
      continue;
    }
    const titleMatch = line.match(/^#### (.+)$/);
    if (titleMatch) {
      current = { title: stripEmoji(titleMatch[1]), day: currentDay, time: '', group: '' };
      events.push(current);
      continue;
    }
    if (!current) continue;
    const timeMatch = line.match(/^- \*\*Time:\*\* (.+)$/);
    if (timeMatch) current.time = timeMatch[1].trim().replace(/^0(\d:)/, '$1');
    const groupMatch = line.match(/^- \*\*Group:\*\* (.+)$/);
    if (groupMatch) current.group = groupMatch[1].trim();
  }
  return events;
}

function formatWeekRange(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const monday = new Date(y, m - 1, d);
  const sunday = new Date(y, m - 1, d + 6);
  const month = (dt) => dt.toLocaleString('en-US', { month: 'long' });
  if (monday.getMonth() === sunday.getMonth()) {
    return `${month(monday)} ${monday.getDate()}–${sunday.getDate()}, ${sunday.getFullYear()}`;
  }
  return `${month(monday)} ${monday.getDate()} – ${month(sunday)} ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

// ---------- SVG text ----------

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// Greedy word-wrap using an average glyph-width estimate for Segoe UI Bold.
function wrapText(text, fontSize, maxWidth) {
  const avg = fontSize * 0.55;
  const maxChars = Math.floor(maxWidth / avg);
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Pick the largest font size that fits the title in <= maxLines lines.
function fitTitle(text, maxWidth, maxLines) {
  for (const size of [124, 110, 96, 84, 72]) {
    const lines = wrapText(text, size, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = 72;
  const lines = wrapText(text, size, maxWidth).slice(0, maxLines);
  lines[maxLines - 1] += '…';
  return { size, lines };
}

function textEl(content, { x = SIZE / 2, y, size, color, weight = 'bold', spacing = null }) {
  const ls = spacing ? ` letter-spacing="${spacing}"` : '';
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="middle"${ls}>${escapeXml(content)}</text>`;
}

function svgCanvas(elements) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">${elements.join('')}</svg>`
  );
}

// ---------- Slide rendering ----------

async function renderSlide(overlaySvg, logoLayer, outPath) {
  const composites = [{ input: svgCanvas(overlaySvg), left: 0, top: 0 }];
  if (logoLayer) composites.push(logoLayer);
  // Composite at full master size first — sharp applies composite() after
  // resize(), so cropping in the same pipeline would reject the overlays.
  const master = await sharp(BACKGROUND).composite(composites).png().toBuffer();
  await sharp(master).extract(CROP_4x5).resize(OUT_W, OUT_H).png().toFile(outPath);
}

async function main() {
  // Accept "--week YYYY-MM-DD" or a bare date (npm can strip the flag)
  const dateArg = process.argv.slice(2).find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
  const monday = getMonday(dateArg);

  const weeklyFile = path.join(ROOT, 'weekly-meetups', `${monday}-weekly-meetups.md`);
  if (!fs.existsSync(weeklyFile)) {
    console.error(`❌ Weekly file not found: weekly-meetups/${monday}-weekly-meetups.md`);
    console.error('   Run the weekly-meetups workflow first, or pass --week YYYY-MM-DD (a Monday).');
    process.exit(1);
  }

  const events = parseWeeklyFile(fs.readFileSync(weeklyFile, 'utf8'));
  if (events.length === 0) {
    console.error('❌ No events parsed from the weekly file.');
    process.exit(1);
  }

  const outDir = path.join(ROOT, 'social', 'exports', monday);
  fs.mkdirSync(outDir, { recursive: true });

  // --- Cover slide ---
  const coverPath = path.join(outDir, 'slide-01-cover.png');
  await renderSlide(
    [
      textEl('757TECH · MEETUPS', { y: 620, size: 58, color: TEAL, spacing: 10 }),
      textEl('This Week', { y: 880, size: 200, color: NAVY }),
      textEl(formatWeekRange(monday), { y: 1030, size: 84, color: TEAL }),
      textEl(`${events.length} meetups — swipe for the lineup →`, { y: 1190, size: 60, color: NAVY_SOFT, weight: 'normal' }),
      textEl('757tech.org', { y: 2010, size: 58, color: NAVY_SOFT }),
    ],
    null,
    coverPath
  );
  console.log(`  slide-01-cover.png`);

  // --- Event slides ---
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const eyebrow = `${ev.day.weekday.toUpperCase()}, ${ev.day.date.toUpperCase()} · ${ev.time}`;
    const { size, lines } = fitTitle(ev.title, 1560, 3);
    const lineHeight = size * 1.2;
    const titleTop = 760;
    const overlay = [
      textEl(eyebrow, { y: 600, size: 58, color: TEAL, spacing: 4 }),
      ...lines.map((line, n) => textEl(line, { y: titleTop + n * lineHeight, size, color: NAVY })),
      textEl(ev.group, {
        y: titleTop + lines.length * lineHeight + 80,
        size: Math.min(68, Math.floor(1560 / (ev.group.length * 0.55))),
        color: TEAL,
      }),
      textEl('757tech.org', { y: 2010, size: 58, color: NAVY_SOFT }),
    ];
    const slug = ev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    const file = `slide-${String(i + 2).padStart(2, '0')}-${slug}.png`;
    await renderSlide(overlay, null, path.join(outDir, file));
    console.log(`  ${file}`);
  }

  console.log(`✅ ${events.length + 1} slides written to social/exports/${monday}/`);
}

main().catch((err) => {
  console.error('❌ Carousel generation failed:', err.message);
  process.exit(1);
});
