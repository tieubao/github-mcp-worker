import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listMarkdownFiles,
  createOrUpdateFile,
  type GitHubEnv,
} from "../lib/github.js";

/**
 * Register the update_index tool on an McpServer instance.
 * Rebuilds README.md with an auto-generated index of all notes grouped by topic.
 */
export function registerUpdateIndex(server: McpServer, env: GitHubEnv): void {
  server.tool(
    "update_index",
    "Rebuild the README.md in the knowledge repo with an auto-generated index of all notes. " +
      "Groups notes by topic folder.",
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

        // Group files by topic (first path segment)
        const groups = new Map<string, string[]>();
        for (const file of files) {
          const parts = file.path.split("/");
          const topic = parts.length >= 2 ? parts[0] : "uncategorized";
          const existing = groups.get(topic) ?? [];
          existing.push(file.path);
          groups.set(topic, existing);
        }

        // Build README content
        const lines: string[] = [
          "# Learned",
          "",
          `> Auto-generated index of ${files.length} note(s). Last updated: ${new Date().toISOString().split("T")[0]}`,
          "",
        ];

        // Sort topics alphabetically
        const sortedGroups = [...groups.entries()].sort((a, b) =>
          a[0].localeCompare(b[0])
        );

        for (const [topic, paths] of sortedGroups) {
          lines.push(`## ${topic}`, "");
          for (const path of paths) {
            // Extract title from filename: slug.md -> "Slug title"
            const filename = path.split("/").pop() ?? path;
            const titleSlug = filename
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
                `Index updated with ${files.length} note(s) across ${groups.size} topic(s).`,
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
