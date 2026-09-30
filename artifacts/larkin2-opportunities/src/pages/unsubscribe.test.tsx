import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { UnsubscribePage } from "./unsubscribe";

const api = vi.hoisted(() => ({
  requestSubscriptionCode: vi.fn(),
  verifySubscriptionCode: vi.fn(),
  getVerifiedSubscriptionPreferences: vi.fn(),
  updateVerifiedSubscriptionPreferences: vi.fn(),
  unsubscribeVerifiedSubscription: vi.fn(),
  getPublicSubscriptionPreferences: vi.fn(),
  updatePublicSubscriptionPreferences: vi.fn(),
}));
const preferences = {
  name: "Alex", craft: "Editing", interests: ["Mentoring"], contentTypes: ["role"],
  careerLevels: [], crafts: ["Sound"], allOpportunities: false,
};
vi.mock("@workspace/api-client-react", () => ({
  ...api,
  AudienceContentType: { role: "role", programme: "programme", training: "training" },
  CareerLevel: { new_entrant: "new_entrant", mid_level: "mid_level", senior: "senior" },
  useListPublicOpportunityOptions: () => ({ data: { departments: ["Sound", "Camera"] } }),
}));
vi.mock("../components/layout", () => ({
  SiteHeader: () => null, MobileMenu: () => null, SiteFooter: () => null,
}));
vi.mock("../lib/subscription-link", () => ({
  savedSubscriptionToken: () => sessionStorage.getItem("legacy-link") ?? "",
  consumeSubscriptionFragment: () => null,
  tokenFromLink: (token: string) => token,
}));

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, "", "/unsubscribe");
  vi.resetAllMocks();
  api.requestSubscriptionCode.mockResolvedValue({ message: "Check your email" });
  api.verifySubscriptionCode.mockResolvedValue({ accessToken: "s".repeat(43), expiresAt: "2026-09-27T00:00:00Z" });
  api.getVerifiedSubscriptionPreferences.mockResolvedValue(preferences);
  api.updateVerifiedSubscriptionPreferences.mockResolvedValue({ ...preferences, craft: "Camera" });
  api.unsubscribeVerifiedSubscription.mockResolvedValue({ message: "Stopped" });
  api.getPublicSubscriptionPreferences.mockResolvedValue({ ...preferences, name: "Old subscriber", craft: "Old craft" });
  api.updatePublicSubscriptionPreferences.mockResolvedValue(preferences);
});
afterEach(cleanup);

it("preserves an arbitrary legacy referral response when other preferences are edited", async () => {
  sessionStorage.setItem("legacy-link", "l".repeat(43));
  api.getPublicSubscriptionPreferences.mockResolvedValue({
    ...preferences, acquisitionSource: "Local crew newsletter", acquisitionDetail: "A note from Jamie",
    acquisitionDetailDeclined: false,
  });
  const user = userEvent.setup();
  render(<UnsubscribePage />);
  await user.click(screen.getByRole("button", { name: "Load preferences" }));
  expect(await screen.findByLabelText("How did you hear about us?")).toHaveValue("__legacy__");
  expect(screen.getByLabelText("Add any detail you would like to share. (optional)")).toHaveValue("A note from Jamie");
  await user.clear(screen.getByLabelText("Your current or primary craft"));
  await user.type(screen.getByLabelText("Your current or primary craft"), "Camera");
  await user.click(screen.getByRole("button", { name: "Update preferences" }));
  await waitFor(() => expect(api.updatePublicSubscriptionPreferences).toHaveBeenCalled());
  expect(api.updatePublicSubscriptionPreferences.mock.calls[0]![0]).toMatchObject({
    acquisitionSource: "Local crew newsletter",
    acquisitionDetail: "A note from Jamie",
    acquisitionDetailDeclined: false,
    craft: "Camera",
  });
});

