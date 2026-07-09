import {
  getAppConfig,
  getAuthSession,
  loadCloudState,
  onAuthStateChange,
  saveCloudState,
  signInWithGithub,
  signOut
} from "./supabase-client.js";

const STORAGE_KEY = "second-brain-command-center:v1";
const isLocalDev = ["127.0.0.1", "localhost", ""].includes(window.location.hostname);
const cloudSync = {
  configured: false,
  session: null,
  timer: null,
  status: "local",
  error: ""
};
const boardColumns = [
  ["inbox", "Inbox"],
  ["backlog", "Backlog"],
  ["this_week", "This week"],
  ["today", "Today"],
  ["done", "Done"]
];

const areaLabels = {
  career: "карьера",
  work: "работа",
  learning: "обучение",
  personal: "личное",
  health: "здоровье",
  admin: "админ"
};

const categoryKindLabels = {
  project: "проект",
  routine: "рутина",
  admin: "админ"
};

const journeyStages = [
  ["call", "Замысел", "зов"],
  ["commitment", "Решение", "порог"],
  ["preparation", "Подготовка", "сбор ресурсов"],
  ["trial", "Испытание", "дорога"],
  ["crisis", "Узкое место", "кризис"],
  ["result", "Результат", "награда"],
  ["integration", "Интеграция", "возвращение"]
];

const todayIso = new Date().toISOString().slice(0, 10);
const dayMs = 24 * 60 * 60 * 1000;
const taskStatuses = ["inbox", "backlog", "this_week", "today", "done"];
const priorities = ["low", "medium", "high"];
const habitGroups = ["morning", "afternoon", "night", "anytime"];
const habitGroupLabels = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
  anytime: "Anytime"
};
const focusModes = {
  focus: { label: "Focus 25", seconds: 25 * 60 },
  short_break: { label: "Break 5", seconds: 5 * 60 }
};
const soundCategories = {
  deep_work: "Deep Work",
  calm_focus: "Calm Focus",
  coding: "Coding",
  reading: "Reading",
  rain: "Rain",
  brown_noise: "Brown Noise"
};

const focusRuntime = {
  timerId: null,
  startedAt: null,
  audioContext: null,
  source: null,
  gain: null,
  isSoundPlaying: false
};

const projectIds = {
  pwa: crypto.randomUUID(),
  health: crypto.randomUUID(),
  personal: crypto.randomUUID()
};

const seedState = {
  settings: {
    autonomy: "maximum",
    activeView: "today"
  },
  focus: {
    selectedTaskId: null,
    timerMode: "focus",
    remainingSeconds: focusModes.focus.seconds,
    soundCategory: "deep_work",
    volume: 0.35,
    running: false
  },
  focusSessions: [],
  dailyPlan: {
    date: todayIso,
    focus: "Собрать понятный день без перегруза",
    status: "steady",
    energy: "medium",
    reviewSummary: "",
    tomorrowInherits: [],
    timeBlocks: [
      timeBlock("09:30", "10:00", "План дня", "Выбрать главный результат и ограничения", "confirmed"),
      timeBlock("10:00", "12:00", "Поиск работы", "2–3 качественных отклика до вечернего проседания", "must"),
      timeBlock("13:30", "14:00", "Еда / восстановление", "Пауза без добивания себя задачами", "ok"),
      timeBlock("16:00", "17:00", "Обучение", "Один источник: математика или vibe coding", "choose"),
      timeBlock("22:00", "22:15", "Review", "Факт дня, переносы, что изменить завтра", "draft")
    ]
  },
  habits: [
    habit("Утренний план", "personal", 6),
    habit("Движение / спорт", "health", 4),
    habit("Фокус-блок без отвлечений", "work", 5),
    habit("Вечерний review", "personal", 3)
  ],
  routines: [
    routine("Планирование дня", "admin"),
    routine("Восстановление", "health"),
    routine("Вечерний review", "admin"),
    routine("BJJ / движение", "health")
  ],
  weeklyPlan: {
    focus: [
      { id: crypto.randomUUID(), title: "Запустить рабочий PWA-прототип", area: "work", progress: 35 },
      { id: crypto.randomUUID(), title: "Удержать спорт и сон как базу", area: "health", progress: 45 },
      { id: crypto.randomUUID(), title: "Разобрать личные хвосты без драматизации", area: "personal", progress: 20 }
    ]
  },
  selectedProjectId: projectIds.pwa,
  projects: [
    project({
      id: projectIds.pwa,
      title: "Second Brain MVP",
      area: "work",
      progress: 35,
      journeyStage: "trial",
      journeyStatus: "active",
      stageReason: "Есть рабочий прототип, но ещё проверяется связка Today / Week / Overview.",
      nextTransition: "Довести online deploy и синхронизацию, затем перейти к результату."
    }),
    project({
      id: projectIds.health,
      title: "Спорт и восстановление",
      area: "health",
      progress: 45,
      journeyStage: "preparation",
      journeyStatus: "active",
      stageReason: "Ритуал есть, но правила нагрузки и восстановления ещё не зафиксированы.",
      nextTransition: "Собрать устойчивый недельный ритм и перейти в испытание."
    }),
    project({
      id: projectIds.personal,
      title: "Личные хвосты без перегруза",
      area: "personal",
      progress: 20,
      journeyStage: "call",
      journeyStatus: "watch",
      stageReason: "Есть накопленные хвосты, но не выбран критерий, что действительно важно.",
      nextTransition: "Принять решение: что берём в неделю, что уходит в backlog."
    })
  ],
  projectStageEvents: [
    stageEvent(projectIds.pwa, "preparation", "trial", "Прототип перешёл от подготовки к регулярной проверке сценариев.", "assistant", "confirmed"),
    stageEvent(projectIds.health, "call", "preparation", "Здоровье вынесено в ритуалы и ограничения планирования.", "assistant", "confirmed")
  ],
  projectObstacles: [
    obstacle(projectIds.pwa, "scope", "Есть риск раньше времени уйти в архитектуру вместо проверки daily flow.", "medium"),
    obstacle(projectIds.personal, "clarity", "Хвосты пока не разделены на обязательные и шум.", "low")
  ],
  tasks: [
    task("Проверить первый экран Today на телефоне", "today", "work", "high", 35, projectIds.pwa),
    task("Сформулировать 3 главных результата недели", "today", "personal", "high", 25, projectIds.personal),
    task("Заложить восстановление после рабочего блока", "this_week", "health", "medium", 30, projectIds.health),
    task("Перенести старые Telegram-заметки в inbox", "backlog", "personal", "medium", 45, projectIds.personal),
    task("Закрыть утренний обзор", "done", "personal", "high", 15, projectIds.personal)
  ],
  notes: [
    {
      id: crypto.randomUUID(),
      type: "memory",
      area: "personal",
      text: "Главный экран должен отвечать на вопрос: что делать сегодня.",
      createdAt: new Date().toISOString()
    }
  ],
  inboxItems: [],
  dailyReviews: [],
  calendarEvents: [
    calendar("10:00", "11:00", "Рабочий созвон", "work"),
    calendar("13:30", "14:00", "Пауза / еда", "health"),
    calendar("19:00", "20:00", "Спорт", "health")
  ],
  assistantActions: [
    action("Система подготовлена", "Создан стартовый день, неделя и канбан.", "confirmed")
  ],
  memoryItems: [
    {
      id: crypto.randomUUID(),
      key: "planning_rule",
      text: "В интерфейсе показывать только операционку дня и недели; глубину держать в памяти.",
      confidence: "high",
      createdAt: new Date().toISOString()
    }
  ]
};

let state = loadState();
state.ui = state.ui || {};
state.ui.selectedDayBlockIndex = Number.isInteger(state.ui.selectedDayBlockIndex) ? state.ui.selectedDayBlockIndex : 1;
state.ui.selectedInboxId = state.ui.selectedInboxId || null;
state.ui.selectedTaskId = state.tasks.some((item) => item.id === state.ui.selectedTaskId) ? state.ui.selectedTaskId : null;

