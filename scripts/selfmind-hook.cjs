#!/usr/bin/env node
// Thin wrapper. Tries `selfmind` on PATH first, then falls back to running
// the source via bun out of this repo (useful during development).
"use strict";
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

function pickRunner() {
  // 1. Globally-installed `selfmind` binary (after `bun link`).
  const PATH = (process.env.PATH || "").split(path.delimiter);
  for (const dir of PATH) {
    const p = path.join(dir, "selfmind");
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return { cmd: p, args: [] };
      }
    } catch {}
  }
  // 2. Bun + the bundled source, found relative to this script.
  const repoBin = path.resolve(__dirname, "..", "src", "bin.ts");
  if (fs.existsSync(repoBin)) {
    return { cmd: "bun", args: [repoBin] };
  }
  // 3. Built dist.
  const distBin = path.resolve(__dirname, "..", "dist", "bin.js");
  if (fs.existsSync(distBin)) {
    return { cmd: process.execPath, args: [distBin] };
  }
  return null;
}

function emitEmpty() {
  const empty = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: "",
    },
    continue: true,
    suppressOutput: true,
  };
  process.stdout.write(JSON.stringify(empty));
}

function main() {
  const sub = process.argv.slice(2);
  if (sub.length === 0) sub.push("hook", "session-start");
  else if (sub[0] === "session-start") sub.unshift("hook");

  const runner = pickRunner();
  if (!runner) {
    emitEmpty();
    return;
  }

  const child = spawn(runner.cmd, [...runner.args, ...sub], {
    stdio: ["inherit", "inherit", "inherit"],
  });
  child.on("error", () => emitEmpty());
  child.on("exit", (code) => process.exit(code ?? 0));
}

main();
