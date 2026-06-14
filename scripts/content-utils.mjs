import { createHash } from "node:crypto";

export const normalizeText = (value) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

export function isQuestion(line) {
  return (
    line.includes("?") &&
    line.length <= 100 &&
    !line.includes("→") &&
    !line.startsWith("http")
  );
}

export function parseQuestions(raw) {
  const ignored = new Set(["아이콘 추가", "커버 추가", "댓글 추가", "기술 질문"]);
  const lines = raw
    .split(/\r?\n/)
    .map(normalizeText)
    .filter((line) => line && !ignored.has(line) && line !== "***");
  const questions = [];
  let current = null;

  for (const line of lines) {
    if (isQuestion(line)) {
      if (current?.answer.length) questions.push(current);
      current = { title: line, answer: [] };
    } else if (current) {
      current.answer.push(line);
    }
  }
  if (current?.answer.length) questions.push(current);
  return questions.filter((question) => question.answer.join(" ").length > 10);
}

export const hashQuestion = ({ title, answer }) =>
  createHash("sha256")
    .update(`${title}\n${answer.join("\n")}`)
    .digest("hex");

export const questionManifest = (questions) =>
  Object.fromEntries(
    questions.map((question) => [question.title, hashQuestion(question)]),
  );
