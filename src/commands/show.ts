import { getDb, getFlashback, linksFor } from "../db.ts";
import type { Flashback, Link } from "../types.ts";

interface ShowOpts {
  json?: boolean;
  noLinks?: boolean;
}

interface NeighborView {
  id: number;
  title: string;
  kind: string;
  direction: "out" | "in";
  tags: string[];
}

function gatherNeighbors(
  db: ReturnType<typeof getDb>,
  id: number,
  links: Link[],
): NeighborView[] {
  const seen = new Set<number>();
  const out: NeighborView[] = [];
  for (const l of links) {
    const otherId = l.src_id === id ? l.dst_id : l.src_id;
    if (seen.has(otherId)) continue;
    seen.add(otherId);
    const fb = getFlashback(db, otherId);
    if (!fb) continue;
    out.push({
      id: fb.id,
      title: fb.title,
      kind: l.kind,
      direction: l.src_id === id ? "out" : "in",
      tags: fb.tags,
    });
  }
  return out;
}

export function showCmd(idArg: string, opts: ShowOpts): void {
  const id = Number(idArg);
  if (!Number.isFinite(id)) {
    console.error(`invalid id: ${idArg}`);
    process.exit(2);
  }
  const db = getDb();
  const fb = getFlashback(db, id);
  if (!fb) {
    console.error(`no flashback #${id}`);
    process.exit(1);
  }
  const links = linksFor(db, id);
  const neighbors: NeighborView[] = opts.noLinks ? [] : gatherNeighbors(db, id, links);

  if (opts.json) {
    console.log(JSON.stringify({ ...fb, links, neighbors }));
    return;
  }

  const date = new Date(fb.created_at).toISOString();
  console.log(`#${fb.id}  ${fb.title}`);
  console.log(`created: ${date}${fb.pinned ? "  •  pinned" : ""}`);
  if (fb.project) console.log(`project: ${fb.project}`);
  if (fb.tags.length) console.log(`tags: ${fb.tags.join(", ")}`);
  if (fb.body) {
    console.log("");
    console.log(fb.body);
  }
  if (neighbors.length) {
    console.log("");
    console.log("--- linked flashbacks ---");
    for (const n of neighbors) {
      const arrow = n.direction === "out" ? "→" : "←";
      const tagPart = n.tags.length ? `  [${n.tags.join(", ")}]` : "";
      console.log(`  ${arrow} #${n.id} (${n.kind})  ${n.title}${tagPart}`);
    }
    console.log(
      `  (use \`continuum show <id>\` to expand any of these — full graph context)`,
    );
  }
  // Suppress unused-var warning when --no-links elides neighbors.
  void (fb as Flashback);
}
