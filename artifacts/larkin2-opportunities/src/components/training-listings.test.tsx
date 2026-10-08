import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TrainingListings } from "./training-listings";

const api = vi.hoisted(() => ({ useListPublicProgrammes: vi.fn() }));
vi.mock("@workspace/api-client-react", () => ({ getListPublicProgrammesQueryKey: () => ["p"], ...api }));
vi.mock("./layout", () => ({ MaskedLink: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => <a href={href} className={className}>{children}</a> }));
afterEach(cleanup);

const base = { category: "training", shortDescription: "d", applicationDeadline: null };
describe("training listings", () => {
  it("announces loading and does not present incomplete data as an empty list", () => {
    api.useListPublicProgrammes.mockReturnValue({ data: [], isLoading: true });
    render(<TrainingListings />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading training courses");
    expect(screen.queryByTestId("training-open")).toBeNull();
  });
  it("announces a failed request and allows a retry", () => {
    api.useListPublicProgrammes.mockReturnValue({ data: [], isError: true, refetch: vi.fn() });
    render(<TrainingListings />);
    expect(screen.getByRole("alert")).toHaveTextContent("couldn’t load training courses");
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });
  it("shows honest empty states when no course records are available", () => {
    api.useListPublicProgrammes.mockReturnValue({ data: [] });
    render(<TrainingListings />);
    expect(screen.getByTestId("training-open")).toHaveTextContent("No training courses are currently open for registration");
    expect(screen.getByTestId("training-closed")).toHaveTextContent("No closed training courses are currently listed");
  });
  it("separates open, unconfirmed and closed and hides drafts", () => {
    api.useListPublicProgrammes.mockReturnValue({ data: [
      { ...base, id: "1", slug: "a", title: "Open course", status: "published", registrationState: "open" },
      { ...base, id: "2", slug: "b", title: "Unknown course", status: "published", registrationState: "unconfirmed" },
      { ...base, id: "3", slug: "c", title: "Old course", status: "closed", registrationState: "closed" },
      { ...base, id: "4", slug: "d", title: "Draft course", status: "draft", registrationState: "open" },
      { ...base, id: "5", slug: "e", title: "Dev", status: "published", category: "programme" },
      { ...base, id: "6", slug: "first-credit", title: "First Credit Work Experience", status: "closed", category: "programme" },
    ] });
    render(<TrainingListings />);
    expect(screen.getByTestId("training-open")).toHaveTextContent("Open course");
    expect(screen.getByTestId("training-unconfirmed")).toHaveTextContent("Unknown course");
    expect(screen.getByRole("heading", { name: "More training courses" })).toBeInTheDocument();
    expect(screen.queryByText(/Registration status unconfirmed/i)).toBeNull();
    expect(screen.queryByText(/registration deadline for these courses cannot be confirmed/i)).toBeNull();
    expect(screen.getByTestId("training-unconfirmed").querySelector(".programme-status-badge")).toBeNull();
    expect(screen.getByTestId("training-closed")).toHaveTextContent("Old course");
    expect(screen.getByTestId("training-closed")).toHaveTextContent("First Credit Work Experience");
    expect(screen.getByRole("link", { name: "View First Credit Programme" })).toHaveAttribute("href", "/opportunities/first-credit");
    expect(screen.getByRole("link", { name: "View First Credit Programme" })).toHaveClass("larkin2-btn");
    for (const link of screen.getAllByRole("link", { name: "View course details" })) {
      expect(link).toHaveClass("larkin2-btn");
    }
    expect(screen.getByTestId("training-open")).not.toHaveTextContent("First Credit");
    expect(screen.getByTestId("training-open").compareDocumentPosition(screen.getByTestId("training-closed")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("training-open").compareDocumentPosition(screen.getByTestId("training-unconfirmed")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText("Draft course")).toBeNull();
    expect(screen.queryByText("Dev")).toBeNull();
  });
});
