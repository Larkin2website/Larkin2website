import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PreferencesPage } from "./preferences";
import { SignupJourneyProvider, useSignupJourney } from "../lib/signup-journey";

const api = vi.hoisted(() => ({ createPublicSubscription: vi.fn() }));
vi.mock("@workspace/api-client-react", () => ({
  ...api,
  AudienceContentType: { role: "role", programme: "programme", training: "training" },
  CareerLevel: { new_entrant: "new_entrant", mid_level: "mid_level", senior: "senior" },
  useListPublicOpportunityOptions: () => ({ data: { departments: [] }, isError: false, refetch: vi.fn() }),
}));
vi.mock("../components/layout", () => ({
  SiteHeader: () => null, MobileMenu: () => null, SiteFooter: () => null,
}));
vi.mock("../lib/subscription-link", () => ({ consumeSubscriptionFragment: () => null }));

beforeEach(() => {
  vi.resetAllMocks();
  api.createPublicSubscription.mockResolvedValue({ message: "Saved" });
});
afterEach(cleanup);

function FollowupPage() {
  const { setDraft } = useSignupJourney();
  useEffect(() => setDraft({ name: "Alex", email: "alex@example.com" }), [setDraft]);
  return <PreferencesPage />;
}

it("clears route details on source changes and submits an explicit detail decline", async () => {
  const user = userEvent.setup();
  render(<SignupJourneyProvider><FollowupPage /></SignupJourneyProvider>);
  const route = await screen.findByLabelText("How did you hear about us? (optional)");
  await user.selectOptions(route, "instagram");
  const detail = screen.getByLabelText("More about this route (optional)");
  await user.type(detail, "Crew account");
  await user.selectOptions(route, "linkedin");
  expect(screen.getByLabelText("More about this route (optional)")).toHaveValue("");
  await user.type(screen.getByLabelText("More about this route (optional)"), "A producer");
  await user.click(screen.getByLabelText("Prefer not to say more"));
  expect(screen.getByLabelText("More about this route (optional)")).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Sign up with these preferences" }));
  await waitFor(() => expect(api.createPublicSubscription).toHaveBeenCalled());
  expect(api.createPublicSubscription.mock.calls[0]![0]).toMatchObject({
    acquisitionSource: "linkedin",
    acquisitionDetailDeclined: true,
  });
  expect(api.createPublicSubscription.mock.calls[0]![0].acquisitionDetail).toBeUndefined();
});