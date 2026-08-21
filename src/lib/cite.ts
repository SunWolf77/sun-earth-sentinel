/** Academic citation with a DOI when one exists. */

export type Citation = {
  label: string;
  /** Bare DOI, no url prefix — e.g. 10.1038/s41598-018-30019-2 */
  doi?: string;
  /** Fallback when the work has no DOI (agency FAQ, software page). */
  url?: string;
};

export function doiHref(doi: string): string {
  return `https://doi.org/${doi.replace(/^https?:\/\/doi\.org\//i, "").replace(/^doi:/i, "")}`;
}

export function citationHref(c: Citation): string | null {
  if (c.doi) return doiHref(c.doi);
  return c.url ?? null;
}
