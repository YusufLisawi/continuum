import { deleteFlashback, getDb } from "../db.ts";
import { regenMemory } from "../render.ts";

export function rmCmd(idArg: string): void {
  const id = Number(idArg);
  const db = getDb();
  const ok = deleteFlashback(db, id);
  if (!ok) {
    console.error(`no flashback #${id}`);
    process.exit(1);
  }
  regenMemory(db);
  console.log(`#${id} removed`);
}
