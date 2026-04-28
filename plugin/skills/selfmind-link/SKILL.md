---
name: selfmind-link
description: Connect two flashbacks in the selfmind graph. Use when a new flashback refines, contradicts, or follows up on an existing one referenced earlier in this session.
---

# Selfmind — Link

Selfmind is a small graph. Links let future-you traverse from one
flashback to related ones.

## When to use

- Just wrote a new flashback that updates or supersedes an existing one.
- Found a flashback that contradicts another — record the conflict so
  future-you can resolve it.
- Two flashbacks share a thread (same bug across days, same feature).

## Workflow

```sh
selfmind link <src-id> <dst-id> --kind <related|follows|contradicts|refines>
selfmind unlink <src-id> <dst-id> [--kind <kind>]
```

## Kinds

- **related** — generic association. Default.
- **follows** — `src` happened after `dst` in the same thread (changelog).
- **contradicts** — `src` disagrees with `dst`. Future-you should reconcile.
- **refines** — `src` updates / supersedes `dst`. Read both, prefer `src`.

## Example

```sh
# After fixing a bug whose root cause was already a flashback:
selfmind add "Dashboard log pane fix landed in v0.2" --tags bug,fix
selfmind link <new-id> <old-bug-id> --kind follows
```
