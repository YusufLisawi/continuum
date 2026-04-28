import { getDb } from "../db.ts";
import { search } from "../search.ts";

interface SearchOpts {
  tag?: string;
  project?: string;
  limit?: string;
  json?: boolean;
}

export function searchCmd(query: string, opts: SearchOpts): void {
  const db = getDb();
  const limit = opts.limit ? Number(opts.limit) : 10;
  const results = search(db, query, {
    tag: opts.tag,
    project: opts.project,
    limit,
  });

  if (opts.json) {
    console.log(JSON.stringify(results));
    return;
  }

  if (results.length === 0) {
    console.log("(no matches)");
    return;
  }

  for (const r of results) {
    const tagPart = r.tags.length ? `  [${r.tags.join(", ")}]` : "";
    const pin = r.pinned ? "★ " : "  ";
    console.log(`${pin}#${r.id}  ${r.title}${tagPart}`);
    if (r.snippet && r.snippet !== r.title) console.log(`     ${r.snippet}`);
  }
}
