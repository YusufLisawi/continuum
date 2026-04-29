import { getDb } from "../db.ts";
import { renderSessionContext } from "../render.ts";

interface PreviewOpts {
  json?: boolean;
}

export function previewCmd(opts: PreviewOpts): void {
  const db = getDb();
  const ctx = renderSessionContext(db);
  if (opts.json) {
    const out = {
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: ctx,
      },
      continue: true,
      suppressOutput: true,
    };
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  console.log(ctx);
}
