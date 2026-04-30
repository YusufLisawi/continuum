import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface HookOut {
  continue: boolean;
  suppressOutput: boolean;
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext: string;
  };
}

async function runStopHook(
  transcriptPath: string | null,
  extra: Record<string, unknown> = {},
  homeOverride?: string,
): Promise<HookOut> {
  const home = homeOverride ?? mkdtempSync(join(tmpdir(), "selfmind-stop-"));
  const proc = Bun.spawn(["bun", "src/bin.ts", "hook", "stop"], {
    env: { ...process.env, SELFMIND_HOME: home },
    stdin: "pipe",
    stdout: "pipe",
    cwd: import.meta.dir.replace(/\/test$/, ""),
  });
  const payload: Record<string, unknown> = { ...extra };
  if (transcriptPath) payload.transcript_path = transcriptPath;
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const text = await new Response(proc.stdout).text();
  if (!homeOverride) rmSync(home, { recursive: true, force: true });
  return JSON.parse(text) as HookOut;
}

const tempFiles: string[] = [];
function fixture(lines: string[]): string {
  const p = join(tmpdir(), `sm-tx-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  writeFileSync(p, lines.join("\n"), "utf8");
  tempFiles.push(p);
  return p;
}

afterEach(() => {
  for (const p of tempFiles) {
    try {
      rmSync(p, { force: true });
    } catch {}
  }
  tempFiles.length = 0;
});

describe("hook stop", () => {
  test("emits context status from latest assistant turn", async () => {
    const tx = fixture([
      JSON.stringify({ type: "user", message: { content: "hi" } }),
      JSON.stringify({
        type: "assistant",
        message: {
          model: "claude-opus-4-7",
          usage: {
            input_tokens: 2400,
            cache_read_input_tokens: 42000,
            cache_creation_input_tokens: 1200,
            output_tokens: 340,
          },
        },
      }),
    ]);
    const out = await runStopHook(tx);
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput?.hookEventName).toBe("Stop");
    const ctx = out.hookSpecificOutput?.additionalContext ?? "";
    expect(ctx).toContain("45,600");
    expect(ctx).toContain("200,000");
    expect(ctx).toContain("23%");
    expect(ctx).toContain("claude-opus-4-7");
  });

  test("appends compaction nudge above 75%", async () => {
    const tx = fixture([
      JSON.stringify({
        type: "assistant",
        message: {
          model: "claude-opus-4-7",
          usage: {
            input_tokens: 140000,
            cache_read_input_tokens: 18000,
            cache_creation_input_tokens: 2000,
            output_tokens: 500,
          },
        },
      }),
    ]);
    const out = await runStopHook(tx);
    expect(out.hookSpecificOutput?.additionalContext).toContain("/compact");
    expect(out.hookSpecificOutput?.additionalContext).toContain("80%");
  });

  test("no transcript path → empty pass-through", async () => {
    const out = await runStopHook(null);
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput).toBeUndefined();
  });

  test("stop_hook_active suppresses to avoid loops", async () => {
    const tx = fixture([
      JSON.stringify({
        type: "assistant",
        message: { usage: { input_tokens: 100000 } },
      }),
    ]);
    const out = await runStopHook(tx, { stop_hook_active: true });
    expect(out.hookSpecificOutput).toBeUndefined();
  });
});
