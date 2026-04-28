import { getDb, listFlashbacks } from "../db.ts";

interface ListOpts {
  limit?: string;
  tag?: string;
  project?: string;
  pinned?: boolean;
  json?: boolean;
}

export function listCmd(opts: ListOpts): void {
  const db = getDb();
  const limit = opts.limit ? Number(opts.limit) : 30;
  const items = listFlashbacks(db, {
    limit,
    tag: opts.tag,
    project: opts.project,
    pinned: opts.pinned,
  });

  if (opts.json) {
    console.log(JSON.stringify(items));
    return;
  }

  if (items.length === 0) {
    console.log("(empty)");
    return;
  }

  for (const f of items) {
    const tagPart = f.tags.length ? `  [${f.tags.join(", ")}]` : "";
    const pin = f.pinned ? "★ " : "  ";
    console.log(`${pin}#${f.id}  ${f.title}${tagPart}`);
  }
}
