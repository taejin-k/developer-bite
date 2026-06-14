import { readFile, writeFile } from "node:fs/promises";
import { hashQuestion, parseQuestions } from "./content-utils.mjs";

const sourceTitle = process.argv.slice(2).join(" ").trim();
if (!sourceTitle) {
  throw new Error(
    '사용법: npm run quiz:approve-source -- "변경한 질문 제목이란?"',
  );
}

const source = await readFile(
  new URL("../notion_technical_questions_final.txt", import.meta.url),
  "utf8",
);
const question = parseQuestions(source).find(
  (entry) => entry.title === sourceTitle,
);
if (!question) throw new Error(`학습 항목을 찾을 수 없습니다: ${sourceTitle}`);

const path = new URL("../quiz-concepts.json", import.meta.url);
const concepts = JSON.parse(await readFile(path, "utf8"));
const targets = concepts.filter(
  (concept) => concept.sourceTitle === sourceTitle,
);
if (!targets.length) {
  throw new Error(`연결된 퀴즈 개념을 찾을 수 없습니다: ${sourceTitle}`);
}

const hash = hashQuestion(question);
for (const concept of targets) concept.sourceHash = hash;
await writeFile(path, `${JSON.stringify(concepts, null, 2)}\n`);
console.log(
  `Updated ${targets.length} quiz source hash after review: ${sourceTitle}`,
);
