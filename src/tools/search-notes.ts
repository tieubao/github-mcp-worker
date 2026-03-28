import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type GitHubEnv } from "../lib/github.js";

interface SearchItem {
  name: string;
  path: string;
  html_url: string;
  repository: { full_name: string };
  text_matches?: Array<{
    fragment: string;
  }>;
}

interface SearchResponse {
  total_count: number;
  items: SearchItem[];
}

/**
 * Register the search_notes tool on an McpServer instance.
 */
export function registerSearchNotes(server: McpServer, env: GitHubEnv): void {
  server.tool(
    "search_notes",
    "Search notes in the knowledge repo by keyword. " +
      "Searches file contents and filenames. " +
      "Returns matching note paths with text snippets.",
    {
      query: z
        .string()
        .min(1)
        .describe("Search keyword or phrase, e.g. 'hook schema' or 'redundant API'"),
      limit: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe("Maximum results to return (default 10, max 20)"),
    },
    async ({ query, limit }) => {
      const maxResults = limit ?? 10;
      const cleanQuery = query.trim();

      if (cleanQuery.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Query cannot be empty." }],
          isError: true,
        };
      }

      const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = env;

      // Use GitHub Code Search API scoped to the repo, markdown files only
      const searchQuery = encodeURIComponent(
        `${cleanQuery} repo:${GITHUB_OWNER}/${GITHUB_REPO} extension:md`
      );
      const apiUrl = `https://api.github.com/search/code?q=${searchQuery}&per_page=${maxResults}`;

      try {
        const resp = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${GITHUB_PAT}`,
            Accept: "application/vnd.github.v3.text-match+json",
            "User-Agent": "github-mcp-worker/1.0",
          },
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`GitHub Search API error (${resp.status}): ${errText}`);
        }

        const data = (await resp.json()) as SearchResponse;

        if (data.total_count === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No notes found matching "${cleanQuery}".`,
              },
            ],
          };
        }

        const lines: string[] = [
          `Found ${data.total_count} result(s)${data.total_count > maxResults ? ` (showing ${maxResults})` : ""}:`,
          "",
        ];

        for (const item of data.items) {
          lines.push(`- **${item.path}**`);
          if (item.text_matches && item.text_matches.length > 0) {
            const snippet = item.text_matches[0].fragment
              .replace(/\n/g, " ")
              .trim();
            const truncated =
              snippet.length > 120 ? snippet.slice(0, 120) + "..." : snippet;
            lines.push(`  ${truncated}`);
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: lines.join("\n"),
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
              text: `Failed to search notes: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
