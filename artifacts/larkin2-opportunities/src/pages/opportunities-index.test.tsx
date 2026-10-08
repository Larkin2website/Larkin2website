import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { OpportunitiesIndexPage } from "./opportunities-index";

const api = vi.hoisted(() => ({ useListPublicProgrammes: vi.fn() }));
vi.mock("@workspace/api-client-react", () => ({ getListPublicProgrammesQueryKey: () => ["programmes"], ...api }));
vi.mock("../components/layout", () => ({
  SiteHeader: () => null,
  MobileMenu: () => null,
  SiteFooter: () => null,
  MaskedLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
afterEach(cleanup);

describe("opportunities overview presentation", () => {
  it("keeps real listings in their status groups without unconfirmed notices or an example programme", () => {
    const base = { category: "training", shortDescription: "Course description", location: "Online", applicationDeadline: null };
    api.useListPublicProgrammes.mockReturnValue({ data: [
      { ...base, id: "open", slug: "open-course", title: "Open course", status: "published", registrationState: "open" },
      { ...base, id: "unknown", slug: "unknown-course", title: "Course awaiting dates", status: "published", registrationState: "unconfirmed" },
      { ...base, id: "closed", slug: "closed-course", title: "Closed course", status: "closed", registrationState: "closed" },
      { ...base, id: "draft", slug: "draft-course", title: "Private draft", status: "draft" },
    ] });
    render(<OpportunitiesIndexPage />);
    const more = screen.getByTestId("section-unconfirmed");
    expect(more).toHaveTextContent("More opportunities");
    expect(more).toHaveTextContent("Course awaiting dates");
    expect(more).not.toHaveTextContent(/unconfirmed|cannot confirm/i);
    expect(more.querySelectorAll(".opp-card-meta-item")).toHaveLength(1);
    expect(screen.queryByText(/programme has been delivered/i)).toBeNull();
    expect(screen.queryByText(/example/i)).toBeNull();
    expect(screen.queryByText("Private draft")).toBeNull();
    expect(screen.getAllByRole("link", { name: "View course details" }).map(link => link.getAttribute("href"))).toEqual([
      "/opportunities/open-course", "/opportunities/unknown-course", "/opportunities/closed-course",
    ]);
  });

  it("does not insert examples into loading, failure or empty states", () => {
    api.useListPublicProgrammes.mockReturnValue({ data: [], isLoading: true });
    const view = render(<OpportunitiesIndexPage />);
    expect(screen.getByText("Loading opportunities…")).toBeInTheDocument();
    expect(screen.queryByText(/example/i)).toBeNull();
    api.useListPublicProgrammes.mockReturnValue({ data: [], isError: true });
    view.rerender(<OpportunitiesIndexPage />);
    expect(screen.getByText(/couldn’t load opportunities/i)).toBeInTheDocument();
    api.useListPublicProgrammes.mockReturnValue({ data: [] });
    view.rerender(<OpportunitiesIndexPage />);
    expect(screen.getByText(/No programmes are currently accepting applications/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View course details" })).toBeNull();
  });
});
