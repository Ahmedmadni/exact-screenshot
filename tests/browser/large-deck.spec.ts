import { expect, test } from "@playwright/test";

test("100-slide deck keeps only nearby rail previews mounted while scrolling", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "desktop large-deck performance");
  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();
  await page.getByPlaceholder(/Search:/).fill("Brand Story");
  await expect(page.locator("article")).toHaveCount(1);
  await page.locator("article").filter({
    has: page.getByRole("heading", { name: "Brand Story · Editorial" }),
  }).getByRole("button", { name: /Edit sample/i }).click();
  await expect(page).toHaveURL(/\/presentations\/[^/]+\/editor/);
  const deckId = page.url().match(/presentations\/([^/]+)\/editor/)?.[1];
  expect(deckId).toBeTruthy();
  const editorUrl = page.url();
  // Fully unmount the autosaving editor before preparing fixture storage.
  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();

  const created = await page.evaluate(async (id) => {
    const { decodeBrowserDatabase, encodeBrowserDatabase } = await import(
      "/src/lib/data/storage-codec.ts"
    );
    const original = window.localStorage.getItem("aps.db.v1");
    if (!original) return false;
    const database = decodeBrowserDatabase(original) as {
      presentations: Array<{ id: string; slides: Array<{
        id: string; presentationId: string; slideNumber: number; sortOrder: number;
        elements: Array<{ id: string; slideId: string }>;
      }> }>;
    };
    const deck = database.presentations.find(item => item.id === id);
    if (!deck || deck.slides.length === 0) return false;
    const base = deck.slides[0]!;
    deck.slides = Array.from({ length: 100 }, (_, index) => {
      const slide = structuredClone(base);
      slide.id = "stress-slide-" + index;
      slide.presentationId = id;
      slide.slideNumber = index + 1;
      slide.sortOrder = index;
      slide.elements = slide.elements.map((element, elementIndex) => ({
        ...element,
        id: "stress-element-" + index + "-" + elementIndex,
        slideId: slide.id,
      }));
      return slide;
    });
    window.localStorage.setItem("aps.db.v1", encodeBrowserDatabase(database));
    return true;
  }, deckId!);
  expect(created).toBe(true);

  await page.goto(editorUrl);
  const frames = page.getByTestId("rail-thumb-frame");
  await expect(frames).toHaveCount(100);
  await expect(page.getByTestId("rail-thumb-rendered").first()).toBeVisible();
  // Only thumbnails close to the viewport should have expensive slide stages mounted.
  expect(await page.getByTestId("rail-thumb-rendered").count()).toBeLessThan(30);
  await frames.last().scrollIntoViewIfNeeded();
  await expect(frames.last().getByTestId("rail-thumb-rendered")).toBeVisible();
  expect(await page.getByTestId("rail-thumb-rendered").count()).toBeLessThan(30);
});
