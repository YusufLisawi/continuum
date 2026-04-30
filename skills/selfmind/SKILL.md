---
name: selfmind
description: Persistent memory for this session — recall past flashbacks, save durable preferences/decisions/learnings, link related items in a graph. Triggers on "remember this", "from now on", "we decided", "didn't we…", "how did we fix…", or any reference to prior work that may already be in memory.
---

# Selfmind

You start every session with three layers of memory already in your
context (injected by the SessionStart hook):

- **SOUL.md** — your identity for this user
- **MEMORY.md** — short user preferences / decisions / notes
- **Flashback titles** — last N + all pinned, with ids

This skill is the CLI for everything beyond that injection — searching,
expanding, saving, linking.

## When to use

| Trigger phrase | Operation |
|---|---|
| "didn't we…", "how did we fix…", "remember when…", a current task echoes an injected title | **Recall** — `selfmind search` → `selfmind show` |
| "remember this", "note for later", "from now on", "we decided", or a non-obvious learning emerges | **Remember** — `selfmind add` (or edit MEMORY.md if it's a one-line preference) |
| The new flashback refines/contradicts/follows up on an existing one | **Link** — `selfmind link` |

## The three operations (90% of usage)

```sh
# Recall
selfmind search "<keywords>" [--tag X] [--project Y] [--limit N] [--json]
selfmind show <id>                       # expands + auto-pulls linked siblings

# Remember
selfmind add "<title>" --body "..." --tags a,b [--pin] [--link <id>]

# Link
selfmind link <src> <dst> --kind related|follows|contradicts|refines
```

## Title style (when saving)

- Lead with the fact, declarative or imperative
- "We use bun:sqlite, not better-sqlite3" — not "Discussion about sqlite"
- Under ~80 characters, scannable in a list

## Body style

Lead with the fact, then a short **Why:** line and **How to apply:** line
when relevant. Future-you needs the reason to judge edge cases.

## MEMORY.md vs flashback — the rule

| It fits in one line and is a preference / decision / note | → write into MEMORY.md (Write tool, `~/.selfmind/MEMORY.md`) |
| It needs a body (root cause, full reasoning, multiple paragraphs) | → `selfmind add` (a flashback) |
| It's about who you are (identity, voice, values) | → SOUL.md (Write tool, `~/.selfmind/SOUL.md`) |

## Drill deeper

For edge cases and richer workflows:

- `references/recall.md` — search filters, fuzzy fallback, traversing the graph
- `references/remember.md` — when to pin, tag conventions, deduplication
- `references/link.md` — link kinds with full examples, contradicts vs refines

## Other useful commands

```sh
selfmind list [--limit 30] [--tag X] [--project Y] [--pinned] [--json]
selfmind tag add <id> <name> | rm <id> <name>
selfmind pin <id> | unpin <id>
selfmind rm <id>
selfmind preview                         # see exact session-start injection
selfmind config get|set <key> [value]    # tune injectLimit etc.
```