function task(title, status = "inbox", area = "work", priority = "medium", estimate = 30, projectId = null) {
  return {
    id: crypto.randomUUID(),
    projectId,
    title,
    status,
    area,
    priority,
    estimate,
    previousStatus: status === "done" ? "today" : status,
    dueDate: "",
    tags: [],
    needsReview: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function project({ id = crypto.randomUUID(), title, area = "work", progress = 0, journeyStage = "call", journeyStatus = "active", stageReason = "", nextTransition = "" }) {
  return {
    id,
    title,
    area,
    status: "active",
    progress,
    journeyStage,
    journeyStatus,
    stageReason,
    nextTransition,
    proposedStage: null,
    proposedReason: "",
    lastStageReviewAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function stageEvent(projectId, fromStage, toStage, reason, proposedBy = "assistant", status = "needs_confirmation") {
  return {
    id: crypto.randomUUID(),
    projectId,
    fromStage,
    toStage,
    reason,
    evidence: [],
    proposedBy,
    status,
    createdAt: new Date().toISOString()
  };
}

function obstacle(projectId, type, text, severity = "medium", status = "open") {
  return {
    id: crypto.randomUUID(),
    projectId,
    type,
    text,
    severity,
    status,
    sourceType: "assistant_action",
    sourceId: null,
    createdAt: new Date().toISOString()
  };
}

function habit(title, area = "personal", streak = 0) {
  return {
    id: crypto.randomUUID(),
    title,
    area,
    group: area === "health" ? "afternoon" : title.toLowerCase().includes("вечер") ? "night" : "morning",
    streak,
    completions: {},
    createdAt: new Date().toISOString()
  };
}

function routine(title, area = "personal") {
  return {
    id: crypto.randomUUID(),
    title,
    area,
    status: "active",
    createdAt: new Date().toISOString()
  };
}

function timeBlock(start, end, title, nextAction, status = "draft") {
  return {
    id: crypto.randomUUID(),
    start,
    end,
    title,
    nextAction,
    status,
    createdAt: new Date().toISOString()
  };
}

function calendar(start, end, title, area) {
  return {
    id: crypto.randomUUID(),
    date: todayIso,
    start,
    end,
    title,
    area,
    source: "calendar_readonly"
  };
}

function action(title, reason, status = "confirmed") {
  return {
    id: crypto.randomUUID(),
    title,
    reason,
    status,
    createdAt: new Date().toISOString()
  };
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return normalizeState(structuredClone(seedState));
  try {
    return normalizeState({ ...structuredClone(seedState), ...JSON.parse(stored) });
  } catch {
    return normalizeState(structuredClone(seedState));
  }
}

function normalizeState(nextState) {
  nextState.settings = { ...seedState.settings, ...(nextState.settings || {}) };
  if (nextState.settings.activeView === "overview") nextState.settings.activeView = "projects";
  if (!["inbox", "today", "week", "projects", "board", "log"].includes(nextState.settings.activeView)) {
    nextState.settings.activeView = "today";
  }
  nextState.ui = nextState.ui || {};
  nextState.focus = {
    ...seedState.focus,
    ...(nextState.focus || {})
  };
  if (!focusModes[nextState.focus.timerMode]) nextState.focus.timerMode = "focus";
  if (!Number.isFinite(nextState.focus.remainingSeconds) || nextState.focus.remainingSeconds <= 0) {
    nextState.focus.remainingSeconds = focusModes[nextState.focus.timerMode].seconds;
  }
  if (!soundCategories[nextState.focus.soundCategory]) nextState.focus.soundCategory = "deep_work";
  nextState.focus.volume = Math.max(0, Math.min(1, Number(nextState.focus.volume) || seedState.focus.volume));
  nextState.focus.running = false;
  nextState.focusSessions = Array.isArray(nextState.focusSessions) ? nextState.focusSessions : [];
  nextState.dailyPlan = { ...seedState.dailyPlan, ...(nextState.dailyPlan || {}) };
  nextState.dailyPlan.timeBlocks = Array.isArray(nextState.dailyPlan.timeBlocks)
    ? nextState.dailyPlan.timeBlocks
    : structuredClone(seedState.dailyPlan.timeBlocks);
  nextState.weeklyPlan = { ...seedState.weeklyPlan, ...(nextState.weeklyPlan || {}) };
  nextState.projects = Array.isArray(nextState.projects) ? nextState.projects : structuredClone(seedState.projects);
  nextState.selectedProjectId = nextState.selectedProjectId || nextState.projects[0]?.id || null;
  nextState.projectStageEvents = Array.isArray(nextState.projectStageEvents) ? nextState.projectStageEvents : structuredClone(seedState.projectStageEvents);
  nextState.projectObstacles = Array.isArray(nextState.projectObstacles) ? nextState.projectObstacles : structuredClone(seedState.projectObstacles);
  nextState.tasks = Array.isArray(nextState.tasks) ? nextState.tasks : [];
  nextState.tasks.forEach((item) => {
    if (!taskStatuses.includes(item.status)) item.status = "inbox";
    if (!priorities.includes(item.priority)) item.priority = "medium";
    item.previousStatus = taskStatuses.includes(item.previousStatus) && item.previousStatus !== "done" ? item.previousStatus : (item.status === "done" ? "today" : item.status);
    item.estimate = Number.isFinite(Number(item.estimate)) ? Number(item.estimate) : 30;
    item.dueDate = item.dueDate || "";
    item.tags = Array.isArray(item.tags) ? item.tags : [];
  });
  if (nextState.focus.selectedTaskId && !nextState.tasks.some((item) => item.id === nextState.focus.selectedTaskId)) {
    nextState.focus.selectedTaskId = null;
  }
  nextState.habits = Array.isArray(nextState.habits) && nextState.habits.length
    ? nextState.habits
    : structuredClone(seedState.habits);
  nextState.habits.forEach((item) => {
    item.completions = item.completions || {};
    item.streak = Number.isFinite(item.streak) ? item.streak : 0;
    item.group = habitGroups.includes(item.group) ? item.group : "anytime";
  });
  nextState.notes = Array.isArray(nextState.notes) ? nextState.notes : [];
  nextState.inboxItems = Array.isArray(nextState.inboxItems) ? nextState.inboxItems : [];
  nextState.dailyReviews = Array.isArray(nextState.dailyReviews) ? nextState.dailyReviews : [];
  nextState.calendarEvents = Array.isArray(nextState.calendarEvents) ? nextState.calendarEvents : [];
  nextState.assistantActions = Array.isArray(nextState.assistantActions) ? nextState.assistantActions : [];
  nextState.memoryItems = Array.isArray(nextState.memoryItems) ? nextState.memoryItems : [];
  nextState.routines = Array.isArray(nextState.routines) ? nextState.routines : structuredClone(seedState.routines);
  ensureStandardTaxonomy(nextState);
  return nextState;
}


function findByTitle(items, title) {
  return items.find((item) => item.title.toLowerCase() === title.toLowerCase());
}

function ensureProject(nextState, title, area, details = {}) {
  let item = findByTitle(nextState.projects, title);
  if (!item) {
    item = project({ title, area, ...details });
    nextState.projects.unshift(item);
  }
  return item;
}

function ensureRoutine(nextState, title, area) {
  let item = findByTitle(nextState.routines, title);
  if (!item) {
    item = routine(title, area);
    nextState.routines.push(item);
  }
  return item;
}

function ensureStandardTaxonomy(nextState) {
  const job = ensureProject(nextState, "Поиск работы", "career", {
    journeyStage: "trial",
    journeyStatus: "active",
    stageReason: "Главный карьерный квест: отклики, интервью, реакция рынка.",
    nextTransition: "Если есть интервью — перейти к результату; если тишина — разобрать узкое место."
  });
  const dailyOs = ensureProject(nextState, "Daily OS", "work", {
    journeyStage: "trial",
    journeyStatus: "active",
    stageReason: "Продуктовый прототип проверяется на реальном daily flow.",
    nextTransition: "Оставить только рабочие сценарии и убрать лишние панели."
  });
  const learning = ensureProject(nextState, "Обучение", "learning", {
    journeyStage: "preparation",
    journeyStatus: "active",
    stageReason: "Нужно сузить источники и привязать обучение к карьерному фокусу.",
    nextTransition: "Выбрать один трек на неделю и проверить применимость."
  });
  const sport = ensureProject(nextState, "Спорт и восстановление", "health", {
    journeyStage: "preparation",
    journeyStatus: "active",
    stageReason: "Есть тренировки, но ещё не зафиксированы правила нагрузки, сна, питания и восстановления.",
    nextTransition: "Две недели выдержан ритм BJJ + восстановление без провала энергии."
  });
  const plan = ensureRoutine(nextState, "Планирование дня", "admin");
  const recovery = ensureRoutine(nextState, "Восстановление", "health");
  const review = ensureRoutine(nextState, "Вечерний review", "admin");

  nextState.tasks.forEach((item) => {
    if (item.projectId || item.routineId) return;
    const text = item.title.toLowerCase();
    if (/отклик|резюме|ваканс|собесед|работ/.test(text)) {
      item.projectId = job.id;
      item.area = "career";
    } else if (/экран|today|daily|app|pwa|прототип|интерфейс|редизайн|дизайн/.test(text)) {
      item.projectId = dailyOs.id;
      item.area = "work";
    } else if (/обуч|курс|математ|coding|код|лекц/.test(text)) {
      item.projectId = learning.id;
      item.area = "learning";
    } else if (/сон|спорт|bjj|движ|восстанов|еда|пауза/.test(text)) {
      item.projectId = sport.id;
      item.area = "health";
    } else if (/план|обзор/.test(text)) {
      item.routineId = plan.id;
      item.area = "admin";
    } else if (/review|итог|вечер/.test(text)) {
      item.routineId = review.id;
      item.area = "admin";
    }
  });
}

function categoryForTask(item) {
  const projectItem = state.projects.find((projectItem) => projectItem.id === item.projectId);
  if (projectItem) return { kind: "project", title: projectItem.title, area: projectItem.area };
  const routineItem = state.routines.find((routineItem) => routineItem.id === item.routineId);
  if (routineItem) return { kind: "routine", title: routineItem.title, area: routineItem.area };
  return { kind: "admin", title: areaLabels[item.area] || "Без проекта", area: item.area || "admin" };
}

function categoryForBlock(block) {
  const text = `${block.title} ${block.nextAction}`.toLowerCase();
  const byTitle = (items, title) => findByTitle(items, title);
  if (/поиск работ|отклик|резюме|ваканс/.test(text)) {
    const item = byTitle(state.projects, "Поиск работы");
    return { kind: "project", title: item?.title || "Поиск работы", area: "career" };
  }
  if (/обуч|coding|математ|курс/.test(text)) {
    const item = byTitle(state.projects, "Обучение");
    return { kind: "project", title: item?.title || "Обучение", area: "learning" };
  }
  if (/план дня|выбрать главный|планирование/.test(text)) {
    const item = byTitle(state.routines, "Планирование дня");
    return { kind: "routine", title: item?.title || "Планирование дня", area: "admin" };
  }
  if (/еда|восстанов|пауза|спорт|сон/.test(text)) {
    const item = byTitle(state.routines, "Восстановление");
    return { kind: "routine", title: item?.title || "Восстановление", area: "health" };
  }
  if (/review|итог|перенос|завтра/.test(text)) {
    const item = byTitle(state.routines, "Вечерний review");
    return { kind: "routine", title: item?.title || "Вечерний review", area: "admin" };
  }
  return { kind: "admin", title: "Операционка", area: "admin" };
}

function renderCategoryChip(category) {
  return `<span class="category-chip ${escapeHtml(category.kind)}"><span>${escapeHtml(categoryKindLabels[category.kind] || category.kind)} · ${escapeHtml(category.title)}</span></span>`;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueCloudSave();
  render();
}

function authLabel(session) {
  const meta = session?.user?.user_metadata || {};
  return meta.user_name || meta.preferred_username || session?.user?.email || "GitHub";
}

function friendlySyncError(message) {
  const text = String(message || "");
  if (/daily_os_states|relation .* does not exist|schema cache|PGRST205|PGRST116/i.test(text)) {
    return "Нужно один раз запустить SQL из db/supabase-state-sync.sql в Supabase SQL Editor.";
  }
  if (/row-level security|permission denied|violates row-level security|42501/i.test(text)) {
    return "Supabase подключён, но RLS-политики не дают сохранить данные. Перезапусти db/supabase-state-sync.sql.";
  }
  return text || "Cloud sync failed";
}

function updateAuthUi() {
  const status = document.querySelector("#authStatus");
  const authButton = document.querySelector("#authButton");
  const signOutButton = document.querySelector("#signOutButton");
  const gateButton = document.querySelector("#authGateButton");
  const gateStatus = document.querySelector("#authGateStatus");
  if (!status || !authButton || !signOutButton || !gateButton || !gateStatus) return;

  authButton.disabled = false;
  signOutButton.disabled = false;
  gateButton.disabled = false;
  authButton.classList.toggle("is-hidden", Boolean(cloudSync.session));
  signOutButton.classList.toggle("is-hidden", !cloudSync.session);

  if (!cloudSync.configured) {
    document.body.dataset.auth = isLocalDev ? "local" : "signed-out";
    status.textContent = isLocalDev ? "local" : "auth off";
    authButton.textContent = isLocalDev ? "Supabase off" : "Auth недоступен";
    gateButton.textContent = "Вход временно недоступен";
    gateButton.disabled = true;
    gateStatus.textContent = isLocalDev
      ? "Локальный режим без облачной синхронизации."
      : "Supabase config не найден в этом deployment.";
    authButton.disabled = true;
    return;
  }

  if (cloudSync.error) {
    const friendlyError = friendlySyncError(cloudSync.error);
    document.body.dataset.auth = cloudSync.session ? "signed-in" : "signed-out";
    status.textContent = cloudSync.session ? "setup needed" : "auth error";
    status.title = friendlyError;
    gateButton.textContent = "Повторить вход через GitHub";
    gateStatus.textContent = friendlyError;
    return;
  }

  status.title = "";
  if (cloudSync.session) {
    document.body.dataset.auth = "signed-in";
    status.textContent = `sync · ${authLabel(cloudSync.session)}`;
    gateStatus.textContent = "Вход выполнен.";
    return;
  }

  document.body.dataset.auth = "signed-out";
  status.textContent = cloudSync.status === "redirect" ? "redirect" : "private";
  authButton.textContent = "GitHub вход";
  gateButton.textContent = cloudSync.status === "redirect" ? "Открываем GitHub..." : "Войти через GitHub";
  gateButton.disabled = cloudSync.status === "redirect";
  gateStatus.textContent = "Доступ к рабочему пространству откроется после GitHub-входа.";
}

async function beginGithubSignIn() {
  cloudSync.error = "";
  cloudSync.status = "redirect";
  updateAuthUi();
  try {
    await signInWithGithub();
  } catch (error) {
    cloudSync.error = error instanceof Error ? error.message : "GitHub sign-in failed";
    cloudSync.status = "local";
    updateAuthUi();
  }
}

async function hydrateCloudState(session) {
  if (!session) return;
  cloudSync.status = "syncing";
  cloudSync.error = "";
  updateAuthUi();

  try {
    const remote = await loadCloudState();
    if (remote?.state) {
      state = normalizeState({ ...structuredClone(seedState), ...remote.state });
      state.ui = state.ui || {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      cloudSync.status = "synced";
      render();
      updateAuthUi();
      return;
    }

    await saveCloudState(state);
    cloudSync.status = "synced";
    updateAuthUi();
  } catch (error) {
    cloudSync.error = friendlySyncError(error instanceof Error ? error.message : "Cloud sync failed");
    updateAuthUi();
  }
}

function queueCloudSave() {
  if (!cloudSync.configured || !cloudSync.session) return;
  window.clearTimeout(cloudSync.timer);
  cloudSync.status = "syncing";
  updateAuthUi();
  cloudSync.timer = window.setTimeout(async () => {
    try {
      await saveCloudState(state);
      cloudSync.status = "synced";
      cloudSync.error = "";
    } catch (error) {
      cloudSync.error = friendlySyncError(error instanceof Error ? error.message : "Cloud sync failed");
    }
    updateAuthUi();
  }, 600);
}

async function initAuth() {
  try {
    const config = await getAppConfig();
    cloudSync.configured = Boolean(config.supabase?.enabled);
    if (!cloudSync.configured) {
      updateAuthUi();
      return;
    }

    cloudSync.session = await getAuthSession();
    cloudSync.status = cloudSync.session ? "synced" : "private";
    updateAuthUi();
    if (cloudSync.session) await hydrateCloudState(cloudSync.session);

    await onAuthStateChange(async (session) => {
      cloudSync.session = session;
      cloudSync.status = session ? "syncing" : "private";
      cloudSync.error = "";
      updateAuthUi();
      if (session) await hydrateCloudState(session);
    });
  } catch (error) {
    cloudSync.error = error instanceof Error ? error.message : "Auth unavailable";
    updateAuthUi();
  }
}

function classifyInbox(text) {
  const lower = text.toLowerCase();
  const result = {
    kind: "note",
    area: "personal",
    status: "inbox",
    priority: "medium",
    needsReview: false,
    title: text.trim().replace(/\s+/g, " ").slice(0, 92)
  };

  if (/(сделать|надо|задач|дедлайн|позвонить|написать|проверить|закрыть)/i.test(text)) {
    result.kind = "task";
    result.status = /(сегодня|утром|вечером|срочно|важно)/i.test(text) ? "today" : "backlog";
  }

  if (/(перенеси|перенести|завтра|на неделю|отложи|отложить)/i.test(text)) {
    result.kind = "plan_change";
    result.status = /сегодня/i.test(text) ? "today" : "this_week";
  }

  if (/(болит|сон|устал|усталость|энерг|спорт|здоров|выгор|тревог)/i.test(lower)) {
    result.area = "health";
    result.kind = result.kind === "task" ? "task" : "health_signal";
  }

  if (/(работ|клиент|проект|crm|созвон|документ|релиз|код|mvp)/i.test(lower)) {
    result.area = "work";
  }

  if (/(идея|мысль|инсайт|понял|заметка|обучен|курс)/i.test(lower)) {
    result.kind = result.kind === "task" ? "task" : "note";
  }

  if (/(может быть|не уверен|кажется|когда-нибудь|потом)/i.test(lower)) {
    result.needsReview = true;
    result.priority = "low";
  }

  if (/(важно|срочно|главн|критич)/i.test(lower)) {
    result.priority = "high";
  }

  return result;
}

function dailyAiContext() {
  return {
    activeView: state.settings.activeView,
    dayFocus: state.dailyPlan.focus,
    dayStatus: state.dailyPlan.status,
    todayTaskCount: state.tasks.filter((item) => item.status === "today").length,
    projects: state.projects
      .filter((item) => item.status !== "archived")
      .slice(0, 8)
      .map((item) => ({
        title: item.title,
        area: item.area,
        stage: item.journeyStage,
        status: item.journeyStatus
      }))
  };
}

function normalizeInboxParsed(parsed, fallbackText) {
  const local = classifyInbox(fallbackText);
  const allowedKinds = new Set(["task", "note", "idea", "plan_change", "health_signal", "project", "daily_context"]);
  const allowedAreas = new Set(Object.keys(areaLabels));
  const allowedStatuses = new Set(["inbox", "backlog", "this_week", "today", "done"]);
  const allowedPriorities = new Set(["low", "medium", "high"]);
  return {
    ...local,
    kind: allowedKinds.has(parsed?.kind) ? parsed.kind : local.kind,
    title: String(parsed?.title || local.title).trim().replace(/\s+/g, " ").slice(0, 92),
    area: allowedAreas.has(parsed?.area) ? parsed.area : local.area,
    status: allowedStatuses.has(parsed?.status) ? parsed.status : local.status,
    priority: allowedPriorities.has(parsed?.priority) ? parsed.priority : local.priority,
    needsReview: typeof parsed?.needsReview === "boolean" ? parsed.needsReview : local.needsReview,
    reason: String(parsed?.reason || "").trim(),
    suggestedAction: String(parsed?.suggestedAction || "").trim(),
    provider: parsed?.provider || "local"
  };
}

async function classifyInboxWithAi(text) {
  try {
    const response = await fetch("/api/ai/inbox", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text,
        context: dailyAiContext()
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }
    const data = await response.json();
    if (!data.ok || !data.parsed) throw new Error(data.error || "AI inbox failed");
    return {
      parsed: normalizeInboxParsed(data.parsed, text),
      warning: ""
    };
  } catch (error) {
    return {
      parsed: normalizeInboxParsed(classifyInbox(text), text),
      warning: error instanceof Error ? error.message.replace(/\s+/g, " ").slice(0, 180) : "AI inbox unavailable"
    };
  }
}

async function processInbox(text) {
  const aiResult = await classifyInboxWithAi(text);
  const parsed = aiResult.parsed;
  const inboxItem = {
    id: crypto.randomUUID(),
    text,
    parsed,
    createdAt: new Date().toISOString()
  };

  state.inboxItems.unshift(inboxItem);

  if (parsed.kind === "project" || /(проект|цель|запустить|начать|новый трек|новое направление)/i.test(text)) {
    const overload = state.tasks.filter((item) => item.status === "today").length > 4 || state.dailyPlan.status === "overloaded";
    const newProject = project({
      title: parsed.title,
      area: parsed.area,
      progress: 0,
      journeyStage: overload ? "call" : "commitment",
      journeyStatus: overload ? "watch" : "active",
      stageReason: overload
        ? "Новый проект выглядит как идея, но текущая загрузка требует проверки перед принятием."
        : "Проект можно принять в работу, если есть следующий конкретный шаг.",
      nextTransition: overload
        ? "Проверить ресурс и отложить или принять решение."
        : "Собрать подготовку: ресурсы, сроки, ограничения."
    });
    state.projects.unshift(newProject);
    state.selectedProjectId = newProject.id;
    state.projectStageEvents.unshift(stageEvent(newProject.id, null, newProject.journeyStage, newProject.stageReason, "assistant", "confirmed"));
    state.assistantActions.unshift(action(
      overload ? "Новый проект поставлен на проверку" : "Новый проект создан",
      overload ? "Ассистент не принимает проект автоматически из-за текущей загрузки." : "Проект добавлен в путь целей.",
      overload ? "needs_review" : "confirmed"
    ));
  } else if (parsed.kind === "task" || parsed.kind === "plan_change") {
    const category = suggestCategoryForInbox(inboxItem);
    const projectItem = category.kind === "project" ? findByTitle(state.projects, category.title) : null;
    const routineItem = category.kind === "routine" ? findByTitle(state.routines, category.title) : null;
    const newTask = {
      ...task(parsed.title, parsed.status, category.area || parsed.area, parsed.priority, 30, projectItem?.id || null),
      routineId: routineItem?.id || null,
      needsReview: parsed.needsReview
    };
    state.tasks.unshift(newTask);
    selectTask(newTask.id);
  } else {
    state.notes.unshift({
      id: crypto.randomUUID(),
      type: parsed.kind,
      area: parsed.area,
      text,
      createdAt: new Date().toISOString()
    });
  }

  if (parsed.kind === "health_signal") {
    state.memoryItems.unshift({
      id: crypto.randomUUID(),
      key: "energy_signal",
      text,
      confidence: parsed.needsReview ? "medium" : "high",
      createdAt: new Date().toISOString()
    });
  }

  state.assistantActions.unshift(
    action(
      labelForKind(parsed.kind),
      parsed.reason || `Определено как ${labelForKind(parsed.kind).toLowerCase()}, область: ${areaLabels[parsed.area]}.`,
      parsed.needsReview ? "needs_review" : "confirmed"
    )
  );

  if (aiResult.warning) {
    state.assistantActions.unshift(
      action(
        "AI fallback",
        "Gemini inbox недоступен, использована локальная классификация.",
        "needs_review"
      )
    );
  }

  rebalanceToday();
  saveState();
}

function processEveningReview(text) {
  const lower = text.toLowerCase();
  const openToday = state.tasks.filter((item) => item.status === "today");
  const completedCountBefore = state.tasks.filter((item) => item.status === "done").length;
  let completedByReview = 0;
  let movedByReview = 0;

  if (/(готово|сделал|сделала|закрыл|закрыла|выполнил|выполнено)/i.test(lower)) {
    openToday
      .filter((item) => item.priority === "high")
      .slice(0, 2)
      .forEach((item) => {
        item.status = "done";
        item.updatedAt = new Date().toISOString();
        completedByReview += 1;
      });
  }

  if (/(не успел|не успела|перенести|перенеси|завтра|хвост|осталось)/i.test(lower)) {
    state.tasks
      .filter((item) => item.status === "today")
      .forEach((item) => {
        item.status = "this_week";
        item.updatedAt = new Date().toISOString();
        movedByReview += 1;
      });
  }

  const energy = detectEnergy(lower);
  state.dailyPlan.energy = energy;

  const tomorrowInherits = state.tasks
    .filter((item) => item.status === "this_week" && item.priority !== "low")
    .slice(0, 3)
    .map((item) => item.title);

  state.dailyPlan.tomorrowInherits = tomorrowInherits;
  state.dailyPlan.reviewSummary = buildReviewSummary(text, completedByReview, movedByReview, energy, tomorrowInherits);

  const review = {
    id: crypto.randomUUID(),
    date: todayIso,
    rawText: text,
    summary: state.dailyPlan.reviewSummary,
    completedByReview,
    movedByReview,
    energy,
    tomorrowInherits,
    createdAt: new Date().toISOString()
  };

  state.dailyReviews.unshift(review);
  state.notes.unshift({
    id: crypto.randomUUID(),
    type: "daily_context",
    area: energy === "low" ? "health" : "personal",
    text,
    createdAt: new Date().toISOString()
  });

  if (energy === "low" || /(перегруз|устал|устала|выгор|тяжело|тревож)/i.test(lower)) {
    state.memoryItems.unshift({
      id: crypto.randomUUID(),
      key: "energy_pattern",
      text: `Review ${todayIso}: ${text}`,
      confidence: "medium",
      createdAt: new Date().toISOString()
    });
  }

  state.assistantActions.unshift(
    action(
      "Вечерний review собран",
      `Закрыто через review: ${completedByReview}. Перенесено: ${movedByReview}. Энергия: ${energy}.`,
      movedByReview > 3 ? "needs_review" : "confirmed"
    )
  );

  if (completedCountBefore !== state.tasks.filter((item) => item.status === "done").length) {
    state.assistantActions.unshift(action("День обновлён", "Review изменил статусы задач и пересчитал прогресс.", "confirmed"));
  }

  saveState();
}

function detectEnergy(lowerText) {
  if (/(мало сил|устал|устала|выгор|сонный|сонная|низк|тяжело|разбит)/i.test(lowerText)) return "low";
  if (/(много сил|бодр|заряжен|заряжена|легко|энергично)/i.test(lowerText)) return "high";
  return "medium";
}

function buildReviewSummary(text, completed, moved, energy, tomorrowInherits) {
  const energyLabel = { low: "низкая", medium: "средняя", high: "высокая" }[energy];
  const inherits = tomorrowInherits.length ? tomorrowInherits.join("; ") : "ничего критичного";
  const cleanText = text.trim().replace(/\s+/g, " ");
  return `Итог дня: ${cleanText}. Закрыто: ${completed}. Перенесено: ${moved}. Энергия: ${energyLabel}. Завтра наследует: ${inherits}.`;
}

function stageLabel(stage) {
  return journeyStages.find(([key]) => key === stage)?.[1] || "Не задано";
}

function stageMeta(stage) {
  return journeyStages.find(([key]) => key === stage) || [stage, stage, ""];
}

function stageIndex(stage) {
  return Math.max(0, journeyStages.findIndex(([key]) => key === stage));
}

function nextTransitionFor(stage) {
  return {
    call: "Сформулировать зачем и критерий, стоит ли брать проект.",
    commitment: "Выделить первый конкретный шаг, сроки и ограничения.",
    preparation: "Собрать ресурсы и перевести проект в регулярную работу.",
    trial: "Закрывать действия и отслеживать первое узкое место.",
    crisis: "Снять блокер: сузить объём, пересобрать сроки или отказаться.",
    result: "Зафиксировать deliverable и уроки.",
    integration: "Решить, нужен ли следующий цикл."
  }[stage] || "Проверить следующий переход.";
}

function reviewProjectJourney(projectItem) {
  const projectTasks = state.tasks.filter((item) => item.projectId === projectItem.id);
  const openTasks = projectTasks.filter((item) => item.status !== "done");
  const doneTasks = projectTasks.filter((item) => item.status === "done");
  const blockers = state.projectObstacles.filter((item) => item.projectId === projectItem.id && item.status === "open");
  const lowEnergy = projectItem.area === "health" && (state.dailyPlan.energy === "low" || state.dailyPlan.status === "low_energy");
  const stale = openTasks.length > 2 && doneTasks.length === 0;

  let proposedStage = projectItem.journeyStage;
  let reason = "Текущая стадия выглядит корректной.";

  if (projectItem.journeyStage === "call" && openTasks.length > 0) {
    proposedStage = "commitment";
    reason = "Появились конкретные действия; пора принять решение, брать проект в работу или отложить.";
  }
  if (["commitment", "preparation"].includes(projectItem.journeyStage) && openTasks.length >= 2) {
    proposedStage = "trial";
    reason = "Есть регулярные задачи; проект перешёл из подготовки в практическое испытание.";
  }
  if (stale || blockers.length > 0 || lowEnergy) {
    proposedStage = "crisis";
    reason = blockers.length
      ? "Есть открытое препятствие; нужен разбор узкого места."
      : "Есть признаки застревания: задачи открыты, прогресс не подтверждён закрытиями.";
  }
  if (doneTasks.length >= 2 && openTasks.length <= 1 && ["trial", "crisis"].includes(projectItem.journeyStage)) {
    proposedStage = "result";
    reason = "Есть закрытые действия и мало открытых хвостов; можно фиксировать результат этапа.";
  }

  projectItem.lastStageReviewAt = new Date().toISOString();
  projectItem.proposedStage = proposedStage === projectItem.journeyStage ? null : proposedStage;
  projectItem.proposedReason = proposedStage === projectItem.journeyStage ? "" : reason;
  projectItem.nextTransition = projectItem.proposedStage
    ? `Подтвердить переход: ${stageLabel(projectItem.journeyStage)} -> ${stageLabel(projectItem.proposedStage)}.`
    : nextTransitionFor(projectItem.journeyStage);

  if (projectItem.proposedStage) {
    state.projectStageEvents.unshift(stageEvent(projectItem.id, projectItem.journeyStage, projectItem.proposedStage, reason));
    state.assistantActions.unshift(action("Предложен переход стадии", `${projectItem.title}: ${reason}`, "needs_review"));
  }
}

function labelForKind(kind) {
  return {
    task: "Создана задача",
    plan_change: "Обновлён план",
    health_signal: "Сохранён сигнал здоровья",
    note: "Сохранена заметка",
    idea: "Сохранена идея",
    project: "Создан проект",
    daily_context: "Сохранён контекст дня"
  }[kind] || "Обработано";
}

function rebalanceToday() {
  const todayTasks = state.tasks.filter((item) => item.status === "today" && item.status !== "done");
  const important = state.tasks.filter((item) => item.priority === "high" && item.status !== "done");

  if (todayTasks.length < 3) {
    const candidate = important.find((item) => item.status === "this_week" || item.status === "backlog");
    if (candidate) {
      candidate.status = "today";
      candidate.updatedAt = new Date().toISOString();
      state.assistantActions.unshift(
        action("Задача поднята в день", `"${candidate.title}" попала в Today как высокий приоритет.`, "confirmed")
      );
    }
  }

  const overload = state.tasks.filter((item) => item.status === "today" && item.status !== "done").length > 5;
  if (overload) {
    const low = state.tasks.find((item) => item.status === "today" && item.priority === "low");
    if (low) {
      low.status = "this_week";
      low.updatedAt = new Date().toISOString();
      state.assistantActions.unshift(
        action("Снят перегруз дня", `"${low.title}" перенесена на неделю.`, "confirmed")
      );
    }
  }
}

function render() {
  renderShell();
  renderInbox();
  renderToday();
  renderWeek();
  renderProjects();
  renderBoard();
  renderLog();
  renderAppInspector(state.settings.activeView);
}

function viewTitle(view) {
  return {
    inbox: "Inbox",
    today: "Сегодня",
    week: "Неделя",
    projects: "Проекты",
    board: "Доска",
    log: "Лог"
  }[view] || "Сегодня";
}

function viewSubtitle(view) {
  return {
    inbox: "Быстрый вход для мыслей, задач, заметок и сигналов, которые разберёт ассистент.",
    today: "Фокус, ритуалы и операционка дня в одном спокойном месте.",
    week: "Фокусы недели, активные задачи и хвосты без лишней аналитики.",
    projects: "Цели, проекты, блокеры и путь проекта без дашбордного шума.",
    board: "Простая доска без Jira-шума: inbox, backlog, week, today, done.",
    log: "Аудит того, что ассистент понял, изменил и почему."
  }[view] || "";
}

function primaryActionLabel(view) {
  return {
    inbox: "Разобрать входящие",
    today: "Проверить план",
    week: "Проверить неделю",
    projects: "Проверить проекты",
    board: "Разложить задачи",
    log: "Обновить лог"
  }[view] || "Проверить";
}

function renderShell() {
  const activeView = state.settings.activeView;
  document.body.dataset.view = activeView;
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === activeView);
  });
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${activeView}View`)?.classList.add("active");
  document.querySelector("#viewTitle").textContent = viewTitle(activeView);
  document.querySelector(".page-subtitle").textContent = viewSubtitle(activeView);
  const primaryAction = document.querySelector("#runAutopilot");
  if (primaryAction) primaryAction.textContent = primaryActionLabel(activeView);
  document.querySelector("#todayDate").textContent = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());

  const reviewItems = state.inboxItems.filter((item) => item.parsed?.needsReview).length + state.assistantActions.filter((item) => item.status === "needs_review").length;
  document.querySelector("#shellMode").textContent = activeView === "today" ? "day" : activeView === "projects" ? "journey" : "object";
  document.querySelector("#reviewCount").textContent = String(reviewItems);
  renderAppInspector(activeView);
}

function getSelectedTask() {
  const selectedId = state.ui?.selectedTaskId || state.focus?.selectedTaskId;
  return state.tasks.find((item) => item.id === selectedId) || null;
}

function renderOptions(values, selected, labels = {}) {
  return values.map((value) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(labels[value] || value)}</option>`).join("");
}

function renderTaskLinkOptions(item) {
  const current = item.projectId ? `project:${item.projectId}` : item.routineId ? `routine:${item.routineId}` : "none";
  const projects = state.projects
    .filter((projectItem) => projectItem.status !== "archived")
    .map((projectItem) => `<option value="project:${escapeHtml(projectItem.id)}" ${current === `project:${projectItem.id}` ? "selected" : ""}>Проект · ${escapeHtml(projectItem.title)}</option>`)
    .join("");
  const routines = state.routines
    .map((routineItem) => `<option value="routine:${escapeHtml(routineItem.id)}" ${current === `routine:${routineItem.id}` ? "selected" : ""}>Рутина · ${escapeHtml(routineItem.title)}</option>`)
    .join("");
  return `<option value="none" ${current === "none" ? "selected" : ""}>Без привязки</option>${projects}${routines}`;
}

function formatSeconds(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function renderFocusCompanion(item) {
  const focus = state.focus || seedState.focus;
  const activeTaskId = focus.selectedTaskId || state.ui?.selectedTaskId || item.id;
  const isCurrentTask = activeTaskId === item.id;
  const soundOptions = Object.entries(soundCategories)
    .map(([key, label]) => `<option value="${escapeHtml(key)}" ${focus.soundCategory === key ? "selected" : ""}>${escapeHtml(label)}</option>`)
    .join("");
  return `<section class="focus-companion" data-task-id="${escapeHtml(item.id)}">
    <div class="focus-companion-head">
      <div>
        <span class="label">Focus companion</span>
        <strong>${escapeHtml(isCurrentTask ? item.title : "Выбрать эту задачу")}</strong>
      </div>
      <button class="secondary-button" type="button" data-focus-action="bind-task">${isCurrentTask ? "Выбрана" : "Фокус"}</button>
    </div>
    <div class="focus-timer" id="focusTimerValue">${formatSeconds(focus.remainingSeconds)}</div>
    <div class="focus-mode-row" role="group" aria-label="Режим таймера">
      ${Object.entries(focusModes).map(([key, mode]) => `<button class="state-button ${focus.timerMode === key ? "active" : ""}" type="button" data-focus-mode="${escapeHtml(key)}">${escapeHtml(mode.label)}</button>`).join("")}
    </div>
    <div class="focus-actions">
      <button class="primary-button" type="button" data-focus-action="${focus.running ? "pause" : "start"}">${focus.running ? "Пауза" : "Старт"}</button>
      <button class="secondary-button" type="button" data-focus-action="reset">Сброс</button>
    </div>
    <div class="sound-panel">
      <label class="field-stack">
        <span>Sound stream</span>
        <select data-focus-field="soundCategory">${soundOptions}</select>
      </label>
      <div class="sound-controls">
        <button class="secondary-button" type="button" data-sound-action="${focusRuntime.isSoundPlaying ? "pause" : "play"}">${focusRuntime.isSoundPlaying ? "Sound off" : "Sound on"}</button>
        <label class="volume-control">
          <span>vol</span>
          <input type="range" min="0" max="1" step="0.05" value="${escapeHtml(focus.volume)}" data-focus-field="volume" />
        </label>
      </div>
    </div>
  </section>`;
}

function renderTaskInspector(item) {
  const category = categoryForTask(item);
  const areaOptions = renderOptions(Object.keys(areaLabels), item.area, areaLabels);
  const priorityOptions = renderOptions(priorities, item.priority);
  const statusOptions = renderOptions(taskStatuses, item.status, {
    inbox: "Inbox",
    backlog: "Backlog",
    this_week: "This week",
    today: "Today",
    done: "Done"
  });
  return `<section class="task-inspector-card" data-task-id="${escapeHtml(item.id)}">
    <div class="task-inspector-title">
      <span class="pill">Task</span>
      <input data-task-field="title" value="${escapeHtml(item.title)}" aria-label="Название задачи" />
    </div>
    <div class="task-property-grid">
      <label><span>Статус</span><select data-task-field="status">${statusOptions}</select></label>
      <label><span>Область</span><select data-task-field="area">${areaOptions}</select></label>
      <label><span>Связь</span><select data-task-field="link">${renderTaskLinkOptions(item)}</select></label>
      <label><span>Приоритет</span><select data-task-field="priority">${priorityOptions}</select></label>
      <label><span>Длительность</span><input data-task-field="estimate" type="number" min="5" step="5" value="${escapeHtml(item.estimate)}" /></label>
      <label><span>Дата</span><input data-task-field="dueDate" type="date" value="${escapeHtml(item.dueDate || "")}" /></label>
      <label class="wide"><span>Теги</span><input data-task-field="tags" value="${escapeHtml((item.tags || []).join(", "))}" placeholder="focus, job, admin" /></label>
    </div>
    <div class="task-inspector-meta">
      ${renderCategoryChip(category)}
      <span class="tag">${escapeHtml(item.priority)}</span>
      <span class="tag">${escapeHtml(item.estimate)} мин</span>
      ${item.dueDate ? `<span class="tag">${escapeHtml(item.dueDate)}</span>` : ""}
    </div>
  </section>
  ${renderFocusCompanion(item)}`;
}

function renderAppInspector(activeView) {
  const mode = document.querySelector("#inspectorMode");
  const root = document.querySelector("#appInspectorContent");
  if (!root) return;

  const selectedTask = getSelectedTask();
  if (selectedTask) {
    mode.textContent = "task detail";
    root.innerHTML = renderTaskInspector(selectedTask);
    return;
  }

  if (activeView === "today") {
    const blocks = (state.dailyPlan.timeBlocks || []).map((block, index) => ({ ...block, index }));
    const selectedIndex = Number.isInteger(state.ui?.selectedDayBlockIndex) ? state.ui.selectedDayBlockIndex : 1;
    const currentBlock = blocks[selectedIndex] || blocks.find((item) => item.status === "must") || blocks[0];
    const openTasks = state.tasks.filter((item) => item.status === "today");
    const nowMeta = currentTimeMeta(blocks);
    const category = currentBlock ? categoryForBlock(currentBlock) : { kind: "admin", title: "Операционка", area: "admin" };
    mode.textContent = "day operator";
    root.innerHTML = `<section class="inspector-object-card accent-blue">
      <span class="pill blue">Selected block</span>
      <h2>${escapeHtml(currentBlock?.title || "План дня")}</h2>
      <p>${escapeHtml(currentBlock?.nextAction || state.dailyPlan.focus)}</p>
      <div class="inspector-category-line">${renderCategoryChip(category)}</div>
      <div class="inspector-meta-grid">
        <div><span>Время</span><strong>${escapeHtml(currentBlock ? `${currentBlock.start}–${currentBlock.end}` : "сейчас")}</strong></div>
        <div><span>Статус</span><strong>${escapeHtml(currentBlock?.status || "draft")}</strong></div>
        <div><span>Сейчас</span><strong>${escapeHtml(nowMeta.label)}</strong></div>
        <div><span>Live</span><strong>${nowMeta.currentBlockIndex === currentBlock?.index ? "идёт сейчас" : nowMeta.nextBlockIndex === currentBlock?.index ? "следующий" : "не сейчас"}</strong></div>
      </div>
    </section>
    <section class="inspector-decision-list">
      <article class="inspector-decision">
        <strong>Открыто сегодня</strong>
        <p>${openTasks.length} задач в Today. Выбери любую задачу, чтобы открыть параметры, pomodoro и sound stream.</p>
      </article>
    </section>`;
    return;
  }

  if (activeView === "inbox") {
    const reviewItem = state.inboxItems.find((item) => item.id === state.ui?.selectedInboxId) || state.inboxItems.find((item) => item.parsed?.needsReview) || state.inboxItems[0];
    mode.textContent = "operator review";
    root.innerHTML = `<section class="inspector-object-card accent-sky">
      <span class="pill">Capture → Queue → Review</span>
      <h2>${escapeHtml(reviewItem?.parsed?.title || "Разобрать входящие")}</h2>
      <p>${escapeHtml(reviewItem?.text || "Сырой текст должен стать задачей, заметкой, проектом или вопросом на подтверждение.")}</p>
    </section>
    <section class="inspector-decision-list">
      <article class="inspector-decision"><strong>Следующее действие</strong><p>Отправь текст в AI Inbox или выбери входящее, чтобы увидеть интерпретацию.</p></article>
    </section>`;
    return;
  }

  if (activeView === "projects") {
    const projectItem = state.projects.find((item) => item.id === state.selectedProjectId) || state.projects[0];
    mode.textContent = "journey chapter";
    root.innerHTML = `<section class="inspector-object-card accent-green">
      <span class="pill green">Hero Journey</span>
      <h2>${escapeHtml(projectItem?.title || "Проект")}</h2>
      <p>${escapeHtml(projectItem?.stageReason || "Текущая глава должна отвечать: какой квест сейчас, что блокирует переход и почему ассистент не пускает дальше.")}</p>
      <div class="inspector-meta-grid">
        <div><span>Глава</span><strong>${escapeHtml(stageLabel(projectItem?.journeyStage || "trial"))}</strong></div>
        <div><span>Переход</span><strong>${escapeHtml(projectItem?.nextTransition ? "задан" : "проверить")}</strong></div>
      </div>
    </section>
    <section class="inspector-decision-list">
      <article class="inspector-decision"><strong>Критерий перехода</strong><p>Если есть стабильные интервью — в “Результат”. Если тишина — в “Узкое место”.</p></article>
    </section>`;
    return;
  }

  const activeTasks = state.tasks.filter((item) => item.status !== "done").slice(0, 3);
  mode.textContent = "selected object";
  root.innerHTML = `<section class="inspector-object-card">
    <span class="pill">Object inspector</span>
    <h2>${escapeHtml(viewTitle(activeView))}</h2>
    <p>Выбери задачу в списке, доске или поиске — здесь откроются параметры, таймер и звук.</p>
  </section>
  <section class="inspector-decision-list">
    ${activeTasks.map((item) => `<article class="inspector-decision"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(areaLabels[item.area] || item.area)} · ${escapeHtml(item.priority)}</p></article>`).join("") || `<article class="inspector-decision"><strong>Нет активного объекта</strong><p>Выбери задачу или входящее, чтобы открыть инспектор.</p></article>`}
  </section>`;
}


function suggestCategoryForInbox(item) {
  const text = `${item.text || ""} ${item.parsed?.title || ""}`.toLowerCase();
  if (/отклик|резюме|ваканс|собесед|работ/.test(text)) return { kind: "project", title: "Поиск работы", area: "career" };
  if (/экран|today|daily|app|pwa|прототип|интерфейс|редизайн|дизайн/.test(text)) return { kind: "project", title: "Daily OS", area: "work" };
  if (/обуч|курс|математ|coding|код|лекц/.test(text)) return { kind: "project", title: "Обучение", area: "learning" };
  if (/сон|спорт|bjj|движ|восстанов|еда|пауза/.test(text)) return { kind: "routine", title: "Восстановление", area: "health" };
  if (/review|итог|вечер/.test(text)) return { kind: "routine", title: "Вечерний review", area: "admin" };
  return { kind: "admin", title: "Операционка", area: item.parsed?.area || "admin" };
}

function renderInbox() {
  document.querySelector("#inboxItemList").innerHTML = state.inboxItems.length
    ? state.inboxItems.slice(0, 10).map((item) => `<article class="inbox-item ${state.ui?.selectedInboxId === item.id ? "selected" : ""}" data-inbox-id="${item.id}">
      <button class="inbox-object-button" type="button" data-action="select-inbox">
        <strong>${escapeHtml(item.parsed?.title || item.text)}</strong>
        <p>${escapeHtml(item.text)}</p>
      </button>
      <div class="task-meta">
        <span class="tag">${labelForKind(item.parsed?.kind || "context")}</span>
        <span class="tag">${areaLabels[item.parsed?.area] || "личное"}</span>
        <span class="tag strong-tag">${escapeHtml(suggestCategoryForInbox(item).title)}</span>
        ${item.parsed?.needsReview ? `<span class="tag">needs review</span>` : ""}
      </div>
    </article>`).join("")
    : `<div class="empty">Входящих пока нет</div>`;

  document.querySelector("#assistantFeed").innerHTML = state.assistantActions
    .slice(0, 8)
    .map(renderActionItem)
    .join("");
}

function renderToday() {
  document.querySelector("#dailyFocus").textContent = state.dailyPlan.focus;
  document.querySelector("#quickStates").innerHTML = ["steady", "low_energy", "overloaded"]
    .map((status) => {
      const labels = { steady: "ровно", low_energy: "мало сил", overloaded: "перегруз" };
      return `<button class="state-button ${state.dailyPlan.status === status ? "active" : ""}" data-status="${status}">${labels[status]}</button>`;
    })
    .join("");

  const blockModel = buildTodayBlockModel();
  const nowMeta = currentTimeMeta(blockModel.blocks);
  if (!Number.isInteger(state.ui?.selectedDayBlockIndex) && Number.isInteger(nowMeta.anchorBlockIndex)) {
    state.ui = state.ui || {};
    state.ui.selectedDayBlockIndex = nowMeta.anchorBlockIndex;
  }
  renderTodayNow(blockModel, nowMeta);
  const timeSpineList = document.querySelector("#timeSpineList");
  if (timeSpineList) {
    timeSpineList.innerHTML = blockModel.blocks.length
      ? `${renderNowMarker(blockModel.blocks)}${blockModel.blocks.map(renderTimeSpineItem).join("")}`
      : `<div class="empty">Временных блоков пока нет</div>`;
  }
  document.querySelector("#dayBlockList").innerHTML = blockModel.blocks.length
    ? blockModel.blocks.map(renderDayBlock).join("")
    : `<div class="empty">Сначала добавь принятые блоки дня</div>`;
  document.querySelector("#todayTasks").innerHTML = blockModel.unscheduled.length
    ? blockModel.unscheduled.map(renderTaskCompact).join("")
    : `<div class="empty">Нет задач без блока</div>`;

  const latestReview = state.dailyReviews[0];
  document.querySelector("#reviewState").textContent = latestReview?.date === todayIso ? "saved" : "draft";
  document.querySelector("#todayReviewDrawer").open = Boolean(state.dailyPlan.reviewSummary);
  document.querySelector("#reviewSummary").innerHTML = state.dailyPlan.reviewSummary
    ? `<article class="review-card"><strong>Итог сохранён</strong><p>${escapeHtml(state.dailyPlan.reviewSummary)}</p></article>`
    : `<div class="empty">Review ещё не собран</div>`;

  renderHabits();
}

function renderTodayNow(blockModel, nowMeta) {
  const root = document.querySelector("#todayNowCard");
  if (!root) return;
  const current = Number.isInteger(nowMeta.currentBlockIndex) ? blockModel.blocks[nowMeta.currentBlockIndex] : null;
  const next = Number.isInteger(nowMeta.nextBlockIndex) ? blockModel.blocks[nowMeta.nextBlockIndex] : null;
  const previous = Number.isInteger(nowMeta.previousBlockIndex) ? blockModel.blocks[nowMeta.previousBlockIndex] : null;
  const anchor = current || next || previous || blockModel.blocks[0];
  const modeLabel = current ? "Сейчас" : next ? "Дальше" : previous ? "План завершён" : "План дня";
  const modeClass = current ? "current" : next ? "next" : previous ? "after" : "empty";
  const linkedCount = anchor?.tasks?.length || 0;
  const eventCount = anchor?.events?.length || 0;

  root.className = `today-now-card ${modeClass}`;
  root.innerHTML = anchor
    ? `<div class="today-now-meta">
        <span class="label">${escapeHtml(modeLabel)}</span>
        <strong>${escapeHtml(nowMeta.label)}</strong>
      </div>
      <div class="today-now-main">
        <div>
          <h3>${escapeHtml(anchor.title)}</h3>
          <p>${escapeHtml(anchor.nextAction)}</p>
        </div>
        <div class="today-now-facts">
          <span>${escapeHtml(anchor.start)}-${escapeHtml(anchor.end)}</span>
          <span>${linkedCount} задач</span>
          ${eventCount ? `<span>${eventCount} календарь</span>` : ""}
        </div>
      </div>
      <button class="secondary-button" type="button" data-action="select-day-block" data-block-index="${anchor.index}">Открыть блок</button>`
    : `<div class="today-now-meta">
        <span class="label">План дня</span>
        <strong>${escapeHtml(nowMeta.label)}</strong>
      </div>
      <div class="today-now-main">
        <h3>Блоков пока нет</h3>
        <p>Добавь принятые блоки дня, чтобы видеть текущее действие.</p>
      </div>`;
}

function buildTodayBlockModel() {
  const blocks = (state.dailyPlan.timeBlocks || []).map((block, index) => ({
    ...block,
    index,
    tasks: [],
    events: state.calendarEvents.filter((event) => overlapsTime(block.start, block.end, event.start, event.end))
  }));
  const scheduled = new Set();
  const todayTasks = state.tasks.filter((item) => item.status === "today" || item.status === "done");

  todayTasks.forEach((taskItem) => {
    const block = findBlockForTask(taskItem, blocks);
    if (!block) return;
    block.tasks.push(taskItem);
    scheduled.add(taskItem.id);
  });

  const nowMeta = currentTimeMeta(blocks);
  blocks.forEach((block) => {
    block.isCurrent = block.index === nowMeta.currentBlockIndex;
    block.isNext = !block.isCurrent && block.index === nowMeta.nextBlockIndex;
  });

  return {
    blocks,
    unscheduled: todayTasks.filter((item) => !scheduled.has(item.id))
  };
}

function findBlockForTask(taskItem, blocks) {
  const title = taskItem.title.toLowerCase();
  const candidates = blocks.map((block) => ({
    block,
    text: `${block.title} ${block.nextAction}`.toLowerCase()
  }));
  const direct = candidates.find(({ text }) =>
    title.split(/\s+/).some((word) => word.length > 4 && text.includes(word))
  );
  if (direct) return direct.block;

  if (taskItem.area === "work") {
    return blocks.find((block) => /работ|поиск|созвон|фокус|mvp/i.test(`${block.title} ${block.nextAction}`)) || null;
  }
  if (taskItem.area === "health") {
    return blocks.find((block) => /восстанов|еда|спорт|сон|пауза/i.test(`${block.title} ${block.nextAction}`)) || null;
  }
  if (taskItem.area === "personal") {
    return blocks.find((block) => /план|review|обзор|итог/i.test(`${block.title} ${block.nextAction}`)) || null;
  }
  return null;
}

function overlapsTime(startA, endA, startB, endB) {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function currentTimeMeta(blocks = []) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const label = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const currentBlock = blocks.find((block) => minutes >= timeToMinutes(block.start) && minutes < timeToMinutes(block.end));
  const nextBlock = blocks.find((block) => timeToMinutes(block.start) > minutes) || null;
  const previousBlock = [...blocks].reverse().find((block) => timeToMinutes(block.end) <= minutes) || null;
  const anchorBlock = currentBlock || nextBlock || previousBlock || blocks[0] || null;
  return {
    minutes,
    label,
    currentBlockIndex: currentBlock?.index ?? null,
    nextBlockIndex: nextBlock?.index ?? null,
    previousBlockIndex: previousBlock?.index ?? null,
    anchorBlockIndex: anchorBlock?.index ?? null,
    mode: currentBlock ? "current" : nextBlock ? "next" : previousBlock ? "after-plan" : "empty"
  };
}

function renderNowMarker(blocks = []) {
  if (!blocks.length) return "";
  const meta = currentTimeMeta(blocks);
  const next = blocks.find((block) => block.index === meta.nextBlockIndex);
  const copy = meta.mode === "current"
    ? "сейчас"
    : meta.mode === "next"
      ? `сейчас · дальше ${next?.start || ""}`
      : "план завершён";
  return `<div class="now-marker ${meta.mode}" data-now-mode="${meta.mode}">
    <span>${escapeHtml(copy)}</span><strong>${escapeHtml(meta.label)}</strong>
  </div>`;
}

function renderHabits() {
  const ritualScore = document.querySelector("#ritualScore");
  const habitList = document.querySelector("#habitList");
  if (!ritualScore || !habitList) return;
  const doneHabits = state.habits.filter((item) => item.completions?.[todayIso]).length;
  const score = state.habits.length ? Math.round((doneHabits / state.habits.length) * 100) : 0;
  ritualScore.textContent = `${score}%`;
  habitList.innerHTML = state.habits.length
    ? habitGroups
        .map((group) => {
          const habits = state.habits.filter((item) => item.group === group);
          if (!habits.length) return "";
          return `<section class="habit-group">
            <div class="habit-group-head"><span>${escapeHtml(habitGroupLabels[group])}</span><strong>${habits.length}</strong></div>
            ${habits.map(renderHabitItem).join("")}
          </section>`;
        })
        .join("")
    : `<div class="empty">Ритуалов нет</div>`;
}

function lastSevenDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * dayMs);
    return date.toISOString().slice(0, 10);
  });
}

