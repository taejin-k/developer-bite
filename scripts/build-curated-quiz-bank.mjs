import { readFile, writeFile } from "node:fs/promises";

const concepts = JSON.parse(
  await readFile(new URL("../quiz-concepts.json", import.meta.url), "utf8"),
);
const approved = concepts.filter(
  (concept) => concept.reviewStatus === "approved",
);
const quizItems = approved.flatMap((concept) => [
  {
    id: `${concept.id}-correct`,
    sourceTitle: concept.sourceTitle,
    category: concept.category,
    kind: "correct",
    prompt: concept.correctPrompt,
    truths: concept.truths,
    misconceptions: concept.misconceptions,
  },
  {
    id: `${concept.id}-incorrect`,
    sourceTitle: concept.sourceTitle,
    category: concept.category,
    kind: "incorrect",
    prompt: concept.incorrectPrompt,
    truths: concept.truths,
    misconceptions: concept.misconceptions,
  },
]);

await writeFile(
  new URL("../quiz-bank-v2.json", import.meta.url),
  `${JSON.stringify(quizItems, null, 2)}\n`,
);
console.log(
  `Generated ${quizItems.length} quiz items from ${approved.length} approved concepts.`,
);
