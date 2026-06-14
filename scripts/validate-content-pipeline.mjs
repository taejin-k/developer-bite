import { readFile } from "node:fs/promises";
import {
  hashQuestion,
  parseQuestions,
  questionManifest,
} from "./content-utils.mjs";

const readJson = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const source = await readFile(
  new URL("../notion_technical_questions_final.txt", import.meta.url),
  "utf8",
);
const questions = parseQuestions(source);
const currentManifest = questionManifest(questions);
const approvedManifest = (await readJson("../content-manifest.json")).questions;
const concepts = await readJson("../quiz-concepts.json");
const errors = [];
const terminologyChecks = [
  ["Synthetic Event란?", "합성 이벤트란?"],
  ["Currying이란?", "커링이란?"],
  ["Compositing 단계란?", "컴포지팅 단계란?"],
  ["Concurrent Rendering이란?", "동시성 렌더링이란?"],
  ["Streaming Rendering이란?", "스트리밍 렌더링이란?"],
  ["Module Bundler란?", "모듈 번들러란?"],
  ["Memory Leak이란?", "메모리 누수란?"],
  ["Call Stack", "콜 스택"],
  ["제로 런타임", "Zero Runtime"],
];

for (const [invalid, canonical] of terminologyChecks) {
  if (source.includes(invalid)) {
    errors.push(`학습 원본 용어 불일치: "${invalid}" 대신 "${canonical}" 사용`);
  }
}

const currentTitles = new Set(Object.keys(currentManifest));
const approvedTitles = new Set(Object.keys(approvedManifest));
const questionByTitle = new Map(
  questions.map((question) => [question.title, question]),
);

for (const title of currentTitles) {
  if (!approvedTitles.has(title)) {
    errors.push(`승인되지 않은 새 학습 항목: ${title}`);
  } else if (currentManifest[title] !== approvedManifest[title]) {
    errors.push(`승인 후 내용이 변경된 학습 항목: ${title}`);
  }
}
for (const title of approvedTitles) {
  if (!currentTitles.has(title)) {
    errors.push(`승인 없이 삭제된 학습 항목: ${title}`);
  }
}

const ids = new Set();
for (const concept of concepts) {
  if (ids.has(concept.id)) errors.push(`중복 퀴즈 개념 ID: ${concept.id}`);
  ids.add(concept.id);
  if (concept.reviewStatus !== "approved") {
    errors.push(`검수되지 않은 퀴즈 개념: ${concept.id}`);
  }
  const sourceQuestion = questionByTitle.get(concept.sourceTitle);
  if (!sourceQuestion) {
    errors.push(
      `${concept.id}: 학습 원본을 찾을 수 없음 (${concept.sourceTitle})`,
    );
    continue;
  }
  if (concept.sourceHash !== hashQuestion(sourceQuestion)) {
    errors.push(
      `${concept.id}: 학습 내용이 바뀌어 퀴즈 재검수가 필요함 (${concept.sourceTitle})`,
    );
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(
    "\nNotion 변경 후에는 퀴즈를 검수하고 `npm run content:approve`를 실행해야 합니다.",
  );
  process.exit(1);
}

console.log(
  `Validated content pipeline: ${questions.length} approved learning entries, ${concepts.length} approved quiz concepts.`,
);
