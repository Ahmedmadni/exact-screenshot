import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("workspace backup download restores prior edits and rejects malformed imports", async ({ page }, info) => {
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
  page.once("dialog", dialog => dialog.accept());
  await page.getByLabel("Select workspace backup").setInputFiles({
    name: "checkpoint.json",
    mimeType: "application/json",
    buffer: backupBuffer,
  });
  await expect(page.getByText("Backup restored. Workspace data is ready.")).toBeVisible();

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
  await expect(page.getByText("This is not a valid JSON backup.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("aps.db.v1"))).toBe(beforeMalformed);
});
