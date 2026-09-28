import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Presentation } from "@/lib/types";
import { SLIDE_H, SLIDE_W } from "@/lib/editor/model";
import { getTheme } from "@/lib/editor/themes";
import { SlideStage } from "@/components/editor/slide-renderer";
import { safeExportFilename } from "./validate";

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function ExportSurface({ presentation }: { presentation: Presentation }) {
  const theme = getTheme(presentation.themeId);
  return createElement(
    "div",
    { style: { width: SLIDE_W, background: "transparent" } },
    ...presentation.slides.map((slide) =>
      createElement(
        "div",
        {
          key: slide.id,
          "data-pdf-slide": slide.id,
          style: {
            position: "relative",
            width: SLIDE_W,
            height: SLIDE_H,
            overflow: "hidden",
          },
        },
        createElement(SlideStage, { slide, theme }),
      ),
    ),
  );
}

export async function exportPresentationToPdf(presentation: Presentation) {
  const [{ toPng }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);

  const host = document.createElement("div");
  Object.assign(host.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${SLIDE_W}px`,
    pointerEvents: "none",
    zIndex: "-1",
  });
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    root.render(createElement(ExportSurface, { presentation }));
    if (document.fonts?.ready) await document.fonts.ready;
    await frame();

    const nodes = Array.from(host.querySelectorAll<HTMLElement>("[data-pdf-slide]"));
    if (!nodes.length) throw new Error("No slides are available to export.");

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [SLIDE_W, SLIDE_H],
      compress: true,
      hotfixes: ["px_scaling"],
    });

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      const data = await toPng(node, {
        width: SLIDE_W,
        height: SLIDE_H,
        pixelRatio: 1.25,
        cacheBust: false,
        backgroundColor: "transparent",
      });
      if (i > 0) doc.addPage([SLIDE_W, SLIDE_H], "landscape");
      doc.addImage(data, "PNG", 0, 0, SLIDE_W, SLIDE_H, undefined, "FAST");
    }

    doc.save(safeExportFilename(presentation.title, "pdf"));
  } finally {
    root.unmount();
    host.remove();
  }
}
