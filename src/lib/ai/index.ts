import { MockAIProvider } from "./mock-provider";
import type { AIProvider } from "./types";

let provider: AIProvider = new MockAIProvider();

/** Swap in a real model-backed provider without touching UI or storage code. */
export function setAIProvider(next: AIProvider) {
  provider = next;
}

export function aiProvider(): AIProvider {
  return provider;
}

export * from "./types";
export { renumber } from "./mock-provider";
