/**
 * Secret scanner for content heading to public repos.
 * Detects hardcoded API keys, tokens, passwords, and other sensitive data.
 */

// Patterns that indicate hardcoded secrets or sensitive data.
const SECRET_PATTERNS: { pattern: RegExp; label: string }[] = [
  // API keys and tokens (generic)
  { pattern: /(?:api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|bearer)\s*[:=]\s*["']?[A-Za-z0-9_\-/.]{20,}["']?/i, label: "API key or token" },
  // AWS
  { pattern: /AKIA[0-9A-Z]{16}/, label: "AWS access key" },
  // GitHub PAT (classic and fine-grained)
  { pattern: /gh[ps]_[A-Za-z0-9_]{36,}/, label: "GitHub token" },
  { pattern: /github_pat_[A-Za-z0-9_]{22,}/, label: "GitHub fine-grained token" },
  // Slack
  { pattern: /xox[bpors]-[A-Za-z0-9-]{10,}/, label: "Slack token" },
  // Private keys
  { pattern: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH|PGP)?\s*PRIVATE KEY-----/, label: "Private key" },
  // Notion integration tokens
  { pattern: /secret_[A-Za-z0-9]{40,}/, label: "Notion integration token" },
  // Notion database/page IDs — only match when assigned to a variable or in a URL-like context
  { pattern: /(?:database_id|page_id|block_id|space_id|spaceId)\s*[:=]\s*["']?[0-9a-f-]{32,36}["']?/i, label: "Notion database/page ID" },
  // UUIDs assigned to ID-like variables (not bare UUIDs in prose)
  { pattern: /(?:id|_id|Id)\s*[:=]\s*["']?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}["']?/i, label: "Hardcoded UUID" },
  // Notion collection:// URLs with IDs
  { pattern: /collection:\/\/[0-9a-f-]{32,36}/i, label: "Notion collection URL with ID" },
  // Generic password assignment
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/i, label: "Hardcoded password" },
  // OpenAI / Anthropic
  { pattern: /sk-[A-Za-z0-9]{20,}/, label: "OpenAI/Anthropic API key" },
  // Stripe
  { pattern: /[sr]k_(test|live)_[A-Za-z0-9]{20,}/, label: "Stripe key" },
  // SendGrid
  { pattern: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/, label: "SendGrid API key" },
];

// Known false-positive patterns to exclude (documentation examples, placeholders)
const FALSE_POSITIVE_PATTERNS = [
  /YOUR_SPACE_ID/,
  /YOUR_[A-Z_]+/,
  /\{[A-Z_]+\}/,         // {API_KEY} style placeholders
  /\$\{[^}]+\}/,         // ${ENV_VAR} style
  /process\.env\./,      // referencing env vars, not hardcoding
  /env\.[A-Z_]+/,        // Cloudflare env binding references
  /x{8,}/i,              // xxxxxxxx placeholders
  /example|placeholder|dummy|test|sample|changeme/i,
];

export interface SecretMatch {
  label: string;
  line: number;
  snippet: string;
}

export function scanForSecrets(content: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip markdown code fence language hints and comment-only lines
    if (/^```/.test(line.trim())) continue;

    for (const { pattern, label } of SECRET_PATTERNS) {
      const match = pattern.exec(line);
      if (!match) continue;

      const matchedText = match[0];

      // Check if the matched text is a known false positive
      const isFalsePositive = FALSE_POSITIVE_PATTERNS.some((fp) => fp.test(matchedText)) ||
        FALSE_POSITIVE_PATTERNS.some((fp) => fp.test(line));
      if (isFalsePositive) continue;

      matches.push({
        label,
        line: i + 1,
        snippet: matchedText.length > 40 ? matchedText.slice(0, 40) + "..." : matchedText,
      });
    }
  }

  return matches;
}
