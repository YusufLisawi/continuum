import { readFileSync } from "node:fs";
import { readConfig } from "../paths.ts";

interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

interface TranscriptEntry {
  type?: string;
  message?: { usage?: Usage; model?: string };
  usage?: Usage;
  model?: string;
}

interface StopHookInput {
  transcript_path?: string;
  stop_hook_active?: boolean;
}

interface StopOutput {
  continue: true;
  suppressOutput: true;
  hookSpecificOutput?: {
    hookEventName: "Stop";
    additionalContext: string;
  };
}

const KNOWN_WINDOWS: Record<string, number> = {
  "claude-opus-4-7": 200000,
  "claude-opus-4-7[1m]": 1000000,
  "claude-sonnet-4-6": 200000,
  "claude-sonnet-4-6[1m]": 1000000,
  "claude-haiku-4-5": 200000,
};

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function findLastUsage(
  path: string,
): { tokens: number; model?: string } | null {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  const lines = raw.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (!line) continue;
    let entry: TranscriptEntry;
    try {
      entry = JSON.parse(line) as TranscriptEntry;
    } catch {
      continue;
    }
    const usage = entry.message?.usage ?? entry.usage;
    if (usage && usage.input_tokens != null) {
      const total =
        (usage.input_tokens ?? 0) +
        (usage.cache_read_input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0);
      return { tokens: total, model: entry.message?.model ?? entry.model };
    }
  }
  return null;
}

function emit(out: StopOutput): void {
  process.stdout.write(JSON.stringify(out));
}

export async function hookStopCmd(): Promise<void> {
  const baseOut: StopOutput = { continue: true, suppressOutput: true };
  const cfg = readConfig();

  if (!cfg.tokenStatusEnabled) {
    emit(baseOut);
    return;
  }

  const stdin = await readStdin();
  let payload: StopHookInput = {};
  try {
    payload = JSON.parse(stdin) as StopHookInput;
  } catch {}

  // Honor stop_hook_active to avoid feedback loops if Claude Code re-fires us.
  if (payload.stop_hook_active) {
    emit(baseOut);
    return;
  }

  const transcript = payload.transcript_path;
  if (!transcript) {
    emit(baseOut);
    return;
  }

  const usage = findLastUsage(transcript);
  if (!usage) {
    emit(baseOut);
    return;
  }

  const window =
    (usage.model && KNOWN_WINDOWS[usage.model]) || cfg.contextWindow;
  const percent = Math.round((usage.tokens / window) * 100);

  if (percent < cfg.tokenStatusThreshold) {
    emit(baseOut);
    return;
  }

  const tail = percent >= 75
    ? " — getting full, consider asking the user to /compact"
    : percent >= 50
    ? " — over halfway"
    : "";
  const modelTag = usage.model ? ` [${usage.model}]` : "";
  const message =
    `Selfmind context: ${fmt(usage.tokens)} / ${fmt(window)} tokens (${percent}%)${modelTag}${tail}`;

  emit({
    ...baseOut,
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: message,
    },
  });
}
