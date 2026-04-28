import { existsSync, writeFileSync } from "node:fs";
import { getDb } from "../db.ts";
import { ensureHome, home, memoryPath } from "../paths.ts";
import { ensureSoul, regenMemory } from "../render.ts";

export function initCmd(_opts: Record<string, unknown>): void {
  ensureHome();
  ensureSoul();
  const db = getDb();
  if (!existsSync(memoryPath())) writeFileSync(memoryPath(), "", "utf8");
  regenMemory(db);
  console.log(`selfmind initialized at ${home()}`);
  console.log(`  - SOUL.md`);
  console.log(`  - MEMORY.md`);
  console.log(`  - selfmind.db`);
}
