import type { Database } from "bun:sqlite";
import { hasTrigram, tagsFor } from "./db.ts";
import type { SearchOptions, SearchResult } from "./types.ts";

function bigrams(s: string): Set<string> {
  const t = s.toLowerCase();
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}

function diceCoeff(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

function fuzzyTitleScore(query: string, title: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const whole = diceCoeff(q, title);
  let best = whole;
  for (const word of title.toLowerCase().split(/\s+/)) {
    if (word.length < 3) continue;
    const s = diceCoeff(q, word);
    if (s > best) best = s;
  }
  return best;
}

interface Hit {
  id: number;
  rank: number;
  snippet: string;
}

const FTS_SAFE = /^[A-Za-z0-9]+$/;

function ftsQuery(q: string): string {
  // Each whitespace-separated term becomes a quoted prefix term.
  // Strip FTS5 special chars so user input is never a syntax error.
  const tokens = q
    .split(/\s+/)
    .map((t) => t.replace(/["'`*:()]/g, "").trim())
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens
    .map((t) => (FTS_SAFE.test(t) ? `${t}*` : `"${t}"`))
    .join(" ");
}

function ftsHits(db: Database, q: string, limit: number): Hit[] {
  const query = ftsQuery(q);
  if (!query) return [];
  try {
    return db
      .query<Hit, [string, number]>(
        `SELECT f.id AS id,
                bm25(flashbacks_fts) AS rank,
                snippet(flashbacks_fts, -1, '«', '»', '…', 12) AS snippet
         FROM flashbacks_fts
         JOIN flashbacks f ON f.id = flashbacks_fts.rowid
         WHERE flashbacks_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
      )
      .all(query, limit);
  } catch {
    return [];
  }
}

function trigramHits(db: Database, q: string, limit: number): Hit[] {
  if (!hasTrigram(db)) return [];
  const term = q.replace(/["'`*:()]/g, "").trim();
  if (term.length < 3) return [];
  try {
    return db
      .query<Hit, [string, number]>(
        `SELECT f.id AS id,
                bm25(flashbacks_trigram) AS rank,
                f.title AS snippet
         FROM flashbacks_trigram
         JOIN flashbacks f ON f.id = flashbacks_trigram.rowid
         WHERE flashbacks_trigram MATCH ?
         ORDER BY rank
         LIMIT ?`,
      )
      .all(`"${term}"`, limit);
  } catch {
    return [];
  }
}

interface MetaRow {
  id: number;
  title: string;
  project: string | null;
  pinned: number;
  created_at: number;
}

export function search(
  db: Database,
  query: string,
  opts: SearchOptions = {},
): SearchResult[] {
  const limit = opts.limit ?? 10;
  const pool = Math.max(limit * 4, 40);

  const fts = ftsHits(db, query, pool);
  const tg = trigramHits(db, query, pool);

  const scores = new Map<number, { score: number; snippet: string }>();
  for (const h of fts) {
    const s = -h.rank * 1.0;
    scores.set(h.id, { score: s, snippet: h.snippet });
  }
  for (const h of tg) {
    const s = -h.rank * 0.5;
    const cur = scores.get(h.id);
    if (cur) cur.score += s;
    else scores.set(h.id, { score: s, snippet: h.snippet });
  }

  // Fuzzy fallback: if lexical hits are thin, score recent titles by Sorensen-Dice.
  if (scores.size < limit) {
    const tail = db
      .query<MetaRow, []>(
        `SELECT id, title, project, pinned, created_at
         FROM flashbacks ORDER BY created_at DESC LIMIT 500`,
      )
      .all();
    for (const r of tail) {
      const sim = fuzzyTitleScore(query, r.title);
      if (sim < 0.4) continue;
      const cur = scores.get(r.id);
      const fuzzScore = sim * 2.0;
      if (cur) cur.score += fuzzScore * 0.5;
      else scores.set(r.id, { score: fuzzScore, snippet: r.title });
    }
  }

  if (scores.size === 0) return [];

  const ids = [...scores.keys()];
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .query<MetaRow, number[]>(
      `SELECT id, title, project, pinned, created_at
       FROM flashbacks WHERE id IN (${placeholders})`,
    )
    .all(...ids);

  let filtered = rows;
  if (opts.project) filtered = filtered.filter((r) => r.project === opts.project);
  if (opts.tag) {
    const tagMap = tagsFor(db, filtered.map((r) => r.id));
    filtered = filtered.filter((r) => (tagMap.get(r.id) ?? []).includes(opts.tag!));
  }

  const tagMap = tagsFor(db, filtered.map((r) => r.id));
  const now = Date.now();

  const results: SearchResult[] = filtered.map((r) => {
    const meta = scores.get(r.id)!;
    const ageDays = (now - r.created_at) / (1000 * 60 * 60 * 24);
    const recency = Math.exp(-ageDays / 30) * 0.2;
    const pinBoost = r.pinned ? 0.5 : 0;
    return {
      id: r.id,
      title: r.title,
      snippet: meta.snippet,
      score: meta.score + recency + pinBoost,
      tags: tagMap.get(r.id) ?? [],
      project: r.project,
      created_at: r.created_at,
      pinned: !!r.pinned,
    };
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
