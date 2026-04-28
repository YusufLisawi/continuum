import { addLink, getDb, removeLink } from "../db.ts";
import type { LinkKind } from "../types.ts";

const VALID_KINDS: LinkKind[] = ["related", "follows", "contradicts", "refines"];

interface LinkOpts {
  kind?: string;
}

function parseKind(k: string | undefined): LinkKind {
  if (!k) return "related";
  if ((VALID_KINDS as string[]).includes(k)) return k as LinkKind;
  throw new Error(`invalid kind: ${k} (use one of ${VALID_KINDS.join(", ")})`);
}

export function linkCmd(srcArg: string, dstArg: string, opts: LinkOpts): void {
  const src = Number(srcArg);
  const dst = Number(dstArg);
  const kind = parseKind(opts.kind);
  const db = getDb();
  addLink(db, src, dst, kind);
  console.log(`#${src} -[${kind}]-> #${dst}`);
}

export function unlinkCmd(srcArg: string, dstArg: string, opts: LinkOpts): void {
  const src = Number(srcArg);
  const dst = Number(dstArg);
  const kind = opts.kind ? parseKind(opts.kind) : undefined;
  const db = getDb();
  const n = removeLink(db, src, dst, kind);
  console.log(`removed ${n} link(s)`);
}
