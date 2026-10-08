import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("workspace backup download restores prior edits and rejects malformed imports", async ({ page }, info) => {
  test.setTimeout(90_000);
  test.skip(info.project.name !== "chromium-desktop", "desktop workspace backup workflow");

  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();
  await page.getByPlaceholder(/Search:/).fill("Brand Story");
  await page.locator("article").filter({
    has: page.getByRole("heading", { name: "Brand Story · Editorial" }),
  }).getByRole("button", { name: /Edit sample/i }).click();
  await expect(page).toHaveURL(/\/presentations\/[^/]+\/editor/);
  const editorUrl = page.url();
  const deckId = editorUrl.match(/presentations\/([^/]+)\/editor/)?.[1];
  expect(deckId).toBeTruthy();
  const editor = page.getByRole("textbox", { name: "Edit template text" }).first();
  await editor.fill("Backup checkpoint text");
  await editor.press("Tab");
  await expect.poll(async () => page.evaluate(async ({ id, expected }) => {
    const raw = localStorage.getItem("aps.db.v1");
    if (!raw) return false;
    const { decodeBrowserDatabase } = await import("/src/lib/data/storage-codec.ts");
    const db = decodeBrowserDatabase(raw) as { presentations?: Array<{ id: string; slides?: Array<{ elements?: Array<{ properties?: { text?: string } }> }> }> };
    const deck = (db.presentations ?? []).find(item => item.id === id);
    return (deck?.slides ?? []).flatMap(slide => slide.elements ?? [])
      .some(element => element.properties?.text === expected);
  }, { id: deckId!, expected: "Backup checkpoint text" })).toBe(true);

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Local workspace backup" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^meridian-workspace-\d{4}-\d{2}-\d{2}\.json$/);
  const backupBuffer = await readFile(await download.path());
  const backupEnvelope = JSON.parse(backupBuffer.toString("utf-8")) as { database: string };
  const backupContainsCheckpoint = await page.evaluate(async ({ raw, id }) => {
    const { decodeBrowserDatabase } = await import("/src/lib/data/storage-codec.ts");
    const db = decodeBrowserDatabase(raw) as {
      presentations?: Array<{ id: string; slides?: Array<{ elements?: Array<{ properties?: { text?: string } }> }> }>;
    };
    const deck = (db.presentations ?? []).find(item => item.id === id);
    return (deck?.slides ?? []).flatMap(slide => slide.elements ?? [])
      .some(element => element.properties?.text === "Backup checkpoint text");
  }, { raw: backupEnvelope.database, id: deckId! });
  expect(backupContainsCheckpoint).toBe(true);

  await page.goto(editorUrl);
  const changed = page.getByRole("textbox", { name: "Edit template text" }).first();
  await changed.fill("Mutation after backup");
  await changed.press("Tab");
  await expect.poll(async () => page.evaluate(async ({ id, expected }) => {
    const raw = localStorage.getItem("aps.db.v1");
    if (!raw) return false;
    const { decodeBrowserDatabase } = await import("/src/lib/data/storage-codec.ts");
    const db = decodeBrowserDatabase(raw) as { presentations?: Array<{ id: string; slides?: Array<{ elements?: Array<{ properties?: { text?: string } }> }> }> };
    const deck = (db.presentations ?? []).find(item => item.id === id);
    return (deck?.slides ?? []).flatMap(slide => slide.elements ?? [])
      .some(element => element.properties?.text === expected);
  }, { id: deckId!, expected: "Mutation after backup" })).toBe(true);

  await page.goto("/settings");
  await page.getByLabel("Select workspace backup").setInputFiles({
    name: "checkpoint.json",
    mimeType: "application/json",
    buffer: backupBuffer,
  });
  await expect.poll(async () => {
    if (await page.getByTestId("backup-restore-confirmation").count()) return "confirm";
    if (await page.getByTestId("backup-restore-status").count()) {
      return "status:" + await page.getByTestId("backup-restore-status").textContent();
    }
    return "pending";
  }, { timeout: 45_000 }).toBe("confirm");

  // A quota failure during confirmation must be atomic: neither persistent
  // storage nor the in-memory workspace may be replaced.
  const beforeFailedRestore = await page.evaluate(() => localStorage.getItem("aps.db.v1"));
  await page.evaluate(() => {
    const storage = Storage.prototype as Storage & { _restoreOriginalSetItem?: Storage["setItem"] };
    storage._restoreOriginalSetItem = storage.setItem;
    storage.setItem = function (key: string, value: string) {
      if (key === "aps.db.v1") throw new DOMException("Quota reached", "QuotaExceededError");
      return storage._restoreOriginalSetItem!.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Confirm restore" }).click();
  await expect(page.getByTestId("backup-restore-status"))
    .toHaveText("Insufficient browser storage. Existing data was preserved.");
  expect(await page.evaluate(() => localStorage.getItem("aps.db.v1"))).toBe(beforeFailedRestore);
  await expect(page.getByTestId("backup-restore-confirmation")).toBeVisible();

  await page.evaluate(() => {
    const storage = Storage.prototype as Storage & { _restoreOriginalSetItem?: Storage["setItem"] };
    if (storage._restoreOriginalSetItem) storage.setItem = storage._restoreOriginalSetItem;
    delete storage._restoreOriginalSetItem;
  });
  await page.getByRole("button", { name: "Confirm restore" }).click();
  await expect(page.getByTestId("backup-restore-status"))
    .toHaveText("Backup restored. Workspace data is ready.");
  const restoredTextPresent = async (expected: string) => page.evaluate(async ({ id, expectedText }) => {
    const raw = localStorage.getItem("aps.db.v1");
    if (!raw) return false;
    const { decodeBrowserDatabase } = await import("/src/lib/data/storage-codec.ts");
    const db = decodeBrowserDatabase(raw) as {
      presentations?: Array<{ id: string; slides?: Array<{ elements?: Array<{ properties?: { text?: string } }> }> }>;
    };
    const deck = (db.presentations ?? []).find(item => item.id === id);
    return (deck?.slides ?? []).flatMap(slide => slide.elements ?? [])
      .some(element => element.properties?.text === expectedText);
  }, { id: deckId!, expectedText: expected });
  await expect.poll(() => restoredTextPresent("Backup checkpoint text")).toBe(true);
  await expect.poll(() => restoredTextPresent("Mutation after backup")).toBe(false);

  await page.goto("/settings");
  const beforeMalformed = await page.evaluate(() => localStorage.getItem("aps.db.v1"));
  await page.getByLabel("Select workspace backup").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ not valid json"),
  });
  await expect(page.getByTestId("backup-restore-status"))
    .toHaveText("This is not a valid JSON backup.");
  expect(await page.evaluate(() => localStorage.getItem("aps.db.v1"))).toBe(beforeMalformed);
});
