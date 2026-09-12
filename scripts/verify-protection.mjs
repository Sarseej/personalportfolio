import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const inventory = JSON.parse(
  readFileSync(
    new URL("../project-vault/protected-files.json", import.meta.url),
  ),
);
for (const [path, expected] of Object.entries(inventory)) {
  const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (actual !== expected) throw new Error(`Protected file changed: ${path}`);
}
const changed = execFileSync(
  "git",
  ["diff", "HEAD", "--name-only", "--", ...Object.keys(inventory)],
  { encoding: "utf8" },
);
if (changed.trim()) throw new Error(`Protected deployment diff: ${changed}`);
console.log(
  `Protected hashes and Git diff verified: ${Object.keys(inventory).length} files.`,
);