function renderHabitItem(item) {
  const done = Boolean(item.completions?.[todayIso]);
  const dots = lastSevenDates()
    .map((date) => `<span class="habit-dot ${item.completions?.[date] ? "done" : ""} ${date === todayIso ? "today" : ""}" title="${escapeHtml(date)}"></span>`)
    .join("");
  return `<article class="habit-item" data-habit-id="${escapeHtml(item.id)}">
    <button class="habit-check ${done ? "done" : ""}" data-action="toggle-habit" title="Отметить привычку"></button>
    <div>
      <div class="task-title">${escapeHtml(item.title)}</div>
      <div class="task-meta"><span class="tag">${areaLabels[item.area] || item.area}</span><span class="tag">${item.streak} дней</span></div>
    </div>
    <div class="habit-week">${dots}</div>
  </article>`;
}

function renderTimeBlock(item) {
  const statusClass = {
    must: "blue",
    confirmed: "green",
    ok: "green",
    choose: "amber",
    draft: ""
  }[item.status] || "";
  return `<article class="time-block-row">
    <span class="time-cell">${escapeHtml(item.start)}–${escapeHtml(item.end)}</span>
    <div><strong>${escapeHtml(item.title)}</strong></div>
    <span class="time-action">${escapeHtml(item.nextAction)}</span>
    <span class="pill ${statusClass}">${escapeHtml(item.status)}</span>
  </article>`;
}

