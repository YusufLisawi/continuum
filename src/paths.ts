import { homedir } from "node:os";
import { join, basename } from "node:path";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_CONFIG, type Config } from "./types.ts";

export function home(): string {
  return process.env.SELFMIND_HOME || join(homedir(), ".selfmind");
}

export function dbPath(): string {
  return join(home(), "selfmind.db");
}

export function soulPath(): string {
  return join(home(), "SOUL.md");
}

export function memoryPath(): string {
  return join(home(), "MEMORY.md");
}

export function configPath(): string {
  return join(home(), "config.json");
}

export function ensureHome(): void {
  const dir = home();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function readConfig(): Config {
  ensureHome();
  const p = configPath();
  if (!existsSync(p)) return { ...DEFAULT_CONFIG };
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<Config>;
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(cfg: Config): void {
  ensureHome();
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

export function currentProject(): string {
  return basename(process.cwd());
}
