// schema.org JSON-LD node factories.
//
// Everything here is emitted as a single `@graph` by SEO.astro rather than as
// separate <script> blocks, so nodes can reference each other by `@id` (the
// WebPage points at the WebSite, which points at the Organization). That builds
// one connected entity rather than a pile of disconnected snippets.
//
// Deliberately NOT modelled here:
//   - `Event` — schema.org/Event effectively requires `location`, and only 3 of
//     50 records in calendar-events.json have one. Inventing a venue to earn a
//     rich result is what Google's structured-data spam policy names, and it
//     would put wrong addresses in front of humans. Event markup lands once
//     update-calendar.js captures real venues from meetup.com's own JSON-LD.
//   - `SearchAction`/sitelinks searchbox — there is no search endpoint on this
//     site, and the rich result is deprecated.
//   - `LocalBusiness` — no storefront, hours, or street address. `Organization`
//     is the correct type for what 757tech actually is.
import { SITE } from "./seo";

/** Absolute URL against the deployed origin. */
const abs = (path: string, site: string) => new URL(path, site).href;

export const ORGANIZATION_ID = "#organization";
export const WEBSITE_ID = "#website";

export function organizationNode(site: string) {
  return {
    "@type": "Organization",
    "@id": abs(ORGANIZATION_ID, site),
    name: SITE.shortName,
    alternateName: SITE.name,
    url: abs("/", site),
    logo: {
      "@type": "ImageObject",
      url: abs(SITE.logo, site),
    },
    description: SITE.description,
    areaServed: {
      "@type": "AdministrativeArea",
      name: SITE.areaServed,
    },
    sameAs: [...SITE.sameAs],
    sponsor: {
      "@type": "NGO",
      name: "RevolutionVA",
      url: "https://revolutionva.org",
      description:
        "A 501(c)(3) non-profit supporting developer education in Southeast Virginia.",
    },
  };
}

export function webSiteNode(site: string) {
  return {
    "@type": "WebSite",
    "@id": abs(WEBSITE_ID, site),
    url: abs("/", site),
    name: SITE.name,
    description: SITE.description,
    inLanguage: "en-US",
    publisher: { "@id": abs(ORGANIZATION_ID, site) },
  };
}

export function webPageNode(
  site: string,
  { url, title, description }: { url: string; title: string; description: string },
) {
  return {
    "@type": "WebPage",
    "@id": url,
    url,
    name: title,
    description,
    isPartOf: { "@id": abs(WEBSITE_ID, site) },
    inLanguage: "en-US",
  };
}

/**
 * `crumbs` should NOT include the page itself as a bare label — pass the full
 * trail including the current page, each with its own URL. Google wants the
 * final item to be the current page.
 */
export function breadcrumbNode(
  site: string,
  crumbs: { name: string; url: string }[],
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: abs(crumb.url, site),
    })),
  };
}
