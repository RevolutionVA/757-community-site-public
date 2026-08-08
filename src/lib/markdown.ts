import { marked } from "marked";

// Extracted verbatim from src/pages/calendar.astro so the weekly archive can
// share it. These regexes exist because meetup.com descriptions arrive with
// mangled Markdown — URLs already inside link syntax, doubled brackets,
// backslash-escaped punctuation — and rendering them raw produces broken links.
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true,
});

/** Convert a meetup.com description (Markdown-ish) to HTML. */
export function formatDescription(description: string): string {
  if (!description) return "";

  try {
    let processed = description
      // Fix escaped characters in URLs
      .replace(/\\([.\\-])/g, "$1")
      // Fix URLs directly followed by markdown link syntax
      .replace(/(\bhttps?:\/\/[^\s\]]+)]\(([^)]+)\)/g, "$1 ]($2)")
      // Fix malformed markdown links missing opening bracket
      .replace(/(\bhttps?:\/\/[^\s]+)\]\(([^)]+)\)/g, "[$1]($2)")
      // Fix double closing brackets in markdown links
      .replace(/\]\](\([^)]+\))/g, "]$1")
      // Fix URLs that end with a closing bracket followed by markdown link syntax
      .replace(/(\bhttps?:\/\/[^\s]+)\)\]\(([^)]+)\)/g, "$1) ]($2)")
      // Fix doubled nested links, e.g. "[[url](url)](url)"
      .replace(/\[\[https?:\/\/[^\]]+\]\(([^)]+)\)\]\(([^)]+)\)/g, "[$1]($2)")
      // Fix "url](url)" appearing bare
      .replace(/(\bhttps?:\/\/[^\s]+)\]\(([^)]+)\)/g, "[$1]($2)")
      // CS2AI-specific escaped-URL pattern
      .replace(
        /\[https:\/\/www\.cs2ai\.org\/([^\]]+)\\?\]\\\(https:\/\/www\.cs2ai\.org\/([^)]+)\\?\)/g,
        "[https://www.cs2ai.org/$1](https://www.cs2ai.org/$2)",
      )
      // Move a trailing period outside the link
      .replace(/(\[https:\/\/[^\]]+)\.\]/g, "$1].")
      // Fix "word.https://" running together
      .replace(/(\w+)\.https:\/\//g, "$1. https://");

    const html = marked.parse(processed);
    const htmlString = typeof html === "string" ? html : String(html);

    // Repair hrefs the parser may have left backslashes in
    return htmlString.replace(/(href="[^"]*?)\\([^"]*?")/g, "$1$2");
  } catch (error) {
    console.error("Error parsing Markdown:", error);
    return description
      .replace(/\n/g, "<br />")
      .replace(
        /(\bhttps?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
      );
  }
}

/**
 * Plain-text excerpt from a Markdown description.
 *
 * Archive pages show an excerpt rather than the full body: meetup.com
 * descriptions run to ~4,800 chars and repeat Zoom links, membership pricing,
 * and copyright notices. Republishing all of that verbatim is a scrape mirror
 * of the source — low quality, and it removes the reason to click through.
 */
export function excerpt(description: string, maxChars = 600): string {
  if (!description) return "";

  let plain = description
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/[*_`>]/g, "") // emphasis / code / quote marks
    .replace(/\\([-.])/g, "$1") // escaped punctuation
    .replace(/\bhttps?:\/\/\S+/g, "") // bare URLs
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();

  // Stripping URLs leaves dangling lead-ins ("Register at:", "Details here:").
  // Drop trailing lines that only introduced a link that is no longer there.
  const lines = plain.split("\n");
  while (lines.length && /(?::|\bat|\bhere|\bbelow)\s*$/i.test(lines[lines.length - 1].trim())) {
    lines.pop();
  }
  plain = lines.join("\n").trim();

  if (plain.length <= maxChars) return plain;

  // Prefer a sentence boundary, then a word boundary, so we never cut mid-word.
  const window = plain.slice(0, maxChars);
  const lastStop = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (lastStop > maxChars * 0.5) return window.slice(0, lastStop + 1);

  const lastSpace = window.lastIndexOf(" ");
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window).trimEnd() + "…";
}
