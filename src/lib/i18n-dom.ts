/**
 * Whole-interface translation layer.
 *
 * Interface copy across the app is authored in English. When Arabic is active,
 * this observer swaps any visible text node or label attribute whose trimmed
 * English text has an entry in the dictionary, and restores the original text
 * when switching back. Slide content and anything the user is typing are never
 * touched: mark such regions with `data-i18n-skip`.
 */

export type PhraseDictionary = Record<string, string>;

const ATTRS = ["placeholder", "title", "aria-label"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "NOSCRIPT", "svg"]);

interface Compiled {
  exact: Map<string, string>;
  patterns: Array<{ re: RegExp; out: string }>;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function compileDictionary(dict: PhraseDictionary): Compiled {
  const exact = new Map<string, string>();
  const patterns: Compiled["patterns"] = [];
  for (const [en, ar] of Object.entries(dict)) {
    if (!ar || ar === en) continue;
    const key = normalise(en);
    if (/\{\d\}/.test(key)) {
      const parts = key.split(/\{(\d)\}/);
      let src = "^";
      parts.forEach((part, i) => {
        src += i % 2 === 0 ? escapeRe(part) : "(.+?)";
      });
      // Require some literal text, otherwise "{0}" alone would match everything.
      if (parts.filter((_, i) => i % 2 === 0).join("").replace(/[\s\p{P}]/gu, "").length < 2) continue;
      const out = ar.replace(/\{(\d)\}/g, (_, d: string) => `$${Number(d) + 1}`);
      patterns.push({ re: new RegExp(src + "$"), out });
    } else {
      exact.set(key, ar);
    }
  }
  return { exact, patterns };
}

function normalise(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export function translatePhrase(compiled: Compiled, value: string): string | null {
  const key = normalise(value);
  if (!key || !/[A-Za-z]/.test(key)) return null;
  const hit = compiled.exact.get(key);
  if (hit) return hit;
  // "Label:" style variants.
  const colon = key.match(/^(.*?)(\s*[:：])$/);
  if (colon?.[1]) {
    const base = compiled.exact.get(colon[1]);
    if (base) return base + ":";
  }
  if (key.length > 400) return null;
  for (const p of compiled.patterns) {
    if (p.re.test(key)) return key.replace(p.re, p.out);
  }
  return null;
}

function isSkipped(node: Node | null): boolean {
  let el: Node | null = node && node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    const e = el as HTMLElement;
    if (SKIP_TAGS.has(e.tagName) || e.hasAttribute("data-i18n-skip") || e.isContentEditable) return true;
    el = e.parentNode;
  }
  return false;
}

let activeDictionary: Compiled | null = null;

/** Translate one English phrase with the active dictionary (for native dialogs and other non-DOM text). */
export function localize(value: string): string {
  return (activeDictionary && translatePhrase(activeDictionary, value)) || value;
}

export function startDomTranslation(dict: PhraseDictionary): () => void {
  const compiled = compileDictionary(dict);
  activeDictionary = compiled;
  const textOriginals = new Map<Text, { original: string; applied: string }>();
  const attrOriginals = new Map<Element, Map<string, { original: string; applied: string }>>();
  let originalTitle: string | null = null;
  let appliedTitle: string | null = null;

  const translateText = (node: Text) => {
    const raw = node.nodeValue ?? "";
    const tracked = textOriginals.get(node);
    if (tracked && tracked.applied === raw) return;
    if (isSkipped(node)) return;
    const ar = translatePhrase(compiled, raw);
    if (!ar) {
      if (tracked) textOriginals.delete(node);
      return;
    }
    const lead = raw.match(/^\s*/)?.[0] ?? "";
    const trail = raw.match(/\s*$/)?.[0] ?? "";
    const applied = lead + ar + trail;
    textOriginals.set(node, { original: raw, applied });
    node.nodeValue = applied;
  };

  const translateAttrs = (el: Element) => {
    for (const attr of ATTRS) {
      const raw = el.getAttribute(attr);
      if (raw == null) continue;
      const map = attrOriginals.get(el);
      const tracked = map?.get(attr);
      if (tracked && tracked.applied === raw) continue;
      if (isSkipped(el)) return;
      const ar = translatePhrase(compiled, raw);
      if (!ar) continue;
      const next = map ?? new Map();
      next.set(attr, { original: raw, applied: ar });
      attrOriginals.set(el, next);
      el.setAttribute(attr, ar);
    }
  };

  const walk = (root: Node) => {
    if (root.nodeType === Node.TEXT_NODE) {
      translateText(root as Text);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const rootEl = root as Element;
    if (isSkipped(rootEl)) return;
    translateAttrs(rootEl);
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === Node.ELEMENT_NODE) {
          const e = n as HTMLElement;
          if (SKIP_TAGS.has(e.tagName) || e.hasAttribute("data-i18n-skip") || e.isContentEditable) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n = walker.nextNode();
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) translateText(n as Text);
      else translateAttrs(n as Element);
      n = walker.nextNode();
    }
  };

  const translateTitle = () => {
    if (document.title === appliedTitle) return;
    const ar = translatePhrase(compiled, document.title);
    if (!ar) return;
    originalTitle = document.title;
    appliedTitle = ar;
    document.title = ar;
  };

  const prune = () => {
    if (textOriginals.size > 4000) for (const n of textOriginals.keys()) if (!n.isConnected) textOriginals.delete(n);
    if (attrOriginals.size > 4000) for (const e of attrOriginals.keys()) if (!e.isConnected) attrOriginals.delete(e);
  };

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") translateText(r.target as Text);
      else if (r.type === "attributes") translateAttrs(r.target as Element);
      else r.addedNodes.forEach(walk);
    }
    prune();
  });

  const titleObserver = new MutationObserver(translateTitle);

  walk(document.body);
  translateTitle();
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });
  titleObserver.observe(document.head, { subtree: true, childList: true, characterData: true });

  return () => {
    if (activeDictionary === compiled) activeDictionary = null;
    observer.disconnect();
    titleObserver.disconnect();
    for (const [node, t] of textOriginals) {
      if (node.isConnected && node.nodeValue === t.applied) node.nodeValue = t.original;
    }
    for (const [el, map] of attrOriginals) {
      for (const [attr, t] of map) if (el.getAttribute(attr) === t.applied) el.setAttribute(attr, t.original);
    }
    if (originalTitle && document.title === appliedTitle) document.title = originalTitle;
    textOriginals.clear();
    attrOriginals.clear();
  };
}
