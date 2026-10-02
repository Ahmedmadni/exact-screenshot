import { expect, test } from "@playwright/test";

test("an editable template opens in the real desktop editor, saves text, and survives reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "desktop workflow");
  await page.goto("/templates");
  await page.getByPlaceholder(/Search:/).fill("brand storytelling");
  // Keyword search returns the editable Brand Story template without relying on card order.
  await page.getByPlaceholder(/Search:/).fill("Brand Story");
  const card = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Brand Story · Editorial" }),
  }).first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /Edit sample/i }).click();
  await expect(page).toHaveURL(/\/presentations\/[^/]+\/editor/);
  const firstText = page.getByRole("textbox", { name: "Edit template text" }).first();
  await expect(firstText).toBeVisible();
  await firstText.fill("Client-edited visual identity story");
  await firstText.press("Tab");
  await expect(firstText).toHaveValue("Client-edited visual identity story");
  await expect(page.getByRole("button", { name: /Save as template/i })).toBeVisible();
  await page.getByRole("button", { name: /Save as template/i }).click();
  await page.goto("/templates");
  await expect(page.getByText("My Templates")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit copy" }).first()).toBeVisible();
});

test("mobile editor can change template text, change tabs, and export PowerPoint", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-mobile", "mobile workflow");
  await page.goto("/templates");
  await page.getByPlaceholder(/Search:/).fill("Training · Masterclass");
  const card = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Training · Masterclass" }),
  }).first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /Edit sample/i }).click();
  await expect(page).toHaveURL(/\/presentations\/[^/]+\/editor/);
  const contentTab = page.getByRole("tab", { name: "Edit content" });
  await expect(contentTab).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Edit template text" }).first();
  await expect(editor).toBeVisible();
  await editor.fill("Mobile masterclass, customized");
  await page.getByRole("tab", { name: "Slides" }).click();
  await page.getByRole("tab", { name: "Edit content" }).click();
  await expect(page.getByRole("textbox", { name: "Edit template text" }).first())
    .toHaveValue("Mobile masterclass, customized");
  await page.getByRole("button", { name: "Save template" }).click();
  await expect(page.getByRole("button", { name: "PPTX" })).toBeEnabled();
  await expect(page.getByRole("tab", { name: "Canvas" })).toBeVisible();
});
