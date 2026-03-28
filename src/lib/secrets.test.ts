import { describe, it, expect } from "vitest";
import { scanForSecrets } from "./secrets.js";

describe("scanForSecrets", () => {
  describe("detects real secrets", () => {
    it("detects AWS access keys", () => {
      const result = scanForSecrets("aws_key = AKIAIOSFODNN7EXAMP01");
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((m) => m.label === "AWS access key")).toBe(true);
    });

    it("detects GitHub PATs (classic)", () => {
      const result = scanForSecrets(
        "token = ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl"
      );
      expect(result.some((m) => m.label === "GitHub token")).toBe(true);
    });

    it("detects GitHub fine-grained tokens", () => {
      const result = scanForSecrets(
        "token = github_pat_ABCDEFGHIJKLMNOPQRSTUVWX"
      );
      expect(result.some((m) => m.label === "GitHub fine-grained token")).toBe(
        true
      );
    });

    it("detects Slack tokens", () => {
      const result = scanForSecrets("SLACK_TOKEN=xoxb-123456789-abcdefgh");
      expect(result.some((m) => m.label === "Slack token")).toBe(true);
    });

    it("detects private keys", () => {
      const result = scanForSecrets("-----BEGIN RSA PRIVATE KEY-----");
      expect(result.some((m) => m.label === "Private key")).toBe(true);
    });

    it("detects OpenAI API keys", () => {
      const result = scanForSecrets(
        "OPENAI_KEY=sk-abcdefghijklmnopqrstuvwxyz"
      );
      expect(result.some((m) => m.label === "OpenAI/Anthropic API key")).toBe(
        true
      );
    });

    it("detects Stripe keys", () => {
      // Build the key dynamically to avoid GitHub push protection flagging the test
      const prefix = "rk_" + "live" + "_";
      const key = prefix + "abcdefghijklmnopqrstuvwx";
      const result = scanForSecrets(`STRIPE=${key}`);
      expect(result.some((m) => m.label === "Stripe key")).toBe(true);
    });

    it("detects hardcoded passwords", () => {
      const result = scanForSecrets('password = "supersecretpassword123"');
      expect(result.some((m) => m.label === "Hardcoded password")).toBe(true);
    });

    it("detects Notion database IDs in assignments", () => {
      const result = scanForSecrets(
        'database_id = "2c264b29b84c80e39bd8c22e7612c1ea"'
      );
      expect(result.some((m) => m.label === "Notion database/page ID")).toBe(
        true
      );
    });

    it("detects collection:// URLs", () => {
      const result = scanForSecrets(
        "collection://2c264b29-b84c-8037-807c-000bf6d0792c"
      );
      expect(result.some((m) => m.label === "Notion collection URL with ID")).toBe(
        true
      );
    });

    it("detects generic API key assignments", () => {
      const result = scanForSecrets(
        'api_key = "abcdefghijklmnopqrstuvwxyz1234"'
      );
      expect(result.some((m) => m.label === "API key or token")).toBe(true);
    });
  });

  describe("ignores false positives", () => {
    it("ignores YOUR_SPACE_ID placeholders", () => {
      const result = scanForSecrets("spaceId = YOUR_SPACE_ID");
      expect(result).toHaveLength(0);
    });

    it("ignores ${ENV_VAR} references", () => {
      const result = scanForSecrets('api_key = "${process.env.API_KEY}"');
      expect(result).toHaveLength(0);
    });

    it("ignores process.env references", () => {
      const result = scanForSecrets(
        "const token = process.env.GITHUB_PAT"
      );
      expect(result).toHaveLength(0);
    });

    it("ignores env.BINDING references", () => {
      const result = scanForSecrets("const pat = env.GITHUB_PAT");
      expect(result).toHaveLength(0);
    });

    it("ignores placeholder strings", () => {
      const result = scanForSecrets(
        'api_key = "your-example-api-key-placeholder"'
      );
      expect(result).toHaveLength(0);
    });

    it("ignores xxxxxxxx placeholders", () => {
      const result = scanForSecrets(
        "token = ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      );
      expect(result).toHaveLength(0);
    });

    it("skips markdown code fence lines", () => {
      const result = scanForSecrets("```bash\necho hello\n```");
      expect(result).toHaveLength(0);
    });
  });

  describe("metadata", () => {
    it("reports correct line numbers", () => {
      const content = "line one\nline two\nAKIAIOSFODNN7EXAMP01\nline four";
      const result = scanForSecrets(content);
      expect(result[0].line).toBe(3);
    });

    it("truncates long snippets at 40 chars", () => {
      const longKey = "ghp_" + "A".repeat(50);
      const result = scanForSecrets(`token = ${longKey}`);
      const match = result.find((m) => m.label === "GitHub token");
      expect(match).toBeDefined();
      expect(match!.snippet.length).toBeLessThanOrEqual(43); // 40 + "..."
    });

    it("returns empty array for clean content", () => {
      const content = [
        "# My Skill",
        "",
        "This is a clean skill with no secrets.",
        "",
        "```python",
        "print('hello')",
        "```",
      ].join("\n");
      expect(scanForSecrets(content)).toHaveLength(0);
    });
  });
});
