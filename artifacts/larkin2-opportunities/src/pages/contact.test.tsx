import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

const api = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
vi.mock("@workspace/api-client-react", () => ({
  useSubmitContactEnquiry: () => ({ mutateAsync: api.mutateAsync, isPending: api.isPending }),
}));
import { ContactPage } from "./contact";

beforeEach(() => { api.mutateAsync.mockReset(); });
afterEach(cleanup);

function renderPage() {
  const { hook } = memoryLocation({ path: "/contact" });
  return render(<Router hook={hook}><ContactPage /></Router>);
}

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Your name/), "Alex");
  await user.type(screen.getByLabelText(/Email address/), "alex@example.com");
  await user.type(screen.getByLabelText(/Subject/), "Trainee roles");
  await user.type(screen.getByLabelText(/Message/), "Hello there");
}

it("shows accessible errors for blank or whitespace fields and does not submit", async () => {
  const user = userEvent.setup();
  renderPage();
  await user.type(screen.getByLabelText(/Your name/), "   ");
  await user.click(screen.getByTestId("button-contact-submit"));
  expect(api.mutateAsync).not.toHaveBeenCalled();
  expect(screen.getByLabelText(/Your name/)).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText(/Your name/)).toHaveFocus();
  expect(screen.getByTestId("error-contact-message")).toBeInTheDocument();
});

it("keeps the honeypot out of tab order and assistive tech", () => {
  renderPage();
  const hp = screen.getByTestId("input-contact-website");
  expect(hp).toHaveAttribute("tabindex", "-1");
  expect(hp.closest("[aria-hidden='true']")).not.toBeNull();
});

it("preserves inputs on failure and reuses the requestId for an identical retry", async () => {
  const user = userEvent.setup();
  api.mutateAsync.mockRejectedValue(new Error("down"));
  renderPage();
  await fill(user);
  await user.click(screen.getByTestId("button-contact-submit"));
  expect(await screen.findByRole("alert")).toHaveTextContent("admin@HETVopportunities.com");
  expect(screen.getByLabelText(/Subject/)).toHaveValue("Trainee roles");
  await user.click(screen.getByTestId("button-contact-submit"));
  expect(api.mutateAsync).toHaveBeenCalledTimes(2);
  const [a, b] = api.mutateAsync.mock.calls.map((c) => c[0].data.requestId);
  expect(a).toBe(b);
  await user.type(screen.getByLabelText(/Message/), "!");
  await user.click(screen.getByTestId("button-contact-submit"));
  expect(api.mutateAsync.mock.calls[2][0].data.requestId).not.toBe(a);
});

it("only treats accepted status as success", async () => {
  const user = userEvent.setup();
  api.mutateAsync.mockResolvedValueOnce({ status: "queued", message: "x" });
  renderPage();
  await fill(user);
  await user.click(screen.getByTestId("button-contact-submit"));
  expect(await screen.findByTestId("status-contact-error")).toBeInTheDocument();
  api.mutateAsync.mockResolvedValueOnce({ status: "accepted", message: "Received." });
  await user.click(screen.getByTestId("button-contact-submit"));
  expect(await screen.findByTestId("status-contact-success")).toHaveTextContent(/accepted for delivery/);
});

it("ignores a second submit while the first is in flight", async () => {
  const user = userEvent.setup();
  api.mutateAsync.mockReturnValue(new Promise(() => {}));
  renderPage();
  await fill(user);
  const button = screen.getByTestId("button-contact-submit");
  await user.click(button);
  await user.click(button);
  expect(api.mutateAsync).toHaveBeenCalledTimes(1);
});
