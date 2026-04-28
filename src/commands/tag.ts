import { addTag, getDb, removeTag } from "../db.ts";
import { regenMemory } from "../render.ts";

export function tagAddCmd(idArg: string, name: string): void {
  const id = Number(idArg);
  const db = getDb();
  addTag(db, id, name);
  regenMemory(db);
  console.log(`#${id} +${name}`);
}

export function tagRmCmd(idArg: string, name: string): void {
  const id = Number(idArg);
  const db = getDb();
  removeTag(db, id, name);
  regenMemory(db);
  console.log(`#${id} -${name}`);
}
