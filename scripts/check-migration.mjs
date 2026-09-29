import { readFileSync } from "node:fs";

const path = "supabase/migrations/20260929_presentation_studio_cloud.sql";
const sql = readFileSync(path, "utf8");
const lines = sql.split(/\r?\n/);

const badSingle = lines
  .map((line, index) => ({ line: index + 1, text: line.trim() }))
  .filter((item) => item.text === "as $" || item.text === "$;" || item.text === "do $");

if (badSingle.length) {
  console.error("Invalid single-dollar PL/pgSQL delimiters:");
  for (const item of badSingle) console.error("  line " + item.line + ": " + item.text);
  process.exit(1);
}

const functionCount = (sql.match(/create\s+or\s+replace\s+function/gi) ?? []).length;
const functionOpenCount = (sql.match(/^\s*as \$\$\s*$/gm) ?? []).length;
const doOpenCount = (sql.match(/^\s*do \$\$/gm) ?? []).length;
const dollarTokenCount = (sql.match(/\$\$/g) ?? []).length;
const expectedDollarTokens = (functionOpenCount + doOpenCount) * 2;

if (functionCount !== functionOpenCount) {
  console.error(
    "Function delimiter mismatch: " +
      functionCount + " function declaration(s), but " +
      functionOpenCount + " PL/pgSQL function opening delimiter(s).",
  );
  process.exit(1);
}

if (dollarTokenCount !== expectedDollarTokens) {
  console.error(
    "Unbalanced dollar-quoted SQL blocks: expected " +
      expectedDollarTokens + " $$ token(s) for " +
      functionOpenCount + " function block(s) and " +
      doOpenCount + " DO block(s), found " +
      dollarTokenCount + ".",
  );
  process.exit(1);
}

console.log(
  "Migration structure OK · " + functionCount + " function(s) · " +
  doOpenCount + " DO block(s) · " + dollarTokenCount + " balanced $$ token(s).",
);
