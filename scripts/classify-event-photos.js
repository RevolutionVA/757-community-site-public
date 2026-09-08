#!/usr/bin/env node

/**
 * Classifies the scraped member photos (social/event-photos/) with the
 * qwen3-vl vision model on the Mac Mini's Ollama, so headshots, people-less
 * shots, and promo graphics can be culled from the archive.
 *
 * Writes verdicts incrementally to social/event-photos/classification.json
 * (resume-safe: already-classified files are skipped on re-run).
 *
 * Run it with: node scripts/classify-event-photos.js [--limit N]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const photosRoot = path.join(ROOT, 'social', 'event-photos');
const resultsPath = path.join(photosRoot, 'classification.json');

const OLLAMA = 'http://192.168.0.142:11434';
const MODEL = 'qwen3-vl:30b-a3b-instruct-q4_K_M';

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const PROMPT = `Classify this photo from a tech meetup's photo album. Reply with exactly one word:

EVENT - a real photograph showing one or more people at a meetup or event (audience, a speaker presenting, groups mingling, candid shots)
HEADSHOT - a posed portrait or professional headshot of a single person filling most of the frame
NOPEOPLE - a photograph with no people visible (empty room, food, swag, equipment, scenery)
GRAPHIC - not a photograph: a flyer, poster, presentation slide, screenshot, meme, logo, or illustration (even if faces appear on it)

Answer with only the single word.`;

async function classify(filePath) {
  const image = await sharp(filePath)
    .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const res = await fetch(`${OLLAMA}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt: PROMPT,
      images: [image.toString('base64')],
      stream: false,
      options: { temperature: 0, num_predict: 10 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  const word = (data.response || '').trim().toUpperCase().match(/EVENT|HEADSHOT|NOPEOPLE|GRAPHIC/);
  return word ? word[0] : `UNPARSED:${(data.response || '').trim().slice(0, 40)}`;
}

async function main() {
  const results = fs.existsSync(resultsPath) ? JSON.parse(fs.readFileSync(resultsPath, 'utf8')) : {};

  const files = [];
  for (const group of fs.readdirSync(photosRoot)) {
    const dir = path.join(photosRoot, group);
    if (group === 'manifests' || group.startsWith('_') || !fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(jpe?g|png|gif|webp)$/i.test(f)) continue;
      const rel = `${group}/${f}`;
      if (!results[rel]) files.push(rel);
    }
  }

  const todo = files.slice(0, LIMIT);
  console.log(`${todo.length} photos to classify (${Object.keys(results).length} already done)`);

  let n = 0;
  const started = Date.now();
  for (const rel of todo) {
    try {
      results[rel] = await classify(path.join(photosRoot, rel));
    } catch (error) {
      console.error(`FAIL ${rel}: ${error.message}`);
      results[rel] = `ERROR:${error.message.slice(0, 60)}`;
    }
    n++;
    if (n % 25 === 0 || n === todo.length) {
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 1));
      const rate = n / ((Date.now() - started) / 1000);
      const eta = Math.round((todo.length - n) / rate / 60);
      console.log(`progress: ${n}/${todo.length} (${rate.toFixed(1)}/s, ~${eta}m left)`);
    }
  }

  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 1));
  const tally = {};
  for (const v of Object.values(results)) tally[v.split(':')[0]] = (tally[v.split(':')[0]] || 0) + 1;
  console.log('Done. Tally:', JSON.stringify(tally));
}

main().catch((error) => {
  console.error('Classification failed:', error);
  process.exit(1);
});
