import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listMarkdownFiles, type GitHubEnv } from "../lib/github.js";

/**
 * Register the list_notes tool on an McpServer instance.
 */
export function registerListNotes(server: McpServer, env: GitHubEnv): void {
  server.tool(
    "list_notes",
    "List learned notes from the GitHub knowledge repo. " +
      "Returns markdown file paths grouped by topic folder. " +
      "Optionally filter by topic name.",
    {
      topic: z
        .string()
        .optional()
        .describe(
          "Optional topic folder to filter, e.g. 'mcp' or 'cloudflare'"
        ),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of notes to return (default 20, max 100)"),
    },
    async ({ topic, limit }) => {
      const maxResults = limit ?? 20;

      try {
        const prefix = topic?.trim() ? `${topic.trim()}/` : undefined;
        const files = await listMarkdownFiles(env, prefix);
        const limited = files.slice(0, maxResults);

        if (limited.length === 0) {
          const scope = topic ? ` in topic "${topic}"` : "";
          return {
            content: [
              {
                type: "text" as const,
                text: `No notes found${scope}.`,
              },
            ],
          };
        }

        const lines = limited.map((f) => `- ${f.path}`);
        const header = `Found ${files.length} note(s)${files.length > maxResults ? ` (showing ${maxResults})` : ""}:`;

        return {
          content: [
            {
              type: "text" as const,
              text: [header, ...lines].join("\n"),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            { type: "text" as const, text: `Failed to list notes: ${message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
