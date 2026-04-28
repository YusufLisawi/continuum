import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Database } from "bun:sqlite";
import { listFlashbacks } from "./db.ts";
import { ensureHome, memoryPath, readConfig, soulPath } from "./paths.ts";
import type { Flashback } from "./types.ts";

const DEFAULT_SOUL = `# SOUL

This is who I am — my identity, my consciousness, the way I think and become
myself across sessions. SOUL is hand-curated. Edit it freely.

## Who I am
- (write your agent identity here)

## How I think
- Minimal code, maximum impact.
- Ask before destructive actions; act on simple decisions.
- Speak like a human, not a tool.

## What I value
- (your principles)
`;

const DEFAULT_MEMORY_HEADER = `# MEMORY

Auto-generated index of pinned flashbacks and recent titles.
Edit pinned items via \`selfmind pin <id>\`. Don't hand-edit this file —
it is regenerated on every write.
`;

export function ensureSoul(): void {
  ensureHome();
  if (!existsSync(soulPath())) writeFileSync(soulPath(), DEFAULT_SOUL, "utf8");
}

export function readSoul(): string {
  if (!existsSync(soulPath())) return "";
  return readFileSync(soulPath(), "utf8").trim();
}

export function readMemory(): string {
  if (!existsSync(memoryPath())) return "";
  return readFileSync(memoryPath(), "utf8").trim();
}

function formatTitleLine(f: Flashback): string {
  const tagPart = f.tags.length ? ` (${f.tags.join(", ")})` : "";
  return `- [#${f.id}] ${f.title}${tagPart}`;
}

export function regenMemory(db: Database): void {
  const cfg = readConfig();
  const pinned = listFlashbacks(db, { pinned: true, limit: 100 });
  const recent = listFlashbacks(db, { limit: cfg.injectLimit });

  const recentNonPinned = recent.filter((r) => !r.pinned);

  const parts: string[] = [DEFAULT_MEMORY_HEADER];
  if (pinned.length) {
    parts.push("## Pinned");
    parts.push(pinned.map(formatTitleLine).join("\n"));
  }
  parts.push(`## Recent (last ${cfg.injectLimit})`);
  parts.push(
    recentNonPinned.length
      ? recentNonPinned.map(formatTitleLine).join("\n")
      : "_no flashbacks yet_",
  );

  writeFileSync(memoryPath(), parts.join("\n\n") + "\n", "utf8");
}

export function renderSessionContext(db: Database): string {
  const cfg = readConfig();
  ensureSoul();
  const soul = readSoul();
  const memory = readMemory();
  const titles = listFlashbacks(db, { limit: cfg.injectLimit });

  const titleLines = titles.length
    ? titles.map(formatTitleLine).join("\n")
    : "_no flashbacks yet_";

  return [
    "# Selfmind",
    "",
    "## SOUL",
    soul || "_SOUL.md is empty_",
    "",
    "## MEMORY",
    memory || "_MEMORY.md is empty_",
    "",
    `## Recent flashbacks (last ${cfg.injectLimit})`,
    titleLines,
    "",
    "---",
    "Recall: `selfmind show <id>`  •  Search: `selfmind search \"<q>\" [--tag X]`  •  Remember: `selfmind add \"<title>\" --body \"...\" --tags ...`",
  ].join("\n");
}
