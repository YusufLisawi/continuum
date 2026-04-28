import { readConfig, writeConfig } from "../paths.ts";
import { DEFAULT_CONFIG, type Config } from "../types.ts";

const KEYS = Object.keys(DEFAULT_CONFIG) as (keyof Config)[];

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
  if (key === "injectLimit") {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      console.error(`injectLimit must be a non-negative integer`);
      process.exit(2);
    }
    cfg.injectLimit = Math.floor(n);
  }
  writeConfig(cfg);
  console.log(`${key} = ${value}`);
}
