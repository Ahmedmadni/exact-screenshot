import { expect, test } from "@playwright/test";

test("large JPEG images are scaled and oversized files are rejected", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desktop", "browser image ingestion checks");
  await page.goto("/templates");
  await expect(page.getByTestId("templates-hydrated")).toBeAttached();

  const result = await page.evaluate(async () => {
    const { readImage } = await import("/src/components/editor/image-upload.ts");
    const canvas = document.createElement("canvas");
    canvas.width = 2800;
    canvas.height = 1800;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1267ab";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(value => value ? resolve(value) : reject(new Error("JPEG encoding failed")), "image/jpeg", 0.9),
    );
    const source = new File([blob], "large-photo.jpg", { type: "image/jpeg" });
    const dataUrl = await readImage(source);
    if (!dataUrl) throw new Error("Valid large JPEG was rejected");
    const decoded = new Image();
    decoded.src = dataUrl;
    await decoded.decode();

    const oversized = new File([new Uint8Array(25 * 1024 * 1024 + 1)], "oversized.jpg", { type: "image/jpeg" });
    const rejected = await readImage(oversized);
    return {
      width: decoded.naturalWidth,
      height: decoded.naturalHeight,
      mimeCorrect: dataUrl.startsWith("data:image/jpeg;base64,"),
      sourceBytes: source.size,
      rejectedOversized: rejected === null,
    };
  });

  expect(result.width).toBe(1600);
  expect(result.height).toBeLessThanOrEqual(1600);
  expect(result.mimeCorrect).toBe(true);
  expect(result.rejectedOversized).toBe(true);
});
