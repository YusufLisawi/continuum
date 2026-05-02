# Continuum

> The thread that runs through every session.

**Continuum** is persistent memory for Claude Code. Your AI assistant
remembers who you are, what you've decided, and the work you've done —
across sessions, across compactions, across machines.

No embeddings. No LLM compression step. No MCP server. No workers.
Just SQLite (FTS5 + trigram + Sørensen-Dice), two markdown files,
a tiny CLI, and one Claude Code plugin.

```
   past ─────────────●──────●─●────────────●────●──── now ─────►
                     │      │ │            │    │
                     └──────┴─┴──flashbacks┴────┘
                                                    + SOUL  (identity)
                                                    + MEMORY (preferences)
```

---

## What it gives the agent at every session start

1. **SOUL.md** — your identity for this user (name, voice, values).
   Hand-curated. The agent boots already knowing who it is to you.
2. **MEMORY.md** — your living preferences, decisions, notes. Always in
   context. The agent edits this directly as you state preferences.
3. **Flashbacks** — DB-backed memory entries with title, body, tags, and
   links to other flashbacks. Last N titles + all pinned are injected;
   the rest is one CLI call away.
4. **An operating manual** — locked-in stance: assistant-first, fully
   agentic, trusts the user, doesn't break character.

A SessionStart hook stitches all of that into the agent's context on
every fresh session, every `/clear`, and every auto-compaction.

---

## Install

Inside Claude Code, two commands. That's it.

```
/plugin marketplace add YusufLisawi/continuum
/plugin install continuum@continuum
```

The plugin auto-installs **everything** on first install:

- Registers the SessionStart hook (memory injection at every fresh
  session, `/clear`, and auto-compaction)
- Registers the `continuum` skill (with deep `references/` for recall /
  remember / link workflows)
- Runs `bun install` in the plugin cache
- Symlinks the `continuum` CLI into `~/.bun/bin` (or `~/.local/bin`),
  so you can run `continuum add`, `continuum search`, etc. from any
  terminal — no manual `bun link` step

**Requirement:** [`bun`](https://bun.sh) must be on your PATH. If it
isn't, the Setup hook prints exactly how to fix it.

After install, in a fresh terminal:

```sh
continuum init        # scaffold ~/.continuum/
continuum --help
```

For local development (no GitHub round-trip):

```
/plugin marketplace add /absolute/path/to/continuum
/plugin install continuum@continuum
```

The CLI symlink points at the plugin's `src/bin.ts` directly — every
edit to source is picked up immediately, no rebuild step.

---

## Quickstart

```sh
continuum init                                            # scaffold ~/.continuum/
continuum add "We use bun:sqlite, not better-sqlite3" \
  --body "Built-in, no native build step, FTS5+trigram out of box." \
  --tags decision,stack
continuum search "sqlite"                                  # BM25 + fuzzy
continuum show 1                                            # full body + linked siblings
continuum preview                                           # see exact session-start injection
```

## CLI surface

```
continuum init
continuum add "<title>" [--body "..."|--stdin] [--tags a,b] [--pin] [--link <id>]
continuum show <id> [--json] [--no-links]
continuum search "<q>" [--tag X] [--project Y] [--limit N] [--json]
continuum list [--limit N] [--tag X] [--project Y] [--pinned] [--json]
continuum link <src> <dst> --kind related|follows|contradicts|refines
continuum unlink <src> <dst> [--kind <k>]
continuum tag add|rm <id> <name>
continuum pin|unpin <id>
continuum rm <id>
continuum soul [print|edit]
continuum memory [print|edit]
continuum config get|set <key> [<value>]
continuum preview                            # what gets injected at SessionStart
```

## How search works

Three signals merged, no embeddings:

| Layer | Mechanism | Weight |
|---|---|---|
| FTS5 BM25 | `bm25(flashbacks_fts)` over title+body, porter stemming | × 1.0 |
| FTS5 trigram | substring match on title | × 0.5 |
| Sørensen-Dice fuzzy | per-word JS bigram overlap, falls back when lexical is thin | × 0.5 |
| Recency | `exp(-age_days/30) × 0.2` | additive |
| Pinned | `+0.5` | additive |

So `continuum search "dashbord"` still finds *Dashboard log pane resets on refresh*; `continuum search "auth bug"` ranks an actual bug write-up above tangentially-related notes.

## Storage

Everything lives at `~/.continuum/`:

```
~/.continuum/
├── SOUL.md         # hand-edited (or by the agent at user request)
├── MEMORY.md       # hand-edited (preferences, decisions, notes)
├── continuum.db    # SQLite (flashbacks + tags + links + FTS5)
└── config.json     # { injectLimit: 30, ... }
```

Personal use, local FS only. Nothing leaves your machine unless you
push the database somewhere yourself.

## Configuration

```sh
continuum config get                       # all settings
continuum config set injectLimit 50         # default 30
```

## Philosophy

Continuum is intentionally **minimal**.

- **No embeddings** — BM25 + trigram + dice is enough for personal
  scale (hundreds to thousands of flashbacks). One less moving part.
- **No LLM compression** — the agent decides what's worth saving. We
  don't summarize automatically.
- **No MCP server** — a CLI + a SessionStart hook is the whole surface.
- **No multi-user** — this is your assistant's brain. Personal use.
- **No automatic flashback writes from hooks** — the agent calls
  `continuum add` deliberately, so you stay in control of what gets
  remembered.

The whole thing is ~1.5 kloc of TypeScript and one SQLite database.

## License

MIT.
