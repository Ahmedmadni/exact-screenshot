import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("workspace backup downloads, restores prior data, and rejects corrupt files", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "desktop backup workflow");

  // Create one real editable presentation and save a recognizable value.
  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();
  await page.getByPlaceholder(/Search:/).fill("Brand Story");
  const card = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Brand Story · Editorial" }),
  }).first();
  await card.getByRole("button", { name: /Edit sample/i }).click();
  const editor = page.getByRole("textbox", { name: "Edit template text" }).first();
  await expect(editor).toBeVisible();
  await editor.fill("Backup checkpoint value");
  await editor.press("Tab");
  await expect(page.getByRole("banner").getByText("Saved", { exact: true })).toBeVisible();

  // Download a real backup from Settings.
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^meridian-workspace-\d{4}-\d{2}-\d{2}\.json$/);
  const backupBytes = await readFile(await download.path());
  const backupText = backupBytes.toString("utf8");
  const envelope = JSON.parse(backupText) as { format?: string; version?: number; database?: string };
  expect(envelope.format).toBe("meridian-workspace-backup");
  expect(envelope.version).toBe(1);
  expect(typeof envelope.database).toBe("string");

  // Change the deck after the backup so restore has something meaningful to roll back.
  await page.goBack();
  await expect(page).toHaveURL(/\/presentations\/[^/]+\/editor/);
  const changedEditor = page.getByRole("textbox", { name: "Edit template text" }).first();
  await changedEditor.fill("Changed after backup");
  await changedEditor.press("Tab");
  await expect(page.getByRole("banner").getByText("Saved", { exact: true })).toBeVisible();

  // Restore the downloaded backup and accept the destructive confirmation.
  await page.goto("/settings");
  page.once("dialog", dialog => dialog.accept());
  const restoreInput = page.getByLabel("Select workspace backup");
  await restoreInput.setInputFiles({
    name: "meridian-workspace-backup.json",
    mimeType: "application/json",
    buffer: backupBytes,
  });
  await expect(page.getByText("Backup restored. Workspace data is ready.")).toBeVisible();

  // Reload the editor from restored local data and verify the earlier checkpoint returned.
  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();
  await page.getByRole("button", { name: "Edit copy" }).first().click().catch(() => undefined);
  // The presentation created from Edit sample is persisted even if it is not a saved template.
  if (!/\/presentations\//.test(page.url())) {
    await page.goto("/");
    const restoredDeck = page.getByText("Brand Story · Editorial").first();
    if (await restoredDeck.count()) await restoredDeck.click();
  }
  if (/\/presentations\//.test(page.url())) {
    await expect(page.getByRole("textbox", { name: "Edit template text" }).first())
      .toHaveValue("Backup checkpoint value");
  } else {
    // Directly inspect the durable database as a fallback to route-label changes.
    const restored = await page.evaluate(async () => {
      const { decodeBrowserDatabase } = await import("/src/lib/data/storage-codec.ts");
      const raw = localStorage.getItem("aps.db.v1");
      if (!raw) return false;
      const db = decodeBrowserDatabase(raw) as { presentations?: Array<{ slides?: Array<{ elements?: Array<{ type?: string; properties?: { text?: string } }> }> }> };
      return db.presentations?.some(deck => deck.slides?.some(slide =>
        slide.elements?.some(element => element.type === "text" && element.properties?.text === "Backup checkpoint value"))) ?? false;
    });
    expect(restored).toBe(true);
  }

  // A malformed backup must be rejected before any replacement occurs.
  await page.goto("/settings");
  const before = await page.evaluate(() => localStorage.getItem("aps.db.v1"));
  await restoreInput.setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"meridian-workspace-backup","version":1,"exportedAt":"not-a-date","database":"{}"}'),
  });
  await expect(page.getByText(/Unsupported or invalid Meridian backup|Backup validation failed/)).toBeVisible();
  const after = await page.evaluate(() => localStorage.getItem("aps.db.v1"));
  expect(after).toBe(before);
});
