import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = readFileSync(resolve(projectDir, ".env"), "utf8");
const databaseUrlEntry = envFile
  .split(/\r?\n/)
  .find((line) => /^\s*DATABASE_URL\s*=/.test(line));

if (!databaseUrlEntry) {
  throw new Error("DATABASE_URL tidak ditemukan di .env");
}

const databaseUrl = databaseUrlEntry
  .replace(/^\s*DATABASE_URL\s*=\s*/, "")
  .trim()
  .replace(/^(["'])(.*)\1$/, "$2");

if (!databaseUrl) {
  throw new Error("DATABASE_URL kosong di .env");
}

const result = spawnSync(
  "npx",
  ["prisma@prev", "studio", `--url=${databaseUrl}`],
  {
    cwd: resolve(projectDir, ".."),
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
