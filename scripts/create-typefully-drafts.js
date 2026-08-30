import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

/**
 * Create Typefully DRAFTS for the weekly 757tech meetup posts.
 *
 * Reads a JSON payload of already-verified, already-formatted posts (produced by
 * the weekly-meetups workflow, after link verification and dedup) and pushes one
 * draft per platform to Typefully.
 *
 * Typefully's v2 API covers x / linkedin / threads / bluesky. Instagram, Slack,
 * Discord and the Bento newsletter are NOT supported and stay manual.
 *
 * Drafts are created as drafts: no `publish_at` or `plan_at` is sent unless you
 * pass --plan or --publish-at, so nothing can go out without review.
 *
 * Usage (secret resolved by 1Password CLI, see .env.example):
 *   op run --account revolutionva.1password.com --env-file .env -- \
 *     node scripts/create-typefully-drafts.js <posts.json> [--only x,bluesky] [--plan <when>] [--dry-run]
 *
 * <posts.json> shape:
 *   {
 *     "title": "757tech Meetups — Aug 31–Sep 6",
 *     "posts": { "x": "...", "linkedin": "...", "threads": "...", "bluesky": "..." },
 *     "scratchpad": "optional internal notes, e.g. the LinkedIn first comment"
 *   }
 *
 * --only  restricts to a comma-separated subset of platforms.
 * --plan  sets `plan_at` (dated but inert; still needs confirmation in Typefully).
 *         Accepts an ISO-8601 datetime or "next-free-slot".
 * --publish-at sets `publish_at` — a real schedule. Refused unless --i-mean-it
 *         is also passed, so a typo can't auto-publish the week.
 * --dry-run prints the payloads without calling the API (no credentials needed).
 *
 * Required env: TYPEFULLY_API_KEY. Optional: TYPEFULLY_SOCIAL_SET_ID
 * (otherwise the only social set on the account is used; ambiguity is an error).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_BASE = 'https://api.typefully.com/v2';
const SUPPORTED = ['x', 'linkedin', 'threads', 'bluesky'];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    fail(`Missing required environment variable ${name} (run via: op run --account revolutionva.1password.com --env-file .env -- node scripts/create-typefully-drafts.js ...)`);
  }
  return value;
}

async function api(pathname, { method = 'GET', body, key }) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    fail(`Typefully ${method} ${pathname} → ${res.status} ${res.statusText}\n${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function resolveSocialSetId(key) {
  if (process.env.TYPEFULLY_SOCIAL_SET_ID) return process.env.TYPEFULLY_SOCIAL_SET_ID;
  const data = await api('/social-sets', { key });
  const sets = data.results || [];
  if (sets.length === 0) fail('No social sets on this Typefully account.');
  if (sets.length > 1) {
    const list = sets.map((s) => `  ${s.id}  ${s.name} (@${s.username})`).join('\n');
    fail(`Multiple social sets found — set TYPEFULLY_SOCIAL_SET_ID to one of:\n${list}`);
  }
  return sets[0].id;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const iMeanIt = args.includes('--i-mean-it');

  const flag = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? null : args[i + 1];
  };

  const only = flag('--only');
  const planAt = flag('--plan');
  const publishAt = flag('--publish-at');

  if (publishAt && !iMeanIt) {
    fail('--publish-at schedules a real post. Re-run with --i-mean-it if that is what you want (use --plan for an inert dated draft).');
  }
  if (planAt && publishAt) fail('--plan and --publish-at are mutually exclusive.');

  const payloadPath = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--only' && args[i - 1] !== '--plan' && args[i - 1] !== '--publish-at');
  if (!payloadPath) fail('Pass the posts JSON file as the first argument.');
  const resolved = path.resolve(payloadPath);
  if (!fs.existsSync(resolved)) fail(`Posts file not found: ${resolved}`);

  const payload = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const wanted = only ? only.split(',').map((s) => s.trim().toLowerCase()) : SUPPORTED;

  const unknown = wanted.filter((p) => !SUPPORTED.includes(p));
  if (unknown.length) fail(`Unsupported platform(s): ${unknown.join(', ')}. Typefully's API covers: ${SUPPORTED.join(', ')}.`);

  const platforms = {};
  for (const p of wanted) {
    const text = payload.posts?.[p];
    if (!text) {
      console.warn(`⚠️  No "${p}" text in ${path.basename(resolved)} — skipping.`);
      continue;
    }
    platforms[p] = { text };
  }
  if (Object.keys(platforms).length === 0) fail('Nothing to draft.');

  const body = {
    platforms,
    draft_title: payload.title || 'Weekly 757tech meetups',
  };
  if (payload.scratchpad) body.scratchpad_text = payload.scratchpad;
  if (planAt) body.plan_at = planAt;
  if (publishAt) body.publish_at = publishAt;

  if (dryRun) {
    console.log('--- DRY RUN — no API call ---');
    console.log(JSON.stringify(body, null, 2));
    for (const [p, v] of Object.entries(platforms)) {
      console.log(`\n[${p}] ${[...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(v.text)].length} graphemes`);
    }
    return;
  }

  const key = requireEnv('TYPEFULLY_API_KEY');
  const socialSetId = await resolveSocialSetId(key);
  const result = await api(`/social-sets/${socialSetId}/drafts`, { method: 'POST', body, key });

  console.log(`✅ Draft created for: ${Object.keys(platforms).join(', ')}`);
  if (result?.id) console.log(`   Draft id: ${result.id}`);
  if (result?.share_url) console.log(`   ${result.share_url}`);
  console.log('   Review and schedule it in Typefully — nothing has been published.');
}

main().catch((err) => fail(err.stack || String(err)));
