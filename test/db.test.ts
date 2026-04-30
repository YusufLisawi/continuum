import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addFlashback,
  addLink,
  addTag,
  closeDb,
  getDb,
  getFlashback,
  linksFor,
  listFlashbacks,
  removeTag,
  setPinned,
} from "../src/db.ts";

function freshHome(): string {
  const dir = mkdtempSync(join(tmpdir(), "continuum-test-"));
  process.env.CONTINUUM_HOME = dir;
  closeDb();
  return dir;
}

afterEach(() => {
  closeDb();
  if (process.env.CONTINUUM_HOME?.startsWith(tmpdir())) {
    rmSync(process.env.CONTINUUM_HOME, { recursive: true, force: true });
  }
});

describe("db", () => {
  test("add + get flashback round-trip", () => {
    freshHome();
    const db = getDb();
    const fb = addFlashback(db, {
      title: "Hello",
      body: "world",
      tags: ["a", "b"],
    });
    expect(fb.id).toBeGreaterThan(0);
    const got = getFlashback(db, fb.id);
    expect(got?.title).toBe("Hello");
    expect(got?.body).toBe("world");
    expect(got?.tags.sort()).toEqual(["a", "b"]);
  });

  test("list orders pinned first then recent", () => {
    freshHome();
    const db = getDb();
    addFlashback(db, { title: "old" });
    const mid = addFlashback(db, { title: "mid" });
    addFlashback(db, { title: "new" });
    setPinned(db, mid.id, true);
    const items = listFlashbacks(db, { limit: 10 });
    expect(items[0]?.title).toBe("mid");
    expect(items[0]?.pinned).toBe(true);
  });

  test("tag add + remove", () => {
    freshHome();
    const db = getDb();
    const fb = addFlashback(db, { title: "tagme" });
    addTag(db, fb.id, "alpha");
    addTag(db, fb.id, "beta");
    expect(getFlashback(db, fb.id)?.tags.sort()).toEqual(["alpha", "beta"]);
    removeTag(db, fb.id, "alpha");
    expect(getFlashback(db, fb.id)?.tags).toEqual(["beta"]);
  });

  test("links: bidirectional retrieval", () => {
    freshHome();
    const db = getDb();
    const a = addFlashback(db, { title: "a" });
    const b = addFlashback(db, { title: "b" });
    addLink(db, a.id, b.id, "refines");
    const fromA = linksFor(db, a.id);
    const fromB = linksFor(db, b.id);
    expect(fromA).toHaveLength(1);
    expect(fromB).toHaveLength(1);
    expect(fromA[0]?.kind).toBe("refines");
  });

  test("filter by tag", () => {
    freshHome();
    const db = getDb();
    addFlashback(db, { title: "x", tags: ["red"] });
    addFlashback(db, { title: "y", tags: ["blue"] });
    const red = listFlashbacks(db, { tag: "red" });
    expect(red).toHaveLength(1);
    expect(red[0]?.title).toBe("x");
  });
});
