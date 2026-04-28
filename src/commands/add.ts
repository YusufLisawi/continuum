import { addFlashback, addLink, getDb } from "../db.ts";
import { currentProject } from "../paths.ts";
import type { LinkKind } from "../types.ts";

interface AddOpts {
  body?: string;
  stdin?: boolean;
  tags?: string;
  pin?: boolean;
  link?: string;
  project?: string;
  json?: boolean;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function addCmd(title: string, opts: AddOpts): Promise<void> {
  const db = getDb();
  let body = opts.body ?? "";
  if (opts.stdin) body = (await readStdin()).trim();

  const tags = opts.tags
    ? opts.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const fb = addFlashback(db, {
    title,
    body,
    project: opts.project ?? currentProject(),
    pinned: !!opts.pin,
    tags,
  });

  if (opts.link) {
    const linkIds = opts.link.split(",").map((s) => Number(s.trim())).filter(Boolean);
    for (const id of linkIds) addLink(db, fb.id, id, "related" as LinkKind);
  }

  if (opts.json) console.log(JSON.stringify(fb));
  else console.log(`#${fb.id} ${fb.title}`);
}