it("loads and saves website purpose answers with a legacy link, clearing Other when deselected", async () => {
  sessionStorage.setItem("legacy-link", "l".repeat(43));
  api.getPublicSubscriptionPreferences.mockResolvedValue({
    ...preferences, websitePurposes: ["on_behalf", "other"], websitePurposeOther: "For a colleague",
  });
  const user = userEvent.setup();
  render(<UnsubscribePage />);
  await user.click(screen.getByRole("button", { name: "Load preferences" }));
  expect(await screen.findByLabelText("Opportunities on behalf of someone else")).toBeChecked();
  expect(screen.getByLabelText("Other")).toBeChecked();
  expect(screen.getByLabelText("Other (optional)")).toHaveValue("For a colleague");
  await user.click(screen.getByLabelText("Other"));
  expect(screen.queryByLabelText("Other (optional)")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Update preferences" }));
  await waitFor(() => expect(api.updatePublicSubscriptionPreferences).toHaveBeenCalled());
  expect(api.updatePublicSubscriptionPreferences.mock.calls[0]![0]).toMatchObject({
    websitePurposes: ["on_behalf"],
    websitePurposeOther: null,
  });
});

it("hides another link's details while loading the newly verified account", async () => {
  sessionStorage.setItem("legacy-link", "l".repeat(43));
  let finishLoad: ((value: typeof preferences) => void) | undefined;
  api.getVerifiedSubscriptionPreferences.mockImplementation(() => new Promise(resolve => { finishLoad = resolve; }));
  const user = userEvent.setup();
  render(<UnsubscribePage />);
  await user.click(screen.getByRole("button", { name: "Load preferences" }));
  expect(await screen.findByDisplayValue("Old subscriber")).toBeInTheDocument();
  await user.type(screen.getByLabelText("Email address"), "alex@example.com");
  await user.click(screen.getByRole("button", { name: "Send verification code" }));
  await user.type(screen.getByLabelText("Six-digit verification code"), "123456");
  await user.click(screen.getByRole("button", { name: "Verify and manage" }));
  await waitFor(() => expect(api.getVerifiedSubscriptionPreferences).toHaveBeenCalled());
  expect(screen.queryByDisplayValue("Old subscriber")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Update preferences" })).not.toBeInTheDocument();
  finishLoad!(preferences);
  expect(await screen.findByDisplayValue("Alex")).toBeInTheDocument();
});

it("uses email code access to update preferences and unsubscribe without a legacy token", async () => {
  const user = userEvent.setup();
  render(<UnsubscribePage />);
  expect(screen.getByLabelText("Email address")).toHaveAttribute("aria-describedby", "verification-email-hint");
  await user.type(screen.getByLabelText("Email address"), "alex@example.com");
  await user.click(screen.getByRole("button", { name: "Send verification code" }));
  await waitFor(() => expect(api.requestSubscriptionCode).toHaveBeenCalledWith({ email: "alex@example.com" }));
  expect(screen.getByRole("status")).toHaveTextContent("If this address has an active subscription");
  await user.type(screen.getByLabelText("Six-digit verification code"), "123456");
  await user.click(screen.getByRole("button", { name: "Verify and manage" }));
  await waitFor(() => expect(api.getVerifiedSubscriptionPreferences).toHaveBeenCalledWith({ accessToken: "s".repeat(43) }));
  expect(screen.getByLabelText("Your current or primary craft")).toHaveValue("Editing");
  expect(screen.getByLabelText("Your topics or themes, separated by commas")).toHaveValue("Mentoring");
  expect(screen.getByLabelText("Selected departments or other crafts, separated by commas")).toHaveValue("Sound");
  await user.clear(screen.getByLabelText("Your current or primary craft"));
  await user.type(screen.getByLabelText("Your current or primary craft"), "Camera");
  await user.click(screen.getByRole("button", { name: "Update preferences" }));
  await waitFor(() => expect(api.updateVerifiedSubscriptionPreferences).toHaveBeenCalled());
  const update = api.updateVerifiedSubscriptionPreferences.mock.calls[0]![0];
  expect(update).toMatchObject({ accessToken: "s".repeat(43), craft: "Camera", interests: ["Mentoring"], crafts: ["Sound"] });
  expect(update).not.toHaveProperty("managementToken");
  await user.click(screen.getByRole("button", { name: "Unsubscribe" }));
  await waitFor(() => expect(api.unsubscribeVerifiedSubscription).toHaveBeenCalledWith({ accessToken: "s".repeat(43) }));
  expect(screen.getByTestId("status-unsubscribed")).toBeInTheDocument();
  expect(sessionStorage.getItem("hetv_verified_subscription_access")).toBeNull();
});

it("focuses an announced error for an invalid saved management link", async () => {
  sessionStorage.setItem("legacy-link", "incomplete");
  const user = userEvent.setup();
  render(<UnsubscribePage />);
  await user.click(screen.getByRole("button", { name: "Load preferences" }));
  const error = await screen.findByRole("alert");
  expect(error).toHaveFocus();
  expect(error).toHaveTextContent("Please paste the complete personal link");
});

it("loads and saves website purpose answers through verified email access", async () => {
  api.getVerifiedSubscriptionPreferences.mockResolvedValue({
    ...preferences, websitePurposes: ["share_network"], websitePurposeOther: null,
  });
  const user = userEvent.setup();
  render(<UnsubscribePage />);
  await user.type(screen.getByLabelText("Email address"), "alex@example.com");
  await user.click(screen.getByRole("button", { name: "Send verification code" }));
  await user.type(screen.getByLabelText("Six-digit verification code"), "123456");
  await user.click(screen.getByRole("button", { name: "Verify and manage" }));
  expect(await screen.findByLabelText("Opportunities to share with my network/community")).toBeChecked();
  await user.click(screen.getByLabelText("General industry interest"));
  await user.click(screen.getByRole("button", { name: "Update preferences" }));
  await waitFor(() => expect(api.updateVerifiedSubscriptionPreferences).toHaveBeenCalled());
  expect(api.updateVerifiedSubscriptionPreferences.mock.calls[0]![0]).toMatchObject({
    websitePurposes: ["share_network", "industry_interest"],
    websitePurposeOther: null,
    accessToken: "s".repeat(43),
  });
});