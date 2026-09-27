const CONTENT_URL = "/resume-content.json?v=20260928-resume-v2";
const $ = (selector, root = document) => root.querySelector(selector);

export function createResumeView({ state, setTrackedValue, toggleTrackedValue, saveState, renderParagraphs, updateCardState }) {
  let content = null;
  let loading = false;
  let search = "";
  let bookmarkOnly = false;
  const openQuestions = new Set();
  const root = $("#resume-view");
  const el = (selector) => $(selector, root);

  function filtered() {
    if (!content) return [];
    const query = search.toLocaleLowerCase();
    return content.questions.filter((q) => {
      const project = content.groups.find((g) => g.id === q.group);
      const source = content.statements.find((s) => s.id === q.source);
      return (!bookmarkOnly || state.bookmarks.has(q.id)) &&
        (!query || [q.title, q.answer, q.note || "", project.label, project.company, source.text].join(" ").toLocaleLowerCase().includes(query));
    });
  }

  function card(q, index) {
    const fragment = $("#question-template").content.cloneNode(true);
    const element = $(".question-card", fragment);
    const main = $(".question-main", fragment);
    const panel = $(".answer-panel", fragment);
    const body = $(".answer-body", fragment);
    const project = content.groups.find((g) => g.id === q.group);
    const source = content.statements.find((s) => s.id === q.source);
    element.dataset.id = q.id;
    element.classList.toggle("is-open", openQuestions.has(q.id));
    $(".question-index", fragment).textContent = String(index + 1).padStart(2, "0");
    $(".question-category", fragment).textContent = `${project.company} · ${project.label}`;
    $(".question-title", fragment).textContent = q.title;
    panel.id = `answer-${q.id}`;
    panel.inert = !openQuestions.has(q.id);
    main.setAttribute("aria-controls", panel.id);
    main.setAttribute("aria-expanded", String(openQuestions.has(q.id)));
    renderParagraphs(body, q.answer);
    const quote = document.createElement("blockquote");
    quote.className = "resume-source";
    const label = document.createElement("span");
    label.textContent = "이력서 근거";
    const text = document.createElement("p");
    text.textContent = source.text;
    quote.append(label, text);
    body.before(quote);
    const answerLabel = document.createElement("p");
    answerLabel.className = "resume-answer-label";
    answerLabel.textContent = "답변 예시";
    body.before(answerLabel);
    if (q.note) {
      const note = document.createElement("aside");
      note.className = "resume-note";
      const title = document.createElement("strong");
      title.textContent = "내 경험 보완";
      const text = document.createElement("p");
      text.textContent = q.note;
      note.append(title, text);
      body.after(note);
    }
    if (q.refs?.length) {
      const refs = document.createElement("div");
      refs.className = "resume-references";
      q.refs.forEach((key) => {
        const reference = content.references[key];
        const link = document.createElement("a");
        link.href = reference.url;
        link.textContent = reference.label;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        refs.append(link);
      });
      $(".answer-panel-inner", fragment).append(refs);
    }
    updateCardState(element, q.id);
    main.addEventListener("click", () => {
      const open = element.classList.toggle("is-open");
      if (open) openQuestions.add(q.id); else openQuestions.delete(q.id);
      main.setAttribute("aria-expanded", String(open));
      panel.inert = !open;
    });
    $(".complete-button", fragment).addEventListener("click", () => {
      toggleTrackedValue("completed", q.id);
      saveState();
      updateCardState(element, q.id);
      progress();
    });
    $(".bookmark-button", fragment).addEventListener("click", () => {
      toggleTrackedValue("bookmarks", q.id);
      saveState();
      if (bookmarkOnly) render(); else updateCardState(element, q.id);
    });
    return fragment;
  }

  function progress() {
    const total = content.questions.length;
    const completed = content.questions.filter((q) => state.completed.has(q.id)).length;
    const percent = total ? Math.round(completed / total * 100) : 0;
    el("#resume-progress-percent").textContent = `${percent}%`;
    el("#resume-progress-bar").style.width = `${percent}%`;
    el("#resume-completed-count").textContent = completed;
    el("#resume-total-count").textContent = total;
    const questions = filtered();
    const all = questions.length > 0 && questions.every((q) => state.completed.has(q.id));
    const button = el("#resume-bulk-complete");
    button.disabled = !questions.length;
    button.textContent = all ? "모두 미완료" : "모두 완료";
    button.classList.toggle("is-reset", all);
    button.setAttribute("aria-label", `현재 이력서 질문을 모두 ${all ? "미완료" : "완료"}로 변경`);
  }

  function render() {
    if (!content) return;
    const questions = filtered();
    const list = el("#resume-question-list");
    list.classList.remove("is-loading");
    const fragment = document.createDocumentFragment();
    questions.forEach((q, index) => fragment.append(card(q, index)));
    list.replaceChildren(fragment);
    el("#resume-result-title").textContent = bookmarkOnly ? "북마크 질문" : "전체 질문";
    el("#resume-result-count").textContent = `${questions.length}개 질문 · 전체 ${content.questions.length}개`;
    el("#resume-empty").classList.toggle("is-hidden", questions.length > 0);
    el("#resume-bookmark-filter").classList.toggle("is-active", bookmarkOnly);
    el("#resume-bookmark-filter").setAttribute("aria-pressed", String(bookmarkOnly));
    progress();
  }

  async function load() {
    if (loading) return;
    loading = true;
    el("#resume-error").classList.add("is-hidden");
    el("#resume-result-count").textContent = "질문을 불러오는 중";
    try {
      const response = await fetch(CONTENT_URL);
      if (!response.ok) throw new Error("resume content unavailable");
      const data = await response.json();
      if (!Array.isArray(data.questions) || !data.questions.length) throw new Error("invalid resume content");
      content = data;
      render();
    } catch {
      el("#resume-question-list").classList.remove("is-loading");
      el("#resume-question-list").replaceChildren();
      el("#resume-result-count").textContent = "불러오기 실패";
      el("#resume-error").classList.remove("is-hidden");
    } finally { loading = false; }
  }

  el("#resume-search").addEventListener("input", (event) => { search = event.target.value.trim(); render(); });
  el("#resume-bookmark-filter").addEventListener("click", () => { bookmarkOnly = !bookmarkOnly; render(); });
  el("#resume-bulk-complete").addEventListener("click", () => {
    const questions = filtered();
    const all = questions.every((q) => state.completed.has(q.id));
    questions.forEach((q) => setTrackedValue("completed", q.id, !all));
    saveState();
    render();
  });
  el("#resume-retry").addEventListener("click", load);
  return { load, render };
}
