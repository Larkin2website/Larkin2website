import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RolesPage } from "./roles";

const publicOpportunities = [
  {
    slug: "wardrobe-assistant",
    title: "Wardrobe Assistant",
    publicationLabel: "Applications close Friday",
    department: "Wardrobe",
    roleType: "Freelance",
    status: "Open",
    summary: "Support the wardrobe team.",
    applicationDeadline: "Applications close Friday",
    responseDate: null,
    applicationUrl: null,
    deadlineExtended: false,
    featured: false,
    urgent: false,
    responsibilities: ["Support the team"],
    essential: [],
    desired: [],
    details: [],
  },
];

vi.mock("@workspace/api-client-react", () => ({
  getListPublicOpportunityOptionsQueryKey: () => ["/public/opportunity-options"],
  getListPublicOpportunitiesQueryKey: () => ["/public/opportunities"],
  useListPublicOpportunityOptions: () => ({
    data: {
      departments: ["Art", "Wardrobe"],
      roleTypes: ["Freelance", "Permanent"],
    },
  }),
  useListPublicOpportunities: () => ({
    data: publicOpportunities,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../components/layout", () => ({
  SiteHeader: () => null,
  MobileMenu: () => null,
  SiteFooter: () => null,
  MaskedLink: ({ children }: { children: React.ReactNode }) => <a href="#role">{children}</a>,
}));

describe("RolesPage department filtering", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/roles");
  });

  it("shows an active department with no public roles and keeps role-derived labels after selecting it", async () => {
    const user = userEvent.setup();
    render(<RolesPage />);

    const departmentSelect = screen.getByLabelText("Department");
    expect(within(departmentSelect).getByRole("option", { name: "Art" })).toBeInTheDocument();
    expect(within(departmentSelect).getByRole("option", { name: "Wardrobe" })).toBeInTheDocument();
    expect(screen.getByLabelText("Role type")).toHaveTextContent("Freelance");
    expect(screen.getByLabelText("Role type")).toHaveTextContent("Permanent");
    expect(screen.getByLabelText("Status")).toHaveTextContent("Open");

    await user.selectOptions(departmentSelect, "Art");

    expect(screen.getByTestId("text-roles-count")).toHaveTextContent("0 Results");
    expect(screen.getByTestId("container-roles-empty")).toHaveTextContent("No roles match those filters");
    expect(within(departmentSelect).getByRole("option", { name: "Wardrobe" })).toBeInTheDocument();
    expect(screen.getByLabelText("Role type")).toHaveTextContent("Freelance");
    expect(screen.getByLabelText("Status")).toHaveTextContent("Open");

    await user.selectOptions(departmentSelect, "");
    await user.selectOptions(screen.getByLabelText("Role type"), "Permanent");

    expect(screen.getByTestId("text-roles-count")).toHaveTextContent("0 Results");
    expect(screen.getByTestId("container-roles-empty")).toHaveTextContent("No roles match those filters");
    expect(within(departmentSelect).getByRole("option", { name: "Wardrobe" })).toBeInTheDocument();
    expect(screen.getByLabelText("Role type")).toHaveTextContent("Freelance");
    expect(screen.getByLabelText("Status")).toHaveTextContent("Open");
  });
});