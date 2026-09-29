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

const openFunctions = lines.filter((line) => line.trim() === "as $$").length;
const closeBlocks = lines.filter((line) => line.trim() === "$$;").length;
const doBlocks = lines.filter((line) => line.trim() === "do $$").length;

if (closeBlocks !== openFunctions + doBlocks) {
  console.error(
    "Unbalanced dollar-quoted SQL blocks: " +
      openFunctions + " function block(s) + " + doBlocks + " DO block(s), but " + closeBlocks + " closing delimiter(s).",
  );
  process.exit(1);
}

const functions = lines.filter((line) => line.trim().startsWith("create or replace function")).length;
console.log(
  "Migration structure OK · " + functions + " function(s) · " +
  doBlocks + " DO block(s) · " + closeBlocks + " balanced closing delimiter(s).",
);
