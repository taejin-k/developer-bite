import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import {
  hashQuestion,
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
const concepts = JSON.parse(
  await readFile(new URL("../quiz-concepts.json", import.meta.url), "utf8"),
);
const questionsByTitle = new Map(
  questions.map((question) => [question.title, question]),
);
let previousManifest = {};

try {
  previousManifest = JSON.parse(
    await readFile(new URL("../content-manifest.json", import.meta.url), "utf8"),
  ).questions;
} catch {
  if (!bootstrap) {
    throw new Error(
      "content-manifest.json이 없습니다. 최초 1회만 --bootstrap을 사용하세요.",
    );
  }
}

const added = Object.keys(nextManifest).filter(
  (title) => !previousManifest[title],
);
const changed = Object.keys(nextManifest).filter(
  (title) =>
    previousManifest[title] && previousManifest[title] !== nextManifest[title],
);
const removed = Object.keys(previousManifest).filter(
  (title) => !nextManifest[title],
);

if (!bootstrap) {
  const approvedSources = new Set(
    concepts
      .filter((concept) => concept.reviewStatus === "approved")
      .map((concept) => concept.sourceTitle),
  );
  const missingQuiz = added.filter((title) => !approvedSources.has(title));
  if (missingQuiz.length) {
    throw new Error(
      `새 학습 항목에는 검수된 퀴즈 개념이 필요합니다:\n- ${missingQuiz.join("\n- ")}`,
    );
  }
}

const staleConcepts = concepts.filter((concept) => {
  const question = questionsByTitle.get(concept.sourceTitle);
  return !question || concept.sourceHash !== hashQuestion(question);
});
if (staleConcepts.length) {
  throw new Error(
    `학습 원본 변경 후 재검수되지 않은 퀴즈가 있습니다:\n- ${staleConcepts
      .map((concept) => `${concept.id} (${concept.sourceTitle})`)
      .join("\n- ")}`,
  );
}

const quizBuild = spawnSync("npm", ["run", "quiz:build"], {
  cwd: new URL("..", import.meta.url),
  stdio: "inherit",
});
if (quizBuild.status !== 0) process.exit(quizBuild.status ?? 1);
const quizValidation = spawnSync("npm", ["run", "quiz:validate"], {
  cwd: new URL("..", import.meta.url),
  stdio: "inherit",
});
if (quizValidation.status !== 0) {
  process.exit(quizValidation.status ?? 1);
}

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
