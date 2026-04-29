import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { dbPath, ensureHome } from "./paths.ts";
import type { Flashback, FlashbackInput, Link, LinkKind } from "./types.ts";

let _db: Database | null = null;

export function getDb(path?: string): Database {
  if (_db) return _db;
  ensureHome();
  const p = path ?? dbPath();
  const fresh = !existsSync(p);
  const db = new Database(p);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  if (fresh) migrate(db);
  else ensureSchema(db);
  _db = db;
  return db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS flashbacks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  project     TEXT,
  pinned      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_flashbacks_created ON flashbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashbacks_project ON flashbacks(project, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashbacks_pinned  ON flashbacks(pinned, created_at DESC);

CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS flashback_tags (
  flashback_id INTEGER NOT NULL REFERENCES flashbacks(id) ON DELETE CASCADE,
  tag_id       INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (flashback_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_ft_tag ON flashback_tags(tag_id);

CREATE TABLE IF NOT EXISTS links (
  src_id     INTEGER NOT NULL REFERENCES flashbacks(id) ON DELETE CASCADE,
  dst_id     INTEGER NOT NULL REFERENCES flashbacks(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'related',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (src_id, dst_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_links_src ON links(src_id);
CREATE INDEX IF NOT EXISTS idx_links_dst ON links(dst_id);

CREATE VIRTUAL TABLE IF NOT EXISTS flashbacks_fts USING fts5(
  title, body,
  content='flashbacks', content_rowid='id',
  tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS flashbacks_ai AFTER INSERT ON flashbacks BEGIN
  INSERT INTO flashbacks_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
END;
CREATE TRIGGER IF NOT EXISTS flashbacks_ad AFTER DELETE ON flashbacks BEGIN
  INSERT INTO flashbacks_fts(flashbacks_fts, rowid, title, body) VALUES('delete', old.id, old.title, old.body);
END;
CREATE TRIGGER IF NOT EXISTS flashbacks_au AFTER UPDATE ON flashbacks BEGIN
  INSERT INTO flashbacks_fts(flashbacks_fts, rowid, title, body) VALUES('delete', old.id, old.title, old.body);
  INSERT INTO flashbacks_fts(rowid, title, body) VALUES (new.id, new.title, new.body);
END;
`;

const TRIGRAM = `
CREATE VIRTUAL TABLE IF NOT EXISTS flashbacks_trigram USING fts5(
  title,
  content='flashbacks', content_rowid='id',
  tokenize='trigram'
);

CREATE TRIGGER IF NOT EXISTS flashbacks_tg_ai AFTER INSERT ON flashbacks BEGIN
  INSERT INTO flashbacks_trigram(rowid, title) VALUES (new.id, new.title);
END;
CREATE TRIGGER IF NOT EXISTS flashbacks_tg_ad AFTER DELETE ON flashbacks BEGIN
  INSERT INTO flashbacks_trigram(flashbacks_trigram, rowid, title) VALUES('delete', old.id, old.title);
END;
CREATE TRIGGER IF NOT EXISTS flashbacks_tg_au AFTER UPDATE ON flashbacks BEGIN
  INSERT INTO flashbacks_trigram(flashbacks_trigram, rowid, title) VALUES('delete', old.id, old.title);
  INSERT INTO flashbacks_trigram(rowid, title) VALUES (new.id, new.title);
END;
`;

function migrate(db: Database): void {
  db.exec(SCHEMA);
  tryEnableTrigram(db);
}

function ensureSchema(db: Database): void {
  db.exec(SCHEMA);
  tryEnableTrigram(db);
}

export function hasTrigram(db: Database): boolean {
  const row = db
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='flashbacks_trigram'",
    )
    .get();
  return !!row;
}

function tryEnableTrigram(db: Database): void {
  try {
    db.exec(TRIGRAM);
  } catch {
    // Older SQLite without trigram tokenizer — fall back to FTS5 porter only.
  }
}

interface FlashbackRow {
  id: number;
  title: string;
  body: string;
  project: string | null;
  pinned: number;
  created_at: number;
  updated_at: number;
}

function rowToFlashback(row: FlashbackRow, tags: string[]): Flashback {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    project: row.project,
    pinned: !!row.pinned,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags,
  };
}

export function tagsFor(db: Database, ids: number[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .query<{ flashback_id: number; name: string }, number[]>(
      `SELECT ft.flashback_id, t.name
       FROM flashback_tags ft
       JOIN tags t ON t.id = ft.tag_id
       WHERE ft.flashback_id IN (${placeholders})
       ORDER BY t.name`,
    )
    .all(...ids);
  for (const r of rows) {
    const arr = map.get(r.flashback_id) ?? [];
    arr.push(r.name);
    map.set(r.flashback_id, arr);
  }
  return map;
}

export function addFlashback(db: Database, input: FlashbackInput): Flashback {
  const now = Date.now();
  const result = db.run(
    `INSERT INTO flashbacks (title, body, project, pinned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      input.body ?? "",
      input.project ?? null,
      input.pinned ? 1 : 0,
      now,
      now,
    ],
  );
  const id = Number(result.lastInsertRowid);
  if (input.tags?.length) setTags(db, id, input.tags);
  const fb = getFlashback(db, id);
  if (!fb) throw new Error(`failed to read back flashback ${id}`);
  return fb;
}

export function getFlashback(db: Database, id: number): Flashback | null {
  const row = db
    .query<FlashbackRow, number>(`SELECT * FROM flashbacks WHERE id = ?`)
    .get(id);
  if (!row) return null;
  const tags = tagsFor(db, [id]).get(id) ?? [];
  return rowToFlashback(row, tags);
}

export function listFlashbacks(
  db: Database,
  opts: {
    limit?: number;
    project?: string;
    tag?: string;
    pinned?: boolean;
    excludePinned?: boolean;
  } = {},
): Flashback[] {
  const limit = opts.limit ?? 30;
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.project) {
    where.push("f.project = ?");
    params.push(opts.project);
  }
  if (opts.pinned) where.push("f.pinned = 1");
  else if (opts.excludePinned) where.push("f.pinned = 0");
  let join = "";
  if (opts.tag) {
    join = "JOIN flashback_tags ft ON ft.flashback_id = f.id JOIN tags t ON t.id = ft.tag_id";
    where.push("t.name = ?");
    params.push(opts.tag);
  }
  const sql = `
    SELECT f.* FROM flashbacks f
    ${join}
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY f.pinned DESC, f.created_at DESC
    LIMIT ?
  `;
  params.push(limit);
  const rows = db.query<FlashbackRow, (string | number)[]>(sql).all(...params);
  const tagMap = tagsFor(db, rows.map((r) => r.id));
  return rows.map((r) => rowToFlashback(r, tagMap.get(r.id) ?? []));
}

export function deleteFlashback(db: Database, id: number): boolean {
  const r = db.run(`DELETE FROM flashbacks WHERE id = ?`, [id]);
  return r.changes > 0;
}

export function setPinned(db: Database, id: number, pinned: boolean): boolean {
  const r = db.run(
    `UPDATE flashbacks SET pinned = ?, updated_at = ? WHERE id = ?`,
    [pinned ? 1 : 0, Date.now(), id],
  );
  return r.changes > 0;
}

function upsertTag(db: Database, name: string): number {
  db.run(`INSERT OR IGNORE INTO tags (name) VALUES (?)`, [name]);
  const row = db
    .query<{ id: number }, string>(`SELECT id FROM tags WHERE name = ?`)
    .get(name);
  if (!row) throw new Error(`tag insert failed: ${name}`);
  return row.id;
}

export function addTag(db: Database, flashbackId: number, name: string): void {
  const tagId = upsertTag(db, name);
  db.run(
    `INSERT OR IGNORE INTO flashback_tags (flashback_id, tag_id) VALUES (?, ?)`,
    [flashbackId, tagId],
  );
}

export function removeTag(db: Database, flashbackId: number, name: string): void {
  db.run(
    `DELETE FROM flashback_tags
     WHERE flashback_id = ?
       AND tag_id = (SELECT id FROM tags WHERE name = ?)`,
    [flashbackId, name],
  );
}

export function setTags(db: Database, flashbackId: number, names: string[]): void {
  const tx = db.transaction((items: string[]) => {
    for (const name of items) addTag(db, flashbackId, name);
  });
  tx(names);
}

export function addLink(
  db: Database,
  srcId: number,
  dstId: number,
  kind: LinkKind = "related",
): void {
  db.run(
    `INSERT OR IGNORE INTO links (src_id, dst_id, kind, created_at) VALUES (?, ?, ?, ?)`,
    [srcId, dstId, kind, Date.now()],
  );
}

export function removeLink(
  db: Database,
  srcId: number,
  dstId: number,
  kind?: LinkKind,
): number {
  if (kind) {
    return db.run(
      `DELETE FROM links WHERE src_id = ? AND dst_id = ? AND kind = ?`,
      [srcId, dstId, kind],
    ).changes;
  }
  return db.run(`DELETE FROM links WHERE src_id = ? AND dst_id = ?`, [srcId, dstId])
    .changes;
}

export function linksFor(db: Database, id: number): Link[] {
  return db
    .query<Link, number[]>(
      `SELECT src_id, dst_id, kind, created_at FROM links
       WHERE src_id = ? OR dst_id = ?
       ORDER BY created_at DESC`,
    )
    .all(id, id);
}

export function countFlashbacks(db: Database): number {
  const r = db
    .query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM flashbacks`)
    .get();
  return r?.n ?? 0;
}
