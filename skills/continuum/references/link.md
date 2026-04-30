# Link — deeper

Continuum is a small typed graph. Edges are directed; types matter.

## The four kinds

| Kind | Meaning | When to use |
|---|---|---|
| `related` | generic association | default, when none of the others fit |
| `follows` | chronological / changelog: B comes after A on the same thread | bug → fix, decision → revision |
| `contradicts` | B disagrees with A; future-you should reconcile | recorded conflict — don't silently delete the old one |
| `refines` | B updates / supersedes A; prefer B's content | new info, more accurate write-up |

## Examples

```sh
# Bug landed a fix:
continuum add "Dashboard log fix landed v0.2" --tags fix,viberelay
continuum link <new-id> <bug-id> --kind follows

# Decision changed:
continuum add "Switched to better-sqlite3 after build pipeline change" --tags decision,stack
continuum link <new-id> <old-decision-id> --kind refines

# Conflicting opinions in two places:
continuum link <a-id> <b-id> --kind contradicts
```

## Reading the graph

`continuum show <id>` always pulls direct neighbors with their direction:

- `→ #N (kind)` — outgoing (this flashback is the source)
- `← #N (kind)` — incoming (this flashback is the destination)

Walk further by calling `show` on any neighbor. Continuum doesn't do
multi-hop traversal — keeping recall predictable and cheap.

## Removing links

```sh
continuum unlink <src> <dst>                  # all kinds between this pair
continuum unlink <src> <dst> --kind refines   # just one kind
```

## Anti-patterns

- Don't link every flashback to every other "just because" — links cost
  cognitive load when reading the graph.
- Don't use `refines` when you mean `follows` — refines means "use the
  new one instead", follows just means "this came after".
- Don't silently delete a contradicted flashback — record the
  contradiction so future-you knows the conflict happened.
