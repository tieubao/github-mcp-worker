import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { deleteFile, type GitHubEnv } from "../lib/github.js";

/**
 * Register the delete_note tool on an McpServer instance.
 */
export function registerDeleteNote(server: McpServer, env: GitHubEnv): void {
  server.tool(
    "delete_note",
    "Delete a note from the GitHub knowledge repo by its file path. " +
      "Use list_notes first to find the exact path.",
    {
      path: z
        .string()
        .min(1)
        .describe(
          "Full file path of the note to delete, e.g. 'mcp/my-note.md'. Use list_notes to find paths."
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
            { type: "text" as const, text: "Only markdown (.md) files can be deleted." },
          ],
          isError: true,
        };
      }

      const commitMessage = `delete: ${cleanPath}`;

      try {
        const result = await deleteFile(env, cleanPath, commitMessage);

        return {
          content: [
            {
              type: "text" as const,
              text: `Note deleted successfully.\nPath: ${result.path}`,
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
              text: `Failed to delete note: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
