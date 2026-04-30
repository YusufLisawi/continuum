# Recall — deeper

## Search internals

Continuum search merges three signals:

1. **FTS5 lexical (BM25)** on `title + body` with porter stemming —
   `commits` matches `commit`, `dashboards` matches `dashboard`. Each term
   is auto-prefixed (`auth*`).
2. **FTS5 trigram** on `title` — substring match across word boundaries.
3. **Sørensen-Dice fuzzy** on titles when lexical hits are thin —
   tolerates typos: `dashbord` → "Dashboard log pane resets on refresh".

Recency boost (`exp(-age_days/30) * 0.2`) and pinned boost (`+0.5`) are
added to the merged score.

## Filters

```sh
continuum search "auth" --tag bug                # tag filter
continuum search "auth" --project viberelay       # cwd-basename filter
continuum search "auth" --limit 5
continuum search "auth" --json                    # for parsing in tools
```

## Traversing the graph

`continuum show <id>` already pulls all linked siblings inline:

```
#2  Dashboard log pane resets on refresh
created: 2026-04-29T22:07:15.734Z
project: viberelay
tags: bug, viberelay

[body]

--- linked flashbacks ---
  → #1 (related)  Picked bun:sqlite
  ← #3 (follows)  Dashboard log fix landed v0.2
```

So one `show` call surfaces the local graph. Walk further with another
`show` on any sibling. Use `--no-links` to suppress when a flashback has
many neighbors and you want a terse view.

## When NOT to search

Cheaper alternatives if the answer is already in front of you:

- The injected MEMORY.md often has the preference verbatim — read first.
- The injected flashback titles list often shows the answer by id — go
  straight to `continuum show <id>`.
- Search only when neither of the above hits.
