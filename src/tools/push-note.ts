import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createOrUpdateFile, type GitHubEnv } from "../lib/github.js";
import { generateNotePath } from "../lib/slug.js";

/**
 * Register the push_note tool on an McpServer instance.
 */
export function registerPushNote(server: McpServer, env: GitHubEnv): void {
  server.tool(
    "push_note",
    "Push a learned note (markdown) to the GitHub knowledge repo. " +
      "Creates a new file at YYYY/MM/YYYY-MM-DD-slug.md with frontmatter. " +
      "Use this to capture learnings, decisions, insights, or any knowledge worth preserving.",
    {
      title: z
        .string()
        .min(1)
        .describe("Short descriptive title for the note (used in filename and frontmatter)"),
      content: z
        .string()
        .min(1)
        .describe("Markdown body of the note. Can include headers, code blocks, lists, etc."),
      tags: z
        .array(z.string())
        .optional()
        .describe("Optional tags for categorization, e.g. ['mcp', 'cloudflare', 'ios']"),
      source: z
        .string()
        .optional()
        .describe("Optional source context, e.g. 'Claude iOS session on PKM pipeline'"),
    },
    async ({ title, content, tags, source }) => {
      // Sanitize inputs
      const cleanTitle = title.trim();
      const cleanContent = content.trim();

      if (cleanTitle.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Title cannot be empty or whitespace only." }],
          isError: true,
        };
      }

      if (cleanContent.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Content cannot be empty or whitespace only." }],
          isError: true,
        };
      }

      if (cleanTitle.length > 200) {
        return {
          content: [{ type: "text" as const, text: "Title must be 200 characters or fewer." }],
          isError: true,
        };
      }

      const filePath = generateNotePath(cleanTitle);
      const now = new Date();

      // Build frontmatter
      const frontmatter = [
        "---",
        `title: "${cleanTitle.replace(/"/g, '\\"')}"`,
        `date: ${now.toISOString().split("T")[0]}`,
        `captured: ${now.toISOString()}`,
      ];

      if (tags && tags.length > 0) {
        const cleanTags = tags.map((t) => t.trim()).filter((t) => t.length > 0);
        if (cleanTags.length > 0) {
          frontmatter.push(`tags: [${cleanTags.map((t) => `"${t}"`).join(", ")}]`);
        }
      }

      if (source) {
        const cleanSource = source.trim();
        if (cleanSource.length > 0) {
          frontmatter.push(`source: "${cleanSource.replace(/"/g, '\\"')}"`);
        }
      }

      frontmatter.push("---", "");

      const fullContent = frontmatter.join("\n") + cleanContent;
      const commitMessage = `learned: ${cleanTitle}`;

      try {
        const result = await createOrUpdateFile(
          env,
          filePath,
          fullContent,
          commitMessage
        );

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Note pushed successfully.`,
                `Path: ${result.path}`,
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
              text: `Failed to push note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
