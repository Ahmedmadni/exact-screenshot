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
  const editor = page.getByRole("textbox", { name: "Edit template text" }).first();
  await editor.fill("Backup checkpoint text");
  await editor.press("Tab");
  await expect(page.getByRole("banner").getByText("Saved", { exact: true })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Local workspace backup" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^meridian-workspace-\d{4}-\d{2}-\d{2}\.json$/);
  const backupBuffer = await readFile(await download.path());

  await page.goto(editorUrl);
  const changed = page.getByRole("textbox", { name: "Edit template text" }).first();
  await changed.fill("Mutation after backup");
  await changed.press("Tab");
  await expect(page.getByRole("banner").getByText("Saved", { exact: true })).toBeVisible();

  await page.goto("/settings");
  page.once("dialog", dialog => dialog.accept());
  await page.getByLabel("Select workspace backup").setInputFiles({
    name: "checkpoint.json",
    mimeType: "application/json",
    buffer: backupBuffer,
  });
  await page.waitForLoadState("domcontentloaded");

  const restoredState = await page.evaluate(async () => {
    const raw = localStorage.getItem("aps.db.v1");
    if (!raw) return { checkpoint: false, mutation: false };
    const { decodeBrowserDatabase } = await import("/src/lib/data/storage-codec.ts");
    const db = decodeBrowserDatabase(raw) as {
      presentations?: Array<{ slides?: Array<{ elements?: Array<{ properties?: { text?: string } }> }> }>;
    };
    const texts = (db.presentations ?? []).flatMap(presentation => presentation.slides ?? [])
      .flatMap(slide => slide.elements ?? [])
      .map(element => element.properties?.text)
      .filter((value): value is string => typeof value === "string");
    return {
      checkpoint: texts.includes("Backup checkpoint text"),
      mutation: texts.includes("Mutation after backup"),
    };
  });
  expect(restoredState.checkpoint).toBe(true);
  expect(restoredState.mutation).toBe(false);

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
