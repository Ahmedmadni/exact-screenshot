import { cloudConfigured } from "@/lib/cloud/supabase";
import { HybridAIProvider } from "./cloud-provider";
import { MockAIProvider } from "./mock-provider";
import type { AIProvider } from "./types";

let provider: AIProvider = cloudConfigured ? new HybridAIProvider() : new MockAIProvider();

/** Swap in a real model-backed provider without touching UI or storage code. */
export function setAIProvider(next: AIProvider) {
  provider = next;
}

export function aiProvider(): AIProvider {
  return provider;
}

export * from "./types";
export { renumber } from "./mock-provider";
