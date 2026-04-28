---
name: selfmind-recall
description: Recall a flashback or search past memory in the selfmind database. Use when the user references prior work ("didn't we decide…", "how did we fix…", "remember when…"), when the current task echoes a flashback title injected at session start, or any time you'd benefit from past context.
---

# Selfmind — Recall

You start every session with SOUL.md, MEMORY.md, and the last N flashback
titles already in your context (injected by the SessionStart hook). Use
those titles as a table of contents into past memory.

## When to use

- User references something from a past session ("we already fixed that…")
- Current task or bug looks like a flashback title you saw at session start
- About to make a decision that may already be settled in MEMORY.md
- User asks you to recall, look up, or remember something

## Workflow

1. **Search by keyword:** `selfmind search "<query>" [--tag X] [--project Y]`
   - FTS5 + fuzzy. Tolerates typos. Returns id + title + snippet + score.
   - Use `--json` if you need to parse results.
2. **Expand a hit:** `selfmind show <id>`
   - Returns title, body, tags, links to other flashbacks.
3. **Follow links:** if `show` reports `links: → #N (refines)`, run
   `selfmind show N` to traverse the graph.

## Filters

- `--tag <name>` to scope to a single tag (e.g. `decision`, `bug`).
- `--project <name>` to scope to a project (cwd basename at write time).
- `--limit <n>` (default 10).

## Don't

- Don't speculate when you can `selfmind search` instead.
- Don't dump every result to the user — pick the relevant one and cite `#id`.
