import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createOrUpdateBinaryFile, type GitHubEnv } from "../lib/github.js";
import { slugify } from "../lib/slug.js";

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"] as const;
type ImageExtension = (typeof ALLOWED_EXTENSIONS)[number];

/**
 * Register the push_image tool on an McpServer instance.
 */
export function registerPushImage(server: McpServer, env: GitHubEnv): void {
  server.tool(
    "push_image",
    "Push an image to the knowledge repo's assets/ directory. " +
      "Accepts base64-encoded image data. Returns the committed file path " +
      "which can be referenced from notes via relative markdown links.",
    {
      filename: z
        .string()
        .min(1)
        .describe("Descriptive filename for the image, e.g. 'architecture-diagram.png'"),
      base64_data: z
        .string()
        .min(1)
        .describe("Base64-encoded image content (no data URI prefix)"),
      alt_text: z
        .string()
        .optional()
        .describe("Optional alt text describing the image"),
    },
    async ({ filename, base64_data, alt_text }) => {
      const cleanFilename = filename.trim();

      if (cleanFilename.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Filename cannot be empty." }],
          isError: true,
        };
      }

      // Extract and validate extension
      const dotIndex = cleanFilename.lastIndexOf(".");
      if (dotIndex === -1) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Filename must have an extension. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      const ext = cleanFilename.slice(dotIndex + 1).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext as ImageExtension)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invalid image extension ".${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      // Strip any data URI prefix if present
      const cleanBase64 = base64_data.replace(/^data:image\/[^;]+;base64,/, "");

      // Validate base64
      if (!/^[A-Za-z0-9+/\n\r]+=*$/.test(cleanBase64.trim())) {
        return {
          content: [{ type: "text" as const, text: "Invalid base64 data." }],
          isError: true,
        };
      }

      // Build path: assets/YYYY/MM/slug.ext
      const now = new Date();
      const yyyy = now.getUTCFullYear();
      const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
      const nameWithoutExt = cleanFilename.slice(0, dotIndex);
      const slug = slugify(nameWithoutExt);
      const filePath = `assets/${yyyy}/${mm}/${slug}.${ext}`;

      try {
        const result = await createOrUpdateBinaryFile(
          env,
          filePath,
          cleanBase64.trim(),
          `asset: ${cleanFilename}`
        );

        const markdownRef = alt_text
          ? `![${alt_text}](${result.path})`
          : `![${cleanFilename}](${result.path})`;

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Image pushed successfully.`,
                `Path: ${result.path}`,
                `URL: ${result.htmlUrl}`,
                `Markdown: ${markdownRef}`,
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
              text: `Failed to push image: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
