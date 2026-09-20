import { readFile } from "node:fs/promises";
import {
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
  ["registrable domain", "등록 도메인"],
  ["등록 가능한 도메인", "등록 도메인"],
  ["Public Suffix List", "등록 도메인"],
  ["공용 suffix", "등록 도메인"],
  ["URL의 host는 `api`만이 아니라", "서브 도메인 설명"],
];

for (const [invalid, canonical] of terminologyChecks) {
  if (source.includes(invalid)) {
    errors.push(`학습 원본 용어 불일치: "${invalid}" 대신 "${canonical}" 사용`);
  }
}

const currentTitles = new Set(Object.keys(currentManifest));
const approvedTitles = new Set(Object.keys(approvedManifest));
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

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(
    "\n학습 변경 후에는 내용을 검수하고 `npm run content:approve`를 실행해야 합니다.",
  );
  process.exit(1);
}

console.log(
  `Validated content pipeline: ${questions.length} approved learning entries.`,
);