function renderTimeSpineItem(item) {
  const statusClass = getBlockStatusClass(item.status);
  return `<a class="time-spine-item ${statusClass} ${item.isCurrent ? "current" : ""} ${item.isNext ? "next" : ""} ${state.ui?.selectedDayBlockIndex === item.index ? "selected" : ""}" href="#day-block-${item.index}" data-action="select-day-block" data-block-index="${item.index}">
    <span class="spine-time">${escapeHtml(item.start)}</span>
    <span class="spine-dot"></span>
    <span class="spine-copy">
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.end)}</small>
    </span>
  </a>`;
}

function renderDayBlock(item) {
  const statusClass = getBlockStatusClass(item.status);
  const relatedTasks = item.tasks.length
    ? item.tasks.map(renderTaskCompact).join("")
    : `<div class="empty">Нет привязанных задач</div>`;
  const relatedEvents = item.events.length
    ? `<div class="block-related-events">${item.events.map((event) => `<span>${escapeHtml(event.start)}-${escapeHtml(event.end)} ${escapeHtml(event.title)}</span>`).join("")}</div>`
    : "";
  const category = categoryForBlock(item);

  return `<article class="day-block-card ${statusClass} ${item.isCurrent ? "current" : ""} ${item.isNext ? "next" : ""} ${state.ui?.selectedDayBlockIndex === item.index ? "selected" : ""}" id="day-block-${item.index}" data-action="select-day-block" data-block-index="${item.index}">
    <div class="day-block-time">
      <span>${escapeHtml(item.start)}</span>
      <span>${escapeHtml(item.end)}</span>
    </div>
    <div class="day-block-main">
      <div class="day-block-header">
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="block-category-row">${renderCategoryChip(category)}</div>
          <p>${escapeHtml(item.nextAction)}</p>
        </div>
        <span class="pill ${statusClass}">${escapeHtml(item.status)}</span>
      </div>
      ${relatedEvents}
      <div class="linked-task-list">${relatedTasks}</div>
    </div>
  </article>`;
}

