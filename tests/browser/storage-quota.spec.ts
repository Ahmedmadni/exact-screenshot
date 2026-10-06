import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("storage quota failure is visibly reported and recovers on next save", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "desktop persistence test");
  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();
  await page.getByPlaceholder(/Search:/).fill("Brand Story");
  await page.locator("article").filter({
    has: page.getByRole("heading", { name: "Brand Story · Editorial" }),
  }).getByRole("button", { name: /Edit sample/i }).click();
  await expect(page).toHaveURL(/\/presentations\/[^/]+\/editor/);
  const deckId = page.url().match(/presentations\/([^/]+)\/editor/)?.[1];
  expect(deckId).toBeTruthy();
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
  const leakedIntoMemory = await page.evaluate(async ({ id, text }) => {
    const { databaseSnapshot } = await import("/src/lib/data/store.ts");
    const deck = databaseSnapshot().presentations.find(item => item.id === id);
    return deck?.slides.flatMap(slide => slide.elements)
      .some(element => element.type === "text" && element.properties.text === text) ?? false;
  }, { id: deckId!, text: "Unsaved when quota exhausted" });
  expect(leakedIntoMemory).toBe(false);

  // Even though durable storage rejected the edit, the in-memory editor must
  // be able to export a complete recovery backup containing that exact draft.
  const recoveryPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download recovery" }).click();
  const recoveryDownload = await recoveryPromise;
  expect(recoveryDownload.suggestedFilename()).toMatch(/^meridian-recovery-\d{4}-\d{2}-\d{2}\.json$/);
  const recoveryRaw = (await readFile(await recoveryDownload.path())).toString("utf8");
  const recoveryContainsDraft = await page.evaluate(async ({ raw, id, expected }) => {
    const { parseWorkspaceBackup } = await import("/src/lib/data/workspace-backup.ts");
    const restored = parseWorkspaceBackup(raw);
    const deck = restored.presentations.find(item => item.id === id);
    return deck?.slides.flatMap(slide => slide.elements)
      .some(element => element.type === "text" && element.properties.text === expected) ?? false;
  }, { raw: recoveryRaw, id: deckId!, expected: "Unsaved when quota exhausted" });
  expect(recoveryContainsDraft).toBe(true);

  await page.evaluate(() => {
    const storage = Storage.prototype as Storage & { _originalSetItemForTest?: Storage["setItem"] };
    if (storage._originalSetItemForTest) storage.setItem = storage._originalSetItemForTest;
    delete storage._originalSetItemForTest;
  });
  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(page.getByRole("banner").getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Edit template text" }).first())
    .toHaveValue("Unsaved when quota exhausted");
});


test("failed durable delete keeps local deck and does not enqueue cloud deletion", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "desktop transactional persistence test");
  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();

  const result = await page.evaluate(async () => {
    const { databaseSnapshot, presentationRepository } = await import("/src/lib/data/store.ts");
    const { queuedCloudDeletes } = await import("/src/lib/cloud/delete-queue.ts");
    const target = databaseSnapshot().presentations[0];
    if (!target) throw new Error("No presentation available for transactional delete test");

    const storage = Storage.prototype as Storage & { _originalSetItemForDeleteTest?: Storage["setItem"] };
    storage._originalSetItemForDeleteTest = storage.setItem;
    storage.setItem = function (key: string, value: string) {
      if (key === "aps.db.v1") throw new DOMException("Storage quota reached", "QuotaExceededError");
      return storage._originalSetItemForDeleteTest!.call(this, key, value);
    };

    try {
      const removed = presentationRepository.remove(target.id);
      return {
        removed,
        stillPresent: databaseSnapshot().presentations.some(item => item.id === target.id),
        queued: queuedCloudDeletes().some(item => item.kind === "presentation" && item.id === target.id),
      };
    } finally {
      if (storage._originalSetItemForDeleteTest) storage.setItem = storage._originalSetItemForDeleteTest;
      delete storage._originalSetItemForDeleteTest;
    }
  });

  expect(result).toEqual({ removed: false, stillPresent: true, queued: false });
});


test("delete is blocked if its cloud tombstone cannot be stored", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "desktop cloud-delete durability test");
  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();

  const result = await page.evaluate(async () => {
    const { databaseSnapshot, presentationRepository } = await import("/src/lib/data/store.ts");
    const { queuedCloudDeletes } = await import("/src/lib/cloud/delete-queue.ts");
    const target = databaseSnapshot().presentations[0];
    if (!target) throw new Error("No presentation available for tombstone test");

    const storage = Storage.prototype as Storage & { _originalSetItemForQueueTest?: Storage["setItem"] };
    storage._originalSetItemForQueueTest = storage.setItem;
    storage.setItem = function (key: string, value: string) {
      if (key === "aps.cloud.deletes.v1") throw new DOMException("Storage quota reached", "QuotaExceededError");
      return storage._originalSetItemForQueueTest!.call(this, key, value);
    };

    try {
      const removed = presentationRepository.remove(target.id);
      return {
        removed,
        stillPresent: databaseSnapshot().presentations.some(item => item.id === target.id),
        queued: queuedCloudDeletes().some(item => item.kind === "presentation" && item.id === target.id),
      };
    } finally {
      if (storage._originalSetItemForQueueTest) storage.setItem = storage._originalSetItemForQueueTest;
      delete storage._originalSetItemForQueueTest;
    }
  });

  expect(result).toEqual({ removed: false, stillPresent: true, queued: false });
});
