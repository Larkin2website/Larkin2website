import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { PrivacyNoticePage, TermsPage } from "./legal";

const source = readFileSync(
  resolve(process.cwd(), "../../attached_assets/Jobs_and_Opportunities_Website_TCs.docx_1790761674771.md"),
  "utf8",
);

function plainText(text: string) {
  return text
    .replace(/^\d+\)\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

test("website terms match every section and list item of the supplied document", () => {
  const headings = [...source.matchAll(/^(\d+)\. \*\*([^*]+)\*\*$/gm)];
  const { container } = render(<TermsPage />);
  const sections = [...container.querySelectorAll(".legal-document > section")];

  expect(headings).toHaveLength(16);
  expect(sections).toHaveLength(headings.length);
  expect(container.querySelector(".legal-updated")?.textContent).toBe("Last updated: [DATE]");

  headings.forEach((heading, index) => {
    const section = sections[index];
    const nextStart = headings[index + 1]?.index ?? source.length;
    const documentLines = source
      .slice(heading.index! + heading[0].length, nextStart)
      .split(/\r?\n/)
      .map(plainText)
      .filter(Boolean);
    const renderedLines = [...section.querySelectorAll("p, li")].map((element) =>
      plainText(element.textContent ?? ""),
    );

    expect(section.querySelector("h2")?.textContent?.toLowerCase()).toBe(
      `${heading[1].padStart(2, "0")}${plainText(heading[2]).toLowerCase()}`,
    );
    expect(renderedLines, `section ${heading[1]}: ${heading[2]}`).toEqual(documentLines);
  });

  const text = container.querySelector(".legal-document")?.textContent ?? "";
  for (const [placeholder, count] of [
    ["[DATE]", 1],
    ["[URL]", 1],
    ["[LINK]", 2],
    ["[CONTACT EMAIL ADDRESS]", 1],
  ] as const) {
    expect(text.split(placeholder).length - 1).toBe(count);
  }
  expect(text).not.toContain("[Larkin 2]");
});

test("privacy notice describes optional website-purpose answers accurately", () => {
  const { container } = render(<PrivacyNoticePage />);
  const text = container.querySelector(".legal-document")?.textContent ?? "";
  expect(text).toContain("You may also optionally tell us what you are looking for");
  expect(text).toContain("We use these answers to understand the needs of our audience.");
  expect(text).toContain("Please do not include personally identifying details about anyone you represent.");
  expect(text).not.toContain("lawful basis for website-purpose answers");
});