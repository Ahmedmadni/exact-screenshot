import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test("editor core flow persists and remains undoable", async ({ page }) => {
  await page.goto("/presentations/p-digital-2027/editor");

  await expect(page.getByTestId("editor-stage")).toBeVisible();
  await expect(page.getByText("12 slides", { exact: true })).toBeVisible();

  await page.getByTestId("add-text").click();
  await page.getByTestId("add-text-heading").click();

  const freeText = page.locator('[data-element-type="text"][data-element-role="free"]').last();
  await expect(freeText).toBeVisible();

  const textBox = await freeText.boundingBox();
  expect(textBox).not.toBeNull();
  await page.mouse.dblclick(
    textBox!.x + Math.min(80, textBox!.width / 4),
    textBox!.y + textBox!.height / 2,
    { delay: 80 },
  );
  const textEditor = page.getByTestId("text-editor");
  await expect(textEditor).toBeVisible();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText("استراتيجية النمو 2027 — EBITDA +15%");
  await page.keyboard.press("Escape");

  await expect(freeText).toContainText("استراتيجية النمو 2027");

  const beforeLeft = await freeText.evaluate((node) => (node as HTMLElement).style.left);
  await freeText.click();
  await page.keyboard.press("ArrowRight");
  const afterLeft = await freeText.evaluate((node) => (node as HTMLElement).style.left);
  expect(afterLeft).not.toBe(beforeLeft);

  await page.getByRole("button", { name: "Hide" }).click();
  await expect(page.getByRole("button", { name: "Show" })).toBeVisible();
  await page.getByRole("button", { name: "Show" }).click();
  await expect(freeText).toBeVisible();

  await page.getByRole("button", { name: "Lock" }).click();
  await expect(page.getByRole("button", { name: "Unlock" })).toBeVisible();
  const lockedLeft = await freeText.evaluate((node) => (node as HTMLElement).style.left);
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => freeText.evaluate((node) => (node as HTMLElement).style.left)).toBe(lockedLeft);
  await page.getByRole("button", { name: "Unlock" }).click();

  const firstSlideThumb = page.locator("aside").locator(".group").first();
  await firstSlideThumb.hover();
  await page.getByLabel("Duplicate slide").first().click();
  await expect(page.getByText("13 slides", { exact: true })).toBeVisible();

  await firstSlideThumb.hover();
  await page.getByLabel("Delete slide").first().click();
  await expect(page.getByText("Slide deleted", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).last().click();
  await expect(page.getByText("13 slides", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByLabel("Close preview")).toBeVisible();
  await page.getByLabel("Close preview").click();

  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.getByTestId("editor-stage")).toBeVisible();
  await expect(page.getByText("13 slides", { exact: true })).toBeVisible();
  await expect(page.locator('[data-element-type="text"]').filter({ hasText: "استراتيجية النمو 2027" })).toBeVisible();
});

test("theme, zoom and slide background controls stay stable", async ({ page }) => {
  await page.goto("/presentations/p-digital-2027/editor");
  await expect(page.getByTestId("editor-stage")).toBeVisible();

  await expect(page.getByText("Slide background", { exact: true })).toBeVisible();
  const accentSwatch = page.getByTitle("Theme · accent").first();
  await accentSwatch.click();

  await page.getByText("Executive Dark", { exact: true }).click();
  await expect(page.getByText("Executive Dark", { exact: true })).toBeVisible();

  await page.getByTestId("zoom-trigger").click();
  await page.getByTestId("zoom-fill").click();
  await expect(page.getByTestId("zoom-trigger")).toHaveText("Fill");

  // Close any lingering Radix menu/focus state before reopening the zoom menu.
  await page.keyboard.press("Escape");
  await page.getByTestId("zoom-trigger").click();
  await page.getByTestId("zoom-50").click();
  await expect(page.getByTestId("zoom-trigger")).toHaveText("50%");

  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByRole("button", { name: "Redo" }).click();

  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.getByTestId("editor-stage")).toBeVisible();
});

test("mobile is viewer-only and can open presentation mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/presentations/p-digital-2027/editor");

  await expect(page.getByText("The visual editor works best on a larger screen. You can review and present your slides here.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Present" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Text" })).toHaveCount(0);
});
