import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type GitHubEnv } from "../lib/github.js";

/**
 * Register the read_note tool on an McpServer instance.
 */
export function registerReadNote(server: McpServer, env: GitHubEnv): void {
  server.tool(
    "read_note",
    "Read a note's content from the GitHub knowledge repo by its file path. " +
      "Use list_notes first to find the exact path. " +
      "Useful for reviewing existing notes before updating them.",
    {
      path: z
        .string()
        .min(1)
        .describe(
          "Full file path of the note to read, e.g. 'mcp/my-note.md'. Use list_notes to find paths."
        ),
    },
    async ({ path }) => {
      const cleanPath = path.trim();

      if (cleanPath.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Path cannot be empty." }],
          isError: true,
        };
      }

      if (!cleanPath.endsWith(".md")) {
        return {
          content: [
            { type: "text" as const, text: "Only markdown (.md) files can be read." },
          ],
          isError: true,
        };
      }

      const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = env;
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${cleanPath}`;

      try {
        const resp = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${GITHUB_PAT}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "github-mcp-worker/1.0",
          },
        });

        if (resp.status === 404) {
          return {
            content: [
              { type: "text" as const, text: `Note not found: ${cleanPath}` },
            ],
            isError: true,
          };
        }

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`GitHub API error (${resp.status}): ${errText}`);
        }

        const data = (await resp.json()) as {
          content: string;
          html_url: string;
          sha: string;
        };

        // GitHub returns base64-encoded content with newlines
        const decoded = decodeURIComponent(
          escape(atob(data.content.replace(/\n/g, "")))
        );

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Path: ${cleanPath}`,
                `URL: ${data.html_url}`,
                `---`,
                decoded,
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
              text: `Failed to read note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
