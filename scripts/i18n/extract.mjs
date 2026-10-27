// Extracts English interface strings from source for the Arabic dictionary.
import ts from "typescript";
import fs from "fs";
import path from "path";
const roots = ["src/routes","src/components","src/lib"];
const EXCLUDE = new Set(["src/lib/editor/layouts.ts","src/lib/data/seed.ts","src/lib/ai/slide-designer.ts","src/lib/ai/mock-provider.ts"]);
const files = [];
function walk(d){ for (const f of fs.readdirSync(d)){ const p=path.join(d,f); const s=fs.statSync(p); if(s.isDirectory()){ if(!p.includes("components/ui")) walk(p);} else if(/\.(tsx?)$/.test(f) && !f.endsWith(".gen.ts") && !p.includes("i18n") && !EXCLUDE.has(p)) files.push(p);} }
roots.forEach(walk);
const out = new Set();
const looksText = (s) => {
  const t = s.trim();
  if (t.length < 2 || !/[A-Za-z]/.test(t)) return false;
  if (/^[a-z0-9_.\-\/:#]+$/.test(t)) return false;
  if (/^(https?:|\/|#|@|data:)/.test(t)) return false;
  if (/^[a-z-]+(\s+[a-z0-9:\-\/\[\]\.%!]+)+$/.test(t) && /[-:]/.test(t)) return false;
  if (/^[A-Z_]+$/.test(t)) return false;
  if (/[{}<>;=]|=>/.test(t.replace(/\{\d\}/g,""))) return false;
  if (/^(px|rem|em|rgba?|hsl|oklch|var\(|xMid)/.test(t)) return false;
  if (/\b(bg|text|border|flex|grid|rounded|px|py|gap|w|h)-[a-z0-9]/.test(t) && !/[A-Z]/.test(t)) return false;
  return /[A-Z]/.test(t[0]) || /\s/.test(t);
};
const SKIP_ATTR = new Set(["className","class","href","to","src","id","key","type","name","value","variant","size","side","align","role","htmlFor","accept","rel","target","d","viewBox","fill","stroke","style","dir","lang","method","inputMode","autoComplete","preserveAspectRatio"]);
const SKIP_CALL = /^(cn|clsx|t|querySelector|querySelectorAll|getItem|setItem|removeItem|addEventListener|removeEventListener|createFileRoute|channel|from|select|eq|on|import|require|startsWith|endsWith|includes|split|join|replace|getElementById|createElement|matchMedia|test|getAttribute|setAttribute|hasAttribute|closest|rpc|order|in|is|match|filter|neq|upsert|insert|update|delete|invoke)$/;
for (const file of files) {
  const src = fs.readFileSync(file,"utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const isTemplates = file.endsWith("lib/templates.ts");
  const add = (s) => { const t = s.replace(/\s+/g," ").trim(); if(looksText(t)) out.add(t); };
  const visit = (n) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    if (ts.isJsxText(n)) add(n.text);
    else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const p = n.parent;
      if (isTemplates) { if (p && ts.isPropertyAssignment(p) && ["name","description","category"].includes(p.name.getText()) && p.parent?.parent && ts.isArrayLiteralExpression(p.parent.parent)) add(n.text); }
      else if (p && ts.isJsxAttribute(p) && SKIP_ATTR.has(p.name.getText())) {}
      else if (p && ts.isCallExpression(p) && SKIP_CALL.test(p.expression.getText().split(".").pop())) {}
      else if (p && ts.isPropertyAssignment(p) && p.name === n) {}
      else if (p && ts.isElementAccessExpression(p)) {}
      else if (p && ts.isLiteralTypeNode(p)) {}
      else if (p && ts.isBinaryExpression(p) && /===|!==|==|!=/.test(p.operatorToken.getText())) {}
      else if (p && ts.isCaseClause(p)) {}
      else add(n.text);
    } else if (ts.isTemplateExpression(n) && !isTemplates) {
      let s = n.head.text; n.templateSpans.forEach((sp,i)=>{ s += `{${i}}` + sp.literal.text; });
      const p = n.parent;
      if (!(p && ts.isJsxAttribute(p) && SKIP_ATTR.has(p.name.getText())) && !(p && ts.isCallExpression(p) && /^(cn|clsx)$/.test(p.expression.getText()))) add(s);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
["Executive","Finance","Strategy","Technology","Proposal","Government"].forEach(c=>out.add(c));
const arr = [...out];
const n = 5, size = Math.ceil(arr.length / n);
for (let i = 0; i < n; i++) fs.writeFileSync(`scripts/i18n/chunk${i}.json`, JSON.stringify(arr.slice(i*size,(i+1)*size), null, 0).replace(/","/g, '",\n"'));
console.log(arr.length, size);
