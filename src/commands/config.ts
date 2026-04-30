import { readConfig, writeConfig } from "../paths.ts";
import { DEFAULT_CONFIG, type Config } from "../types.ts";

const KEYS = Object.keys(DEFAULT_CONFIG) as (keyof Config)[];

function parseNonNegInt(key: string, value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    console.error(`${key} must be a non-negative number`);
    process.exit(2);
  }
  return Math.floor(n);
}

function parseBool(key: string, value: string): boolean {
  const v = value.toLowerCase();
  if (["true", "1", "yes", "on"].includes(v)) return true;
  if (["false", "0", "no", "off"].includes(v)) return false;
  console.error(`${key} must be true|false`);
  process.exit(2);
}

export function configGetCmd(key?: string): void {
  const cfg = readConfig();
  if (!key) {
    console.log(JSON.stringify(cfg, null, 2));
    return;
  }
  if (!(KEYS as string[]).includes(key)) {
    console.error(`unknown key: ${key} (valid: ${KEYS.join(", ")})`);
    process.exit(2);
  }
  console.log(String(cfg[key as keyof Config]));
}

export function configSetCmd(key: string, value: string): void {
  if (!(KEYS as string[]).includes(key)) {
    console.error(`unknown key: ${key} (valid: ${KEYS.join(", ")})`);
    process.exit(2);
  }
  const cfg = readConfig();
  switch (key as keyof Config) {
    case "injectLimit":
      cfg.injectLimit = parseNonNegInt(key, value);
      break;
    case "contextWindow":
      cfg.contextWindow = parseNonNegInt(key, value);
      break;
    case "tokenStatusThreshold":
      cfg.tokenStatusThreshold = parseNonNegInt(key, value);
      break;
    case "tokenStatusEnabled":
      cfg.tokenStatusEnabled = parseBool(key, value);
      break;
  }
  writeConfig(cfg);
  console.log(`${key} = ${value}`);
}
