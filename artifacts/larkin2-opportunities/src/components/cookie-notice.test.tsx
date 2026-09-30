import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Router } from "wouter";
import { CookieNotice } from "./cookie-notice";

const renderNotice = () => render(
  <Router base="/larkin2-opportunities">
    <CookieNotice />
  </Router>,
);

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/larkin2-opportunities/");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("appears on a direct route and links to the Cookies section of the Privacy Notice", () => {
  window.history.replaceState({}, "", "/larkin2-opportunities/roles");
  renderNotice();

  expect(screen.getByRole("region", { name: "Cookie notice" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Privacy Notice" })).toHaveAttribute(
    "href",
    "/larkin2-opportunities/privacy#legal-section-9",
  );
  expect(screen.getByRole("button", { name: "Dismiss cookie notice" })).toBeInTheDocument();
});

test("dismissal persists after a reload without claiming consent", () => {
  const notice = renderNotice();
  expect(screen.getByText(/We use cookies and similar technologies/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Dismiss cookie notice" }));
  expect(screen.queryByRole("region", { name: "Cookie notice" })).not.toBeInTheDocument();
  expect(window.localStorage.getItem("hetv-cookie-notice-dismissed")).toBe("true");

  notice.unmount();
  renderNotice();
  expect(screen.queryByRole("region", { name: "Cookie notice" })).not.toBeInTheDocument();
});

test("the notice can be dismissed when browser storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage blocked"); });
  renderNotice();

  expect(screen.getByRole("region", { name: "Cookie notice" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss cookie notice" }));
  expect(screen.queryByRole("region", { name: "Cookie notice" })).not.toBeInTheDocument();
});