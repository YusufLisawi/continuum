import { getDb } from "../db.ts";
import { ensureHome, home } from "../paths.ts";
import { ensureMemory, ensureSoul } from "../render.ts";

export function initCmd(_opts: Record<string, unknown>): void {
  ensureHome();
  ensureSoul();
  ensureMemory();
  getDb();
  console.log(`selfmind initialized at ${home()}`);
  console.log(`  - SOUL.md  (init prompt — agent will fill on first session)`);
  console.log(`  - MEMORY.md (init prompt — agent edits as preferences emerge)`);
  console.log(`  - selfmind.db`);
}
