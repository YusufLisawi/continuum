import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addFlashback, closeDb, getDb } from "../src/db.ts";
import { renderSessionContext } from "../src/render.ts";

afterEach(() => {
  closeDb();
  if (process.env.CONTINUUM_HOME?.startsWith(tmpdir())) {
    rmSync(process.env.CONTINUUM_HOME, { recursive: true, force: true });
  }
});

describe("session context render", () => {
  test("includes SOUL, MEMORY, and recent titles", () => {
    process.env.CONTINUUM_HOME = mkdtempSync(join(tmpdir(), "continuum-render-"));
    closeDb();
    const db = getDb();
    addFlashback(db, { title: "First note", tags: ["t1"] });
    addFlashback(db, { title: "Second note" });
    const ctx = renderSessionContext(db);
    expect(ctx).toContain("# Continuum");
    expect(ctx).toContain("## SOUL");
    expect(ctx).toContain("## MEMORY");
    expect(ctx).toContain("## Recent flashbacks");
    expect(ctx).toContain("First note");
    expect(ctx).toContain("Second note");
  });

  test("empty DB still renders valid context", () => {
    process.env.CONTINUUM_HOME = mkdtempSync(join(tmpdir(), "continuum-empty-"));
    closeDb();
    const db = getDb();
    const ctx = renderSessionContext(db);
    expect(ctx).toContain("## SOUL");
    expect(ctx).toContain("no flashbacks yet");
  });
});

describe("hook stdout contract", () => {
  test("emits hookSpecificOutput JSON", async () => {
    const home = mkdtempSync(join(tmpdir(), "continuum-hook-"));
    const proc = Bun.spawn(["bun", "src/bin.ts", "hook", "session-start"], {
      env: { ...process.env, CONTINUUM_HOME: home },
      stdin: "pipe",
      stdout: "pipe",
      cwd: import.meta.dir.replace(/\/test$/, ""),
    });
    proc.stdin.write('{"session_id":"x","cwd":"/tmp"}');
    await proc.stdin.end();
    const out = await new Response(proc.stdout).text();
    const json = JSON.parse(out);
    expect(json.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(typeof json.hookSpecificOutput.additionalContext).toBe("string");
    expect(json.continue).toBe(true);
    rmSync(home, { recursive: true, force: true });
  });
});
