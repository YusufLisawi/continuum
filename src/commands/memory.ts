import { getDb } from "../db.ts";
import { readMemory, regenMemory } from "../render.ts";

export function memoryPrintCmd(): void {
  console.log(readMemory());
}

export function memoryRegenCmd(): void {
  const db = getDb();
  regenMemory(db);
  console.log("MEMORY.md regenerated");
}
