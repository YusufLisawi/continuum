---
name: selfmind-remember
description: Save a durable flashback (decision, learning, preference, root cause) into selfmind so it survives across sessions. Use when the user says "remember this", "note for later", "from now on", "we decided", or when a non-obvious learning emerges that future-you would want to know.
---

# Selfmind — Remember

Write durable, surprise-worthy facts into the selfmind database as
"flashbacks". On the next session start, their titles are injected into
context automatically.

## When to use

- User says "remember this", "note this", "from now on", "we decided".
- A bug's root cause is non-obvious and would be hard to rediscover.
- User states a preference that should apply across sessions.
- A meaningful design decision was just made.

## When NOT to use

- Trivia derivable from `git log` or current code.
- In-progress task state — that's task tracking, not memory.
- Anything already in MEMORY.md / SOUL.md.

## Workflow

```sh
selfmind add "<concise title>" \
  --body "<full context: why, where, what to do>" \
  --tags <tag1>,<tag2> \
  [--pin] \
  [--link <existing-id>]
```

Use `--pin` only for things the user explicitly wants kept top-of-mind.
Use `--link <id>` when this flashback refines, contradicts, or follows up
on an existing one (then upgrade the link kind via `selfmind link`).

## Title style

- Imperative or declarative, **scannable in a list**.
- Lead with the fact: "We use bun:sqlite, not better-sqlite3" — not
  "Discussion about sqlite library".
- Keep under ~80 characters.

## Body style

Lead with the fact, then a short **Why:** line and **How to apply:** line
when relevant. Future-you needs the reason to judge edge cases.
