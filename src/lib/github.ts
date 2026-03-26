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
