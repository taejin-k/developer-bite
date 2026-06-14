import { readFile } from "node:fs/promises";

const items = JSON.parse(
  await readFile(new URL("../quiz-bank-v2.json", import.meta.url), "utf8"),
);
const concepts = JSON.parse(
  await readFile(new URL("../quiz-concepts.json", import.meta.url), "utf8"),
);
const qualityVersionByItemId = new Map(
  concepts.flatMap((concept) => [
    [`${concept.id}-correct`, concept.qualityVersion ?? 1],
    [`${concept.id}-incorrect`, concept.qualityVersion ?? 1],
  ]),
);
const errors = [];
const bannedFragments = [
  "이 개념은",
  "이 기능은",
  "이 선언은",
  "핵심 원칙은",
  "첫째,",
  "그래서",
  "아둥",
];
const terminologyRules = [
  {
    conceptIds: new Set(["web-worker-correct", "web-worker-incorrect"]),
    label: "Web Worker",
    invalid(value) {
      const withoutCanonicalTerms = value
        .replaceAll("Web Worker", "")
        .replaceAll("SharedWorker", "")
        .replaceAll("Service Worker", "");
      return /(^|[^A-Za-z])worker(?=$|[^A-Za-z])/i.test(
        withoutCanonicalTerms,
      );
    },
  },
  {
    conceptIds: new Set(["hydration-correct", "hydration-incorrect"]),
    label: "하이드레이션",
    invalid: (value) => /\bHydration\b/.test(value),
  },
  {
    conceptIds: new Set(["hoc-correct", "hoc-incorrect"]),
    label: "고차 컴포넌트",
    invalid: (value) => /Higher-order Component/i.test(value),
  },
  {
    conceptIds: new Set([
      "microfrontend-correct",
      "microfrontend-incorrect",
    ]),
    label: "마이크로 프론트엔드",
    invalid: (value) => /\bMicro Frontend\b/i.test(value),
  },
  {
    conceptIds: new Set(["defer-async-correct", "defer-async-incorrect"]),
    label: "script",
    invalid: (value) => /스크립트/.test(value),
  },
  {
    conceptIds: new Set(["currying-correct", "currying-incorrect"]),
    label: "커링",
    invalid: (value) => /\bCurrying\b/i.test(value),
  },
  {
    conceptIds: new Set(["call-stack-correct", "call-stack-incorrect"]),
    label: "콜 스택",
    invalid: (value) => /\bCall Stack\b/i.test(value),
  },
  {
    conceptIds: new Set([
      "concurrent-rendering-correct",
      "concurrent-rendering-incorrect",
    ]),
    label: "동시성 렌더링",
    invalid: (value) => /\bConcurrent Rendering\b/i.test(value),
  },
  {
    conceptIds: new Set(["streaming-correct", "streaming-incorrect"]),
    label: "스트리밍 렌더링",
    invalid: (value) => /\bStreaming Rendering\b/i.test(value),
  },
  {
    conceptIds: new Set(["compositing-correct", "compositing-incorrect"]),
    label: "컴포지팅",
    invalid: (value) => /\bCompositing\b/i.test(value),
  },
  {
    conceptIds: new Set(["debounce-correct", "debounce-incorrect"]),
    label: "debounce",
    invalid: (value) => /\bDebounce\b/.test(value),
  },
  {
    conceptIds: new Set(["throttle-correct", "throttle-incorrect"]),
    label: "throttle",
    invalid: (value) => /\bThrottle\b/.test(value),
  },
];

for (const item of items) {
  const qualityVersion = qualityVersionByItemId.get(item.id) ?? 1;
  if (item.truths.length < 3) errors.push(`${item.id}: truths < 3`);
  if (item.misconceptions.length < 4) {
    errors.push(`${item.id}: misconceptions < 4`);
  }
  const options = [...item.truths, ...item.misconceptions];
  const texts = options.map(({ text }) => text);
  if (new Set(texts).size !== texts.length) {
    errors.push(`${item.id}: duplicate option`);
  }
  for (const { text, reason } of options) {
    if (!reason || reason.length < 35) {
      errors.push(`${item.id}: short reason for "${text}"`);
    }
    if (bannedFragments.some((fragment) => text.includes(fragment))) {
      errors.push(`${item.id}: awkward fragment in "${text}"`);
    }
    if (/(아닙니다|없습니다)[.!]?$/.test(text)) {
      errors.push(`${item.id}: obvious negative ending in "${text}"`);
    }
    if (
      qualityVersion >= 2 &&
      ((reason.match(/[.!?](?:\s|$)/g) ?? []).length < 2 ||
        reason.length < 60)
    ) {
      errors.push(`${item.id}: v2 explanation needs two substantial sentences for "${text}"`);
    }
    for (const rule of terminologyRules) {
      if (
        rule.conceptIds.has(item.id) &&
        (rule.invalid(text) || rule.invalid(reason))
      ) {
        errors.push(
          `${item.id}: use canonical term "${rule.label}" in "${text}"`,
        );
      }
    }
  }
  for (const { text, reason } of item.truths) {
    if (!reason.startsWith(text)) {
      errors.push(`${item.id}: truth reason is not self-contained for "${text}"`);
    }
    const explanation = reason.slice(text.length).trim();
    if (explanation.length < 30) {
      errors.push(`${item.id}: truth explanation is too short for "${text}"`);
    }
  }
  const lengths = options.map(({ text }) => text.length);
  if (Math.max(...lengths) > Math.min(...lengths) * 2.5) {
    errors.push(`${item.id}: option length imbalance`);
  }
}

const ids = items.map(({ id }) => id);
if (new Set(ids).size !== ids.length) errors.push("duplicate item id");

const normalizedOptionOwners = new Map();
for (const item of items) {
  for (const { text } of [...item.truths, ...item.misconceptions]) {
    const normalized = text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, "");
    const owner = normalizedOptionOwners.get(normalized);
    if (owner && owner !== item.sourceTitle) {
      errors.push(
        `${item.id}: globally duplicated option from "${owner}" in "${text}"`,
      );
    } else {
      normalizedOptionOwners.set(normalized, item.sourceTitle);
    }
  }
}

const byCategory = Object.groupBy(items, ({ category }) => category);
for (const [category, categoryItems] of Object.entries(byCategory)) {
  console.log(`${category}: ${categoryItems.length}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${items.length} curated quiz items.`);
