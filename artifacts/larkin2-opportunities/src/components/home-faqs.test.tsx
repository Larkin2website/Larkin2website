import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { HomeFaqs } from "./home-faqs";
import { newFaq } from "../pages/faq-data";

afterEach(cleanup);

it("renders the existing questions as native, initially collapsed dropdowns", () => {
  const { container } = render(<HomeFaqs />);
  const items = container.querySelectorAll("details");
  expect(items).toHaveLength(2);
  items.forEach(item => {
    expect(item).not.toHaveAttribute("open");
    expect(item.querySelector("summary > h3")).not.toBeNull();
    expect(item.querySelector("summary > svg")).toHaveAttribute("aria-hidden", "true");
  });
  expect(screen.getByText(newFaq.question)).toBeInTheDocument();
  expect(screen.getByText(/Due to the volume of applications/)).toBeInTheDocument();
  expect(screen.getByRole("link", { hidden: true, name: newFaq.email })).toHaveAttribute("href", `mailto:${newFaq.email}`);
});

it("opens and closes each answer independently without changing its content", async () => {
  const user = userEvent.setup();
  const { container } = render(<HomeFaqs />);
  const [first, second] = [...container.querySelectorAll("details")];
  await user.click(first.querySelector("summary")!);
  expect(first).toHaveAttribute("open");
  expect(second).not.toHaveAttribute("open");
  await user.click(second.querySelector("summary")!);
  expect(second).toHaveAttribute("open");
  expect(screen.getByRole("link", { name: newFaq.email })).toHaveAttribute("href", `mailto:${newFaq.email}`);
  await user.click(first.querySelector("summary")!);
  expect(first).not.toHaveAttribute("open");
  expect(second).toHaveAttribute("open");
});
