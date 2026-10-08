import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProgrammeContent, parseProgrammeContent, toggleProgrammeBullets } from "@workspace/programme-content";
import { developmentDetailContent, publicProgrammeDetailContent, splitPublicProgrammes } from "./programme-presentation";
afterEach(cleanup);

describe("programme text content", () => {
  it("removes source listing lines on every detail page while preserving nearby course information and links", () => {
    for (const slug of ["departmental-budgeting", "career-mapping-session", "director-pathway", "another-course"]) {
      expect(publicProgrammeDetailContent(slug, "Original course listing: https://larkin2opportunities.com/trainings/example/")).toBe("");
      expect(publicProgrammeDetailContent(slug, "Original course listing")).toBe("");
      const content = "Sign-up deadline: 8 October 12 pm (Noon).\r\n• Original course listing: https://larkin2opportunities.com/trainings/example/\r\nRegister: https://airtable.com/example/form";
      render(<ProgrammeContent content={publicProgrammeDetailContent(slug, content)} />);
      expect(screen.queryByText(/Original course listing/i)).toBeNull();
      expect(screen.getByText("Sign-up deadline: 8 October 12 pm (Noon).")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "https://airtable.com/example/form");
      cleanup();
    }
  });
  it("renders mixed paragraphs, bullet runs and subsequent paragraphs semantically", () => {
    render(<ProgrammeContent content={"Introduction.\nContinued.\n\n• First\n- Second\n* Third\n\nConclusion.\n\n• Another"} />);
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["First", "Second", "Third", "Another"]);
    expect(screen.getByText("Conclusion.").tagName).toBe("P");
    expect(parseProgrammeContent("Introduction.\nContinued.")[0].lines).toEqual(["Introduction.", "Continued."]);
  });
  it("retains safe legacy link lists and never interprets HTML", () => {
    render(<ProgrammeContent content={"Guild: https://example.com/guild\nBranch: https://example.com/branch\n\n<script>alert(1)</script>\nEvil: javascript:alert(1)"} />);
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Guild" })).toHaveAttribute("href", "https://example.com/guild");
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText(/<script>/)).toBeInTheDocument();
  });
  it("supports duplicates, CRLF and empty content", () => {
    expect(parseProgrammeContent("")).toEqual([]);
    render(<ProgrammeContent content={"• Same\r\n• Same"} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
  it("toggles selected lines without changing surrounding paragraphs", () => {
    const original = "Introduction\n\nFirst\nSecond\n\nConclusion";
    const start = original.indexOf("First");
    const end = original.indexOf("\n\nConclusion");
    const result = toggleProgrammeBullets(original, start, end);
    expect(result.value).toBe("Introduction\n\n• First\n• Second\n\nConclusion");
    expect(toggleProgrammeBullets(result.value, result.start, result.end).value).toBe(original);
    // Saved text is still plain text and parses identically after reopening.
    expect(parseProgrammeContent(JSON.parse(JSON.stringify(result.value)))[1]).toEqual({ kind: "list", lines: ["First", "Second"] });
  });
  it("does not include the next line when a selection ends at its start", () => {
    expect(toggleProgrammeBullets("One\nTwo\nThree", 0, 8).value).toBe("• One\n• Two\nThree");
    expect(toggleProgrammeBullets("", 0, 0).value).toBe("• ");
  });
});

describe("previous programme boundaries", () => {
  it("uses actual lifecycle status, excludes drafts/archives and does not guess from display labels", () => {
    const records = [
      { slug: "director-pathway", status: "closed", applicationStatus: "Open" },
      { slug: "current", status: "published", applicationStatus: "Closed" },
      { slug: "draft", status: "draft" },
      { slug: "archive", status: "archived" },
    ];
    expect(splitPublicProgrammes(records).previous.map((p) => p.slug)).toEqual(["director-pathway"]);
    expect(splitPublicProgrammes(records).current.map((p) => p.slug)).toEqual(["current"]);
  });
  it("removes only the approved development feedback sentences while retaining deadlines", () => {
    const suffix = "If not contacted by Wednesday 5th August, applicants are considered unsuccessful.";
    for (const note of [
      "No individual feedback available for unsuccessful applicants.",
      "Due to high volume, individual feedback is not provided.",
      "Note: As a reminder, due to the anticipated volume of applications, we’re unfortunately unable to provide individual feedback to unsuccessful applicants.",
    ]) {
      expect(developmentDetailContent("director-pathway", `${note} ${suffix}`)).toBe(suffix);
      expect(developmentDetailContent("producer-pathway", note)).toBe("");
      expect(developmentDetailContent("first-credit", note)).toBe(note);
    }
  });
});
