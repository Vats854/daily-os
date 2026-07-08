const actions = {
  "resume-tailor": "Адаптация резюме",
  "resume-rewrite": "Адаптированное резюме",
  "resume-match": "Мэтч с вакансией",
  "cv-check": "Проверка резюме",
  "cover-letter": "Сопроводительное письмо"
};

const state = {
  backgroundText: localStorage.getItem("career-tailor.background") || "",
  cvText: localStorage.getItem("career-tailor.cv") || "",
  jobText: localStorage.getItem("career-tailor.job") || "",
  clarificationText: localStorage.getItem("career-tailor.clarifications") || "",
  latest: null,
  loading: false
};

const backgroundInput = document.querySelector("#backgroundText");
const cvInput = document.querySelector("#cvText");
const jobInput = document.querySelector("#jobText");
const clarificationInput = document.querySelector("#clarificationText");
const backgroundCount = document.querySelector("#backgroundCount");
const cvCount = document.querySelector("#cvCount");
const jobCount = document.querySelector("#jobCount");
const clarificationCount = document.querySelector("#clarificationCount");
const result = document.querySelector("#result");
const resultTitle = document.querySelector("#resultTitle");
const resultBadge = document.querySelector("#resultBadge");
const providerState = document.querySelector("#providerState");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function syncInputs() {
  backgroundInput.value = state.backgroundText;
  cvInput.value = state.cvText;
  jobInput.value = state.jobText;
  clarificationInput.value = state.clarificationText;
  backgroundCount.textContent = `${wordCount(state.backgroundText)} слов`;
  cvCount.textContent = `${wordCount(state.cvText)} слов`;
  jobCount.textContent = `${wordCount(state.jobText)} слов`;
  clarificationCount.textContent = `${wordCount(state.clarificationText)} слов`;
}

function setBusy(action) {
  state.loading = true;
  resultTitle.textContent = actions[action] || "Обработка";
  resultBadge.textContent = "думаю";
  result.className = "loading-state";
  result.innerHTML = "<strong>Собираю результат...</strong><p>Сравниваю факты резюме с вакансией и готовлю формулировки без выдуманных достижений.</p>";
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.disabled = true;
  });
}

function setIdle() {
  state.loading = false;
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.disabled = false;
  });
}

