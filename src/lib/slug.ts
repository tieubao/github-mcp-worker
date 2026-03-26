/**
 * Convert a title string into a URL/filename-safe slug.
 *
 * "SDD Framework Landscape" -> "sdd-framework-landscape"
 * "How Ito's Lemma Works (Finance)" -> "how-itos-lemma-works-finance"
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "") // Remove apostrophes
    .replace(/[^a-z0-9]+/g, "-") // Non-alphanumeric -> dash
    .replace(/^-+|-+$/g, "") // Trim leading/trailing dashes
    .substring(0, 80); // Cap length for filesystem safety
}

/**
 * Generate the full file path for a learned note.
 * Format: YYYY/MM/YYYY-MM-DD-slug.md
 *
 * Example: 2026/03/2026-03-26-sdd-framework-landscape.md
 */
export function generateNotePath(title: string, date?: Date): string {
  const d = date ?? new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const slug = slugify(title);
  return `${yyyy}/${mm}/${yyyy}-${mm}-${dd}-${slug}.md`;
}
