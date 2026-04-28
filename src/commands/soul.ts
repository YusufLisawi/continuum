import { spawnSync } from "node:child_process";
import { ensureSoul, readSoul } from "../render.ts";
import { soulPath } from "../paths.ts";

export function soulPrintCmd(): void {
  ensureSoul();
  console.log(readSoul());
}

export function soulEditCmd(): void {
  ensureSoul();
  const editor = process.env.EDITOR || process.env.VISUAL || "vi";
  const r = spawnSync(editor, [soulPath()], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
