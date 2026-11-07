// Copies the design-source JSON (single source of truth, one folder up in the
// design plan) into packages/content/data so this repo also builds on its own.
// Run:  npm run sync-content
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const planRoot = resolve(here, "..", "..");            // "Game Design Plan"
const dest = resolve(here, "..", "packages", "content", "data");
const files = [
  ["Content/rules.json", "rules.json"],
  ["Content/cards.json", "cards.json"],
  ["Content/biomes.json", "biomes.json"],
  ["Content/sources.json", "sources.json"],
  ["board.json", "board.json"],
];
mkdirSync(dest, { recursive: true });
let copied = 0;
for (const [from, to] of files) {
  const src = join(planRoot, from);
  if (!existsSync(src)) { console.warn(`skip (not found): ${src}`); continue; }
  copyFileSync(src, join(dest, to));
  copied++;
}
console.log(`synced ${copied}/${files.length} content files into packages/content/data`);
