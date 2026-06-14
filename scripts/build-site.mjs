import { cp, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const quality = spawnSync("npm", ["run", "quality"], {
  cwd: new URL("..", import.meta.url),
  encoding: "utf8",
  stdio: "inherit",
});
if (quality.status !== 0) process.exit(quality.status ?? 1);

const root = new URL("..", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
const files = [
  "app.js",
  "icon.svg",
  "index.html",
  "manifest.webmanifest",
  "notion_technical_questions_final.txt",
  "quiz-bank-v2.json",
  "styles.css",
  "sw.js",
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of files) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, dist));
}
console.log(`Built ${files.length} production files in dist/.`);
