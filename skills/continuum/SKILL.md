---
name: continuum
description: Persistent memory for this session — recall past flashbacks, save durable preferences/decisions/learnings, link related items in a graph. Triggers on "remember this", "from now on", "we decided", "didn't we…", "how did we fix…", or any reference to prior work that may already be in memory, or when you figure out something that you need to learn, like a bug or issue that you overcame
---

# Continuum

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
| "didn't we…", "how did we fix…", "remember when…", a current task echoes an injected title | **Recall** — `continuum search` → `continuum show` |
| "remember this", "note for later", "from now on", "we decided", or a non-obvious learning emerges | **Remember** — `continuum add` (or edit MEMORY.md if it's a one-line preference) |
| The new flashback refines/contradicts/follows up on an existing one | **Link** — `continuum link` |

when you figure out something that you need to learn, like a bug or issue that you overcame

## The three operations (90% of usage)

```sh
# Recall
continuum search "<keywords>" [--tag X] [--project Y] [--limit N] [--json]
continuum show <id>                       # expands + auto-pulls linked siblings

# Remember
continuum add "<title>" --body "..." --tags a,b [--pin] [--link <id>]

# Link
continuum link <src> <dst> --kind related|follows|contradicts|refines
```

## Title style (when saving)

- Lead with the fact, declarative or imperative
- "We use bun:sqlite, not better-sqlite3" — not "Discussion about sqlite"
- Under ~80 characters, scannable in a list

## Body style

Lead with the fact, then a short **Why:** line and **How to apply:** line
when relevant. Future-you needs the reason to judge edge cases.

## MEMORY.md vs flashback — the rule

| It fits in one line and is a preference / decision / note | → write into MEMORY.md (Write tool, `~/.continuum/MEMORY.md`) |
| It needs a body (root cause, full reasoning, multiple paragraphs) | → `continuum add` (a flashback) |
| It's about who you are (identity, voice, values) | → SOUL.md (Write tool, `~/.continuum/SOUL.md`) |

## Drill deeper

For edge cases and richer workflows:

- `references/recall.md` — search filters, fuzzy fallback, traversing the graph
- `references/remember.md` — when to pin, tag conventions, deduplication
- `references/link.md` — link kinds with full examples, contradicts vs refines

## Other useful commands

```sh
continuum list [--limit 30] [--tag X] [--project Y] [--pinned] [--json]
continuum tag add <id> <name> | rm <id> <name>
continuum pin <id> | unpin <id>
continuum rm <id>
continuum preview                         # see exact session-start injection
continuum config get|set <key> [value]    # tune injectLimit etc.
```
