import { readFile, stat } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

const specialistRoot = new URL(
  "../../.agents/skills/rea-specialists/",
  import.meta.url,
);
const entrypoint = new URL("SKILL.md", specialistRoot);
const roleGuides = [
  "references/onboarding.md",
  "references/archaeology.md",
  "references/code-review.md",
  "references/defensive-review.md",
  "references/multi-agent-design.md",
  "references/evidence-analysis.md",
] as const;

const markdownLinks = (content: string): string[] =>
  [...content.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/gu)].map(
    (match) => match[1] ?? "",
  );

describe("repository specialist skill", () => {
  it("provides discoverable skill metadata", async () => {
    const content = await readFile(entrypoint, "utf8");
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(
      content,
    )?.[1];
    expect(frontmatter).toBeDefined();
    const document = parseDocument(frontmatter ?? "");
    expect(document.errors).toEqual([]);
    const metadata: unknown = document.toJS();
    expect(metadata).toMatchObject({
      name: "rea-specialists",
      description: expect.stringMatching(/\S/u),
    });
  });

  it("makes each curated role guide accessible from the entrypoint", async () => {
    const links = markdownLinks(await readFile(entrypoint, "utf8")).map(
      (destination) => destination.split("#")[0],
    );
    for (const guide of roleGuides) {
      expect(links).toContain(guide);
      expect((await stat(new URL(guide, specialistRoot))).isFile()).toBe(true);
    }
  });

  it.each(["SKILL.md", ...roleGuides])(
    "keeps local Markdown references usable in %s",
    async (path) => {
      const source = new URL(path, specialistRoot);
      const links = markdownLinks(await readFile(source, "utf8"));
      for (const destination of links) {
        if (/^(?:https?:\/\/|mailto:|#)/u.test(destination)) continue;
        const target = new URL(destination.split("#")[0] ?? "", source);
        expect((await stat(target)).isFile(), `${path}: ${destination}`).toBe(
          true,
        );
      }
    },
  );
});
