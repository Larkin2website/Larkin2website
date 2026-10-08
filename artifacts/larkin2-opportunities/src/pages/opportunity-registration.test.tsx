import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { OpportunityPage } from "./opportunity";

const api = vi.hoisted(() => ({
  useGetPublicProgramme: vi.fn(),
  recordPublicEngagement: vi.fn(() => Promise.resolve()),
}));
vi.mock("@workspace/api-client-react", () => ({
  getGetPublicProgrammeQueryKey: (slug: string) => [slug],
  ...api,
}));
const form = "https://airtable.com/appBmuMR6u77V1PsU/pagAIhhIDcBrhyaUI/form";
const course = {
  id: "course-id", slug: "career-mapping-session", title: "Career Mapping Session",
  category: "training", status: "published", registrationState: "open",
  applicationUrl: form, location: "Virtual", num: "8", shortDescription: "A course.",
  about: [], placement: [], training: [], eligibility: [], timeline: [], applicationGuidance: [],
};
function show(overrides = {}) {
  api.useGetPublicProgramme.mockReturnValue({ data: { ...course, ...overrides } });
  const location = memoryLocation({ path: "/opportunities/career-mapping-session" });
  return render(<Router hook={location.hook}><OpportunityPage id="career-mapping-session" /></Router>);
}
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("registration sidebar", () => {
  it("omits source attribution links and empty source-only blocks across detail sections", () => {
    show({
      about: ["A course.", "Original course listing: https://larkin2opportunities.com/trainings/example/"],
      eligibility: ["Original course listing: https://larkin2opportunities.com/trainings/example/"],
      applicationGuidance: ["Register through the provider.", "Original course listing: https://larkin2opportunities.com/trainings/example/"],
    });
    expect(screen.queryByText(/Original course listing/i)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Who Can Register?" })).toBeNull();
    expect(screen.getByText("Register through the provider.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register for this course" })).toHaveAttribute("href", form);
    expect(document.querySelector('a[href*="larkin2opportunities.com/trainings/"]')).toBeNull();
  });
  it("uses the actual form and shared button, with a distinct secondary hub action", () => {
    show();
    const primary = screen.getByRole("link", { name: "Register for this course" });
    expect(primary).toHaveAttribute("href", form);
    expect(primary).toHaveClass("larkin2-link", "larkin2-btn");
    expect(primary).not.toHaveClass("secondary");
    expect(primary.querySelector('[aria-hidden="true"]')).not.toBeNull();
    const updates = screen.getByRole("link", { name: "Future opportunity updates" });
    expect(updates).toHaveAttribute("href", "/#signup");
    expect(updates).toHaveClass("secondary");
    expect(primary.parentElement).toBe(updates.parentElement);
    expect(screen.queryByRole("link", { name: "Register interest" })).toBeNull();
    expect(screen.getByText(/does not register you for this course/)).toBeInTheDocument();
    expect(screen.getByText(/Email alerts are not currently enabled/)).toBeInTheDocument();
  });
  it("retains apply engagement tracking without tracking the hub action as course registration", () => {
    show();
    expect(api.recordPublicEngagement).toHaveBeenCalledWith({ kind: "programme", id: "course-id", event: "view" });
    const apply = screen.getByTestId("link-opp-apply");
    apply.addEventListener("click", event => event.preventDefault());
    fireEvent.click(apply);
    expect(api.recordPublicEngagement).toHaveBeenCalledWith({ kind: "programme", id: "course-id", event: "apply" });
    api.recordPublicEngagement.mockClear();
    fireEvent.click(screen.getByTestId("link-opp-signup"));
    expect(api.recordPublicEngagement).not.toHaveBeenCalled();
  });
  it.each([
    { status: "closed", registrationState: "closed" },
    { registrationState: "unconfirmed", registrationClosesOn: "2026-10-13" },
    { registrationState: "closed" },
    { registrationClosesOn: "2020-01-01" },
    { applicationUrl: null },
    { applicationUrl: "" },
  ])("never substitutes hub registration for an unavailable course action: %j", overrides => {
    show(overrides);
    expect(screen.queryByTestId("link-opp-apply")).toBeNull();
    expect(screen.getByRole("link", { name: "Future opportunity updates" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /register for this course|register interest/i })).toBeNull();
  });
  it("offers the source form without inventing a status when the source gives no complete deadline", () => {
    show({
      registrationState: "unconfirmed", registrationClosesOn: null,
      applicationGuidance: ["Signing up does not confirm your place.", "Registration status is unconfirmed: No application link is available until these details are confirmed."],
      timeline: ["Sign-up deadline: 8 October 12 pm (Noon)."],
    });
    expect(screen.getByRole("link", { name: "View registration form" })).toHaveAttribute("href", form);
    expect(screen.getByRole("heading", { name: "Course registration" })).toBeInTheDocument();
    expect(screen.getByText("Sign-up deadline: 8 October 12 pm (Noon).")).toBeInTheDocument();
    expect(screen.getByText("Signing up does not confirm your place.")).toBeInTheDocument();
    expect(screen.queryByText(/unconfirmed|cannot be confirmed|cannot confirm|no registration link/i)).toBeNull();
    expect(screen.queryByText("Registration open")).toBeNull();
  });
  it("keeps programme application destinations, labels and gating", () => {
    show({ category: "programme", applicationUrl: "https://forms.example.org/programme" });
    expect(screen.getByRole("link", { name: "Apply now" })).toHaveAttribute("href", "https://forms.example.org/programme");
    expect(screen.getByRole("link", { name: "Register interest" })).toBeInTheDocument();
    cleanup();
    show({ category: "programme", status: "closed" });
    expect(screen.queryByTestId("link-opp-apply")).toBeNull();
  });
});
