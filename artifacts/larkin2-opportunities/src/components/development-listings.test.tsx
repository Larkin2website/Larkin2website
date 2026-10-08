import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DevelopmentListings } from "./development-listings";

const api = vi.hoisted(() => ({ useListPublicProgrammes: vi.fn() }));
vi.mock("@workspace/api-client-react", () => ({
  getListPublicProgrammesQueryKey: () => ["/public/programmes"],
  ...api,
}));
vi.mock("./layout", () => ({
  MaskedLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
afterEach(cleanup);
beforeEach(() => api.useListPublicProgrammes.mockReturnValue({ data: [], isLoading: false, isError: false }));

describe("development programme archive", () => {
  it("shows explicit loading, error and empty states rather than sample history", () => {
    api.useListPublicProgrammes.mockReturnValue({ isLoading: true });
    const view = render(<DevelopmentListings />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading development programmes");
    api.useListPublicProgrammes.mockReturnValue({ isError: true });
    view.rerender(<DevelopmentListings />);
    expect(screen.getByRole("alert")).toHaveTextContent("couldn’t load development programmes");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    api.useListPublicProgrammes.mockReturnValue({ data: [], isLoading: false, isError: false });
    view.rerender(<DevelopmentListings />);
    expect(screen.getByText("No closed development programmes are currently listed.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View programme details" })).not.toBeInTheDocument();
  });
  it("links existing closed development records and excludes training, drafts and archived records", () => {
    api.useListPublicProgrammes.mockReturnValue({ data: [
      { id: "director", slug: "director-pathway", status: "closed", title: "Director Pathway", shortDescription: "Approved director programme." },
      { id: "producer", slug: "producer-pathway", status: "published", title: "Producer Pathway", shortDescription: "Approved producer programme." },
      { id: "training", slug: "first-credit", status: "closed", title: "Training programme" },
      { id: "draft", slug: "director-pathway", status: "draft", title: "Private draft" },
      { id: "archived", slug: "producer-pathway", status: "archived", title: "Private archive" },
    ] });
    render(<DevelopmentListings />);
    expect(screen.getByText("Applications closed")).toBeInTheDocument();
    expect(screen.getByText("Applications open")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "View programme details" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/opportunities/producer-pathway", "/opportunities/director-pathway"]);
    expect(screen.queryByText("Training programme")).not.toBeInTheDocument();
    expect(screen.queryByText(/Private/)).not.toBeInTheDocument();
    expect(screen.queryByText(/does not confirm that a programme has been delivered/)).not.toBeInTheDocument();
    expect(screen.getByText("These development programme application windows are closed.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore all closed programme records" })).toHaveAttribute("href", "/opportunities#previous-programmes");
  });
});
