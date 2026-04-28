#!/usr/bin/env bun
import sade from "sade";
import { initCmd } from "./commands/init.ts";
import { addCmd } from "./commands/add.ts";
import { showCmd } from "./commands/show.ts";
import { searchCmd } from "./commands/search.ts";
import { listCmd } from "./commands/list.ts";
import { linkCmd, unlinkCmd } from "./commands/link.ts";
import { tagAddCmd, tagRmCmd } from "./commands/tag.ts";
import { pinCmd } from "./commands/pin.ts";
import { rmCmd } from "./commands/rm.ts";
import { soulEditCmd, soulPrintCmd } from "./commands/soul.ts";
import { memoryEditCmd, memoryPrintCmd } from "./commands/memory.ts";
import { configGetCmd, configSetCmd } from "./commands/config.ts";
import { hookSessionStartCmd } from "./commands/hook.ts";

const prog = sade("selfmind");

prog.version("0.1.0").describe("Minimal persistent memory for Claude Code.");

prog.command("init").describe("Scaffold ~/.selfmind/.").action(initCmd);

prog
  .command("add <title>")
  .describe("Add a new flashback.")
  .option("--body", "Inline body text")
  .option("--stdin", "Read body from stdin")
  .option("--tags", "Comma-separated tags")
  .option("--pin", "Pin this flashback")
  .option("--link", "Comma-separated flashback ids to link as 'related'")
  .option("--project", "Override project tag (defaults to cwd basename)")
  .option("--json", "Output JSON")
  .action(addCmd);

prog
  .command("show <id>")
  .describe("Show a flashback by id.")
  .option("--json", "Output JSON")
  .action(showCmd);

prog
  .command("search <query>")
  .describe("Search flashbacks (FTS5 + trigram fuzzy).")
  .option("--tag", "Filter by tag")
  .option("--project", "Filter by project")
  .option("--limit", "Max results", 10)
  .option("--json", "Output JSON")
  .action(searchCmd);

prog
  .command("list")
  .describe("List flashbacks (newest first; pinned first).")
  .option("--limit", "Max results", 30)
  .option("--tag", "Filter by tag")
  .option("--project", "Filter by project")
  .option("--pinned", "Pinned only")
  .option("--json", "Output JSON")
  .action(listCmd);

prog
  .command("link <src> <dst>")
  .describe("Link two flashbacks.")
  .option("--kind", "related | follows | contradicts | refines", "related")
  .action(linkCmd);

prog
  .command("unlink <src> <dst>")
  .describe("Remove a link.")
  .option("--kind", "Limit to a single kind")
  .action(unlinkCmd);

prog.command("tag add <id> <name>").describe("Add a tag.").action(tagAddCmd);
prog.command("tag rm <id> <name>").describe("Remove a tag.").action(tagRmCmd);

prog
  .command("pin <id>")
  .describe("Pin a flashback.")
  .action((id: string) => pinCmd(id, true));
prog
  .command("unpin <id>")
  .describe("Unpin a flashback.")
  .action((id: string) => pinCmd(id, false));

prog.command("rm <id>").describe("Delete a flashback.").action(rmCmd);

prog.command("soul").describe("Print SOUL.md.").action(soulPrintCmd);
prog.command("soul edit").describe("Edit SOUL.md in $EDITOR.").action(soulEditCmd);
prog.command("soul print").describe("Print SOUL.md.").action(soulPrintCmd);

prog.command("memory").describe("Print MEMORY.md.").action(memoryPrintCmd);
prog.command("memory print").describe("Print MEMORY.md.").action(memoryPrintCmd);
prog.command("memory edit").describe("Edit MEMORY.md in $EDITOR.").action(memoryEditCmd);

prog.command("config get [key]").describe("Read config.").action(configGetCmd);
prog.command("config set <key> <value>").describe("Write config.").action(configSetCmd);

prog
  .command("hook session-start", "", { default: false })
  .describe("Internal: emit SessionStart context JSON for Claude Code.")
  .action(() => {
    void hookSessionStartCmd();
  });

prog.parse(process.argv);
