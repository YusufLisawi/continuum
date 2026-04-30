import { countFlashbacks, getDb, listFlashbacks } from "../db.ts";
import { readConfig } from "../paths.ts";
import { renderSessionContext } from "../render.ts";
import type { Flashback } from "../types.ts";

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: "SessionStart";
    additionalContext: string;
  };
  continue: true;
  suppressOutput: true;
  systemMessage?: string;
}

async function readAllStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const MAX_VISIBLE_TITLES = 20;

function formatVisibleLine(f: Flashback, pinned: boolean): string {
  const tagPart = f.tags.length ? ` [${f.tags.join(", ")}]` : "";
  const marker = pinned ? "★" : "·";
  return `  ${marker} #${f.id} ${f.title}${tagPart}`;
}

function buildVisibleSummary(
  pinned: Flashback[],
  recent: Flashback[],
  total: number,
): string {
  if (total === 0) {
    return "continuum: no flashbacks yet — `continuum add \"<title>\" --tags ...` to start";
  }

  const lines: string[] = [];
  lines.push(
    `continuum: ${total} total flashback${total === 1 ? "" : "s"} (${pinned.length} pinned, ${recent.length} recent)`,
  );

  let shown = 0;
  if (pinned.length) {
    for (const f of pinned) {
      if (shown >= MAX_VISIBLE_TITLES) break;
      lines.push(formatVisibleLine(f, true));
      shown++;
    }
  }
  for (const f of recent) {
    if (shown >= MAX_VISIBLE_TITLES) break;
    lines.push(formatVisibleLine(f, false));
    shown++;
  }

  const remaining = pinned.length + recent.length - shown;
  if (remaining > 0) {
    lines.push(`  …and ${remaining} more — \`continuum preview\` for the full injection`);
  }
  return lines.join("\n");
}

export async function hookSessionStartCmd(): Promise<void> {
  await readAllStdin();
  let context = "";
  let summary = "";
  try {
    const db = getDb();
    const cfg = readConfig();
    context = renderSessionContext(db);
    const total = countFlashbacks(db);
    const pinned = listFlashbacks(db, { pinned: true, limit: 200 });
    const recent = listFlashbacks(db, {
      excludePinned: true,
      limit: cfg.injectLimit,
    });
    summary = buildVisibleSummary(pinned, recent, total);
  } catch (err) {
    context = `# Continuum\n\n_failed to render context: ${(err as Error).message}_`;
    summary = `continuum: failed to inject — ${(err as Error).message}`;
  }
  const out: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: context,
    },
    continue: true,
    suppressOutput: true,
    systemMessage: summary,
  };
  process.stdout.write(JSON.stringify(out));
}
