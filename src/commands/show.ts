import { getDb, getFlashback, linksFor } from "../db.ts";

interface ShowOpts {
  json?: boolean;
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

  if (opts.json) {
    console.log(JSON.stringify({ ...fb, links }));
    return;
  }

  const date = new Date(fb.created_at).toISOString();
  console.log(`#${fb.id}  ${fb.title}`);
  console.log(`created: ${date}${fb.pinned ? "  •  pinned" : ""}`);
  if (fb.project) console.log(`project: ${fb.project}`);
  if (fb.tags.length) console.log(`tags: ${fb.tags.join(", ")}`);
  if (links.length) {
    const out = links.map((l) =>
      l.src_id === id ? `→ #${l.dst_id} (${l.kind})` : `← #${l.src_id} (${l.kind})`,
    );
    console.log(`links: ${out.join(", ")}`);
  }
  if (fb.body) {
    console.log("");
    console.log(fb.body);
  }
}
