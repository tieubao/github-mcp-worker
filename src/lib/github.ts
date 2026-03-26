/**
 * GitHub Contents API client.
 * Handles creating/updating files in a repository via the REST API.
 */

export interface GitHubFileResult {
  path: string;
  htmlUrl: string;
  sha: string;
}

export interface GitHubEnv {
  GITHUB_PAT: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
}

export class GitHubRateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    const minutes = Math.ceil(retryAfter / 60);
    super(`GitHub API rate limit exceeded. Resets in ~${minutes} minute(s). Try again later.`);
    this.name = "GitHubRateLimitError";
    this.retryAfter = retryAfter;
  }
}

function checkRateLimit(resp: Response): void {
  if (resp.status === 403 || resp.status === 429) {
    const remaining = resp.headers.get("x-ratelimit-remaining");
    const resetHeader = resp.headers.get("x-ratelimit-reset");
    if (remaining === "0" || resp.status === 429) {
      const resetEpoch = resetHeader ? parseInt(resetHeader, 10) : 0;
      const retryAfter = resetEpoch > 0 ? resetEpoch - Math.floor(Date.now() / 1000) : 60;
      throw new GitHubRateLimitError(Math.max(retryAfter, 1));
    }
  }
}

/**
 * Create or update a file in the target GitHub repository.
 * Uses PUT /repos/{owner}/{repo}/contents/{path}
 *
 * If the file already exists, this will update it (requires the existing SHA).
 * For new files, SHA is omitted.
 */
export async function createOrUpdateFile(
  env: GitHubEnv,
  filePath: string,
  content: string,
  commitMessage: string
): Promise<GitHubFileResult> {
  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = env;

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  // Check if the file already exists (to get its SHA for update)
  let existingSha: string | undefined;
  const checkResp = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "github-mcp-worker/1.0",
    },
  });

  checkRateLimit(checkResp);

  if (checkResp.ok) {
    const existing = (await checkResp.json()) as { sha: string };
    existingSha = existing.sha;
  } else if (checkResp.status !== 404) {
    const errText = await checkResp.text();
    throw new Error(
      `GitHub API error checking file existence (${checkResp.status}): ${errText}`
    );
  }

  // Base64 encode the content
  const encoded = btoa(unescape(encodeURIComponent(content)));

  const body: Record<string, string> = {
    message: commitMessage,
    content: encoded,
  };

  if (existingSha) {
    body.sha = existingSha;
  }

  const resp = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "github-mcp-worker/1.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  checkRateLimit(resp);

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(
      `GitHub API error creating file (${resp.status}): ${errText}`
    );
  }

  const result = (await resp.json()) as {
    content: { path: string; html_url: string; sha: string };
  };

  return {
    path: result.content.path,
    htmlUrl: result.content.html_url,
    sha: result.content.sha,
  };
}

export interface GitHubTreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

/**
 * Get the default branch name for the repo.
 */
async function getDefaultBranch(env: GitHubEnv): Promise<string> {
  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = env;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

  const resp = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "github-mcp-worker/1.0",
    },
  });

  checkRateLimit(resp);

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`GitHub API error fetching repo info (${resp.status}): ${errText}`);
  }

  const data = (await resp.json()) as { default_branch: string };
  return data.default_branch;
}

/**
 * List markdown files in the repo using the Git Trees API (recursive).
 * Returns entries sorted by path (alphabetical by topic, then filename).
 */
export async function listMarkdownFiles(
  env: GitHubEnv,
  prefix?: string
): Promise<GitHubTreeEntry[]> {
  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = env;

  const branch = await getDefaultBranch(env);
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${branch}?recursive=1`;

  const resp = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "github-mcp-worker/1.0",
    },
  });

  checkRateLimit(resp);

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`GitHub API error listing tree (${resp.status}): ${errText}`);
  }

  const data = (await resp.json()) as { tree: GitHubTreeEntry[] };

  return data.tree
    .filter((entry) => entry.type === "blob" && entry.path.endsWith(".md"))
    .filter((entry) => entry.path !== "README.md")
    .filter((entry) => !prefix || entry.path.startsWith(prefix))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Create or update a binary file (base64 encoded) in the repo.
 */
export async function createOrUpdateBinaryFile(
  env: GitHubEnv,
  filePath: string,
  base64Content: string,
  commitMessage: string
): Promise<GitHubFileResult> {
  const { GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO } = env;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  let existingSha: string | undefined;
  const checkResp = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "github-mcp-worker/1.0",
    },
  });

  checkRateLimit(checkResp);

  if (checkResp.ok) {
    const existing = (await checkResp.json()) as { sha: string };
    existingSha = existing.sha;
  } else if (checkResp.status !== 404) {
    const errText = await checkResp.text();
    throw new Error(`GitHub API error checking file (${checkResp.status}): ${errText}`);
  }

  const body: Record<string, string> = {
    message: commitMessage,
    content: base64Content,
  };

  if (existingSha) {
    body.sha = existingSha;
  }

  const resp = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "github-mcp-worker/1.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  checkRateLimit(resp);

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`GitHub API error creating file (${resp.status}): ${errText}`);
  }

  const result = (await resp.json()) as {
    content: { path: string; html_url: string; sha: string };
  };

  return {
    path: result.content.path,
    htmlUrl: result.content.html_url,
    sha: result.content.sha,
  };
}