async function runAction(action) {
  if (state.loading) return;
  const backgroundText = state.backgroundText.trim();
  const cvText = state.cvText.trim();
  const jobText = state.jobText.trim();
  const clarificationText = state.clarificationText.trim();
  const factContext = [
    backgroundText,
    clarificationText ? `Ответы на уточнения:\n${clarificationText}` : ""
  ].filter(Boolean).join("\n\n");

  if ((!cvText && !factContext) || (action !== "cv-check" && !jobText)) {
    resultTitle.textContent = "Не хватает текста";
    resultBadge.textContent = "нужно заполнить";
    result.className = "empty-state error";
    result.innerHTML = "<strong>Нужна база фактов или резюме.</strong><p>Для адаптации, мэтча и письма добавь ещё вакансию. Для проверки достаточно базы фактов или резюме.</p>";
    return;
  }

  setBusy(action);
  try {
    const response = await fetch(`/api/career/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ backgroundText: factContext, cvText, jobText })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Request failed");
    state.latest = payload.result;
    renderResult(payload.result);
  } catch (error) {
    resultTitle.textContent = "Ошибка";
    resultBadge.textContent = "не готово";
    result.className = "empty-state error";
    result.innerHTML = `<strong>Не получилось получить результат.</strong><p>${escapeHtml(error.message)}</p>`;
  } finally {
    setIdle();
  }
}

function renderSummary(text, score) {
  const scoreHtml = typeof score === "number" ? `<strong class="score">${Math.round(score)}%</strong>` : "";
  return `<article class="summary-card"><span>Короткий вывод</span><p>${escapeHtml(text || "Готово.")}</p>${scoreHtml}</article>`;
}

function renderProviderWarning(data) {
  if (!data.provider_warning) return "";
  return `<article class="provider-warning"><strong>AI-провайдер не сработал</strong><p>${escapeHtml(data.provider_warning)}</p></article>`;
}

function renderInsightBlocks(data) {
  const atsKeywords = (data.ats_keywords || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const usedFacts = (data.used_facts || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const questions = (data.clarifying_questions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  if (!atsKeywords && !usedFacts && !questions) return "";

  return `
    <div class="insight-grid">
      ${atsKeywords ? `<article class="insight-card"><strong>ATS-ключи</strong><ul>${atsKeywords}</ul></article>` : ""}
      ${usedFacts ? `<article class="insight-card"><strong>Использованные факты</strong><ul>${usedFacts}</ul></article>` : ""}
      ${questions ? `<article class="insight-card question"><strong>Уточнить</strong><ul>${questions}</ul></article>` : ""}
    </div>
  `;
}

function renderTailor(data) {
  const cards = (data.suggestions || []).map((item) => `
    <article class="tailor-card ${escapeHtml(item.status || "warning")}">
      <div class="tailor-head">
        <span class="status-dot">!</span>
        <div>
          <strong>${escapeHtml(item.section)}</strong>
          <p>${escapeHtml(item.headline)}</p>
        </div>
        <small>${escapeHtml(item.confidence || "review")}</small>
      </div>
      <div class="compare">
        <div>
          <span>в резюме</span>
          <p>${escapeHtml(item.before)}</p>
        </div>
        <div>
          <span class="proposed">предлагаем</span>
          <p>${escapeHtml(item.after)}</p>
          <button type="button" class="copy-button" data-copy="${escapeHtml(item.after)}">Копировать</button>
        </div>
      </div>
      <p class="signal">${escapeHtml(item.vacancy_signal)}</p>
      <p class="reason">${escapeHtml(item.reason)}</p>
      <p class="risk">${escapeHtml(item.risk)}</p>
    </article>
  `).join("");
  return `${renderSummary(data.summary)}${renderProviderWarning(data)}${renderInsightBlocks(data)}<div class="result-list">${cards}</div>`;
}

function renderMatch(data) {
  const dimensions = (data.dimensions || []).map((item) => `
    <article class="metric-card ${escapeHtml(item.status)}">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.comment)}</p>
      </div>
      <span>${Math.round(item.score || 0)}%</span>
      ${item.current_issue ? `<p class="issue">${escapeHtml(item.current_issue)}</p>` : ""}
      <p class="recommendation">${escapeHtml(item.recommendation)}</p>
    </article>
  `).join("");
  return `${renderSummary(data.summary, data.match_percentage)}${renderProviderWarning(data)}<div class="result-list">${dimensions}</div>`;
}

function renderCheck(data) {
  const criteria = (data.criteria || []).map((item) => `
    <article class="metric-card ${escapeHtml(item.status)}">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <p>${escapeHtml(item.comment)}</p>
      </div>
      ${item.current_issue ? `<p class="issue">${escapeHtml(item.current_issue)}</p>` : ""}
      <p class="recommendation">${escapeHtml(item.recommendation)}</p>
    </article>
  `).join("");
  return `${renderSummary(data.summary, data.overall_score)}${renderProviderWarning(data)}<div class="result-list">${criteria}</div>`;
}

function renderLetter(data) {
  return `
    ${renderSummary(data.summary)}
    ${renderProviderWarning(data)}
    <article class="letter-card">
      <strong>${escapeHtml(data.title || "Сопроводительное письмо")}</strong>
      <p>${escapeHtml(data.coverLetter).replaceAll("\n", "<br>")}</p>
      <button type="button" class="copy-button" data-copy="${escapeHtml(data.coverLetter)}">Копировать письмо</button>
    </article>
  `;
}

function renderResume(data) {
  const sections = data.resume || {};
  const experience = (sections.experience || []).map((item) => `
    <section class="resume-section">
      <strong>${escapeHtml(item.role || "Опыт")}</strong>
      ${item.company ? `<span>${escapeHtml(item.company)}</span>` : ""}
      <ul>
        ${(item.bullets || []).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}
      </ul>
    </section>
  `).join("");
  const skills = (sections.skills || []).map((skill) => `<li>${escapeHtml(skill)}</li>`).join("");
  const additional = (sections.additional || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const fullText = data.fullText || [
    sections.title,
    sections.summary,
    (sections.skills || []).join("; "),
    ...(sections.experience || []).flatMap((item) => [item.role, ...(item.bullets || [])]),
    ...(sections.additional || [])
  ].filter(Boolean).join("\n\n");

  return `
    ${renderSummary(data.summary)}
    ${renderProviderWarning(data)}
    ${renderInsightBlocks(data)}
    <article class="resume-document">
      <header>
        <span>готовая версия</span>
        <h3>${escapeHtml(sections.title || "Адаптированное резюме")}</h3>
        <p>${escapeHtml(sections.summary || "")}</p>
      </header>
      ${skills ? `<section class="resume-section"><strong>Ключевые навыки</strong><ul>${skills}</ul></section>` : ""}
      ${experience}
      ${additional ? `<section class="resume-section"><strong>Дополнительно</strong><ul>${additional}</ul></section>` : ""}
      <button type="button" class="copy-button document-copy" data-copy="${escapeHtml(fullText)}">Копировать резюме</button>
    </article>
    ${(data.risks || []).length ? `<article class="risk-list"><strong>Проверить перед отправкой</strong><ul>${data.risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul></article>` : ""}
  `;
}

function renderResult(data) {
  providerState.textContent = data.provider || "local";
  resultTitle.textContent = actions[data.kind] || "Результат";
  resultBadge.textContent = data.provider === "openai" ? "OPENAI" : data.provider === "gemini" ? "GEMINI" : "LOCAL";
  result.className = "result-content";

  if (data.kind === "resume-tailor") result.innerHTML = renderTailor(data);
  else if (data.kind === "resume-rewrite") result.innerHTML = renderResume(data);
  else if (data.kind === "resume-match") result.innerHTML = renderMatch(data);
  else if (data.kind === "cover-letter") result.innerHTML = renderLetter(data);
  else result.innerHTML = renderCheck(data);
}

document.addEventListener("input", (event) => {
  if (event.target === backgroundInput) {
    state.backgroundText = backgroundInput.value;
    localStorage.setItem("career-tailor.background", state.backgroundText);
  }
  if (event.target === cvInput) {
    state.cvText = cvInput.value;
    localStorage.setItem("career-tailor.cv", state.cvText);
  }
  if (event.target === jobInput) {
    state.jobText = jobInput.value;
    localStorage.setItem("career-tailor.job", state.jobText);
  }
  if (event.target === clarificationInput) {
    state.clarificationText = clarificationInput.value;
    localStorage.setItem("career-tailor.clarifications", state.clarificationText);
  }
  syncInputs();
});

document.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    await runAction(actionButton.dataset.action);
    return;
  }

  const copyButton = event.target.closest("[data-copy]");
  if (copyButton) {
    await navigator.clipboard.writeText(copyButton.dataset.copy || "");
    copyButton.textContent = "Скопировано";
    setTimeout(() => { copyButton.textContent = "Копировать"; }, 1200);
    return;
  }

  if (event.target.closest("#clearButton")) {
    state.backgroundText = "";
    state.cvText = "";
    state.jobText = "";
    state.clarificationText = "";
    state.latest = null;
    localStorage.removeItem("career-tailor.background");
    localStorage.removeItem("career-tailor.cv");
    localStorage.removeItem("career-tailor.job");
    localStorage.removeItem("career-tailor.clarifications");
    syncInputs();
    resultTitle.textContent = "Готов к работе";
    resultBadge.textContent = "ожидание";
    result.className = "empty-state";
    result.innerHTML = "<strong>Вставь резюме и вакансию, затем нажми “Адаптировать”.</strong><p>Приложение покажет короткий вывод, конкретные правки и готовые формулировки.</p>";
  }
});

syncInputs();
