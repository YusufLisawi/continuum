import { getDb } from "../db.ts";
import { renderSessionContext } from "../render.ts";

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: "SessionStart";
    additionalContext: string;
  };
  continue: true;
  suppressOutput: true;
}

async function readAllStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function hookSessionStartCmd(): Promise<void> {
  // Drain stdin to honor the hook contract; we don't use the input today.
  await readAllStdin();
  let context = "";
  try {
    const db = getDb();
    context = renderSessionContext(db);
  } catch (err) {
    context = `# Selfmind\n\n_failed to render context: ${(err as Error).message}_`;
  }
  const out: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: context,
    },
    continue: true,
    suppressOutput: true,
  };
  process.stdout.write(JSON.stringify(out));
}
