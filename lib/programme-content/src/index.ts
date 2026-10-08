import { createElement, Fragment } from "react";

type ContentBlock = { kind: "paragraph" | "list" | "links"; lines: string[] };

const bullet = /^(?:•|-|\*)\s+/;
const linkLine = /^(.+): (https?:\/\/\S+)$/;

function readLink(line: string) {
  const match = linkLine.exec(line);
  if (!match) return null;
  try {
    const url = new URL(match[2]);
    return ["http:", "https:"].includes(url.protocol) ? { label: match[1], href: url.href } : null;
  } catch {
    return null;
  }
}

/** Plain text only: paragraphs and contiguous bullet/link runs, never HTML. */
export function parseProgrammeContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let current: ContentBlock | undefined;
  for (const source of content.replace(/\r\n?/g, "\n").split("\n")) {
    const line = source.trim();
    if (!line) {
      current = undefined;
      continue;
    }
    const kind = bullet.test(line) ? "list" : readLink(line) ? "links" : "paragraph";
    if (!current || current.kind !== kind) {
      current = { kind, lines: [] };
      blocks.push(current);
    }
    current.lines.push(kind === "list" ? line.replace(bullet, "") : line);
  }
  return blocks;
}

export function ProgrammeContent({ content }: { content: string }) {
  return createElement(Fragment, null, ...parseProgrammeContent(content).map((block, index) => {
    if (block.kind === "paragraph") {
      return createElement("p", { key: index, style: { whiteSpace: "pre-line" } }, block.lines.join("\n"));
    }
    return createElement("ul", { key: index }, ...block.lines.map((line, item) => {
      const link = block.kind === "links" ? readLink(line) : null;
      return createElement("li", { key: item }, link
        ? createElement("a", { href: link.href, target: "_blank", rel: "noreferrer" }, link.label)
        : line);
    }));
  }));
}

/** Toggle bullets on the selected lines; keep content and selection in text storage. */
export function toggleProgrammeBullets(value: string, start: number, end: number) {
  const from = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const endAt = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const nextBreak = value.indexOf("\n", endAt);
  const to = nextBreak === -1 ? value.length : nextBreak;
  const lines = value.slice(from, to).split("\n");
  const remove = lines.every((line) => bullet.test(line.trimStart()));
  const formatted = lines.map((line) => {
    if (remove) return line.replace(/^(\s*)(?:•|-|\*)\s+/, "$1");
    return bullet.test(line.trimStart()) ? line : `• ${line}`;
  }).join("\n");
  return { value: value.slice(0, from) + formatted + value.slice(to), start: from, end: from + formatted.length };
}
