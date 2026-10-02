import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";

test("replace image, crop the native picture, reload, and download an editable PPTX", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "desktop media-inspector and PPTX workflow");

  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();
  await page.getByPlaceholder(/Search:/).fill("Brand Story");
  await expect(page.locator("article")).toHaveCount(1);
  await page.locator("article").filter({
    has: page.getByRole("heading", { name: "Brand Story · Editorial" }),
  }).getByRole("button", { name: /Edit sample/i }).click();
  await expect(page).toHaveURL(/\/presentations\/[^/]+\/editor/);

  // Generate an actual 800x400 image using the browser canvas, not a mocked image URL.
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 400;
    const context = canvas.getContext("2d")!;
    const gradient = context.createLinearGradient(0, 0, 800, 400);
    gradient.addColorStop(0, "#224466");
    gradient.addColorStop(1, "#f4ae67");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 800, 400);
    return canvas.toDataURL("image/png");
  });
  const upload = page.getByText("Quick edit · Template content").locator("..").locator('input[type="file"]').first();
  await upload.setInputFiles({
    name: "client-hero.png",
    mimeType: "image/png",
    buffer: Buffer.from(dataUrl.split(",")[1]!, "base64"),
  });
  await expect(page.getByText("Image attached").last()).toBeVisible();
  const picture = page.locator('img[alt="Gallery hero"]').first();
  await expect(picture).toHaveAttribute("src", /^data:image\/png;base64,/);

  // The frame remains a separately selectable picture, with native zoom controls.
  await page.getByRole("button", { name: "More", exact: true }).first().click();
  await expect(page.getByText("Photo crop · Pan & zoom")).toBeVisible();
  const zoom = page.getByRole("slider", { name: "Zoom" });
  await zoom.focus();
  await zoom.press("ArrowRight");
  await zoom.press("ArrowRight");
  await expect.poll(async () => picture.evaluate(img => parseFloat((img as HTMLImageElement).style.width))).toBeGreaterThan(100);
  await page.getByRole("button", { name: "Focus top right" }).click();

  await expect(page.getByRole("banner").getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('img[alt="Gallery hero"]').first()).toHaveAttribute("src", /^data:image\/png;base64,/);

  const trigger = page.getByRole("button", { name: "Export", exact: true });
  await trigger.click();
  const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
  await page.getByRole("menuitem", { name: /PowerPoint \(\.pptx\)/ }).click();
  const downloaded = await downloadPromise;
  expect(downloaded.suggestedFilename()).toMatch(/\.pptx$/i);
  const zip = await JSZip.loadAsync(await readFile(await downloaded.path()));
  const slideXml = await zip.file("ppt/slides/slide1.xml")?.async("string");
  expect(slideXml).toContain("<p:pic>");
  expect(slideXml).toContain("<a:srcRect");
  expect(Object.keys(zip.files).some(name => name.startsWith("ppt/media/image"))).toBe(true);
});