function getBlockStatusClass(status) {
  return {
    must: "blue",
    confirmed: "green",
    ok: "green",
    choose: "amber",
    draft: ""
  }[status] || "";
}

function renderTask(item) {
  const area = areaLabels[item.area] || item.area;
  const category = categoryForTask(item);
  return `<article class="task-item ${state.ui?.selectedTaskId === item.id ? "selected" : ""}" data-task-id="${item.id}" data-action="select-task">
    <button class="task-toggle ${item.status === "done" ? "done" : ""}" title="Готово" data-action="toggle"></button>
    <div>
      <div class="task-title">${escapeHtml(item.title)}</div>
      <div class="task-meta">
        ${renderCategoryChip(category)}
        <span class="tag">${item.estimate} мин</span>
        ${item.needsReview ? `<span class="tag">needs review</span>` : ""}
      </div>
    </div>
    <span class="task-cell">${area}</span>
    <span class="task-cell">${item.priority}</span>
    <span class="task-cell">${statusLabel(item.status)}</span>
  </article>`;
}

function renderTaskCompact(item) {
  const category = categoryForTask(item);
  return `<article class="task-item compact-task ${state.ui?.selectedTaskId === item.id ? "selected" : ""}" data-task-id="${item.id}" data-action="select-task">
    <button class="task-toggle ${item.status === "done" ? "done" : ""}" title="Готово" data-action="toggle"></button>
    <div>
      <div class="task-title">${escapeHtml(item.title)}</div>
      <div class="task-meta">
        ${renderCategoryChip(category)}
        <span class="tag">${item.priority}</span>
        <span class="tag">${item.estimate} мин</span>
      </div>
    </div>
    <span class="task-cell">${statusLabel(item.status)}</span>
  </article>`;
}

