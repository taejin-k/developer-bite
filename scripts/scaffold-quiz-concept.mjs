import { readFile, writeFile } from "node:fs/promises";
import { hashQuestion, parseQuestions } from "./content-utils.mjs";

const sourceTitle = process.argv.slice(2).join(" ").trim();
if (!sourceTitle) {
  throw new Error(
    '사용법: npm run quiz:scaffold -- "새 질문 제목이란?"',
  );
}

const source = await readFile(
  new URL("../notion_technical_questions_final.txt", import.meta.url),
  "utf8",
);
const question = parseQuestions(source).find(
  (entry) => entry.title === sourceTitle,
);
if (!question) {
  throw new Error(`학습 데이터에서 질문을 찾을 수 없습니다: ${sourceTitle}`);
}

const conceptsPath = new URL("../quiz-concepts.json", import.meta.url);
const concepts = JSON.parse(await readFile(conceptsPath, "utf8"));
if (concepts.some((concept) => concept.sourceTitle === sourceTitle)) {
  throw new Error(`이미 연결된 퀴즈 개념이 있습니다: ${sourceTitle}`);
}

const id = sourceTitle
  .replace(/[?？]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9가-힣]+/g, "-")
  .replace(/^-|-$/g, "");
const topic = sourceTitle.replace(/[?？]$/, "").replace(/이란$|란$/, "");
const placeholder = (type, index) => ({
  text: `[${type} ${index}] 선택지 내용을 작성하세요.`,
  reason: `[${type} ${index}] 이 선택지가 ${
    type === "사실" ? "맞는" : "틀린"
  } 이유를 독립적인 문장으로 작성하세요.`,
});

concepts.push({
  id,
  sourceTitle,
  sourceHash: hashQuestion(question),
  category: "tooling",
  reviewStatus: "draft",
  qualityVersion: 2,
  correctPrompt: `${topic}에 대한 설명으로 가장 적절한 것은?`,
  incorrectPrompt: `${topic}에 관한 설명으로 틀린 것은?`,
  truths: [1, 2, 3].map((index) => placeholder("사실", index)),
  misconceptions: [1, 2, 3, 4].map((index) =>
    placeholder("오개념", index),
  ),
});

await writeFile(conceptsPath, `${JSON.stringify(concepts, null, 2)}\n`);
console.log(
  `Created a blocked draft for "${sourceTitle}". Fill it, set the category, then change reviewStatus to approved after review.`,
);
