import { getDb, setPinned } from "../db.ts";
import { regenMemory } from "../render.ts";

export function pinCmd(idArg: string, pinned: boolean): void {
  const id = Number(idArg);
  const db = getDb();
  const ok = setPinned(db, id, pinned);
  if (!ok) {
    console.error(`no flashback #${id}`);
    process.exit(1);
  }
  regenMemory(db);
  console.log(`#${id} ${pinned ? "pinned" : "unpinned"}`);
}
