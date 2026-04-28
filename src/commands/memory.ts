import { spawnSync } from "node:child_process";
import { ensureMemory, readMemory } from "../render.ts";
import { memoryPath } from "../paths.ts";

export function memoryPrintCmd(): void {
  ensureMemory();
  console.log(readMemory());
}

export function memoryEditCmd(): void {
  ensureMemory();
  const editor = process.env.EDITOR || process.env.VISUAL || "vi";
  const r = spawnSync(editor, [memoryPath()], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
