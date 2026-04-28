import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addFlashback, closeDb, getDb } from "../src/db.ts";
import { search } from "../src/search.ts";

function freshHome(): void {
  const dir = mkdtempSync(join(tmpdir(), "selfmind-search-"));
  process.env.SELFMIND_HOME = dir;
  closeDb();
}

afterEach(() => {
  closeDb();
  if (process.env.SELFMIND_HOME?.startsWith(tmpdir())) {
    rmSync(process.env.SELFMIND_HOME, { recursive: true, force: true });
  }
});

describe("search", () => {
  test("FTS5 lexical match", () => {
    freshHome();
    const db = getDb();
    addFlashback(db, { title: "We use bun:sqlite", body: "no native build" });
    addFlashback(db, { title: "Unrelated note", body: "" });
    const r = search(db, "sqlite");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]?.title).toContain("sqlite");
  });

  test("fuzzy fallback: typo matches title", () => {
    freshHome();
    const db = getDb();
    addFlashback(db, { title: "Dashboard log pane resets on refresh" });
    addFlashback(db, { title: "Auth flow rewrite" });
    const r = search(db, "dashbord");
    expect(r[0]?.title).toContain("Dashboard");
  });

  test("tag filter narrows results", () => {
    freshHome();
    const db = getDb();
    addFlashback(db, { title: "cache hit ratio", tags: ["perf"] });
    addFlashback(db, { title: "cache invalidation", tags: ["bug"] });
    const r = search(db, "cache", { tag: "perf" });
    expect(r).toHaveLength(1);
    expect(r[0]?.tags).toContain("perf");
  });

  test("pinned items get a score boost", () => {
    freshHome();
    const db = getDb();
    const a = addFlashback(db, { title: "auth bug found", body: "" });
    addFlashback(db, { title: "auth bug fixed", body: "", pinned: true });
    const r = search(db, "auth bug");
    expect(r[0]?.pinned).toBe(true);
    expect(a.id).toBeGreaterThan(0);
  });

  test("empty query returns nothing", () => {
    freshHome();
    const db = getDb();
    addFlashback(db, { title: "anything" });
    const r = search(db, "");
    expect(r).toEqual([]);
  });
});