function renderWeek() {
  document.querySelector("#weeklyFocusList").innerHTML = state.weeklyPlan.focus
    .map((item) => `<article class="weekly-item focus-stake"><span class="focus-type">Ставка недели</span><strong>${escapeHtml(item.title)}</strong><div class="task-meta"><span class="tag">${areaLabels[item.area]}</span><span class="tag">${item.progress}% направления</span></div></article>`)
    .join("");

  const weekTasks = state.tasks.filter((item) => item.status === "today" || item.status === "this_week");
  document.querySelector("#weekTaskList").innerHTML = weekTasks.length
    ? weekTasks.map(renderTaskCompact).join("")
    : `<div class="empty">На неделю ничего не выбрано</div>`;

  const carry = state.tasks.filter((item) => item.status === "backlog").slice(0, 6);
  document.querySelector("#carryOverList").innerHTML = carry.length ? carry.map(renderTaskCompact).join("") : `<div class="empty">Хвостов нет</div>`;
}

function renderProjects() {
  renderProjectJourneys();
}

function renderLog() {
  const groupedActions = groupAssistantActions(state.assistantActions);
  document.querySelector("#actionLogList").innerHTML = groupedActions.length
    ? groupedActions.map(renderActionItem).join("")
    : `<div class="empty">Действий ассистента пока нет</div>`;
}

