import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { AssetDataTable, AssetRecord } from "@/lib/types";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 60_000;
const MAX_SECTION_CHARS = 14_000;

export interface FileAnalysis {
  kind: AssetRecord["kind"];
  extractionStatus: NonNullable<AssetRecord["extractionStatus"]>;
  extractedText?: string;
  extractionSummary?: string;
  pageCount?: number;
  sheetNames?: string[];
  slideCount?: number;
  dataTables?: AssetDataTable[];
  imageDataUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  warnings?: string[];
}

export function kindOfFile(name: string): AssetRecord["kind"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (ext === "pptx") return "powerpoint";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  return "other";
}

function compact(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function capped(value: string, warnings: string[]) {
  const clean = compact(value);
  if (clean.length <= MAX_EXTRACTED_CHARS) return clean;
  warnings.push(`Only the first ${MAX_EXTRACTED_CHARS.toLocaleString()} characters are stored for planning.`);
  return clean.slice(0, MAX_EXTRACTED_CHARS);
}

function xmlText(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("The Office document contains invalid XML.");
  return compact(doc.documentElement.textContent ?? "");
}

function xmlRuns(xml: string, selector: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("The Office document contains invalid XML.");
  return Array.from(doc.querySelectorAll(selector))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean)
    .join("\n");
}

async function compressImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = url;
    });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return {
      dataUrl: canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.82),
      width: img.width,
      height: img.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function analyzePdf(file: File): Promise<FileAnalysis> {
  const warnings: string[] = [];
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .filter(Boolean)
      .join(" ");
    if (text.trim()) pages.push(`[Page ${pageNumber}]\n${text}`);
    if (pages.join("\n\n").length >= MAX_EXTRACTED_CHARS) break;
  }

  const extractedText = capped(pages.join("\n\n"), warnings);
  if (!extractedText) warnings.push("No selectable text was found. This PDF may be scanned or image-only.");

  return {
    kind: "pdf",
    extractionStatus: extractedText ? "ready" : "failed",
    extractedText,
    extractionSummary: `${pdf.numPages} page PDF · ${extractedText.length.toLocaleString()} characters extracted`,
    pageCount: pdf.numPages,
    warnings,
  };
}

async function analyzeDocx(file: File): Promise<FileAnalysis> {
  const warnings: string[] = [];
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentXml = await zip.file("word/document.xml")?.async("text");
  if (!documentXml) throw new Error("The DOCX file does not contain word/document.xml.");

  const main = xmlRuns(documentXml, "w\\:p, p")
    || xmlText(documentXml);
  const footnotesXml = await zip.file("word/footnotes.xml")?.async("text");
  const endnotesXml = await zip.file("word/endnotes.xml")?.async("text");
  const notes = [footnotesXml ? xmlText(footnotesXml) : "", endnotesXml ? xmlText(endnotesXml) : ""].filter(Boolean).join("\n\n");
  const extractedText = capped([main, notes].filter(Boolean).join("\n\n"), warnings);

  return {
    kind: "word",
    extractionStatus: extractedText ? "ready" : "failed",
    extractedText,
    extractionSummary: `Word document · ${extractedText.length.toLocaleString()} characters extracted`,
    warnings,
  };
}

function numericSuffix(path: string) {
  return Number(path.match(/(\d+)(?=\.xml$)/)?.[1] ?? 0);
}

async function analyzePptx(file: File): Promise<FileAnalysis> {
  const warnings: string[] = [];
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((a, b) => numericSuffix(a) - numericSuffix(b));

  const slides: string[] = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const xml = await zip.file(slidePaths[i]!)?.async("text");
    if (!xml) continue;
    const text = xmlRuns(xml, "a\\:t, t");
    if (text) slides.push(`[Slide ${i + 1}]\n${text}`);
    if (slides.join("\n\n").length >= MAX_EXTRACTED_CHARS) break;
  }

  const extractedText = capped(slides.join("\n\n"), warnings);
  return {
    kind: "powerpoint",
    extractionStatus: extractedText ? "ready" : "failed",
    extractedText,
    extractionSummary: `${slidePaths.length} slide PowerPoint · ${extractedText.length.toLocaleString()} characters extracted`,
    slideCount: slidePaths.length,
    warnings,
  };
}

