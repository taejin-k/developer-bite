import { readFile, writeFile } from "node:fs/promises";
import { parseQuestions } from "./content-utils.mjs";

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error(
    "사용법: node scripts/import-notion-content.mjs <Notion Markdown 또는 텍스트 파일>",
  );
}

const raw = await readFile(inputPath, "utf8");
const plain = raw
  .replace(/<\/?(?:page|content|ancestor-path|properties|empty-block)[^>]*>/g, "")
  .replace(/^#{1,6}\s+/gm, "")
  .replace(/\*\*([^*]+)\*\*/g, "$1")
  .replace(/`([^`]+)`/g, "$1")
  .replace(/<[^>]+>/g, "")
  .replace(/\n{3,}/g, "\n\n")
  .trim();
const questions = parseQuestions(plain);

if (!questions.length) {
  throw new Error("가져온 파일에서 질문과 답변을 찾지 못했습니다.");
}

const output = questions
  .flatMap((question) => [question.title, ...question.answer, ""])
  .join("\n")
  .trimEnd();

await writeFile(
  new URL("../notion_technical_questions_final.txt", import.meta.url),
  `${output}\n`,
);
console.log(
  `Imported ${questions.length} Notion entries. Run \`npm run quality\` to see items requiring review.`,
);
