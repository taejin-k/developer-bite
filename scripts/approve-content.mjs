import { readFile, writeFile } from "node:fs/promises";
import {
  parseQuestions,
  questionManifest,
} from "./content-utils.mjs";

const bootstrap = process.argv.includes("--bootstrap");
const source = await readFile(
  new URL("../notion_technical_questions_final.txt", import.meta.url),
  "utf8",
);
const questions = parseQuestions(source);
const nextManifest = questionManifest(questions);
let previousManifest = {};

try {
  previousManifest = JSON.parse(
    await readFile(new URL("../content-manifest.json", import.meta.url), "utf8"),
  ).questions;
} catch {
  if (!bootstrap) {
    throw new Error("content-manifest.json이 없습니다. 최초 1회만 --bootstrap을 사용하세요.");
  }
}

const added = Object.keys(nextManifest).filter((title) => !previousManifest[title]);
const changed = Object.keys(nextManifest).filter(
  (title) => previousManifest[title] && previousManifest[title] !== nextManifest[title],
);
const removed = Object.keys(previousManifest).filter((title) => !nextManifest[title]);

await writeFile(
  new URL("../content-manifest.json", import.meta.url),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      approvedAt: new Date().toISOString(),
      questions: nextManifest,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `Approved ${questions.length} learning entries (added ${added.length}, changed ${changed.length}, removed ${removed.length}).`,
);
