import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createOrUpdateFile, type GitHubEnv } from "../lib/github.js";
import { scanForSecrets, type SecretMatch } from "../lib/secrets.js";

const SKILLS_OWNER = "dwarvesf";
const SKILLS_REPO = "claude-skills";
const KEBAB_CASE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface ExistingFile {
  sha: string;
  content: string;
}

/**
 * Register the push_skill tool on an McpServer instance.
 */
export function registerPushSkill(server: McpServer, env: GitHubEnv): void {
  server.tool(
    "push_skill",
    "Push a SKILL.md file (and optional extra files) to the dwarvesf/claude-skills repo. " +
      "Creates or updates skills/<name>/SKILL.md. " +
      "Use the files parameter to include templates, scripts, or other assets alongside the skill.",
    {
      name: z
        .string()
        .min(1)
        .describe("Skill name in kebab-case. Used as folder name: skills/<name>/SKILL.md"),
      content: z
        .string()
        .min(1)
        .describe("Full SKILL.md content including YAML frontmatter and markdown body"),
      files: z
        .array(
          z.object({
            path: z.string().describe("Relative path within the skill folder, e.g. 'template.md' or 'scripts/setup.sh'"),
            content: z.string().describe("File content"),
          })
        )
        .optional()
        .describe("Optional extra files to include in the skill folder (templates, scripts, configs)"),
      message: z
        .string()
        .optional()
        .describe("Optional commit message. Defaults to 'add <name> skill' or 'update <name> skill'"),
    },
    async ({ name, content, files, message }) => {
      const cleanName = name.trim().toLowerCase();
      const cleanContent = content.trim();

      if (!KEBAB_CASE_RE.test(cleanName)) {
        return {
          content: [{ type: "text" as const, text: "Skill name must be kebab-case (e.g. 'my-skill'). Only lowercase letters, numbers, and hyphens." }],
          isError: true,
        };
      }

      if (!cleanContent.startsWith("---")) {
        return {
          content: [{ type: "text" as const, text: "Content must start with YAML frontmatter (---). Got unexpected content start." }],
          isError: true,
        };
      }

      // Scan all content for hardcoded secrets before pushing to a public repo
      const allContent = [
        { file: "SKILL.md", text: cleanContent },
        ...(files || []).map((f) => ({ file: f.path, text: f.content })),
      ];

      const allFindings: { file: string; matches: SecretMatch[] }[] = [];
      for (const { file, text } of allContent) {
        const matches = scanForSecrets(text);
        if (matches.length > 0) {
          allFindings.push({ file, matches });
        }
      }

      if (allFindings.length > 0) {
        const report = allFindings.flatMap(({ file, matches }) =>
          matches.map((m) => `  - ${file}:${m.line} — ${m.label}: \`${m.snippet}\``)
        );
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Blocked: potential secrets detected. This skill would be pushed to a public repo.`,
                ``,
                `Findings:`,
                ...report,
                ``,
                `Remove or replace these with environment variable references before pushing.`,
              ].join("\n"),
            },
          ],
          isError: true,
        };
      }

      const skillsEnv: GitHubEnv = {
        GITHUB_PAT: env.GITHUB_PAT,
        GITHUB_OWNER: SKILLS_OWNER,
        GITHUB_REPO: SKILLS_REPO,
      };

      const skillPath = `skills/${cleanName}/SKILL.md`;

      try {
        // Check existing file to detect no-change and determine add vs update
        const existing = await getExistingFile(skillsEnv, skillPath);
        const isUpdate = existing !== null;

        if (existing && existing.content === cleanContent) {
          // No extra files to push either — true no-op
          if (!files || files.length === 0) {
            return {
              content: [{ type: "text" as const, text: `Skill '${cleanName}' is already up to date. No changes needed.` }],
            };
          }
        }

        const commitMessage = message || (isUpdate ? `update ${cleanName} skill` : `add ${cleanName} skill`);
        const pushed: string[] = [];
        const pushedUrls: string[] = [];

        // Push SKILL.md (skip if unchanged and there are extra files to push)
        if (!existing || existing.content !== cleanContent) {
          const result = await createOrUpdateFile(skillsEnv, skillPath, cleanContent, commitMessage, existing?.sha);
          pushed.push(`${result.path} (${result.sha.slice(0, 7)})`);
          pushedUrls.push(result.htmlUrl);
        }

        // Push extra files
        if (files && files.length > 0) {
          for (const file of files) {
            const cleanPath = file.path.replace(/^\/+/, "").replace(/\.\.\//g, "");
            if (!cleanPath || cleanPath.includes("..") || cleanPath.startsWith("/")) {
              return {
                content: [{ type: "text" as const, text: `Invalid file path: '${file.path}'. Paths must be relative within the skill folder, no '..' allowed.` }],
                isError: true,
              };
            }
            const fullPath = `skills/${cleanName}/${cleanPath}`;
            const fileContent = file.content.trim();
            const fileMsg = `${commitMessage}: ${cleanPath}`;

            const existingExtra = await getExistingFile(skillsEnv, fullPath);
            if (existingExtra && existingExtra.content === fileContent) {
              continue; // skip unchanged extra file
            }

            const result = await createOrUpdateFile(skillsEnv, fullPath, fileContent, fileMsg, existingExtra?.sha);
            pushed.push(`${result.path} (${result.sha.slice(0, 7)})`);
            pushedUrls.push(result.htmlUrl);
          }
        }

        if (pushed.length === 0) {
          return {
            content: [{ type: "text" as const, text: `Skill '${cleanName}' is already up to date. No changes needed.` }],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Skill pushed successfully.`,
                `Files committed:`,
                ...pushed.map((p) => `  - ${p}`),
                ...(pushedUrls.length > 0 ? [`URL: ${pushedUrls[0]}`] : []),
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: `Failed to push skill: ${msg}` }],
          isError: true,
        };
      }
    }
  );
}

async function getExistingFile(env: GitHubEnv, filePath: string): Promise<ExistingFile | null> {
  const apiUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}`;
  const resp = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "github-mcp-worker/1.0",
    },
  });

  if (resp.status === 404) return null;
  if (!resp.ok) return null;

  const data = (await resp.json()) as { sha: string; content: string };
  // GitHub returns base64-encoded content with newlines
  const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
  return { sha: data.sha, content: decoded };
}
