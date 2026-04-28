# selfmind

Minimal persistent memory for Claude Code.

Two markdown files and a graph of flashbacks. No embeddings, no LLM step, no
MCP server, no workers.

- **SOUL.md** — the agent's identity and consciousness, hand-curated.
- **MEMORY.md** — auto-regenerated index of pinned items + recent flashback titles.
- **Flashbacks** — DB-backed memory entries with title, body, tags, and links
  to other flashbacks.

A SessionStart hook injects SOUL → MEMORY → last N flashback titles into the
agent's context. The agent expands and searches the rest agentically via the
`selfmind` CLI.

## Install

```sh
bun install
bun run build
bun link
```

## Quickstart

```sh
selfmind init
selfmind add "We use bun:sqlite, not better-sqlite3" --tags decision,stack
selfmind search "sqlite"
selfmind show 1
```

## Plugin

Symlink this repo into `~/.claude/plugins/` (or use `claude plugin install`)
to enable the SessionStart hook and skills.

## Storage

Everything lives at `~/.selfmind/`:

```
~/.selfmind/
├── SOUL.md       # hand-edited
├── MEMORY.md     # auto-regenerated
├── selfmind.db   # SQLite (FTS5 + trigram)
└── config.json
```
