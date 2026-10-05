import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("workspace backup downloads, rejects corrupt imports, and restores after confirmation", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "desktop backup and restore workflow");
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Local workspace backup" })).toBeVisible();

  const backupProbe = await page.evaluate(async () => {
    const { databaseSnapshot } = await import("/src/lib/data/store.ts");
    const { createWorkspaceBackup } = await import("/src/lib/data/workspace-backup.ts");
    try {
      return { chars: createWorkspaceBackup(databaseSnapshot()).length, error: "" };
    } catch (error) {
      return { chars: 0, error: String(error) };
    }
  });
  expect(backupProbe.error, JSON.stringify(backupProbe)).toBe("");
  expect(backupProbe.chars).toBeGreaterThan(100);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const downloaded = await downloadPromise;
  expect(downloaded.suggestedFilename()).toMatch(/^meridian-workspace-.*\.json$/);
  const bytes = await readFile(await downloaded.path());
  const backup = JSON.parse(bytes.toString("utf-8"));
  expect(backup.format).toBe("meridian-workspace-backup");
  expect(backup.version).toBe(1);

  const input = page.getByLabel("Select workspace backup");
  await input.setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"format":"bad"}') });
  await expect(page.getByText(/Unsupported or invalid Meridian backup/)).toBeVisible();

  // Cancellation must preserve active workspace and not reload.
  page.once("dialog", dialog => dialog.dismiss());
  await input.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: bytes });
  await expect(page.getByRole("heading", { name: "Workspace settings" })).toBeVisible();

  page.once("dialog", dialog => dialog.accept());
  const restoredNavigation = page.waitForEvent("framenavigated", {
    predicate: frame => frame === page.mainFrame(),
  });
  await input.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: bytes });
  await restoredNavigation;
  await expect(page.getByRole("heading", { name: "Workspace settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local workspace backup" })).toBeVisible();
});
