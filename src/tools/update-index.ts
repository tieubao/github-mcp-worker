import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listMarkdownFiles,
  getFileContent,
  createOrUpdateFile,
  type GitHubEnv,
} from "../lib/github.js";

/**
 * Register the update_index tool on an McpServer instance.
 * Rebuilds README.md with an auto-generated index of all notes.
 */
export function registerUpdateIndex(server: McpServer, env: GitHubEnv): void {
  server.tool(
    "update_index",
    "Rebuild the README.md in the knowledge repo with an auto-generated index of all notes. " +
      "Groups notes by year/month and extracts titles from frontmatter.",
    {},
    async () => {
      try {
        const files = await listMarkdownFiles(env);

        if (files.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No notes found in the repo. Nothing to index.",
              },
            ],
          };
        }

        // Group files by YYYY/MM
        const groups = new Map<string, string[]>();
        for (const file of files) {
          // Extract YYYY/MM from path like "2026/03/2026-03-26-slug.md"
          const parts = file.path.split("/");
          const groupKey =
            parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "other";
          const existing = groups.get(groupKey) ?? [];
          existing.push(file.path);
          groups.set(groupKey, existing);
        }

        // Build README content
        const lines: string[] = [
          "# Learned",
          "",
          `> Auto-generated index of ${files.length} note(s). Last updated: ${new Date().toISOString().split("T")[0]}`,
          "",
        ];

        // Sort groups descending (newest first)
        const sortedGroups = [...groups.entries()].sort((a, b) =>
          b[0].localeCompare(a[0])
        );

        for (const [group, paths] of sortedGroups) {
          lines.push(`## ${group}`, "");
          for (const path of paths) {
            // Try to extract title from filename: YYYY-MM-DD-slug.md -> slug
            const filename = path.split("/").pop() ?? path;
            const titleSlug = filename
              .replace(/^\d{4}-\d{2}-\d{2}-/, "")
              .replace(/\.md$/, "")
              .replace(/-/g, " ");
            const displayTitle =
              titleSlug.charAt(0).toUpperCase() + titleSlug.slice(1);
            lines.push(`- [${displayTitle}](${path})`);
          }
          lines.push("");
        }

        const readmeContent = lines.join("\n");
        const result = await createOrUpdateFile(
          env,
          "README.md",
          readmeContent,
          "docs: update note index"
        );

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Index updated with ${files.length} note(s) across ${groups.size} month(s).`,
                `URL: ${result.htmlUrl}`,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to update index: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
