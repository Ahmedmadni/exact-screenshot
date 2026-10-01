import { assetRepository } from "@/lib/data/store";
import type { AssetRecord } from "@/lib/types";
import { enrichAssetMetadata } from "@/lib/assets/catalog";
import { analyzeSourceFile, kindOfFile } from "./analyze";

export async function ingestSourceFile(file: File, presentationId: string | null): Promise<AssetRecord> {
  const kind = kindOfFile(file.name);
  const metadata = enrichAssetMetadata({ name: file.name, kind });
  const pending = assetRepository.add({
    presentationId,
    name: file.name,
    kind,
    size: file.size,
    extractionStatus: "pending",
    extractionSummary: "Analyzing file contents…",
    ...metadata,
  });

  const analysis = await analyzeSourceFile(file);
  assetRepository.update(pending.id, analysis);
  return assetRepository.get(pending.id) ?? { ...pending, ...analysis };
}

export async function ingestSourceFiles(files: FileList | File[], presentationId: string | null) {
  const list = Array.from(files);
  return Promise.all(list.map((file) => ingestSourceFile(file, presentationId)));
}
