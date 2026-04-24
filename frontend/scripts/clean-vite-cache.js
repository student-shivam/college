import fs from "node:fs";
import path from "node:path";

function rm(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
    process.stdout.write(`removed ${target}\n`);
  } catch (err) {
    process.stdout.write(`skip ${target} (${err.message})\n`);
  }
}

const root = process.cwd();
rm(path.join(root, "node_modules", ".vite"));
rm(path.join(root, ".vite"));
rm(path.join(root, "dist"));

