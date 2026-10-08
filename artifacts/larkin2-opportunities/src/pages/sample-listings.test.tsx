import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpportunityPage } from "./opportunity";
import { OpportunitiesIndexPage } from "./opportunities-index";
import { RoleDetailPage } from "./role-detail";
import { RolesPage } from "./roles";

const api = vi.hoisted(() => ({
  useListPublicOpportunityOptions: vi.fn(() => ({ data: { departments: [], roleTypes: [] } })),
  useListPublicOpportunities: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  useListPublicProgrammes: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  useGetPublicOpportunity: vi.fn(() => ({ data: undefined, isLoading: false, isError: false })),
  useGetPublicProgramme: vi.fn(() => ({ data: undefined, isLoading: false, isError: false })),
  recordPublicEngagement: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  getListPublicOpportunityOptionsQueryKey: () => ["/public/opportunity-options"],
  getListPublicOpportunitiesQueryKey: () => ["/public/opportunities"],
  getListPublicProgrammesQueryKey: () => ["/public/programmes"],
  getGetPublicOpportunityQueryKey: (id: string) => [`/public/opportunities/${id}`],
  getGetPublicProgrammeQueryKey: (id: string) => [`/public/programmes/${id}`],
  ...api,
}));

vi.mock("../components/layout", () => ({
  SiteHeader: () => null,
  MobileMenu: () => null,
  SiteFooter: () => null,
  MaskedLink: ({ children, href, className, testId }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    testId?: string;
  }) => <a href={href} className={className} data-testid={testId}>{children}</a>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("development sample listings", () => {
  it("links from the roles list to the clearly marked sample role detail", () => {
    render(<RolesPage />);

    expect(screen.getByText("Find jobs and career opportunities")).toBeInTheDocument();
    expect(screen.getByText("SAMPLE — NOT A REAL OPENING")).toBeInTheDocument();
    expect(screen.getByTestId("link-role-sample-round-2-role")).toHaveAttribute(
      "href",
      "/roles/sample-round-2-role",
    );
  });

  it("renders a sample role detail without requesting, tracking, or offering an application link", () => {
    api.useGetPublicOpportunity.mockClear();
    render(<RoleDetailPage id="sample-round-2-role" />);

    expect(screen.getByRole("heading", { name: "Example production role" })).toBeInTheDocument();
    expect(screen.getByText("SAMPLE — NOT A REAL OPENING")).toBeInTheDocument();
    expect(screen.getByTestId("button-role-apply-now-disabled")).toBeDisabled();
    expect(screen.queryByTestId("link-role-apply-now")).not.toBeInTheDocument();
    expect(api.useGetPublicOpportunity).toHaveBeenCalledWith("sample-round-2-role", expect.objectContaining({
      query: expect.objectContaining({ enabled: false }),
    }));
    expect(api.recordPublicEngagement).not.toHaveBeenCalled();
  });

  it("links from opportunities to an example programme and renders its detail without apply actions", () => {
    const { unmount, container } = render(<OpportunitiesIndexPage />);
    expect(container.querySelector("main img, .opp-card-media")).toBeNull();
    expect(screen.getByText("EXAMPLE ONLY")).toBeInTheDocument();
    expect(screen.getByTestId("link-opp-sample-round-2-programme")).toHaveAttribute(
      "href",
      "/opportunities/sample-round-2-programme",
    );
    unmount();

    api.useGetPublicProgramme.mockClear();
    const detail = render(<OpportunityPage id="sample-round-2-programme" />);
    expect(detail.container.querySelector("main img, .opp-hero-media")).toBeNull();
    expect(screen.getByRole("heading", { name: "Example HETV development programme" })).toBeInTheDocument();
    expect(screen.getByText("Example only — this sample programme is not accepting applications.")).toBeInTheDocument();
    expect(screen.queryByTestId("link-opp-apply")).not.toBeInTheDocument();
    expect(screen.queryByTestId("link-opp-signup")).not.toBeInTheDocument();
    expect(api.useGetPublicProgramme).toHaveBeenCalledWith("sample-round-2-programme", expect.objectContaining({
      query: expect.objectContaining({ enabled: false }),
    }));
    expect(api.recordPublicEngagement).not.toHaveBeenCalled();
  });
});