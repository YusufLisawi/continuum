import { deleteFlashback, getDb } from "../db.ts";

export function rmCmd(idArg: string): void {
  const id = Number(idArg);
  const db = getDb();
  const ok = deleteFlashback(db, id);
  if (!ok) {
    console.error(`no flashback #${id}`);
    process.exit(1);
  }
  console.log(`#${id} removed`);
}
