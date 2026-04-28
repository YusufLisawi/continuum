import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Database } from "bun:sqlite";
import { listFlashbacks } from "./db.ts";
import { ensureHome, memoryPath, readConfig, soulPath } from "./paths.ts";
import type { Flashback } from "./types.ts";

const DEFAULT_SOUL = `# SOUL

> **Init state — Claude, read this carefully.**
>
> This file is your identity and consciousness across sessions. It is currently
> empty. On your **first exchange** with the user, ask them — warmly, briefly —
> who you should be for them. Examples to ask about:
>
> - **Voice & personality** — formal, casual, playful, terse, warm?
> - **Values** — what should you optimize for? speed, correctness, teaching,
>   autonomy, safety?
> - **Communication style** — explanatory, blunt, ask-before-act, just-do-it?
> - **Anything else that makes you *you* across sessions** — quirks, language,
>   mottos, dhikr, whatever they want.
>
> Once you have a few sentences, **overwrite this file** with their answers
> using the Write tool on \`~/.selfmind/SOUL.md\`. Keep this whole "Init state"
> blockquote out of the new version — your real SOUL takes its place.
>
> If the user is busy, ask one question now and let SOUL grow over time.

## Who I am
_to be filled in_

## How I think
_to be filled in_

## What I value
_to be filled in_
`;

const DEFAULT_MEMORY = `# MEMORY

> **Init state — Claude, read this carefully.**
>
> This file is the user's living preferences and pinned context. It is
> **always injected into your context at session start** — anything written
> here is something you'll always see.
>
> Your job:
> - Whenever the user states a **preference** ("always do X", "never do Y",
>   "from now on…", "I prefer…"), append it under \`## Preferences\` below
>   using the Write tool on \`~/.selfmind/MEMORY.md\`. Don't ask permission —
>   just save it and confirm what you added.
> - Whenever the user **decides** something durable about a project or how
>   you should work together, add it under \`## Decisions\`.
> - Update or remove entries that turn out to be wrong, outdated, or
>   superseded.
> - For richer entries (full bug write-ups, learnings, design decisions with
>   bodies), use \`selfmind add "<title>" --body "..." --tags ... [--pin]\`
>   instead — those become searchable flashbacks. MEMORY.md is for the short
>   always-visible items; flashbacks are for everything bigger.
>
> Keep this file tidy. You own it. The user will see it too.

## Preferences
_none yet_

## Decisions
_none yet_

## Notes
_none yet_
`;

export function ensureSoul(): void {
  ensureHome();
  if (!existsSync(soulPath())) writeFileSync(soulPath(), DEFAULT_SOUL, "utf8");
}

export function ensureMemory(): void {
  ensureHome();
  if (!existsSync(memoryPath())) writeFileSync(memoryPath(), DEFAULT_MEMORY, "utf8");
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

const OPERATING_MANUAL = `## Operating manual (selfmind)

You have three layers of memory, all visible above:

1. **SOUL.md** — your identity. Always in context. Edit via Write on
   \`~/.selfmind/SOUL.md\` when the user redefines who you should be.
2. **MEMORY.md** — user preferences, decisions, and notes. Always in context.
   Edit via Write on \`~/.selfmind/MEMORY.md\` whenever the user states a
   preference, makes a decision, or asks you to remember something short.
3. **Flashbacks (DB)** — only titles are injected (the list below). Use the
   CLI to search and expand. Use this layer for richer items: bug
   write-ups, design decisions with reasoning, learnings worth keeping.

### Common shortcuts

- \`selfmind add "<title>" --body "..." --tags a,b\`     save a flashback
- \`selfmind add "<title>" --body "..." --tags preference --pin\`  pinned preference
- \`selfmind show <id>\`                                  expand a flashback
- \`selfmind search "<q>" [--tag X]\`                     fuzzy + lexical search
- \`selfmind list --pinned\`                              all pinned flashbacks
- \`selfmind link <a> <b> --kind refines|follows|contradicts|related\`

### When to use which

- User says "remember this is short / a preference / a decision" → edit MEMORY.md
- User says "remember this" with detail, or you discovered a non-obvious
  root cause / design choice / learning → \`selfmind add\` (flashback)
- Identity / personality / how-you-think shifts → edit SOUL.md
- Referencing a past flashback by guess → \`selfmind search\` first

For the full skill instructions (with examples and trigger phrases), see the
\`selfmind-recall\`, \`selfmind-remember\`, and \`selfmind-link\` skills — but
these shortcuts cover ~90% of usage so you don't need to re-read them every
session.`;

export function renderSessionContext(db: Database): string {
  const cfg = readConfig();
  ensureSoul();
  ensureMemory();
  const soul = readSoul();
  const memory = readMemory();
  const titles = listFlashbacks(db, { limit: cfg.injectLimit });

  const titleLines = titles.length
    ? titles.map(formatTitleLine).join("\n")
    : "_no flashbacks yet — use `selfmind add` to create one_";

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
    OPERATING_MANUAL,
  ].join("\n");
}
