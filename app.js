const DATA_URL = "/notion_technical_questions_final.txt?v=20260921-study-only-v1";
const STORAGE_KEY = "interview-bite-state-v1";
const SYNC_ID_KEY = "interview-bite-sync-id-v1";
const SYNC_CLIENT_ID_KEY = "interview-bite-sync-client-id-v1";
const SYNC_DEBOUNCE_MS = 800;
const SYNC_POLL_MS = 60_000;
const SYNC_COLLECTIONS = ["completed", "bookmarks"];

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
  category: "all",
  search: "",
  bookmarkOnly: false,
  completed: new Set(),
  bookmarks: new Set(),
  records: {
    completed: {},
    bookmarks: {},
  },
  clientId: "",
  sync: {
    id: "",
    status: "idle",
    message: "기기별로 저장 중",
    lastSyncedAt: null,
    timer: null,
    poller: null,
  },
  deferredInstallPrompt: null,
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

function getClientId() {
  let clientId = localStorage.getItem(SYNC_CLIENT_ID_KEY);
  if (!clientId) {
    clientId =
      crypto.randomUUID?.() ??
      `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(SYNC_CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

function recordFromValue(value, updatedAt = Date.now()) {
  return {
    value: Boolean(value),
    updatedAt,
    clientId: state.clientId,
  };
}

function createRecordsFromIds(ids, updatedAt) {
  return Object.fromEntries(
    [...new Set(ids || [])].map((id) => [id, recordFromValue(true, updatedAt)]),
  );
}

function sanitizeRecords(records) {
  const safeRecords = {
    completed: {},
    bookmarks: {},
  };

  for (const collection of SYNC_COLLECTIONS) {
    const source =
      records?.[collection] && typeof records[collection] === "object"
        ? records[collection]
        : {};
    for (const [id, record] of Object.entries(source)) {
      safeRecords[collection][id] = {
        value: Boolean(record?.value),
        updatedAt: Number(record?.updatedAt) || 0,
        clientId: String(record?.clientId || ""),
      };
    }
  }

  return safeRecords;
}

function applyRecordsToSets() {
  for (const collection of SYNC_COLLECTIONS) {
    state[collection] = new Set(
      Object.entries(state.records[collection])
        .filter(([, record]) => record.value)
        .map(([id]) => id),
    );
  }
}

function serializeState() {
  return {
    version: 2,
    updatedAt: Date.now(),
    clientId: state.clientId,
    records: state.records,
  };
}

function loadState() {
  state.clientId = getClientId();
  state.sync.id = localStorage.getItem(SYNC_ID_KEY) || "";
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved.records) {
      state.records = sanitizeRecords(saved.records);
    } else {
      const updatedAt = Number(saved.updatedAt) || Date.now();
      state.records = {
        completed: createRecordsFromIds(saved.completed, updatedAt),
        bookmarks: createRecordsFromIds(saved.bookmarks, updatedAt),

      };
    }
    applyRecordsToSets();
  } catch {
    // Corrupted local state should not block the app.
  }
}

function saveState({ sync = true } = {}) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(serializeState()),
  );
  if (sync) scheduleSyncPush();
}

function setTrackedValue(collection, id, value) {
  if (!SYNC_COLLECTIONS.includes(collection)) return;
  if (value) state[collection].add(id);
  else state[collection].delete(id);
  state.records[collection][id] = recordFromValue(value);
}

function toggleTrackedValue(collection, id) {
  setTrackedValue(collection, id, !state[collection].has(id));
}

function mergeRecords(remoteState) {
  if (!remoteState?.records) return false;
  let changed = false;
  const remoteRecords = sanitizeRecords(remoteState.records);

  for (const collection of SYNC_COLLECTIONS) {
    for (const [id, remoteRecord] of Object.entries(
      remoteRecords[collection],
    )) {
      const localRecord = state.records[collection][id];
      if (!localRecord || remoteRecord.updatedAt > localRecord.updatedAt) {
        state.records[collection][id] = remoteRecord;
        changed = true;
      }
    }
  }

  if (changed) applyRecordsToSets();
  return changed;
}

function renderAllState() {
  renderStudy();
}

function formatSyncedAt(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function updateSyncStatus(message = state.sync.message, status = state.sync.status) {
  state.sync.message = message;
  state.sync.status = status;
  const statusElement = $("#sync-status");
  const button = $("#sync-open");
  if (!statusElement || !button) return;

  const suffix =
    state.sync.lastSyncedAt && status === "synced"
      ? ` · ${formatSyncedAt(state.sync.lastSyncedAt)}`
      : "";
  statusElement.textContent = `${message}${suffix}`;
  statusElement.dataset.status = status;
  button.classList.toggle("is-synced", Boolean(state.sync.id));
  button.setAttribute(
    "aria-label",
    state.sync.id ? "동기화 설정 열기" : "동기화 시작하기",
  );
}

function syncEndpoint() {
  return `/api/sync-state?id=${encodeURIComponent(state.sync.id)}`;
}

async function requestSync(method, body) {
  const response = await fetch(syncEndpoint(), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "동기화에 실패했습니다.");
    error.code = data.code;
    throw error;
  }
  return data.state;
}

async function pushSyncState({ silent = false } = {}) {
  if (!state.sync.id) return;
  if (!silent) updateSyncStatus("동기화 중", "syncing");
  try {
    const remoteState = await requestSync("PUT", { state: serializeState() });
    if (mergeRecords(remoteState)) {
      saveState({ sync: false });
      renderAllState();
    }
    state.sync.lastSyncedAt = Date.now();
    updateSyncStatus("동기화됨", "synced");
  } catch (error) {
    updateSyncStatus(
      error.code === "SYNC_STORAGE_NOT_CONFIGURED"
        ? "저장소 연결 필요"
        : error.message,
      "error",
    );
  }
}

async function syncNow({ silent = false } = {}) {
  if (!state.sync.id) return;
  if (!silent) updateSyncStatus("동기화 중", "syncing");
  try {
    const remoteState = await requestSync("GET");
    if (mergeRecords(remoteState)) {
      saveState({ sync: false });
      renderAllState();
    }
    await pushSyncState({ silent: true });
  } catch (error) {
    updateSyncStatus(
      error.code === "SYNC_STORAGE_NOT_CONFIGURED"
        ? "저장소 연결 필요"
        : error.message,
      "error",
    );
  }
}

function scheduleSyncPush() {
  if (!state.sync.id) return;
  clearTimeout(state.sync.timer);
  state.sync.timer = setTimeout(() => {
    pushSyncState({ silent: true });
  }, SYNC_DEBOUNCE_MS);
}

function startSyncPolling() {
  clearInterval(state.sync.poller);
  if (!state.sync.id) return;
  state.sync.poller = setInterval(() => {
    if (document.visibilityState === "visible") syncNow({ silent: true });
  }, SYNC_POLL_MS);
}

function saveSyncId(value) {
  state.sync.id = value.trim();
  if (state.sync.id) localStorage.setItem(SYNC_ID_KEY, state.sync.id);
  else localStorage.removeItem(SYNC_ID_KEY);
  $("#sync-id-input").value = state.sync.id;
  updateSyncStatus(
    state.sync.id ? "동기화 준비됨" : "기기별로 저장 중",
    state.sync.id ? "idle" : "off",
  );
  startSyncPolling();
}

function openSyncModal() {
  $("#sync-id-input").value = state.sync.id;
  $("#sync-modal").classList.remove("is-hidden");
  updateSyncStatus();
  requestAnimationFrame(() => $("#sync-id-input").focus());
}

function closeSyncModal() {
  $("#sync-modal").classList.add("is-hidden");
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
    toggleTrackedValue("completed", question.id);
    saveState();
    updateProgress();
    updateCardState(card, question.id);
    updateBulkCompletionButton();
  });
  bookmarkButton.addEventListener("click", () => {
    toggleTrackedValue("bookmarks", question.id);
    saveState();
    if (state.bookmarkOnly) renderStudy();
    else updateCardState(card, question.id);
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

function bindEvents() {
  $("#sync-open").addEventListener("click", openSyncModal);
  $("#sync-close").addEventListener("click", closeSyncModal);
  $("#sync-modal").addEventListener("click", (event) => {
    if (event.target.id === "sync-modal") closeSyncModal();
  });
  $("#sync-save").addEventListener("click", async () => {
    saveSyncId($("#sync-id-input").value);
    if (state.sync.id) await pushSyncState();
    else updateSyncStatus("동기화 ID를 입력하세요.", "error");
  });
  $("#sync-now").addEventListener("click", async () => {
    if (!state.sync.id) saveSyncId($("#sync-id-input").value);
    if (state.sync.id) await syncNow();
    else updateSyncStatus("동기화 ID를 입력하세요.", "error");
  });
  $("#sync-id-input").addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    saveSyncId(event.currentTarget.value);
    if (state.sync.id) await syncNow();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSyncModal();
  });
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
      setTrackedValue("completed", question.id, !allCompleted);
    });
    saveState();
    renderStudy();
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
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncNow({ silent: true });
  });
  window
    .matchMedia("(display-mode: standalone)")
    .addEventListener("change", updateInstallButton);
  updateInstallButton();
  updateSyncStatus(
    state.sync.id ? "동기화 준비됨" : "기기별로 저장 중",
    state.sync.id ? "idle" : "off",
  );
  startSyncPolling();
}

async function init() {
  loadState();
  bindEvents();
  try {
    const questionResponse = await fetch(DATA_URL);
    if (!questionResponse.ok) {
      throw new Error("질문 데이터를 불러오지 못했습니다.");
    }
    state.questions = parseQuestions(await questionResponse.text());
    renderStudy();
    syncNow({ silent: true });
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