async function analyzeExcel(file: File): Promise<FileAnalysis> {
  const warnings: string[] = [];
  const XLSX = await import("xlsx");
  const ext = file.name.split(".").pop()?.toLowerCase();
  const workbook = ext === "csv"
    ? XLSX.read(await file.text(), { type: "string", cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });

  const sections: string[] = [];
  const dataTables: AssetDataTable[] = [];

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;

    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];
    const nonEmpty = matrix.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
    if (nonEmpty.length) {
      const width = Math.min(12, Math.max(...nonEmpty.map((row) => row.length), 1));
      const first = nonEmpty[0] ?? [];
      const columns = Array.from({ length: width }, (_, i) => String(first[i] ?? `Column ${i + 1}`).trim() || `Column ${i + 1}`);
      const rows = nonEmpty.slice(1, 31).map((row) =>
        Array.from({ length: width }, (_, i) => {
          const value = row[i];
          return typeof value === "number" && Number.isFinite(value) ? value : String(value ?? "");
        }),
      );
      dataTables.push({ name, columns, rows });
      if (nonEmpty.length > 31) warnings.push(`Sheet “${name}” has more than 30 rows; the structured preview keeps the first 30.`);
    }

    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (!csv.trim()) continue;
    sections.push(`[Sheet: ${name}]\n${csv.slice(0, MAX_SECTION_CHARS)}`);
    if (csv.length > MAX_SECTION_CHARS) warnings.push(`Sheet “${name}” was truncated for planning.`);
    if (sections.join("\n\n").length >= MAX_EXTRACTED_CHARS) break;
  }

  const extractedText = capped(sections.join("\n\n"), warnings);
  return {
    kind: "excel",
    extractionStatus: extractedText ? "ready" : "failed",
    extractedText,
    extractionSummary: `${workbook.SheetNames.length} sheet workbook · ${extractedText.length.toLocaleString()} characters extracted`,
    sheetNames: workbook.SheetNames,
    dataTables: dataTables.slice(0, 4),
    warnings,
  };
}

export async function analyzeSourceFile(file: File): Promise<FileAnalysis> {
  const kind = kindOfFile(file.name);
  if (file.size > MAX_FILE_BYTES) {
    return {
      kind,
      extractionStatus: "failed",
      extractionSummary: "File is too large to analyze in the browser.",
      warnings: ["Maximum file size for local document intelligence is 25 MB."],
    };
  }

  try {
    if (kind === "pdf") return await analyzePdf(file);
    if (kind === "word") return await analyzeDocx(file);
    if (kind === "excel") return await analyzeExcel(file);
    if (kind === "powerpoint") return await analyzePptx(file);
    if (kind === "image") {
      const image = await compressImage(file);
      return {
        kind,
        extractionStatus: "ready",
        extractionSummary: `Visual source ready · ${image.width}×${image.height}px`,
        imageDataUrl: image.dataUrl,
        mimeType: file.type || undefined,
        width: image.width,
        height: image.height,
        warnings: ["The image is available for slide design. OCR/vision text extraction is not enabled locally."],
      };
    }
    return {
      kind,
      extractionStatus: "unsupported",
      extractionSummary: "This file type is not supported for content extraction.",
      warnings: ["Supported document formats: PDF, DOCX, XLS/XLSX/CSV and PPTX."],
    };
  } catch (error) {
    return {
      kind,
      extractionStatus: "failed",
      extractionSummary: "Content extraction failed.",
      warnings: [error instanceof Error ? error.message : "Unknown document parsing error."],
    };
  }
}

export function sourceContextFromAssets(assets: AssetRecord[], maxChars = 28_000) {
  const ready = assets.filter((asset) => asset.extractionStatus === "ready" && asset.extractedText?.trim());
  let remaining = maxChars;
  const sections: string[] = [];
  for (const asset of ready) {
    if (remaining <= 0) break;
    const header = `SOURCE: ${asset.name} (${asset.kind})\n`;
    const body = asset.extractedText!.slice(0, Math.max(0, remaining - header.length));
    sections.push(header + body);
    remaining -= header.length + body.length + 2;
  }
  return sections.join("\n\n");
}