function groupAssistantActions(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = `${item.title}::${item.reason}::${item.status}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (new Date(item.createdAt) > new Date(existing.createdAt)) existing.createdAt = item.createdAt;
      return;
    }
    groups.set(key, { ...item, count: 1 });
  });
  return [...groups.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderActionItem(item) {
  const time = item.createdAt
    ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))
    : "";
  return `<article class="feed-item action-item ${item.status === "needs_review" ? "needs-review" : ""}">
    <span class="action-time">${time}</span>
    <div class="action-copy">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.reason)}</p>
    </div>
    ${item.count > 1 ? `<span class="pill">x${item.count}</span>` : ""}
    <span class="pill">${escapeHtml(item.status)}</span>
  </article>`;
}

function renderProjectJourneys() {
  const activeProjects = state.projects.filter((item) => item.status !== "archived");
  document.querySelector("#journeyList").innerHTML = activeProjects.length
    ? activeProjects.map(renderJourneyCard).join("")
    : `<div class="empty">Активных проектов нет</div>`;

  const selected = state.projects.find((item) => item.id === state.selectedProjectId) || activeProjects[0];
  if (!selected) {
    document.querySelector("#projectDetail").innerHTML = `<div class="empty">Выбери проект</div>`;
    return;
  }
  state.selectedProjectId = selected.id;
  renderProjectDetail(selected);
}

function renderJourneyCard(projectItem) {
  const index = stageIndex(projectItem.journeyStage);
  const stageProgress = Math.round(((index + 1) / journeyStages.length) * 100);
  const obstacles = state.projectObstacles.filter((item) => item.projectId === projectItem.id && item.status === "open");
  return `<article class="journey-card" data-project-id="${projectItem.id}">
    <button class="journey-card-main" data-action="select-project">
      <div>
        <strong>${escapeHtml(projectItem.title)}</strong>
        <div class="task-meta">
          <span class="tag">${areaLabels[projectItem.area]}</span>
          <span class="tag">${stageLabel(projectItem.journeyStage)}</span>
          ${obstacles.length ? `<span class="tag">blocker</span>` : ""}
        </div>
      </div>
      <span class="pill">${stageProgress}% пути</span>
    </button>
    <div class="area-bar"><span style="width:${stageProgress}%"></span></div>
    ${projectItem.proposedStage ? `<div class="journey-proposal">
      <span>Предложение: ${stageLabel(projectItem.journeyStage)} -> ${stageLabel(projectItem.proposedStage)}</span>
      <button class="secondary-button" data-action="confirm-stage">Подтвердить</button>
    </div>` : ""}
  </article>`;
}

function renderProjectDetail(projectItem) {
  const relatedTasks = state.tasks.filter((item) => item.projectId === projectItem.id).slice(0, 4);
  const obstacles = state.projectObstacles.filter((item) => item.projectId === projectItem.id && item.status === "open");
  const events = state.projectStageEvents.filter((item) => item.projectId === projectItem.id).slice(0, 4);
  const currentStage = stageMeta(projectItem.journeyStage);
  const questItems = relatedTasks.length
    ? relatedTasks.slice(0, 3).map((item) => item.title)
    : ["Определить следующий конкретный шаг", "Проверить ресурс и ограничение", "Решить: продолжать, сузить или отложить"];

  document.querySelector("#projectDetailState").textContent = projectItem.journeyStatus;
  document.querySelector("#projectDetail").innerHTML = `<article class="project-card project-journey-card" data-project-id="${projectItem.id}">
    <div class="project-chapter-hero">
      <div>
        <span class="label">Проект</span>
        <h2>${escapeHtml(projectItem.title)}</h2>
        <div class="project-stage-line"><span>Стадия</span><strong>${escapeHtml(currentStage[1])}</strong><em>${escapeHtml(currentStage[2])}</em></div>
        <p>${escapeHtml(projectItem.stageReason)}</p>
      </div>
      <button class="secondary-button" data-action="review-project" data-project-id="${projectItem.id}">Проверить стадию</button>
    </div>

    <div class="journey-map" aria-label="Путь героя проекта">
      ${journeyStages.map(([key, label, metaphor], index) => `<div class="map-step ${stageIndex(key) < stageIndex(projectItem.journeyStage) ? "done" : ""} ${key === projectItem.journeyStage ? "now" : ""}">
        <small>${String(index + 1).padStart(2, "0")}</small>
        <span>${escapeHtml(label)}</span>
        <em>${escapeHtml(metaphor)}</em>
      </div>`).join("")}
    </div>

    <div class="quest-panel">
      <section class="quest-card">
        <span class="label">Квест этапа</span>
        <ul>${questItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section class="quest-card">
        <span class="label">Условие перехода</span>
        <p>${escapeHtml(projectItem.nextTransition || nextTransitionFor(projectItem.journeyStage))}</p>
        ${obstacles.length ? `<div class="quest-warning">Есть блокер: ${escapeHtml(obstacles[0].text)}</div>` : ""}
      </section>
    </div>

    <div class="project-detail-grid">
      <div>
        <span class="label">Связанные задачи</span>
        <div class="task-list compact">${relatedTasks.length ? relatedTasks.map(renderTaskCompact).join("") : `<div class="empty">Задач нет</div>`}</div>
      </div>
      <div>
        <span class="label">История переходов</span>
        <div class="insight-list">${events.length ? events.map((item) => `<article class="insight-card"><div><strong>${stageLabel(item.fromStage)} -> ${stageLabel(item.toStage)}</strong><div class="metric-caption">${escapeHtml(item.reason)}</div></div><span class="pill">${item.status}</span></article>`).join("") : `<div class="empty">Переходов нет</div>`}</div>
      </div>
    </div>
  </article>`;
}

function renderBoard() {
  document.querySelector("#taskBoard").innerHTML = boardColumns
    .map(([status, title]) => {
      const cards = state.tasks.filter((item) => item.status === status);
      return `<section class="board-column" data-board-status="${status}">
        <div class="board-column-head"><h2>${title}</h2><span>${cards.length}</span></div>
        ${cards.length ? cards.map(renderBoardCard).join("") : `<div class="board-empty">Пусто</div>`}
      </section>`;
    })
    .join("");
}

function renderBoardCard(item) {
  const projectItem = state.projects.find((project) => project.id === item.projectId);
  return `<article class="board-card ${item.status === "done" ? "is-done" : ""} ${state.ui?.selectedTaskId === item.id ? "selected" : ""}" data-task-id="${item.id}" data-action="select-task">
    <button class="task-toggle ${item.status === "done" ? "done" : ""}" title="Готово" data-action="toggle"></button>
    <div class="board-card-main">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="task-meta">
        <span>${escapeHtml(areaLabels[item.area] || item.area)}</span>
        <span>${escapeHtml(item.priority)}</span>
        <span>${item.estimate} мин</span>
        ${projectItem ? `<span>${escapeHtml(projectItem.title)}</span>` : ""}
      </div>
    </div>
  </article>`;
}

function boardColumnHint(status) {
  return {
    inbox: "Сырое, ещё не разобрано",
    backlog: "Не принято на эту неделю",
    this_week: "Пул недели",
    today: "Принято в план дня",
    done: "Закрыто"
  }[status] || "";
}

function statusLabel(status) {
  return {
    inbox: "inbox",
    backlog: "backlog",
    this_week: "week",
    today: "today",
    done: "done"
  }[status] || status;
}

function selectTask(taskId, view = null) {
  const item = state.tasks.find((candidate) => candidate.id === taskId);
  if (!item) return false;
  state.ui = state.ui || {};
  state.ui.selectedTaskId = item.id;
  state.focus = state.focus || structuredClone(seedState.focus);
  state.focus.selectedTaskId = item.id;
  if (view) state.settings.activeView = view;
  return true;
}

function updateTaskField(item, field, value) {
  if (!item) return;
  if (field === "title") item.title = String(value || "").trim() || item.title;
  if (field === "status" && taskStatuses.includes(value)) {
    if (value !== "done") item.previousStatus = value;
    if (item.status !== "done" && value === "done") item.previousStatus = item.status;
    item.status = value;
  }
  if (field === "area" && areaLabels[value]) item.area = value;
  if (field === "priority" && priorities.includes(value)) item.priority = value;
  if (field === "estimate") item.estimate = Math.max(5, Math.min(480, Number(value) || 30));
  if (field === "dueDate") item.dueDate = value || "";
  if (field === "tags") {
    item.tags = String(value || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  if (field === "link") {
    item.projectId = null;
    item.routineId = null;
    const [kind, id] = String(value || "").split(":");
    if (kind === "project" && state.projects.some((projectItem) => projectItem.id === id)) item.projectId = id;
    if (kind === "routine" && state.routines.some((routineItem) => routineItem.id === id)) item.routineId = id;
  }
  item.updatedAt = new Date().toISOString();
}

function addTaskToToday(title) {
  const newTask = task(title.trim(), "today", "personal", "medium", 30);
  state.tasks.unshift(newTask);
  selectTask(newTask.id);
  state.assistantActions.unshift(action("Задача добавлена", newTask.title, "confirmed"));
}

function addHabitFromForm(title, area, group) {
  const newHabit = habit(title.trim(), area, 0);
  newHabit.group = habitGroups.includes(group) ? group : "anytime";
  state.habits.push(newHabit);
  state.assistantActions.unshift(action("Привычка добавлена", newHabit.title, "confirmed"));
}

function setFocusMode(mode) {
  if (!focusModes[mode]) return;
  state.focus.timerMode = mode;
  state.focus.remainingSeconds = focusModes[mode].seconds;
  state.focus.running = false;
  stopFocusTimer();
}

function updateFocusTimerDisplay() {
  const timer = document.querySelector("#focusTimerValue");
  if (timer) timer.textContent = formatSeconds(state.focus.remainingSeconds);
}

function stopFocusTimer() {
  if (focusRuntime.timerId) window.clearInterval(focusRuntime.timerId);
  focusRuntime.timerId = null;
  focusRuntime.startedAt = null;
}

function startFocusTimer() {
  const taskItem = getSelectedTask();
  if (!taskItem) return;
  state.focus.selectedTaskId = taskItem.id;
  state.focus.running = true;
  focusRuntime.startedAt = new Date();
  stopFocusTimer();
  focusRuntime.timerId = window.setInterval(() => {
    state.focus.remainingSeconds = Math.max(0, state.focus.remainingSeconds - 1);
    updateFocusTimerDisplay();
    if (state.focus.remainingSeconds <= 0) completeFocusSession();
  }, 1000);
  saveState();
}

function pauseFocusTimer() {
  state.focus.running = false;
  stopFocusTimer();
  saveState();
}

function resetFocusTimer() {
  state.focus.running = false;
  state.focus.remainingSeconds = focusModes[state.focus.timerMode]?.seconds || focusModes.focus.seconds;
  stopFocusTimer();
  saveState();
}

function completeFocusSession() {
  const taskItem = state.tasks.find((item) => item.id === state.focus.selectedTaskId);
  const endedAt = new Date();
  const startedAt = focusRuntime.startedAt || new Date(endedAt.getTime() - (focusModes[state.focus.timerMode]?.seconds || 0) * 1000);
  const durationMinutes = Math.max(1, Math.round((endedAt - startedAt) / 60000));
  state.focusSessions.unshift({
    id: crypto.randomUUID(),
    taskId: taskItem?.id || null,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMinutes,
    soundCategory: state.focus.soundCategory
  });
  state.assistantActions.unshift(action(
    "Фокус-сессия завершена",
    `${taskItem?.title || "Без задачи"} · ${durationMinutes} мин · ${soundCategories[state.focus.soundCategory]}.`,
    "confirmed"
  ));
  state.focus.running = false;
  state.focus.remainingSeconds = focusModes[state.focus.timerMode]?.seconds || focusModes.focus.seconds;
  stopFocusTimer();
  saveState();
}

function createNoiseBuffer(audioContext, category) {
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * 2;
  const buffer = audioContext.createBuffer(2, length, sampleRate);
  const toneMap = {
    deep_work: [82, 164],
    calm_focus: [110, 220],
    coding: [132, 264],
    reading: [98, 196],
    rain: [0, 0],
    brown_noise: [0, 0]
  };
  const [base, harmonic] = toneMap[category] || toneMap.deep_work;

  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    let brown = 0;
    for (let index = 0; index < length; index += 1) {
      const t = index / sampleRate;
      brown = (brown + (Math.random() * 2 - 1) * 0.02) / 1.02;
      const rain = (Math.random() * 2 - 1) * 0.08;
      const tone = base ? Math.sin(2 * Math.PI * base * t) * 0.035 + Math.sin(2 * Math.PI * harmonic * t) * 0.018 : 0;
      data[index] = category === "rain" ? rain : category === "brown_noise" ? brown * 3.5 : brown * 1.2 + tone;
    }
  }
  return buffer;
}

async function playFocusSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  stopFocusSound();
  focusRuntime.audioContext = focusRuntime.audioContext || new AudioContextClass();
  if (focusRuntime.audioContext.state === "suspended") await focusRuntime.audioContext.resume();
  const source = focusRuntime.audioContext.createBufferSource();
  const gain = focusRuntime.audioContext.createGain();
  source.buffer = createNoiseBuffer(focusRuntime.audioContext, state.focus.soundCategory);
  source.loop = true;
  gain.gain.value = state.focus.volume;
  source.connect(gain);
  gain.connect(focusRuntime.audioContext.destination);
  source.start();
  focusRuntime.source = source;
  focusRuntime.gain = gain;
  focusRuntime.isSoundPlaying = true;
  render();
}

function stopFocusSound() {
  if (focusRuntime.source) {
    try {
      focusRuntime.source.stop();
    } catch {
      // Source can already be stopped after category changes.
    }
    focusRuntime.source.disconnect();
  }
  focusRuntime.source = null;
  focusRuntime.gain = null;
  focusRuntime.isSoundPlaying = false;
}

function updateFocusVolume(value) {
  state.focus.volume = Math.max(0, Math.min(1, Number(value) || 0));
  if (focusRuntime.gain) focusRuntime.gain.gain.value = state.focus.volume;
}

function searchDailyOs(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const results = [];
  state.tasks.forEach((item) => {
    if (`${item.title} ${(item.tags || []).join(" ")}`.toLowerCase().includes(needle)) {
      results.push({ type: "task", id: item.id, title: item.title, detail: `${statusLabel(item.status)} · ${areaLabels[item.area] || item.area}` });
    }
  });
  state.projects.forEach((item) => {
    if (`${item.title} ${item.stageReason}`.toLowerCase().includes(needle)) {
      results.push({ type: "project", id: item.id, title: item.title, detail: `Проект · ${stageLabel(item.journeyStage)}` });
    }
  });
  state.inboxItems.forEach((item) => {
    if (`${item.text} ${item.parsed?.title || ""}`.toLowerCase().includes(needle)) {
      results.push({ type: "inbox", id: item.id, title: item.parsed?.title || item.text, detail: "Inbox" });
    }
  });
  state.notes.forEach((item) => {
    if (String(item.text || "").toLowerCase().includes(needle)) {
      results.push({ type: "note", id: item.id, title: item.text.slice(0, 72), detail: `Заметка · ${areaLabels[item.area] || item.area}` });
    }
  });
  return results.slice(0, 8);
}

function renderSearchResults(query) {
  const root = document.querySelector("#searchResults");
  if (!root) return;
  const results = searchDailyOs(query);
  root.hidden = !query.trim();
  root.innerHTML = results.length
    ? results.map((item) => `<button type="button" class="search-result" data-search-type="${escapeHtml(item.type)}" data-search-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></button>`).join("")
    : `<div class="search-empty">Ничего не найдено</div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.settings.activeView = button.dataset.view;
    saveState();
  });
});

