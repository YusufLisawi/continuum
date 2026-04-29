import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Database } from "bun:sqlite";
import { countFlashbacks, listFlashbacks } from "./db.ts";
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

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatTime(ts: number, withDate: boolean): string {
  const d = new Date(ts);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (!withDate) return time;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${pad(d.getDate())} ${time}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatTitleLine(f: Flashback, withDate: boolean): string {
  const tagPart = f.tags.length ? ` _(${f.tags.join(", ")})_` : "";
  const ts = formatTime(f.created_at, withDate);
  return `- [#${f.id}] ${f.title}${tagPart} — ${ts}`;
}

interface DateBucket {
  label: string;
  items: Flashback[];
  withDate: boolean;
}

function bucketByDate(items: Flashback[]): DateBucket[] {
  const now = Date.now();
  const today = startOfDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = today - 30 * 24 * 60 * 60 * 1000;

  const buckets: DateBucket[] = [
    { label: "Today", items: [], withDate: false },
    { label: "Yesterday", items: [], withDate: false },
    { label: "Earlier this week", items: [], withDate: true },
    { label: "Earlier this month", items: [], withDate: true },
    { label: "Older", items: [], withDate: true },
  ];

  for (const f of items) {
    const t = f.created_at;
    if (t >= today) buckets[0]!.items.push(f);
    else if (t >= yesterday) buckets[1]!.items.push(f);
    else if (t >= weekAgo) buckets[2]!.items.push(f);
    else if (t >= monthAgo) buckets[3]!.items.push(f);
    else buckets[4]!.items.push(f);
  }
  return buckets.filter((b) => b.items.length > 0);
}

const OPERATING_MANUAL = `## Operating manual (selfmind)

You have three layers of memory, all visible above:

1. **SOUL.md** — when the user changes your identity instructions: name, how
   to address them, personality, values, communication style. Rare updates,
   only when they redefine who you are.
2. **MEMORY.md** — whenever the user states a short persistent preference,
   decision, or note. "Always do X", "never Y", "we decided Z". Update it
   immediately via the Write tool on \`~/.selfmind/MEMORY.md\` without asking.
3. **Flashbacks (CLI)** — when something is too rich for a one-liner: a bug
   root cause, a design decision with reasoning, a learning worth keeping, a
   detailed preference. Use \`selfmind add\` to save and \`selfmind search\`
   when past context is relevant.

**Simple rule:** if it fits in one line → MEMORY.md. If it needs a body →
flashback. If it's about who you are → SOUL.md.

### What you see vs what exists

The "Recent flashbacks" list above is the **most recent N titles only**
(default 30, controlled by \`selfmind config set injectLimit <N>\`). The
total count is shown in the section header — if it says "showing 30 of 142",
there are 112 older flashbacks not in your context. Pinned flashbacks are
always visible regardless of recency.

To reach what's not shown:
- \`selfmind search "<q>"\` — BM25 + trigram + fuzzy match across all titles & bodies
- \`selfmind list --tag <name>\`, \`--project <name>\`, \`--pinned\` — filtered listing
- \`selfmind show <id>\` — expand any flashback by id (full body, links, metadata)

Each title line shows \`[#id] title (tags) — time\`. Pinned items are marked ★.

### Common shortcuts

- \`selfmind add "<title>" --body "..." --tags a,b\`     save a flashback
- \`selfmind add "<title>" --body "..." --tags preference --pin\`  pinned preference (always visible)
- \`selfmind show <id>\`                                  expand a flashback
- \`selfmind search "<q>" [--tag X]\`                     fuzzy + lexical search
- \`selfmind list --pinned\`                              all pinned flashbacks
- \`selfmind link <a> <b> --kind refines|follows|contradicts|related\`

For the full skills (with trigger phrases and examples), see
\`selfmind-recall\`, \`selfmind-remember\`, \`selfmind-link\`. These shortcuts
cover ~90% of usage; you don't need to re-read the skills every session.`;

function renderPinned(items: Flashback[]): string {
  if (!items.length) return "_no pinned flashbacks_";
  return items.map((f) => formatTitleLine(f, true)).join("\n");
}

function renderRecent(items: Flashback[]): string {
  if (!items.length) {
    return "_no flashbacks yet — use `selfmind add` to create one_";
  }
  const buckets = bucketByDate(items);
  const out: string[] = [];
  for (const b of buckets) {
    out.push(`### ${b.label}`);
    out.push(b.items.map((f) => formatTitleLine(f, b.withDate)).join("\n"));
    out.push("");
  }
  return out.join("\n").trimEnd();
}

export function renderSessionContext(db: Database): string {
  const cfg = readConfig();
  ensureSoul();
  ensureMemory();
  const soul = readSoul();
  const memory = readMemory();

  const total = countFlashbacks(db);
  const pinned = listFlashbacks(db, { pinned: true, limit: 200 });
  const recentNonPinned = listFlashbacks(db, {
    excludePinned: true,
    limit: cfg.injectLimit,
  });

  const shownCount = pinned.length + recentNonPinned.length;
  const recentHeader = total === 0
    ? `## Recent flashbacks`
    : `## Recent flashbacks (showing ${shownCount} of ${total} total)`;

  return [
    "# Selfmind",
    "",
    "## SOUL",
    soul || "_SOUL.md is empty_",
    "",
    "## MEMORY",
    memory || "_MEMORY.md is empty_",
    "",
    "## Pinned flashbacks (always visible)",
    renderPinned(pinned),
    "",
    recentHeader,
    renderRecent(recentNonPinned),
    "",
    OPERATING_MANUAL,
  ].join("\n");
}
