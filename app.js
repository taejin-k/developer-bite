const DATA_URL = "/notion_technical_questions_final.txt?v=20260615-terminology";
const QUIZ_BANK_URL = "/quiz-bank-v2.json?v=20260615-terminology";
const STORAGE_KEY = "interview-bite-state-v1";

const categories = [
  {
    id: "security",
    label: "보안·인증",
    keywords: [
      "csrf",
      "xss",
      "이스케이프",
      "html 엔티티",
      "samesite",
      "secure",
      "httponly",
      "jwt",
      "세션",
      "인증",
      "sso",
      "cors",
      "csp",
      "https",
      "ssl",
      "tls",
      "암호",
      "하이브리드 암호",
    ],
  },
  {
    id: "javascript",
    label: "JavaScript",
    keywords: [
      "javascript",
      "promise",
      "async",
      "await",
      "클로저",
      "렉시컬",
      "콜 스택",
      "실행 컨텍스트",
      "this",
      "호이스팅",
      "커링",
      "비동기",
      "이벤트 루프",
      "web api",
      "복사",
      "함수형",
      "일급 객체",
      "undefined",
      "null",
    ],
  },
  {
    id: "react",
    label: "React",
    keywords: [
      "react",
      "리액트",
      "jsx",
      "props",
      "state",
      "usestate",
      "useref",
      "usememo",
      "usecallback",
      "usetransition",
      "suspense",
      "memo",
      "fiber",
      "파이버",
      "virtual dom",
      "재조정",
      "하이드레이션",
      "hooks",
      "hook",
      "context",
      "error boundary",
      "제어 컴포넌트",
      "합성 이벤트",
      "고차 컴포넌트",
    ],
  },
  {
    id: "next",
    label: "Next.js",
    keywords: [
      "next",
      "rsc",
      "server component",
      "서버 컴포넌트",
      "csr",
      "ssr",
      "ssg",
      "isr",
      "streaming",
      "스트리밍",
      "generateMetadata",
      "layout",
      "template",
      "force-dynamic",
      "route cache",
      "router cache",
      "image",
    ],
  },
  {
    id: "browser",
    label: "브라우저·웹",
    keywords: [
      "브라우저",
      "dom",
      "crp",
      "worker",
      "requestanimationframe",
      "requestidlecallback",
      "렌더링",
      "컴포지팅",
      "스토리지",
      "이벤트 버블링",
      "이벤트 캡처",
      "이벤트 전파",
      "이벤트 위임",
      "seo",
      "접근성",
      "doctype",
      "fcp",
      "lcp",
      "cls",
      "inp",
      "fouc",
      "shadow dom",
      "pwa",
    ],
  },
  {
    id: "network",
    label: "네트워크·인프라",
    keywords: [
      "tcp",
      "udp",
      "http",
      "http/2",
      "http/3",
      "quic",
      "dns",
      "handshake",
      "keep-alive",
      "cdn",
      "cloudfront",
      "websocket",
      "프록시",
      "redis",
      "로드 밸런싱",
      "cold start",
      "업스트림",
      "다운스트림",
    ],
  },
  {
    id: "typescript",
    label: "TypeScript",
    keywords: [
      "typescript",
      "type",
      "interface",
      "any",
      "unknown",
      "유니온",
      "인터섹션",
      "pick",
      "omit",
      "partial",
      "readonly",
      "enum",
      "as const",
      "인덱스 시그니처",
      ".d.ts",
      "declare",
    ],
  },
  {
    id: "tooling",
    label: "도구·설계",
    keywords: [
      "git",
      "husky",
      "lint-staged",
      "npm",
      "yarn",
      "pnpm",
      "번들러",
      "트랜스파일러",
      "컴파일러",
      "폴리필",
      "코드 스플리팅",
      "트리 셰이킹",
      "cjs",
      "esm",
      "모노레포",
      "멀티레포",
      "solid",
      "클린코드",
      "관심사",
      "싱글톤",
      "마이크로 프론트엔드",
      "e2e",
      "testing library",
      "cypress",
      "playwright",
      "tailwind",
      "css",
    ],
  },
];

