---
name: tropes
version: 0.3.0
description: "Review and fix AI writing tropes in generated text. Use when writing customer-facing content, support responses, documentation, or any prose. Also proactively apply these rules whenever generating text that will be read by humans. Trigger when the user asks to 'fix tropes', 'check writing', 'de-AI this', 'clean up the writing', or 'make it sound human'."
user-invocable: true
---

# /tropes — AI Writing Trope Checker

Review any generated text and fix common AI writing patterns that make prose sound artificial. These rules apply to all written output: support emails, documentation, commit messages, PR descriptions, customer communications, and any other prose.

Sources: tropes.fyi; louisabraham.github.io/load-bearing (cluster analysis of GitHub PR descriptions); "Claude is a Contrarian" (rdsubhas, Medium) + HN 49699373 discussion (contrastive negation family)

---

## When to Apply

- **Always**: when writing customer-facing text (support replies, docs, emails)
- **On request**: when the user asks to review or clean up writing
- **Proactively**: when you notice your own output falling into these patterns

---

## Word Choice

### Avoid magic adverbs
"Quietly", "deeply", "fundamentally", "remarkably", "arguably" used to inject false significance.

### Avoid "delve" and friends
"Delve", "certainly", "utilize", "leverage" (as verb), "robust", "streamline", "harness".

### Avoid ornate nouns
"Tapestry", "landscape", "paradigm", "synergy", "ecosystem", "framework" where simpler words work.

### Avoid the "serves as" dodge
Replacing "is" with "serves as", "stands as", "marks", "represents".

---

## Sentence Structure

### No negative parallelism
The "It's not X -- it's Y" pattern. One per piece max. Ten in a blog post is an insult to the reader.

### No trailing contrastive negation
The same tic in apposition form: "features that move you, not bore you", "gives you hope, never disillusion", "does this, not that". Defining a thing by negating its opposite when nobody proposed the opposite. Greppable tell: count ", not " and ", never " — more than one or two per piece is the dialect.

### No expectation-snap reversals
Setting up a premise just to knock it down in a two-beat: "This was supposed to be the problem. It's not." Manufactured surprise; state the finding directly.

### No dramatic countdown
"Not X. Not Y. Just Z." builds false tension.

### No self-posed rhetorical questions
"The result? Devastating." Nobody asked the question.

### No anaphora abuse
Repeating the same sentence opening multiple times in succession.

### No tricolon abuse
Overuse of rule-of-three patterns. One is elegant; three back-to-back is a tic.

### No filler transitions
"It's worth noting", "It bears mentioning", "Importantly", "Interestingly", "Notably".

### No superficial analyses
Tacking "-ing" phrases onto sentences: "highlighting its importance", "reflecting broader trends", "underscoring its role".

### No false ranges
"From X to Y" where X and Y aren't on any real scale.

### No gerund fragment litanies
Standalone verbless fragments after a claim: "Fixing small bugs. Writing features. Implementing tickets."

---

## Paragraph Structure

### No short punchy fragments for manufactured emphasis
"He published this. Openly. In a book. As a priest." is inhuman.

### No listicles in a trench coat
"The first... The second... The third..." disguising a list as prose.

---

## Tone

### No false suspense
"Here's the kicker", "Here's the thing", "Here's where it gets interesting".

### No patronizing analogies
"Think of it as...", "It's like a..." when the original concept is clearer than the metaphor.

### No "imagine a world"
"Imagine a world where..." followed by a utopian sales pitch.

### No false vulnerability
Performative self-awareness: "And yes, I'm openly in love with..."

### No "the truth is simple"
Asserting something is obvious instead of proving it: "The reality is simpler", "History is clear".

### No grandiose stakes inflation
A blog post about API pricing does not determine the fate of civilization.

### No pedagogical voice
"Let's break this down", "Let's unpack this", "Let's explore", "Let's dive in".

### No vague attributions
"Experts argue", "Industry reports suggest", "Observers have cited". Name the source or cut it.

### No invented concept labels
"The supervision paradox", "the acceleration trap", "workload creep" used as if they're established terms.

### No corrective one-upping
Agreeing and then reframing so the reader's point seems incomplete: "You're right, but for a stronger reason than you said", "the real issue is deeper". Either agree or disagree; don't relitigate a settled point to look smarter.

### No unrequested balancing
"Balancing" a clear claim with counterpoints nobody asked for, until the message is neutralized. If the piece has a thesis, argue it. One honest limitation stated once beats reflexive both-sidesing.

---

## Technical Writing (PR descriptions, commit messages, code prose)

A cluster analysis of 47k GitHub PR descriptions (the "load-bearing vocabulary of Claude" study) found one way of writing grew from 1% to 45% of all PR descriptions as AI-written PRs took over. These are its most overrepresented words. Any one of them used once is fine; a cluster of them reads as a generated PR.

### Avoid the metaphor kit
"Load-bearing" (123x overrepresented), "seam", "latent", "headroom", "ceiling", "machinery", "trap", "throwaway". Also flagged by readers: "spike", "wedged", "latch", "gate", "capstone". Use the plain term: critical, boundary, hidden, margin, limit.

### Don't anthropomorphize code
Code that "survives", "refuses", "carries", "holds", "lives", "sits", "walks", "arrives", "sees", "collapses", "recovers". Say what happens mechanically: "the test still passes", not "the test survives the refactor".

### No sincerity adverbs
"Genuinely", "honestly", "deliberately", "precisely", "merely", "quietly", "loudly". These assert care instead of showing it. "Fails loudly" / "quietly drops" is the most common pair.

### No absolutist negation flourishes
"Nothing else changed." "Nobody calls this." "Never fires." "Untouched." Stacked negations performing thoroughness. State the actual diff scope instead.

### Go easy on hyphenated-precision compounds
"Byte-identical", "wall-clock", "hand-rolled", "one-line", "in-flight", "unit-tested". Each is legitimate alone; several together signal the dialect.

---

## Formatting

### No em dashes
Do not use em dashes (`--`, `—`, or ` - ` used as a pause/aside). Rewrite using periods, commas, colons, or parentheses instead. This is a hard rule, not a soft limit. If the output contains any em dash variant, it fails this check.

### No bold-first bullets
Not every list item needs to start with a bolded keyword.

### No unicode decoration
Use `->` or `=>`, not `→`. Use straight quotes, not smart quotes.

---

## Composition

### No fractal summaries
Don't summarize at every level. No "as we've seen in this section" recaps.

### No dead metaphors
Don't repeat the same metaphor 5-10 times across a piece.

### No historical analogy stacking
"Apple didn't build Uber. Facebook didn't build Spotify." rapid-fire name-dropping.

### No one-point dilution
A single argument restated 10 ways across thousands of words.

### No signposted conclusions
"In conclusion", "To sum up", "In summary". The reader can feel the ending.

### No "despite its challenges"
The rigid formula: acknowledge problems, immediately dismiss them, end optimistic.

### No self-undermining coda
The reverse formula: build an argument, then walk it back in the final paragraph with hedges and counterweights. The ending should land the thesis, not dismantle it.

### No caveat re-flagging
Raising the same caveat in multiple places across a piece. Say it once, where it matters, and move on.

---

## How to Use This Skill

When invoked on a piece of text:

1. Read the text
2. Identify any tropes present (cite which ones)
3. Rewrite the text with tropes removed
4. Show what changed

Don't trust a read-through of your own output: models rate their own writing highly and these patterns persist even when instructed away. Scan for the specific words and shapes listed above.

When writing new text, apply these rules from the start. Any single pattern used once might be fine. The problem is when multiple tropes cluster or a single trope repeats. Write varied, specific, human prose.
