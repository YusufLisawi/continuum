# Remember — deeper

## When to pin

`--pin` makes a flashback always-visible at session start regardless of
how old it is. Pin sparingly:

- Critical user preferences the user expects you to honor every session
- Decisions that govern many future choices ("we use X stack")
- Identity-adjacent items that didn't make it into SOUL.md

If you'd write it into MEMORY.md anyway, just write it there — that's
already always-visible and cheaper.

## Tag conventions

Suggested tags (you can invent more):

- `decision` — durable architectural / product call
- `bug` — root cause / repro / workaround
- `fix` — what landed (link to the bug with `--kind follows`)
- `preference` — short user preference (or just edit MEMORY.md)
- `learning` — non-obvious gotcha worth keeping

Multiple tags are fine: `--tags decision,stack,viberelay`.

## Deduplication

Before saving, search for similar titles:

```sh
continuum search "<a few keywords>" --limit 5
```

If you find a near-duplicate:

- **Same fact:** don't add. Update body/tags on the existing one if
  needed via — currently this means delete + re-add (no `update` cmd).
- **Refines / contradicts the existing:** add the new one and link it
  with `--kind refines` or `--kind contradicts`.

## Body conventions

```
**Why:** [the reason — past incident, constraint, deadline]

**How to apply:** [when this rule fires, what to do, where it lives]
```

Future-you needs *why* to judge edge cases, not just *what*.

## Multi-line bodies

```sh
continuum add "Dashboard log pane resets on refresh" --body "$(cat <<'EOF'
Refresh loop replaces #app-body wholesale, which wipes the log pane and
follow-state.

**Why:** the loop's full-DOM swap is faster but destructive.

**How to apply:** preserve the pane node, swap children only. See
packages/daemon/src/dashboard/render.ts.
EOF
)" --tags bug,viberelay
```

Or use `--stdin` and pipe.
