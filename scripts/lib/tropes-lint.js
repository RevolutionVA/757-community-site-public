/**
 * Mechanical subset of the /tropes skill (.claude/skills/tropes/SKILL.md) for
 * newsletter prose. The skill is the full rule set and needs a human or Claude
 * to apply; this catches the rules a regex can — em dashes, banned words, prose
 * arrows — so a draft can't reach Bento with them no matter who runs the script.
 *
 * Only hand-written prose is checked. Template chrome (the "—" between title
 * and time, "&rarr;" CTAs), event titles from Meetup, and quoted speech are
 * format or someone else's words, not ours to rewrite.
 */

const RULES = [
  { name: 'em dash', pattern: /—|&mdash;|\s--\s/g, fix: 'rewrite with a period, comma, colon, or parentheses' },
  { name: 'unicode arrow in prose', pattern: /→|&rarr;/g, fix: 'say it in words' },
  {
    name: 'magic/sincerity adverb',
    pattern: /\b(quietly|deeply|fundamentally|remarkably|arguably|genuinely|honestly)\b/gi,
    fix: 'cut it',
  },
  {
    name: 'AI word choice',
    pattern: /\b(delve[sd]?|delving|utiliz(e|es|ed|ing)|leverag(e|es|ed|ing)|robust|streamlin(e|es|ed|ing)|harness(es|ed|ing)?|tapestry|paradigm|synergy|ecosystem|landscape|load-bearing)\b/gi,
    fix: 'use the plain word',
  },
  { name: '"serves as" dodge', pattern: /\b(serves|stands) as\b/gi, fix: 'use "is"' },
  {
    name: 'filler transition',
    pattern: /\b(it'?s worth noting|it bears mentioning|importantly|interestingly|notably)\b/gi,
    fix: 'cut it',
  },
  {
    name: 'false suspense',
    pattern: /\bhere'?s (the kicker|the thing|where it gets)\b/gi,
    fix: 'state the point directly',
  },
  {
    name: 'pedagogical voice',
    pattern: /\blet'?s (dive in|break (this|it) down|unpack|explore)\b/gi,
    fix: 'cut it',
  },
  { name: '"imagine a world"', pattern: /\bimagine a world\b/gi, fix: 'cut it' },
  { name: 'signposted conclusion', pattern: /\b(in conclusion|to sum up|in summary)\b/gi, fix: 'cut it' },
];

// Quoted speech stays verbatim, and an attribution dash directly after a quote
// ("<em>“…”</em> — Name") is formatting, not an aside.
function stripQuotes(text) {
  return text.replace(/“[^”]*”/g, '""').replace(/^(\s*(<[^>]+>|"")\s*)+(—|&mdash;)\s/, '');
}

// Markdown link targets and HTML attributes hold URLs, not prose.
function stripMarkup(text) {
  return text.replace(/\]\([^)]*\)/g, ']').replace(/<[^>]*>/g, ' ');
}

/** entries: [{ where, text }] → [{ where, rule, match, fix }] */
export function lintProse(entries) {
  const problems = [];
  for (const { where, text } of entries) {
    if (!text) continue;
    const clean = stripMarkup(stripQuotes(String(text)));
    for (const rule of RULES) {
      for (const m of clean.matchAll(rule.pattern)) {
        const start = Math.max(0, m.index - 30);
        const context = clean.slice(start, m.index + m[0].length + 30).replace(/\s+/g, ' ').trim();
        problems.push({ where, rule: rule.name, match: m[0].trim(), context, fix: rule.fix });
      }
    }
  }
  return problems;
}

const each = (arr, where) => (arr || []).map((text, i) => ({ where: `${where}[${i}]`, text }));

/** Prose fields of a monthly social/newsletter/<issue>/content.json. */
export function monthlyProse(content) {
  const missedItems = content.missed ? content.missed.items || [content.missed] : [];
  return [
    { where: 'subject', text: content.subject },
    { where: 'preheader', text: content.preheader },
    ...each(content.greeting, 'greeting'),
    ...(content.happening?.items || []).flatMap((item, i) => [
      { where: `happening.items[${i}].lead`, text: item.lead },
      ...each(item.body, `happening.items[${i}].body`),
    ]),
    ...missedItems.flatMap((item, i) => [
      ...each(item.body, `missed.items[${i}].body`),
      ...each(item.bodyAfterPhoto, `missed.items[${i}].bodyAfterPhoto`),
    ]),
    { where: 'regulars.lead', text: content.regulars?.lead },
  ];
}

/** Prose fields of the weekly src/data/newsletter-recap.json plus CLI overrides. */
export function weeklyProse(recap, { greeting, preheader } = {}) {
  return [
    { where: '--greeting', text: greeting },
    { where: '--preheader', text: preheader },
    { where: 'recap.heading', text: recap?.heading },
    ...each(recap?.body, 'recap.body'),
  ];
}

/**
 * Print problems. Returns true when the caller may proceed: always on a dry run
 * (it's a preview), otherwise only when clean or --allow-tropes was passed.
 */
export function reportTropes(problems, { dryRun, allow, source }) {
  if (!problems.length) {
    console.log(`✅ Tropes check: no issues in ${source}`);
    return true;
  }
  console.log(`\n⚠️  Tropes check: ${problems.length} issue(s) in ${source} (see .claude/skills/tropes/SKILL.md)`);
  for (const p of problems) console.log(`   ${p.where}: ${p.rule} "${p.match}" in "…${p.context}…" (${p.fix})`);
  if (dryRun || allow) return true;
  console.log('\nRefusing to create the draft. Fix the prose, or pass --allow-tropes to override.');
  return false;
}