const state = {
  questions: [],
  quizBank: [],
  view: "study",
  category: "all",
  search: "",
  bookmarkOnly: false,
  completed: new Set(),
  bookmarks: new Set(),
  wrong: new Set(),
  quizType: "multiple",
  quizCount: 20,
  quizCategory: "all",
  quizItems: [],
  quizIndex: 0,
  quizScore: 0,
  quizAnswered: false,
  deferredInstallPrompt: null,
  scrollPositions: {
    study: 0,
    quiz: 0,
    review: 0,
  },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isMobileDevice() {
  return (
    window.matchMedia("(max-width: 800px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function updateInstallButton() {
  $(".install-button").classList.toggle(
    "is-hidden",
    isStandaloneApp() || (!state.deferredInstallPrompt && !isMobileDevice()),
  );
}

function normalizeText(value) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isQuestion(line) {
  if (!line.includes("?")) return false;
  if (line.length > 100) return false;
  return !line.includes("→") && !line.startsWith("http");
}

function parseQuestions(raw) {
  const ignored = new Set([
    "아이콘 추가",
    "커버 추가",
    "댓글 추가",
    "기술 질문",
  ]);
  const lines = raw
    .split(/\r?\n/)
    .map(normalizeText)
    .filter((line) => line && !ignored.has(line) && line !== "***");

  const parsed = [];
  let current = null;

  for (const line of lines) {
    if (isQuestion(line)) {
      if (current?.answer.length) parsed.push(current);
      current = { title: line, answer: [] };
      continue;
    }
    if (current) current.answer.push(line);
  }
  if (current?.answer.length) parsed.push(current);

  return parsed
    .filter((item) => item.answer.join(" ").length > 10)
    .map((item, index) => {
      const answer = item.answer.join("\n");
      const id = `q-${index + 1}`;
      const category = detectCategory(item.title, answer);
      return {
        id,
        number: index + 1,
        title: item.title,
        answer,
        shortAnswer: firstSentence(answer),
        category,
      };
    });
}

function detectCategory(title, answer) {
  const titleValue = title.toLowerCase();
  const answerValue = answer.toLowerCase();
  let best = categories[0];
  let bestScore = 0;

  for (const category of categories) {
    const score = category.keywords.reduce(
      (total, keyword) =>
        total +
        (titleValue.includes(keyword.toLowerCase()) ? 5 : 0) +
        (answerValue.includes(keyword.toLowerCase()) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return bestScore ? best.id : "tooling";
}

function firstSentence(answer) {
  const clean = answer.replace(/\n/g, " ").trim();
  const match = clean.match(/^(.{20,180}?[.!?])(?:\s|$)/);
  return match ? match[1] : `${clean.slice(0, 150)}${clean.length > 150 ? "…" : ""}`;
}

function renderParagraphs(container, text) {
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  container.replaceChildren(
    ...paragraphs.map((paragraph) => {
      const element = document.createElement("p");
      element.textContent = paragraph;
      return element;
    }),
  );
}

function categoryLabel(id) {
  return categories.find((category) => category.id === id)?.label ?? "기타";
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.completed = new Set(saved.completed || []);
    state.bookmarks = new Set(saved.bookmarks || []);
    state.wrong = new Set(saved.wrong || []);
  } catch {
    // Corrupted local state should not block the app.
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      completed: [...state.completed],
      bookmarks: [...state.bookmarks],
      wrong: [...state.wrong],
    }),
  );
}

function renderCategoryControls() {
  const tabs = $("#category-tabs");
  const items = [{ id: "all", label: "전체" }, ...categories];

  if (!tabs.querySelector(".category-tab")) {
    tabs.replaceChildren();
    tabs.classList.remove("is-loading");
    for (const item of items) {
      const count =
        item.id === "all"
          ? state.questions.length
          : state.questions.filter((question) => question.category === item.id)
              .length;
      if (!count) continue;
      const button = document.createElement("button");
      button.className = "category-tab";
      button.dataset.category = item.id;
      button.textContent = `${item.label} ${count}`;
      button.addEventListener("click", () => {
        state.category = item.id;
        renderStudy();
      });
      tabs.append(button);
    }
  }

  $$(".category-tab", tabs).forEach((button) =>
    button.classList.toggle(
      "is-active",
      button.dataset.category === state.category,
    ),
  );

  const options = $("#quiz-category-options");
  if (!options.children.length) {
    for (const item of items.filter(
      (category) =>
        category.id === "all" ||
        state.questions.some((question) => question.category === category.id),
    )) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "select-option";
      option.role = "option";
      option.dataset.value = item.id;
      option.textContent = item.label;
      option.addEventListener("click", () => {
        state.quizCategory = item.id;
        updateQuizCategorySelect();
        closeQuizCategorySelect();
      });
      options.append(option);
    }
  }
  updateQuizCategorySelect();
}

function updateQuizCategorySelect() {
  $("#quiz-category-value").textContent =
    state.quizCategory === "all" ? "전체" : categoryLabel(state.quizCategory);
  $$(".select-option", $("#quiz-category-options")).forEach((option) => {
    const selected = option.dataset.value === state.quizCategory;
    option.classList.toggle("is-selected", selected);
    option.setAttribute("aria-selected", String(selected));
  });
}

function closeQuizCategorySelect() {
  $("#quiz-category-field").classList.remove("is-open");
  $("#quiz-category-trigger").setAttribute("aria-expanded", "false");
}

function filteredQuestions() {
  const query = state.search.toLowerCase();
  return state.questions.filter((question) => {
    const categoryMatch =
      state.category === "all" || question.category === state.category;
    const searchMatch =
      !query ||
      question.title.toLowerCase().includes(query) ||
      question.answer.toLowerCase().includes(query);
    const bookmarkMatch =
      !state.bookmarkOnly || state.bookmarks.has(question.id);
    return categoryMatch && searchMatch && bookmarkMatch;
  });
}

function createQuestionCard(question, index) {
  const fragment = $("#question-template").content.cloneNode(true);
  const card = $(".question-card", fragment);
  const main = $(".question-main", fragment);
  const completeButton = $(".complete-button", fragment);
  const bookmarkButton = $(".bookmark-button", fragment);

  card.dataset.id = question.id;
  card.classList.toggle("is-complete", state.completed.has(question.id));
  $(".question-index", fragment).textContent = String(index + 1).padStart(2, "0");
  $(".question-category", fragment).textContent = categoryLabel(
    question.category,
  );
  $(".question-title", fragment).textContent = question.title;
  renderParagraphs($(".answer-body", fragment), question.answer);

  completeButton.classList.toggle(
    "is-active",
    state.completed.has(question.id),
  );
  completeButton.textContent = state.completed.has(question.id)
    ? "학습 완료"
    : "학습 미완료";

  bookmarkButton.classList.toggle(
    "is-active",
    state.bookmarks.has(question.id),
  );
  bookmarkButton.setAttribute(
    "aria-label",
    state.bookmarks.has(question.id) ? "북마크 해제" : "북마크 추가",
  );
  bookmarkButton.setAttribute(
    "aria-pressed",
    String(state.bookmarks.has(question.id)),
  );

  main.setAttribute("aria-expanded", "false");
  main.addEventListener("click", () => {
    const open = card.classList.toggle("is-open");
    main.setAttribute("aria-expanded", String(open));
  });
  completeButton.addEventListener("click", () => {
    toggleSet(state.completed, question.id);
    saveState();
    updateProgress();
    updateCardState(card, question.id);
    updateBulkCompletionButton();
  });
  bookmarkButton.addEventListener("click", () => {
    toggleSet(state.bookmarks, question.id);
    saveState();
    if (state.bookmarkOnly) renderStudy();
    else updateCardState(card, question.id);
    renderReview();
  });
  return fragment;
}

function updateCardState(card, id) {
  const completed = state.completed.has(id);
  const bookmarked = state.bookmarks.has(id);
  card.classList.toggle("is-complete", completed);
  $(".complete-button", card).classList.toggle("is-active", completed);
  $(".complete-button", card).textContent = completed
    ? "학습 완료"
    : "학습 미완료";
  $(".bookmark-button", card).classList.toggle("is-active", bookmarked);
  $(".bookmark-button", card).setAttribute(
    "aria-label",
    bookmarked ? "북마크 해제" : "북마크 추가",
  );
  $(".bookmark-button", card).setAttribute(
    "aria-pressed",
    String(bookmarked),
  );
}

function toggleSet(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function updateBulkCompletionButton(questions = filteredQuestions()) {
  const button = $("#bulk-complete");
  const allCompleted =
    questions.length > 0 &&
    questions.every((question) => state.completed.has(question.id));

  button.disabled = questions.length === 0;
  button.classList.toggle("is-reset", allCompleted);
  button.textContent = allCompleted ? "모두 미완료" : "모두 완료";
  button.setAttribute(
    "aria-label",
    allCompleted
      ? "현재 질문을 모두 학습 미완료로 변경"
      : "현재 질문을 모두 학습 완료로 변경",
  );
}

function renderStudy() {
  renderCategoryControls();
  const questions = filteredQuestions();
  const list = $("#question-list");
  const fragment = document.createDocumentFragment();
  questions.forEach((question, index) =>
    fragment.append(createQuestionCard(question, index)),
  );
  list.classList.remove("is-loading");
  list.replaceChildren(fragment);

  const categoryName =
    state.category === "all" ? "전체 질문" : categoryLabel(state.category);
  $("#result-title").textContent = state.bookmarkOnly
    ? `${categoryName} 북마크`
    : categoryName;
  $("#result-eyebrow").textContent =
    state.category === "all" ? "ALL QUESTIONS" : state.category.toUpperCase();
  updateBulkCompletionButton(questions);
  $("#study-empty").classList.toggle("is-hidden", questions.length > 0);
  $("#bookmark-filter").classList.toggle("is-active", state.bookmarkOnly);
  $("#bookmark-filter").setAttribute(
    "aria-pressed",
    String(state.bookmarkOnly),
  );
  updateProgress();
}

function updateProgress() {
  const total = state.questions.length;
  const completed = state.completed.size;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  $("#progress-percent").textContent = `${percent}%`;
  $("#progress-bar").style.width = `${percent}%`;
  $("#completed-count").textContent = completed;
  $("#total-count").textContent = total;
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function buildQuizItem(definition) {
  return state.quizType === "multiple"
    ? buildMultipleQuestion(definition)
    : buildOxQuestion(definition);
}

function quizItemSignature(item) {
  return [
    item.prompt,
    item.correct,
    ...item.options.map(({ text }) => text).sort(),
  ].join("\n");
}

function buildVariedQuizItems(pool, count) {
  if (!pool.length) return [];

  const targetCount = count === "all" ? pool.length : count;
  const items = [];
  const signatures = new Set();
  let queue = [];
  let attempts = 0;
  const maxUniqueAttempts = Math.max(targetCount * 80, pool.length * 20);

  while (items.length < targetCount && attempts < maxUniqueAttempts) {
    if (!queue.length) queue = shuffle(pool);
    const item = buildQuizItem(queue.pop());
    const signature = quizItemSignature(item);
    attempts += 1;
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    items.push(item);
  }

  // OX처럼 만들 수 있는 고유 조합 수가 요청 수보다 적을 때만 반복을 허용합니다.
  while (items.length < targetCount) {
    if (!queue.length) queue = shuffle(pool);
    items.push(buildQuizItem(queue.pop()));
  }
  return items;
}

function buildQuiz() {
  const pool = state.quizBank.filter(
    (item) =>
      state.quizCategory === "all" || item.category === state.quizCategory,
  );
  state.quizItems = buildVariedQuizItems(pool, state.quizCount);
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswered = false;
}

function findSourceQuestion(item) {
  return (
    state.questions.find((question) => question.title === item.sourceTitle) ?? {
      id: `quiz-${item.id}`,
      category: item.category,
      title: item.sourceTitle,
      answer: "",
    }
  );
}

function asQuizOption(option, isAnswer) {
  return { ...option, isAnswer };
}

function buildMultipleQuestion(item) {
  const answerPool =
    item.kind === "correct" ? item.truths : item.misconceptions;
  const otherPool =
    item.kind === "correct" ? item.misconceptions : item.truths;
  const answer = shuffle(answerPool)[0];
  const options = shuffle([
    asQuizOption(answer, true),
    ...shuffle(otherPool).slice(0, 3).map((entry) => asQuizOption(entry, false)),
  ]);

  return {
    definition: item,
    source: findSourceQuestion(item),
    kind: item.kind,
    prompt: item.prompt,
    correct: answer.text,
    options,
    selected: null,
  };
}

function buildOxQuestion(item) {
  const isTrue = Math.random() >= 0.5;
  const statement = shuffle(
    isTrue ? item.truths : item.misconceptions,
  )[0];
  const answer = isTrue ? "O" : "X";
  return {
    definition: item,
    source: findSourceQuestion(item),
    kind: "ox",
    prompt: `${item.prompt.replace(/(?:가장 적절한|틀린) 것은\?$/, "다음 문장을 판단해보세요.")}\n\n“${statement.text}”`,
    correct: answer,
    options: [
      { text: "O", reason: statement.reason, isAnswer: answer === "O" },
      { text: "X", reason: statement.reason, isAnswer: answer === "X" },
    ],
    selected: null,
  };
}

function quizOptionFeedback(item, option) {
  if (option.isAnswer) {
    return {
      label: "정답입니다.",
      reason: option.reason,
    };
  }
  if (item.kind === "incorrect") {
    return {
      label: "이 설명은 맞습니다.",
      reason: `${option.reason} 따라서 틀린 설명을 찾는 이 문제의 정답은 아닙니다.`,
    };
  }
  if (item.kind === "correct") {
    return {
      label: "이 설명은 정확하지 않습니다.",
      reason: option.reason,
    };
  }
  return {
    label:
      item.correct === "O"
        ? "제시된 문장은 맞습니다."
        : "제시된 문장은 틀립니다.",
    reason: option.reason,
  };
}

function updateQuizScore() {
  if (!state.quizItems.length) {
    state.quizScore = 0;
    return;
  }
  state.quizScore = Math.round(
    (state.quizItems.filter(
      (quizItem) => quizItem.selected === quizItem.correct,
    ).length /
      state.quizItems.length) *
      100,
  );
}

function renderQuizQuestion() {
  const item = state.quizItems[state.quizIndex];
  if (!item) return finishQuiz();
  state.quizAnswered = item.selected !== null;

  $("#quiz-progress-text").textContent =
    `${state.quizIndex + 1} / ${state.quizItems.length}`;
  $("#quiz-score").textContent = `${state.quizScore}점`;
  $("#quiz-progress-bar").style.width =
    `${((state.quizIndex + 1) / state.quizItems.length) * 100}%`;
  $("#quiz-category-label").textContent = categoryLabel(item.source.category);
  $("#quiz-question").textContent = item.prompt;
  $("#previous-question").classList.toggle("is-hidden", state.quizIndex === 0);
  $("#retry-question").classList.toggle("is-hidden", !state.quizAnswered);
  $("#next-question").classList.toggle("is-hidden", !state.quizAnswered);
  $("#next-question").textContent =
    state.quizIndex === state.quizItems.length - 1 ? "결과 보기" : "다음 문제";
  $("#quiz-explanation").classList.toggle("is-hidden", !state.quizAnswered);

  const options = $("#quiz-options");
  options.innerHTML = "";
  item.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    if (state.quizType === "multiple") {
      const label = document.createElement("span");
      label.className = "quiz-option-label";
      label.textContent = `${String.fromCharCode(65 + index)}.`;
      const text = document.createElement("span");
      text.textContent = option.text;
      button.append(label, text);
    } else {
      button.classList.add("is-ox");
      button.textContent = option.text;
    }
    button.addEventListener("click", () => answerQuiz(button, option));
    if (state.quizAnswered) {
      button.disabled = true;
      if (option.isAnswer) button.classList.add("is-correct");
      if (option.text === item.selected && !option.isAnswer) {
        button.classList.add("is-wrong");
      }
    }
    options.append(button);
  });

  if (state.quizAnswered) {
    const selectedOption = item.options.find(
      (option) => option.text === item.selected,
    );
    const feedback = selectedOption
      ? quizOptionFeedback(item, selectedOption)
      : { label: "", reason: "" };
    $("#quiz-result-label").textContent = feedback.label;
    $("#quiz-selected-reason").textContent = feedback.reason;
    renderParagraphs($("#quiz-answer-text"), item.source.answer);
  }
}

function answerQuiz(button, option) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;
  const item = state.quizItems[state.quizIndex];
  const correct = option.isAnswer;
  item.selected = option.text;

  if (!correct) {
    state.wrong.add(item.source.id);
  }
  updateQuizScore();
  saveState();

  $$(".quiz-option").forEach((optionButton, index) => {
    optionButton.disabled = true;
    if (item.options[index].isAnswer) {
      optionButton.classList.add("is-correct");
    }
  });
  if (!correct) button.classList.add("is-wrong");

  const feedback = quizOptionFeedback(item, option);
  $("#quiz-result-label").textContent = feedback.label;
  $("#quiz-selected-reason").textContent = feedback.reason;
  renderParagraphs($("#quiz-answer-text"), item.source.answer);
  $("#quiz-explanation").classList.remove("is-hidden");
  $("#retry-question").classList.remove("is-hidden");
  $("#next-question").classList.remove("is-hidden");
  $("#quiz-score").textContent = `${state.quizScore}점`;
}

function retryCurrentQuestion() {
  const current = state.quizItems[state.quizIndex];
  if (!current?.definition) return;

  state.quizItems[state.quizIndex] =
    state.quizType === "multiple"
      ? buildMultipleQuestion(current.definition)
      : buildOxQuestion(current.definition);
  updateQuizScore();
  renderQuizQuestion();
}

function startQuiz() {
  buildQuiz();
  $("#quiz-setup").classList.add("is-hidden");
  $("#quiz-finish").classList.add("is-hidden");
  $("#quiz-stage").classList.remove("is-hidden");
  $("#quiz-view").classList.add("is-running");
  renderQuizQuestion();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function finishQuiz() {
  $("#quiz-stage").classList.add("is-hidden");
  $("#quiz-finish").classList.remove("is-hidden");
  const finalScore = Math.min(100, state.quizScore);
  $("#final-score").textContent = finalScore;
  const wrongCount = state.quizItems.length - Math.round(
    (finalScore / 100) * state.quizItems.length,
  );
  $("#finish-title").textContent =
    finalScore >= 80
      ? "좋은 흐름입니다."
      : finalScore >= 50
        ? "조금만 더 다듬어볼까요?"
        : "지금부터 기억에 남기면 됩니다.";
  $("#finish-description").textContent =
    wrongCount > 0
      ? `${state.quizItems.length}문제 중 ${wrongCount}문제를 오답노트에 추가했습니다.`
      : "모든 문제를 맞혔습니다. 다른 카테고리에도 도전해보세요.";
  renderReview();
}

function quitQuiz() {
  $("#quiz-stage").classList.add("is-hidden");
  $("#quiz-finish").classList.add("is-hidden");
  $("#quiz-setup").classList.remove("is-hidden");
  $("#quiz-view").classList.remove("is-running");
}

function renderReview() {
  const ids = new Set([...state.wrong, ...state.bookmarks]);
  const questions = state.questions.filter((question) => ids.has(question.id));
  const list = $("#review-list");
  const fragment = document.createDocumentFragment();
  questions.forEach((question, index) =>
    fragment.append(createQuestionCard(question, index)),
  );
  list.replaceChildren(fragment);
  $("#wrong-count").textContent = state.wrong.size;
  $("#bookmark-count").textContent = state.bookmarks.size;
  $("#review-empty").classList.toggle("is-hidden", questions.length > 0);
}

function switchView(view) {
  if (view === state.view) return;

  if (state.view === "study") state.scrollPositions.study = window.scrollY;
  state.view = view;
  $$(".view").forEach((element) =>
    element.classList.toggle("is-active", element.id === `${view}-view`),
  );
  $$("[data-view]").forEach((button) =>
    button.classList.toggle("is-active", button.dataset.view === view),
  );
  if (view === "review") renderReview();
  requestAnimationFrame(() => {
    window.scrollTo({
      top: view === "study" ? state.scrollPositions.study : 0,
      behavior: "instant",
    });
  });
}

function bindEvents() {
  $$("[data-view]").forEach((button) =>
    button.addEventListener("click", () => switchView(button.dataset.view)),
  );
  $$("[data-view-link]").forEach((button) =>
    button.addEventListener("click", () =>
      switchView(button.dataset.viewLink),
    ),
  );
  $("#search-input").addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderStudy();
  });
  $("#bookmark-filter").addEventListener("click", () => {
    state.bookmarkOnly = !state.bookmarkOnly;
    renderStudy();
  });
  $("#bulk-complete").addEventListener("click", () => {
    const questions = filteredQuestions();
    if (!questions.length) return;

    const allCompleted = questions.every((question) =>
      state.completed.has(question.id),
    );
    questions.forEach((question) => {
      if (allCompleted) state.completed.delete(question.id);
      else state.completed.add(question.id);
    });
    saveState();
    renderStudy();
  });
  $$("[data-quiz-type]").forEach((button) =>
    button.addEventListener("click", () => {
      state.quizType = button.dataset.quizType;
      $$("[data-quiz-type]").forEach((item) =>
        item.classList.toggle("is-active", item === button),
      );
    }),
  );
  $$("[data-count]").forEach((button) =>
    button.addEventListener("click", () => {
      state.quizCount =
        button.dataset.count === "all"
          ? "all"
          : Number(button.dataset.count);
      $$("[data-count]").forEach((item) =>
        item.classList.toggle("is-active", item === button),
      );
    }),
  );
  $("#quiz-category-trigger").addEventListener("click", () => {
    const field = $("#quiz-category-field");
    const open = !field.classList.contains("is-open");
    field.classList.toggle("is-open", open);
    $("#quiz-category-trigger").setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#quiz-category-field")) {
      closeQuizCategorySelect();
    }
  });
  $("#quiz-category-field").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeQuizCategorySelect();
      $("#quiz-category-trigger").focus();
    }
  });
  $("#start-quiz").addEventListener("click", startQuiz);
  $("#next-question").addEventListener("click", () => {
    if (state.quizIndex === state.quizItems.length - 1) {
      finishQuiz();
      return;
    }
    state.quizIndex += 1;
    renderQuizQuestion();
  });
  $("#previous-question").addEventListener("click", () => {
    if (state.quizIndex === 0) return;
    state.quizIndex -= 1;
    renderQuizQuestion();
  });
  $("#retry-question").addEventListener("click", retryCurrentQuestion);
  $("#quit-quiz").addEventListener("click", quitQuiz);
  $("#retry-quiz").addEventListener("click", startQuiz);
  $("#clear-review").addEventListener("click", () => {
    state.wrong.clear();
    saveState();
    renderReview();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    updateInstallButton();
  });
  $(".install-button").addEventListener("click", async () => {
    if (state.deferredInstallPrompt) {
      state.deferredInstallPrompt.prompt();
      await state.deferredInstallPrompt.userChoice;
      state.deferredInstallPrompt = null;
      updateInstallButton();
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.alert(
      isIOS
        ? "Safari 하단의 공유 버튼을 누른 뒤 '홈 화면에 추가'를 선택해주세요."
        : "브라우저 메뉴에서 '앱 설치' 또는 '홈 화면에 추가'를 선택해주세요.",
    );
  });
  window.addEventListener("appinstalled", updateInstallButton);
  window
    .matchMedia("(display-mode: standalone)")
    .addEventListener("change", updateInstallButton);
  updateInstallButton();
}

async function init() {
  loadState();
  bindEvents();
  try {
    const [questionResponse, quizBankResponse] = await Promise.all([
      fetch(DATA_URL),
      fetch(QUIZ_BANK_URL),
    ]);
    if (!questionResponse.ok) {
      throw new Error("질문 데이터를 불러오지 못했습니다.");
    }
    if (!quizBankResponse.ok) {
      throw new Error("퀴즈 선택지 데이터를 불러오지 못했습니다.");
    }
    state.questions = parseQuestions(await questionResponse.text());
    state.quizBank = await quizBankResponse.json();
    renderStudy();
    renderReview();
  } catch (error) {
    $("#question-list").innerHTML = `
      <div class="empty-state">
        <strong>데이터를 불러오지 못했습니다.</strong>
        <p>${error.message}</p>
      </div>`;
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {}),
    );
  }
}

init();
