import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TrainingListings } from "./training-listings";

const api = vi.hoisted(() => ({ useListPublicProgrammes: vi.fn() }));
vi.mock("@workspace/api-client-react", () => ({ getListPublicProgrammesQueryKey: () => ["p"], ...api }));
vi.mock("./layout", () => ({ MaskedLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
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
    ] });
    render(<TrainingListings />);
    expect(screen.getByTestId("training-open")).toHaveTextContent("Open course");
    expect(screen.getByTestId("training-unconfirmed")).toHaveTextContent("Unknown course");
    expect(screen.getByTestId("training-closed")).toHaveTextContent("Old course");
    expect(screen.queryByText("Draft course")).toBeNull();
    expect(screen.queryByText("Dev")).toBeNull();
  });
});
