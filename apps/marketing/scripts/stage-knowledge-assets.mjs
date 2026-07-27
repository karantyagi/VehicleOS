import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const knowledgeSrc = join(appRoot, "../../packages/knowledge");
const stageRoot = join(appRoot, "knowledge-data");

const copyDir = (name) => {
  const from = join(knowledgeSrc, name);
  const to = join(stageRoot, name);
  if (!existsSync(from)) {
    throw new Error(`Missing knowledge source dir: ${from}`);
  }
  cpSync(from, to, { recursive: true });
};

rmSync(stageRoot, { recursive: true, force: true });
mkdirSync(stageRoot, { recursive: true });

for (const dir of ["packs", "catalog", "aliases", "schemas", "sources"]) {
  copyDir(dir);
}

console.log(`Staged knowledge assets → ${stageRoot}`);
