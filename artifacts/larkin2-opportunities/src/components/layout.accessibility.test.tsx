import { useRef, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MaskedLink, MobileMenu, SiteHeader } from "./layout";

vi.mock("../utils/navigation", () => ({ scrollToHash: vi.fn() }));
vi.mock("../utils/smooth-scroll", () => ({
  pausePageScroll: vi.fn(),
  resumePageScroll: vi.fn(),
}));

function HeaderAndMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <SiteHeader
        scrolled={false}
        headerHidden={false}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        headerRef={headerRef}
        menuButtonRef={menuButtonRef}
      />
      <MobileMenu
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuButtonRef={menuButtonRef}
      />
    </>
  );
}

describe("shared layout accessibility", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("opens a named modal menu, traps keyboard focus, and restores the trigger on Escape", async () => {
    const user = userEvent.setup();
    render(<HeaderAndMenu />);

    const trigger = screen.getByRole("button", { name: "Open navigation menu" });
    const panel = screen.getByTestId("button-menu-close").closest('[role="dialog"]');
    expect(panel).toHaveAttribute("inert");
    expect(panel).toHaveAttribute("aria-hidden", "true");

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "HETV Opportunities Hub / navigation" })).toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(screen.getByRole("button", { name: "Close menu" })).toHaveFocus());
    expect(screen.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByTestId("link-mobile-faqs")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveFocus();
    expect(panel).toHaveAttribute("aria-hidden", "true");
    expect(panel).toHaveAttribute("inert");
  });

  it("keeps complex masked-link children as the accessible link name", () => {
    render(
      <MaskedLink href="/roles">
        <>View <strong>all roles</strong></>
      </MaskedLink>,
    );

    expect(screen.getByRole("link", { name: "View all roles" })).toBeInTheDocument();
  });
});