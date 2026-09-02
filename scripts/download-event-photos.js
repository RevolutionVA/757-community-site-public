#!/usr/bin/env node

/**
 * Downloads the member-uploaded event photos harvested from Meetup's photo
 * albums (see social/event-photos/manifests/<group>.json, scraped via the
 * logged-in browser session — the album pages 307 to /login for anonymous
 * requests, but the meetupstatic CDN itself is public).
 *
 * Photos land in social/event-photos/<group>/<albumId>-<photoId>.jpeg.
 * Resume-safe: already-downloaded files are skipped.
 *
 * Run it with: node scripts/download-event-photos.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const photosRoot = path.join(ROOT, 'social', 'event-photos');
const manifestsDir = path.join(photosRoot, 'manifests');

const CONCURRENCY = 6;

async function downloadOne(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) {
    // highres_ occasionally 404s; the 600px rendition usually still exists
    if (url.includes('highres_')) {
      const fallback = url.replace('highres_', '600_');
      const res2 = await fetch(fallback);
      if (res2.ok) {
        fs.writeFileSync(outPath, Buffer.from(await res2.arrayBuffer()));
        return 'fallback-600';
      }
    }
    throw new Error(`HTTP ${res.status}`);
  }
  fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  return 'ok';
}

async function main() {
  const manifests = fs.readdirSync(manifestsDir).filter((f) => f.endsWith('.json'));
  const jobs = [];

  for (const file of manifests) {
    const group = JSON.parse(fs.readFileSync(path.join(manifestsDir, file), 'utf8'));
    const groupDir = path.join(photosRoot, group.slug.toLowerCase());
    fs.mkdirSync(groupDir, { recursive: true });
    for (const album of group.albums) {
      for (const photo of album.photos || []) {
        const ext = (photo.url.match(/\.(jpe?g|png|gif|webp)$/i) || [, 'jpeg'])[1].toLowerCase();
        const outPath = path.join(groupDir, `${album.id}-${photo.id}.${ext}`);
        if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) continue;
        jobs.push({ url: photo.url, outPath, group: group.slug });
      }
    }
  }

  console.log(`${jobs.length} photos to download across ${manifests.length} groups`);

  let done = 0;
  let failed = 0;
  let fallbacks = 0;
  const queue = [...jobs];

  async function worker() {
    while (queue.length) {
      const job = queue.shift();
      try {
        const result = await downloadOne(job.url, job.outPath);
        if (result === 'fallback-600') fallbacks++;
        done++;
      } catch (error) {
        console.error(`FAIL ${job.url}: ${error.message}`);
        failed++;
      }
      if ((done + failed) % 100 === 0) {
        console.log(`progress: ${done + failed}/${jobs.length} (${failed} failed)`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Done. Downloaded ${done} photos (${fallbacks} via 600px fallback), ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Download failed:', error);
  process.exit(1);
});