document.querySelector("#inboxForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#inboxText");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  await processInbox(text);
});

document.querySelector("#todayCaptureForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#todayCaptureText");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  await processInbox(text);
});

document.querySelector("#reviewForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#reviewText");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  processEveningReview(text);
});

document.querySelector("#todayView").addEventListener("click", (event) => {
  const stateButton = event.target.closest("[data-status]");
  if (stateButton) {
    state.dailyPlan.status = stateButton.dataset.status;
    if (state.dailyPlan.status === "low_energy") {
      state.dailyPlan.focus = "Оставить минимум и защитить восстановление";
    }
    if (state.dailyPlan.status === "overloaded") {
      state.dailyPlan.focus = "Снять лишнее и закрыть один главный результат";
    }
    saveState();
  }
});

document.querySelector("#todayView").addEventListener("click", (event) => {
  const dayBlock = event.target.closest('[data-action="select-day-block"]');
  if (!dayBlock) return;
  state.ui = state.ui || {};
  state.ui.selectedDayBlockIndex = Number(dayBlock.dataset.blockIndex);
  saveState();
});

document.querySelector("#inboxView").addEventListener("click", (event) => {
  const inboxObject = event.target.closest('[data-action="select-inbox"]');
  if (!inboxObject) return;
  const row = inboxObject.closest("[data-inbox-id]");
  state.ui = state.ui || {};
  state.ui.selectedInboxId = row?.dataset.inboxId || null;
  saveState();
});

document.body.addEventListener("click", (event) => {
  const habitToggle = event.target.closest('[data-action="toggle-habit"]');
  if (habitToggle) {
    const habitItem = habitToggle.closest("[data-habit-id]");
    const item = state.habits.find((candidate) => candidate.id === habitItem.dataset.habitId);
    if (!item) return;
    item.completions = item.completions || {};
    if (item.completions[todayIso]) {
      delete item.completions[todayIso];
      item.streak = Math.max(0, item.streak - 1);
      state.assistantActions.unshift(action("Ритуал снят", item.title, "confirmed"));
    } else {
      item.completions[todayIso] = new Date().toISOString();
      item.streak += 1;
      state.assistantActions.unshift(action("Ритуал отмечен", item.title, "confirmed"));
    }
    saveState();
    return;
  }

  const toggle = event.target.closest('[data-action="toggle"]');
  if (toggle) {
    const taskItem = toggle.closest("[data-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskItem.dataset.taskId);
    if (!item) return;
    if (item.status === "done") {
      item.status = item.previousStatus || "today";
      state.assistantActions.unshift(action("Задача возвращена", item.title, "confirmed"));
    } else {
      item.previousStatus = item.status;
      item.status = "done";
      state.assistantActions.unshift(action("Задача закрыта", item.title, "confirmed"));
    }
    item.updatedAt = new Date().toISOString();
    selectTask(item.id);
    saveState();
    return;
  }

  const taskRow = event.target.closest('[data-action="select-task"]');
  if (taskRow) {
    if (selectTask(taskRow.dataset.taskId)) saveState();
    return;
  }
});

document.querySelector("#quickTaskForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#quickTaskTitle");
  const title = input.value.trim();
  if (!title) return;
  input.value = "";
  addTaskToToday(title);
  saveState();
});

document.querySelector("#addHabitToggle").addEventListener("click", () => {
  document.querySelector("#habitComposer")?.classList.toggle("is-hidden");
});

document.querySelector("#habitComposer").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.querySelector("#habitTitle").value.trim();
  if (!title) return;
  addHabitFromForm(title, document.querySelector("#habitArea").value, document.querySelector("#habitGroup").value);
  document.querySelector("#habitTitle").value = "";
  document.querySelector("#habitComposer").classList.add("is-hidden");
  saveState();
});

document.querySelector("#editFocus").addEventListener("click", () => {
  const focus = prompt("Фокус дня", state.dailyPlan.focus);
  if (!focus?.trim()) return;
  state.dailyPlan.focus = focus.trim();
  state.assistantActions.unshift(action("Фокус обновлён", focus.trim(), "confirmed"));
  saveState();
});

document.querySelector("#addWeeklyFocus").addEventListener("click", () => {
  const title = prompt("Фокус недели");
  if (!title?.trim()) return;
  state.weeklyPlan.focus.unshift({ id: crypto.randomUUID(), title: title.trim(), area: "personal", progress: 0 });
  saveState();
});

function sweepBacklogToWeek() {
  state.tasks
    .filter((item) => item.status === "backlog" && item.priority !== "low")
    .slice(0, 3)
    .forEach((item) => {
      item.status = "this_week";
      item.updatedAt = new Date().toISOString();
    });
  state.assistantActions.unshift(action("Бэклог разложен", "До трёх важных задач подняты в неделю.", "confirmed"));
}

document.querySelector("#sweepBacklog").addEventListener("click", () => {
  sweepBacklogToWeek();
  saveState();
});

document.querySelector("#reviewJourneys").addEventListener("click", () => {
  state.projects.filter((item) => item.status !== "archived").forEach(reviewProjectJourney);
  saveState();
});

document.querySelector("#projectsView").addEventListener("click", (event) => {
  const projectElement = event.target.closest("[data-project-id]");
  if (!projectElement) return;
  const projectItem = state.projects.find((item) => item.id === projectElement.dataset.projectId);
  if (!projectItem) return;

  if (event.target.closest('[data-action="confirm-stage"]')) {
    const fromStage = projectItem.journeyStage;
    projectItem.journeyStage = projectItem.proposedStage || projectItem.journeyStage;
    projectItem.stageReason = projectItem.proposedReason || projectItem.stageReason;
    projectItem.nextTransition = nextTransitionFor(projectItem.journeyStage);
    projectItem.proposedStage = null;
    projectItem.proposedReason = "";
    projectItem.updatedAt = new Date().toISOString();
    const pending = state.projectStageEvents.find((item) => item.projectId === projectItem.id && item.fromStage === fromStage && item.toStage === projectItem.journeyStage && item.status === "needs_confirmation");
    if (pending) pending.status = "confirmed";
    state.assistantActions.unshift(action("Переход стадии подтверждён", `${projectItem.title}: ${stageLabel(fromStage)} -> ${stageLabel(projectItem.journeyStage)}.`, "confirmed"));
    saveState();
    return;
  }

  if (event.target.closest('[data-action="review-project"]')) {
    reviewProjectJourney(projectItem);
    saveState();
    return;
  }

  if (event.target.closest('[data-action="select-project"]') || event.target.closest(".journey-card")) {
    state.selectedProjectId = projectItem.id;
    saveState();
  }
});

document.querySelector("#runAutopilot").addEventListener("click", () => {
  const view = state.settings.activeView;
  if (view === "today") {
    rebalanceToday();
    state.assistantActions.unshift(action("План проверен", "Ассистент проверил перегруз дня, высокий приоритет и хвосты.", "confirmed"));
  } else if (view === "week" || view === "board") {
    sweepBacklogToWeek();
  } else if (view === "projects") {
    state.projects.filter((item) => item.status !== "archived").forEach(reviewProjectJourney);
    state.assistantActions.unshift(action("Проекты проверены", "Ассистент пересмотрел стадии, блокеры и возможные переходы проектов.", "confirmed"));
  } else if (view === "inbox") {
    state.assistantActions.unshift(action("Inbox проверен", "Ассистент подсветил входящие, которые требуют разбора или подтверждения.", "confirmed"));
  } else {
    state.assistantActions.unshift(action("Лог обновлён", "Актуальный audit trail пересобран без изменения объектов.", "confirmed"));
  }
  saveState();
});

document.querySelector("#appInspectorContent").addEventListener("change", async (event) => {
  const taskField = event.target.closest("[data-task-field]");
  if (taskField) {
    const taskRoot = taskField.closest("[data-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskRoot?.dataset.taskId);
    updateTaskField(item, taskField.dataset.taskField, taskField.value);
    state.assistantActions.unshift(action("Задача обновлена", item?.title || "Параметры задачи изменены.", "confirmed"));
    saveState();
    return;
  }

  const focusField = event.target.closest("[data-focus-field]");
  if (focusField) {
    if (focusField.dataset.focusField === "soundCategory") {
      state.focus.soundCategory = focusField.value;
      if (focusRuntime.isSoundPlaying) await playFocusSound();
    }
    if (focusField.dataset.focusField === "volume") updateFocusVolume(focusField.value);
    saveState();
  }
});

document.querySelector("#appInspectorContent").addEventListener("keydown", (event) => {
  const taskField = event.target.closest("[data-task-field]");
  if (!taskField || event.key !== "Enter" || event.target.tagName === "TEXTAREA") return;
  event.preventDefault();
  taskField.blur();
});

document.querySelector("#appInspectorContent").addEventListener("click", async (event) => {
  const modeButton = event.target.closest("[data-focus-mode]");
  if (modeButton) {
    setFocusMode(modeButton.dataset.focusMode);
    saveState();
    return;
  }

  const focusAction = event.target.closest("[data-focus-action]");
  if (focusAction) {
    const actionType = focusAction.dataset.focusAction;
    if (actionType === "bind-task") {
      const taskRoot = focusAction.closest("[data-task-id]");
      if (selectTask(taskRoot?.dataset.taskId)) saveState();
    }
    if (actionType === "start") startFocusTimer();
    if (actionType === "pause") pauseFocusTimer();
    if (actionType === "reset") resetFocusTimer();
    return;
  }

  const soundAction = event.target.closest("[data-sound-action]");
  if (soundAction) {
    if (soundAction.dataset.soundAction === "play") await playFocusSound();
    else {
      stopFocusSound();
      render();
    }
  }
});

document.querySelector("#globalSearch").addEventListener("input", (event) => {
  renderSearchResults(event.target.value);
});

document.querySelector("#searchResults").addEventListener("click", (event) => {
  const item = event.target.closest("[data-search-type]");
  if (!item) return;
  const type = item.dataset.searchType;
  const id = item.dataset.searchId;
  if (type === "task") selectTask(id, "today");
  if (type === "project") {
    state.selectedProjectId = id;
    state.settings.activeView = "projects";
  }
  if (type === "inbox") {
    state.ui.selectedInboxId = id;
    state.settings.activeView = "inbox";
  }
  if (type === "note") {
    state.settings.activeView = "log";
  }
  document.querySelector("#globalSearch").value = "";
  renderSearchResults("");
  saveState();
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
  if ((event.key === "/" && !isTyping) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
    event.preventDefault();
    document.querySelector("#globalSearch")?.focus();
  }
  if (event.key === "Escape") {
    document.querySelector("#globalSearch").value = "";
    renderSearchResults("");
  }
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  if (!confirm("Сбросить демо-данные?")) return;
  state = structuredClone(seedState);
  saveState();
});

document.querySelector("#authButton")?.addEventListener("click", beginGithubSignIn);
document.querySelector("#authGateButton")?.addEventListener("click", beginGithubSignIn);

document.querySelector("#signOutButton")?.addEventListener("click", async () => {
  try {
    await signOut();
    cloudSync.session = null;
    cloudSync.status = "private";
    updateAuthUi();
  } catch (error) {
    cloudSync.error = error instanceof Error ? error.message : "Sign out failed";
    updateAuthUi();
  }
});

if ("serviceWorker" in navigator && isLocalDev) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .then(() => caches.keys())
    .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    .catch(() => {});
}

if ("serviceWorker" in navigator && !isLocalDev) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  state = normalizeState(JSON.parse(event.newValue));
  render();
});

render();
initAuth();


setInterval(() => {
  if (state.settings.activeView === "today") render();
}, 60 * 1000);
