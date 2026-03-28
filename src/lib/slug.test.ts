import { describe, it, expect } from "vitest";
import { slugify, generateNotePath } from "./slug.js";

describe("slugify", () => {
  it("converts basic text to lowercase kebab", () => {
    expect(slugify("SDD Framework Landscape")).toBe("sdd-framework-landscape");
  });

  it("strips apostrophes", () => {
    expect(slugify("How Ito's Lemma Works")).toBe("how-itos-lemma-works");
    expect(slugify("It's a test")).toBe("its-a-test");
  });

  it("strips parentheses and special chars", () => {
    expect(slugify("How Ito's Lemma Works (Finance)")).toBe(
      "how-itos-lemma-works-finance"
    );
  });

  it("collapses multiple dashes", () => {
    expect(slugify("foo---bar")).toBe("foo-bar");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("caps length at 80 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBe(80);
  });

  it("handles Vietnamese-ish characters by stripping them", () => {
    expect(slugify("Café résumé")).toBe("caf-r-sum");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});

describe("generateNotePath", () => {
  it("generates topic/slug.md for simple topic", () => {
    expect(generateNotePath("mcp", "Streamable HTTP Transport")).toBe(
      "mcp/streamable-http-transport.md"
    );
  });

  it("slugifies the topic when no slashes", () => {
    expect(generateNotePath("Cloud Flare", "My Note")).toBe(
      "cloud-flare/my-note.md"
    );
  });

  it("preserves path-style topics with slashes", () => {
    expect(generateNotePath("2026/03", "My Note")).toBe(
      "2026/03/my-note.md"
    );
  });
});
