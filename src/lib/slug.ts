/**
 * Convert a string into a URL/filename-safe slug.
 *
 * "SDD Framework Landscape" -> "sdd-framework-landscape"
 * "How Ito's Lemma Works (Finance)" -> "how-itos-lemma-works-finance"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "") // Remove apostrophes
    .replace(/[^a-z0-9]+/g, "-") // Non-alphanumeric -> dash
    .replace(/^-+|-+$/g, "") // Trim leading/trailing dashes
    .substring(0, 80); // Cap length for filesystem safety
}

/**
 * Generate the file path for a note: {topic}/{slug}.md
 *
 * Example: "mcp", "Streamable HTTP Transport" -> "mcp/streamable-http-transport.md"
 */
export function generateNotePath(topic: string, title: string): string {
  const topicSlug = slugify(topic);
  const titleSlug = slugify(title);
  return `${topicSlug}/${titleSlug}.md`;
}
