import { expect, test } from "@playwright/test";

test("navigating away immediately after an edit keeps the latest queued change locally", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "desktop editor navigation persistence");
  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();
  await page.getByPlaceholder(/Search:/).fill("Brand Story");
  await page.locator("article").filter({
    has: page.getByRole("heading", { name: "Brand Story · Editorial" }),
  }).getByRole("button", { name: /Edit sample/i }).click();
  await expect(page).toHaveURL(/\/presentations\/[^/]+\/editor/);
  const editorUrl = page.url();

  const input = page.getByRole("textbox", { name: "Edit template text" }).first();
  await expect(input).toBeVisible();
  await input.fill("Queued edit survives immediate navigation");
  // Leave before the normal 500 ms autosave debounce can flush.
  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();

  await page.goto(editorUrl);
  await expect(page.getByRole("textbox", { name: "Edit template text" }).first())
    .toHaveValue("Queued edit survives immediate navigation");
});
