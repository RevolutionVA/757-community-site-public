// Site-wide SEO constants. Single source of truth for anything that appears in
// <head> across both layouts — previously these were duplicated (and had drifted:
// MainLayout hardcoded the site URL while LandingLayout derived it from Astro.site).
import { COMMUNITY } from "../data/community";

export const SITE = {
  /** Fallback only. Prefer `Astro.site`, which is set in astro.config.mjs. */
  url: "https://757tech.org",
  name: "757 Tech Community",
  shortName: "757tech",
  locale: "en_US",
  lang: "en",

  /** Twitter/X handle for `twitter:site`. */
  twitter: "@757techorg",

  /**
   * Site-wide social card. Must be at least 1200x630 for `summary_large_image`
   * — a smaller image makes X silently downgrade to a small square card.
   */
  defaultImage: "/images/757tech-social-card.jpg",
  defaultImageAlt:
    "757tech — every tech meetup, user group, and conference in Hampton Roads, Virginia",
  defaultImageWidth: 1200,
  defaultImageHeight: 630,

  logo: "/images/757tech-logo.png",
  themeColor: "#0e7490",

  areaServed: "Hampton Roads, Virginia",
  description:
    "Every meetup, user group, and regional conference in the 757 — in one tide. The front door to tech in Hampton Roads, Virginia.",

  /** Drives schema.org `sameAs`, which is how search engines resolve us as an entity. */
  sameAs: [
    COMMUNITY.linkedin,
    COMMUNITY.x,
    COMMUNITY.instagram,
    COMMUNITY.threads,
    COMMUNITY.github,
  ],
} as const;
