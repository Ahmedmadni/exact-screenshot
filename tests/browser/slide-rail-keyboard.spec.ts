import { expect, test } from "@playwright/test";

test("slide rail supports accessible keyboard selection and arrow navigation", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "desktop keyboard navigation regression");

  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();
  await page.getByPlaceholder(/Search:/).fill("Brand Story");
  await page.locator("article").filter({
    has: page.getByRole("heading", { name: "Brand Story · Editorial" }),
  }).getByRole("button", { name: /Edit sample/i }).click();
  await expect(page).toHaveURL(/\/presentations\/[^/]+\/editor/);

  const slides = page.locator("[data-slide-selection]");
  await expect(slides.first()).toBeVisible();
  expect(await slides.count()).toBeGreaterThan(1);

  await slides.first().focus();
  await expect(slides.first()).toBeFocused();
  await slides.first().press("ArrowDown");
  await expect(slides.nth(1)).toBeFocused();
  await expect(slides.nth(1)).toHaveAttribute("aria-current", "true");

  await slides.first().focus();
  await slides.first().press("Enter");
  await expect(slides.first()).toHaveAttribute("aria-current", "true");
});
