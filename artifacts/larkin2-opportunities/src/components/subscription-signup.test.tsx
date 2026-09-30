import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SubscriptionSignup } from "./subscription-signup";
import { SignupJourneyProvider } from "../lib/signup-journey";

const api = vi.hoisted(() => ({ createPublicSubscription: vi.fn() }));
vi.mock("@workspace/api-client-react", () => api);

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(cleanup);

it("exposes labeled required fields and focuses an announced submission error", async () => {
  const user = userEvent.setup();
  api.createPublicSubscription.mockRejectedValue(new Error("Request failed"));
  render(<SignupJourneyProvider><SubscriptionSignup /></SignupJourneyProvider>);

  expect(screen.getByLabelText("Your name")).toBeRequired();
  expect(screen.getByLabelText("Email address")).toBeRequired();
  const consent = screen.getByTestId("checkbox-signup-consent");
  expect(consent).toBeRequired();
  await user.type(screen.getByLabelText("Your name"), "Alex");
  await user.type(screen.getByLabelText("Email address"), "alex@example.com");
  await user.click(consent);
  await user.click(screen.getByRole("button", { name: "Skip preferences" }));

  const error = await screen.findByRole("alert");
  expect(error).toHaveFocus();
  expect(error).toHaveTextContent("We couldn't save your request");
});