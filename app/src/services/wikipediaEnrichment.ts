/**
 * Wikipedia Enrichment Service
 *
 * Fetches a description and photo for an OSM shelter using the `wikipedia`
 * tag that OSM contributors already placed on the node. No name-matching or
 * searching — if OSM didn't link a Wikipedia article, we return null.
 *
 * This guarantees zero false positives: we never pull data for the wrong shelter.
 */

const WIKIPEDIA_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary";
const REQUEST_TIMEOUT_MS = 5000;

export interface WikipediaEnrichment {
  description: string;
  photo: string;
}

/**
 * Convert an OSM `wikipedia` tag into a URL-safe Wikipedia page title.
 *
 * OSM stores these as "language:Page Title", e.g. "en:Union Rescue Mission".
 * Wikipedia's REST API expects underscores instead of spaces in the URL.
 *
 * Examples:
 *   "en:Union Rescue Mission"  →  "Union_Rescue_Mission"
 *   "en:The Midnight Mission"  →  "The_Midnight_Mission"
 *   "Union Rescue Mission"     →  "Union_Rescue_Mission"  (no prefix, still works)
 */
function osmTagToPageTitle(tag: string): string {
  const withoutLang = tag.includes(":") ? tag.split(":").slice(1).join(":") : tag;
  return withoutLang.trim().replace(/ /g, "_");
}

/**
 * Fetch Wikipedia enrichment for a shelter.
 *
 * @param wikipediaTag  The raw OSM `wikipedia` tag, e.g. "en:Union Rescue Mission".
 *                      If undefined or empty, returns null immediately — no network call made.
 * @returns             Description and photo URL, or null if unavailable.
 */
export async function fetchWikipediaEnrichment(
  wikipediaTag: string | undefined,
): Promise<WikipediaEnrichment | null> {
  // If OSM didn't give us a Wikipedia link, there's nothing to look up.
  // Return null right away — no network request, no delay.
  if (!wikipediaTag) return null;

  const pageTitle = osmTagToPageTitle(wikipediaTag);

  try {
    // AbortController lets us cancel the request if it takes too long.
    // We set a 5-second limit — if Wikipedia doesn't respond by then, we give up.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(
      `${WIKIPEDIA_SUMMARY_API}/${encodeURIComponent(pageTitle)}`,
      {
        signal: controller.signal,
        headers: {
          // Wikipedia's API guidelines ask bots to identify themselves.
          "User-Agent": "Hou2ed-App/1.0 (housing platform; contact@hou2ed.com)",
        },
      },
    );
    clearTimeout(timer);

    // A non-OK response (404, 500, etc.) means the article doesn't exist
    // or something went wrong — either way, return null gracefully.
    if (!response.ok) return null;

    const data = await response.json();

    // Disambiguation pages (e.g. "Mission" that lists many meanings) are
    // not useful — they have no real description of a specific shelter.
    if (data.type === "disambiguation" || data.type === "no-extract") return null;

    const description: string = data.extract ?? "";
    const photo: string = data.thumbnail?.source ?? "";

    // If Wikipedia returned a page but both fields are empty, there's nothing
    // worth merging — treat it as if no article was found.
    if (!description && !photo) return null;

    return { description, photo };
  } catch {
    // Network error, timeout, or any unexpected failure.
    // We swallow the error silently — a missing Wikipedia photo is never
    // worth crashing a shelter listing over.
    return null;
  }
}
