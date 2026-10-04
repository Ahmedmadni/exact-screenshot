import { expect, test } from "@playwright/test";

test("storage quota failure is visibly reported and recovers on next save", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "desktop persistence test");
  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();
  await page.getByPlaceholder(/Search:/).fill("Brand Story");
  await page.locator("article").filter({
    has: page.getByRole("heading", { name: "Brand Story · Editorial" }),
  }).getByRole("button", { name: /Edit sample/i }).click();
  await expect(page).toHaveURL(/\/presentations\/[^/]+\/editor/);
  const editor = page.getByRole("textbox", { name: "Edit template text" }).first();
  await expect(editor).toBeVisible();
  await expect(page.getByRole("banner").getByText("Saved", { exact: true })).toBeVisible();

  // Simulate a quota error only for the editor's database key.
  await page.evaluate(() => {
    const storage = Storage.prototype as Storage & { _originalSetItemForTest?: Storage["setItem"] };
    storage._originalSetItemForTest = storage.setItem;
    storage.setItem = function (key: string, value: string) {
      if (key === "aps.db.v1") throw new DOMException("Storage quota reached", "QuotaExceededError");
      return storage._originalSetItemForTest!.call(this, key, value);
    };
  });
  await editor.fill("Unsaved when quota exhausted");
  await editor.press("Tab");
  await expect(page.getByRole("banner").getByText("Save failed — check storage or connection")).toBeVisible();
  await expect(page.getByRole("banner").getByText("Saved", { exact: true })).toHaveCount(0);

  await page.evaluate(() => {
    const storage = Storage.prototype as Storage & { _originalSetItemForTest?: Storage["setItem"] };
    if (storage._originalSetItemForTest) storage.setItem = storage._originalSetItemForTest;
    delete storage._originalSetItemForTest;
  });
  await editor.fill("Recovered after quota cleared");
  await editor.press("Tab");
  await expect(page.getByRole("banner").getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Edit template text" }).first())
    .toHaveValue("Recovered after quota cleared");
});
