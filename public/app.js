import {
  getAppConfig,
  getAuthSession,
  loadCloudNotes,
  loadCloudState,
  onAuthStateChange,
  saveCloudNotes,
  saveCloudState,
  signInWithGithub,
  signOut
} from "./supabase-client.js?v=129";
import {
  createBackupPayload,
  createTaskRecord,
  duplicateTaskRecord,
  parseBackupPayload,
  parseStateSnapshot,
  restoreTaskRecord,
  serializeStateSnapshot,
  updateTaskRecord
} from "./task-state.js?v=132";

const STORAGE_KEY = "second-brain-command-center:v1";
const CONFLICT_BACKUP_KEY = "second-brain-command-center:conflict-backup";
const PRE_IMPORT_BACKUP_KEY = "second-brain-command-center:pre-import-backup";
const PRE_HYDRATE_BACKUP_KEY = "second-brain-command-center:pre-hydrate-backup";
const PENDING_CLOUD_SAVE_KEY = "second-brain-command-center:pending-cloud-save";
const LAST_EXPORT_AT_KEY = "second-brain-command-center:last-export-at";
const UNDO_TTL_MS = 12_000;
const isLocalDev = ["127.0.0.1", "localhost", ""].includes(window.location.hostname);
const cloudSync = {
  configured: false,
  session: null,
  timer: null,
  inFlight: false,
  pendingSnapshot: null,
  status: "local",
  error: "",
  contentAvailable: false,
  revision: null,
  remoteUpdatedAt: null,
  legacyMode: false,
  hydratedUserId: ""
};
const boardColumns = [
  ["inbox", "Inbox"],
  ["backlog", "Backlog"],
  ["this_week", "Неделя"],
  ["today", "Сегодня"],
  ["done", "Готово"]
];

const areaLabels = {
  career: "карьера",
  work: "работа",
  learning: "обучение",
  personal: "личное",
  health: "здоровье",
  admin: "админ"
};

const defaultTaskListMeta = {
  career: { group: "work", icon: "list-todo", tone: "blue" },
  work: { group: "work", icon: "notebook-pen", tone: "amber" },
  learning: { group: "personal", icon: "calendar-days", tone: "green" },
  personal: { group: "personal", icon: "notebook-pen", tone: "rose" },
  health: { group: "health", icon: "circle-check-big", tone: "green" },
  admin: { group: "personal", icon: "list-todo", tone: "blue" }
};
const defaultTaskLists = Object.entries(areaLabels).map(([id, title]) => ({ id, title, ...defaultTaskListMeta[id] }));
const simpleModules = new Set(["capture", "tasks", "calendar", "habits", "focus", "notes", "projects", "log"]);
const listIcons = ["list-todo", "notebook-pen", "calendar-days", "circle-check-big", "timer"];
const listTones = ["blue", "amber", "green", "rose"];
const defaultNoteFolders = [
  { id: "note-personal", title: "Личное", icon: "notebook-pen", tone: "blue" },
  { id: "note-learning", title: "Обучение", icon: "calendar-days", tone: "green" },
  { id: "note-work", title: "Работа", icon: "list-todo", tone: "amber" }
];
const calendarStartHour = 8;
const calendarEndHour = 23;
const calendarHourHeight = 64;

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
  morning: "Утро",
  afternoon: "День",
  night: "Вечер",
  anytime: "В любое время"
};
const focusModes = {
  focus: { label: "Focus 25", seconds: 25 * 60 },
  short_break: { label: "Break 5", seconds: 5 * 60 }
};
const soundCategories = {
  deep_work: "Глубокая работа",
  calm_focus: "Спокойный фокус",
  coding: "Кодинг",
  reading: "Чтение",
  rain: "Дождь",
  brown_noise: "Коричневый шум"
};
const simpleTaskViews = new Set(["today", "week", "inbox", "board", "done"]);

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
    activeView: "today",
    appearanceTheme: "sage",
    appearanceFont: "clean"
  },
  lists: structuredClone(defaultTaskLists),
  noteFolders: structuredClone(defaultNoteFolders),
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
      folderId: "note-personal",
      title: "Принцип главного экрана",
      text: "Главный экран должен отвечать на вопрос: что делать сегодня.",
      tags: ["продукт"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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

function createCleanInitialState() {
  const initial = structuredClone(seedState);
  initial.dailyPlan.focus = "";
  initial.dailyPlan.reviewSummary = "";
  initial.dailyPlan.tomorrowInherits = [];
  initial.dailyPlan.timeBlocks = [];
  initial.weeklyPlan.focus = [];
  initial.tasks = [];
  initial.notes = [];
  initial.habits = [];
  initial.routines = [];
  initial.projects = [];
  initial.selectedProjectId = null;
  initial.projectStageEvents = [];
  initial.projectObstacles = [];
  initial.inboxItems = [];
  initial.dailyReviews = [];
  initial.calendarEvents = [];
  initial.assistantActions = [];
  initial.memoryItems = [];
  return normalizeState(initial);
}

let state = loadState();
let simpleSearchQuery = "";
let simpleSyncPanelOpen = false;
let pendingImportPayload = null;
let backupMessage = "";
let undoSnapshot = null;
let undoTimer = null;
let networkOffline = !navigator.onLine;
let calendarInstance = null;
let calendarTaskDraggable = null;
let calendarEngineFailed = false;
let calendarReminderTimers = [];
let calendarPendingEdit = null;
state.ui = state.ui || {};
state.ui.selectedDayBlockIndex = Number.isInteger(state.ui.selectedDayBlockIndex) ? state.ui.selectedDayBlockIndex : 1;
state.ui.selectedInboxId = state.ui.selectedInboxId || null;
state.ui.selectedTaskId = state.tasks.some((item) => item.id === state.ui.selectedTaskId) ? state.ui.selectedTaskId : null;
state.ui.selectedNoteId = state.notes?.some((item) => item.id === state.ui.selectedNoteId) ? state.ui.selectedNoteId : null;
state.ui.selectedCalendarBlockId = null;
state.ui.selectedNoteFolderId = state.ui.selectedNoteFolderId || "";
state.ui.simpleArea = state.ui.simpleArea || "";
state.ui.simpleModule = simpleModules.has(state.ui.simpleModule)
  ? state.ui.simpleModule
  : state.settings.activeView === "notes" ? "notes" : "tasks";
state.ui.listMenuId = "";
state.ui.pendingDeleteTaskId = state.ui.pendingDeleteTaskId || "";
state.ui.pendingDeleteNoteId = state.ui.pendingDeleteNoteId || "";
state.ui.taskMenuOpen = false;
state.ui.taskMenuPosition = null;
state.ui.quickTagsOpen = false;
state.ui.appearanceOpen = false;
state.ui.calendarWeekOffset = Number.isInteger(state.ui.calendarWeekOffset) ? state.ui.calendarWeekOffset : 0;

function task(title, status = "inbox", area = "work", priority = "medium", estimate = 30, projectId = null) {
  return createTaskRecord({ title, status, area, priority, estimate, projectId });
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
    date: todayIso,
    endDate: todayIso,
    taskId: "",
    title,
    nextAction,
    status,
    recurrence: "none",
    reminderMinutes: null,
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
  if (!stored) return createCleanInitialState();
  try {
    return normalizeState({ ...structuredClone(seedState), ...parseStateSnapshot(stored) });
  } catch {
    return normalizeState(structuredClone(seedState));
  }
}

function stageUndo(label) {
  undoSnapshot = { label, state: serializeStateSnapshot(state), expiresAt: Date.now() + UNDO_TTL_MS };
  window.clearTimeout(undoTimer);
  undoTimer = window.setTimeout(() => {
    undoSnapshot = null;
    renderSimpleApp();
  }, UNDO_TTL_MS);
}

function restoreUndo() {
  if (!undoSnapshot || undoSnapshot.expiresAt < Date.now()) return false;
  state = normalizeState({ ...structuredClone(seedState), ...parseStateSnapshot(undoSnapshot.state) });
  undoSnapshot = null;
  window.clearTimeout(undoTimer);
  saveState();
  return true;
}

function normalizeState(nextState) {
  nextState.settings = { ...seedState.settings, ...(nextState.settings || {}) };
  if (!["sage", "sky", "clay"].includes(nextState.settings.appearanceTheme)) nextState.settings.appearanceTheme = "sage";
  if (!["clean", "soft", "editorial"].includes(nextState.settings.appearanceFont)) nextState.settings.appearanceFont = "clean";
  if (nextState.settings.activeView === "overview") nextState.settings.activeView = "projects";
  if (!["inbox", "today", "week", "projects", "board", "focus", "habits", "notes", "log", "done"].includes(nextState.settings.activeView)) {
    nextState.settings.activeView = "today";
  }
  nextState.ui = nextState.ui || {};
  nextState.ui.simpleArea = nextState.ui.simpleArea || "";
  nextState.ui.simpleModule = simpleModules.has(nextState.ui.simpleModule)
    ? nextState.ui.simpleModule
    : nextState.settings.activeView === "notes" ? "notes" : "tasks";
  nextState.ui.lastTaskView = simpleTaskViews.has(nextState.ui.lastTaskView)
    ? nextState.ui.lastTaskView
    : (simpleTaskViews.has(nextState.settings.activeView) ? nextState.settings.activeView : "today");
  nextState.ui.listMenuId = "";
  nextState.ui.pendingDeleteTaskId = nextState.ui.pendingDeleteTaskId || "";
  nextState.ui.pendingDeleteNoteId = nextState.ui.pendingDeleteNoteId || "";
  nextState.ui.pendingDeleteNoteFolderId = nextState.ui.pendingDeleteNoteFolderId || "";
  nextState.ui.selectedNoteFolderId = nextState.ui.selectedNoteFolderId || "";
  nextState.ui.noteFolderMenuId = "";
  nextState.ui.taskMenuOpen = false;
  nextState.ui.taskMenuPosition = null;
  nextState.ui.appearanceOpen = false;
  nextState.ui.selectedCalendarBlockId = null;
  nextState.ui.calendarWeekOffset = Number.isInteger(nextState.ui.calendarWeekOffset) ? nextState.ui.calendarWeekOffset : 0;
  nextState.lists = Array.isArray(nextState.lists) && nextState.lists.length
    ? nextState.lists
        .map((item) => ({
          id: String(item.id || slugifyListTitle(item.title || "list")),
          title: String(item.title || item.id || "Список").trim() || "Список",
          group: ["work", "personal", "health"].includes(item.group) ? item.group : (defaultTaskListMeta[item.id]?.group || "personal"),
          icon: listIcons.includes(item.icon) ? item.icon : (defaultTaskListMeta[item.id]?.icon || "list-todo"),
          tone: listTones.includes(item.tone) ? item.tone : (defaultTaskListMeta[item.id]?.tone || "blue")
        }))
        .filter((item, index, list) => item.id && list.findIndex((candidate) => candidate.id === item.id) === index)
    : structuredClone(seedState.lists);
  nextState.focus = {
    ...seedState.focus,
    ...(nextState.focus || {})
  };
  if (!focusModes[nextState.focus.timerMode]) nextState.focus.timerMode = "focus";
  if (!Number.isFinite(nextState.focus.remainingSeconds) || nextState.focus.remainingSeconds <= 0) {
    nextState.focus.remainingSeconds = focusModes[nextState.focus.timerMode].seconds;
  }
  if (!soundCategories[nextState.focus.soundCategory]) nextState.focus.soundCategory = "deep_work";
  const normalizedVolume = Number(nextState.focus.volume);
  nextState.focus.volume = Number.isFinite(normalizedVolume)
    ? Math.max(0, Math.min(1, normalizedVolume))
    : seedState.focus.volume;
  nextState.focus.running = false;
  nextState.focusSessions = Array.isArray(nextState.focusSessions) ? nextState.focusSessions : [];
  nextState.dailyPlan = { ...seedState.dailyPlan, ...(nextState.dailyPlan || {}) };
  nextState.dailyPlan.timeBlocks = Array.isArray(nextState.dailyPlan.timeBlocks)
    ? nextState.dailyPlan.timeBlocks
    : structuredClone(seedState.dailyPlan.timeBlocks);
  nextState.dailyPlan.timeBlocks.forEach((block) => {
    block.id = block.id || crypto.randomUUID();
    block.date = /^\d{4}-\d{2}-\d{2}$/.test(block.date || "") ? block.date : (nextState.dailyPlan.date || todayIso);
    block.endDate = /^\d{4}-\d{2}-\d{2}$/.test(block.endDate || "") && block.endDate >= block.date ? block.endDate : block.date;
    block.taskId = block.taskId || "";
  });
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
    item.pinned = Boolean(item.pinned);
    item.description = String(item.description || "");
    item.subtasks = Array.isArray(item.subtasks)
      ? item.subtasks.map((subtask) => ({
          id: String(subtask.id || crypto.randomUUID()),
          title: String(subtask.title || "Подзадача"),
          done: Boolean(subtask.done)
        }))
      : [];
  });
  if (nextState.focus.selectedTaskId && !nextState.tasks.some((item) => item.id === nextState.focus.selectedTaskId)) {
    nextState.focus.selectedTaskId = null;
  }
  nextState.habits = Array.isArray(nextState.habits) ? nextState.habits : structuredClone(seedState.habits);
  nextState.habits.forEach((item) => {
    item.completions = item.completions || {};
    item.streak = Number.isFinite(item.streak) ? item.streak : 0;
    item.group = habitGroups.includes(item.group) ? item.group : "anytime";
  });
  nextState.notes = Array.isArray(nextState.notes) ? nextState.notes : [];
  nextState.noteFolders = Array.isArray(nextState.noteFolders) && nextState.noteFolders.length
    ? nextState.noteFolders.map((item) => ({
        id: String(item.id || crypto.randomUUID()),
        title: String(item.title || "Новая папка").trim() || "Новая папка",
        icon: listIcons.includes(item.icon) ? item.icon : "notebook-pen",
        tone: listTones.includes(item.tone) ? item.tone : "blue"
      }))
    : structuredClone(seedState.noteFolders);
  const legacyFolderByArea = {
    personal: "note-personal",
    learning: "note-learning",
    work: "note-work",
    career: "note-work"
  };
  nextState.notes.forEach((item) => {
    item.title = String(item.title || String(item.text || "").split("\n")[0].slice(0, 90) || "Без названия");
    item.text = String(item.text || "");
    item.area = item.area || nextState.lists[0]?.id || "personal";
    item.folderId = nextState.noteFolders.some((folder) => folder.id === item.folderId)
      ? item.folderId
      : (legacyFolderByArea[item.area] || "");
    item.tags = Array.isArray(item.tags) ? item.tags : [];
    item.createdAt = item.createdAt || new Date().toISOString();
    item.updatedAt = item.updatedAt || item.createdAt;
  });
  if (nextState.ui.selectedNoteFolderId && nextState.ui.selectedNoteFolderId !== "unfiled" && !nextState.noteFolders.some((folder) => folder.id === nextState.ui.selectedNoteFolderId)) {
    nextState.ui.selectedNoteFolderId = "";
  }
  nextState.inboxItems = Array.isArray(nextState.inboxItems) ? nextState.inboxItems : [];
  nextState.inboxItems.forEach((item) => {
    item.status = item.status || (item.linkedId ? "processed" : "open");
    item.linkedType = item.linkedType || "";
    item.linkedId = item.linkedId || "";
  });
  nextState.dailyReviews = Array.isArray(nextState.dailyReviews) ? nextState.dailyReviews : [];
  nextState.calendarEvents = Array.isArray(nextState.calendarEvents) ? nextState.calendarEvents : [];
  nextState.calendarEvents.forEach((item) => {
    item.id = item.id || crypto.randomUUID();
    item.date = /^\d{4}-\d{2}-\d{2}$/.test(item.date || "") ? item.date : todayIso;
    item.start = /^\d{2}:\d{2}$/.test(item.start || "") ? item.start : "09:00";
    item.end = /^\d{2}:\d{2}$/.test(item.end || "") ? item.end : item.start;
    item.title = String(item.title || "Событие");
    item.area = item.area || nextState.lists[0]?.id || "personal";
    item.source = item.source || "calendar_readonly";
  });
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
  return { kind: "admin", title: listLabel(item.area) || "Без проекта", area: item.area || "admin" };
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
  localStorage.setItem(STORAGE_KEY, serializeStateSnapshot(state));
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
  if (/SYNC_CONFLICT/i.test(text)) return "На другом устройстве уже сохранена более новая версия. Актуальные данные загружены, локальная версия сохранена в резервной копии.";
  if (/SYNC_UPGRADE_REQUIRED/i.test(text)) return "Нужно обновить безопасную синхронизацию: запусти db/supabase-state-sync.sql в Supabase SQL Editor. До этого изменения сохраняются только на этом устройстве.";
  return text || "Cloud sync failed";
}

function applyCloudSaveResult(result) {
  if (!result || result.skipped) return;
  cloudSync.revision = Number.isFinite(result.revision) ? result.revision : null;
  cloudSync.remoteUpdatedAt = result.updatedAt || cloudSync.remoteUpdatedAt;
  cloudSync.legacyMode = Boolean(result.legacy);
}

async function recoverCloudConflict(localSnapshot, expectedRevision = cloudSync.revision) {
  const backup = {
    savedAt: new Date().toISOString(),
    expectedRevision: Number.isFinite(expectedRevision) ? expectedRevision : null,
    remoteRevision: null,
    remoteUpdatedAt: null,
    state: localSnapshot
  };
  localStorage.setItem(CONFLICT_BACKUP_KEY, JSON.stringify(backup));
  cloudSync.status = "conflict";
  cloudSync.error = friendlySyncError("SYNC_CONFLICT");
  try {
    const remote = await loadCloudState();
    if (remote?.state) {
      backup.remoteRevision = Number.isFinite(Number(remote.revision)) ? Number(remote.revision) : null;
      backup.remoteUpdatedAt = remote.updated_at || null;
      localStorage.setItem(CONFLICT_BACKUP_KEY, JSON.stringify(backup));
      state = normalizeState({ ...structuredClone(seedState), ...remote.state });
      cloudSync.revision = remote.revision !== null && remote.revision !== undefined && Number.isFinite(Number(remote.revision)) ? Number(remote.revision) : null;
      cloudSync.remoteUpdatedAt = remote.updated_at || null;
      cloudSync.legacyMode = Boolean(remote.legacy);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    cloudSync.error = "Облачную версию пока не удалось перечитать. Локальная копия сохранена; повтори после восстановления связи.";
  }
  render();
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
  queueMicrotask(renderSimpleApp);

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
    status.textContent = cloudSync.status === "conflict" ? "sync conflict" : cloudSync.session ? "setup needed" : "auth error";
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
    gateStatus.textContent = "Войти можно в любой момент; без входа данные остаются на этом устройстве.";
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
  const userId = session.user?.id || "";
  if (userId && cloudSync.hydratedUserId === userId && cloudSync.status === "synced") return;
  cloudSync.status = "syncing";
  cloudSync.error = "";
  updateAuthUi();

  try {
    const remote = await loadCloudState();
    if (remote?.state) {
      cloudSync.revision = remote.revision !== null && remote.revision !== undefined && Number.isFinite(Number(remote.revision)) ? Number(remote.revision) : null;
      cloudSync.remoteUpdatedAt = remote.updated_at || null;
      cloudSync.legacyMode = Boolean(remote.legacy);

      localStorage.setItem(PRE_HYDRATE_BACKUP_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        userId,
        state: structuredClone(state)
      }));

      let pendingLocal = null;
      try {
        pendingLocal = JSON.parse(localStorage.getItem(PENDING_CLOUD_SAVE_KEY) || "null");
      } catch {
        localStorage.removeItem(PENDING_CLOUD_SAVE_KEY);
      }

      if (pendingLocal?.userId === userId && pendingLocal.state) {
        state = normalizeState({ ...structuredClone(seedState), ...pendingLocal.state });
        applyCloudSaveResult(await saveCloudState(state, cloudSync.revision));
        localStorage.removeItem(PENDING_CLOUD_SAVE_KEY);
      } else {
        state = normalizeState({ ...structuredClone(seedState), ...remote.state });
      }
    } else {
      applyCloudSaveResult(await saveCloudState(state, 0));
    }

    const content = await loadCloudNotes();
    cloudSync.contentAvailable = content.available;
    if (content.available) {
      const normalizedNotesActive = Boolean(state.settings.notesNormalizedAt);
      if (normalizedNotesActive || content.notes.length) {
        state.noteFolders = content.folders;
        state.notes = content.notes;
        state.settings.notesNormalizedAt ||= new Date().toISOString();
        state = normalizeState(state);
      } else {
        const migration = await saveCloudNotes(state.noteFolders, state.notes);
        if (migration.available) state.settings.notesNormalizedAt = new Date().toISOString();
      }
      applyCloudSaveResult(await saveCloudState(state, cloudSync.revision));
    }

    state.ui = state.ui || {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    cloudSync.status = "synced";
    cloudSync.hydratedUserId = userId;
    render();
    updateAuthUi();
  } catch (error) {
    cloudSync.error = friendlySyncError(error?.message || (error instanceof Error ? error.message : "Cloud sync failed"));
    cloudSync.status = "error";
    updateAuthUi();
  }
}

function queueCloudSave({ immediate = false } = {}) {
  if (!cloudSync.configured || !cloudSync.session) return;
  if (cloudSync.status === "conflict") return;
  cloudSync.pendingSnapshot = structuredClone(state);
  localStorage.setItem(PENDING_CLOUD_SAVE_KEY, JSON.stringify({
    savedAt: new Date().toISOString(),
    userId: cloudSync.session.user?.id || "",
    state: cloudSync.pendingSnapshot
  }));
  window.clearTimeout(cloudSync.timer);
  cloudSync.status = "syncing";
  updateAuthUi();
  cloudSync.timer = window.setTimeout(flushCloudSave, immediate ? 0 : 600);
}

async function flushCloudSave() {
  if (cloudSync.inFlight || !cloudSync.pendingSnapshot || cloudSync.status === "conflict") return;
  cloudSync.timer = null;
  const localSnapshot = cloudSync.pendingSnapshot;
  const expectedRevision = cloudSync.revision;
  cloudSync.pendingSnapshot = null;
  cloudSync.inFlight = true;
  try {
    const stateResult = await saveCloudState(localSnapshot, expectedRevision);
    applyCloudSaveResult(stateResult);
    const contentResult = await saveCloudNotes(localSnapshot.noteFolders, localSnapshot.notes);
    cloudSync.contentAvailable = contentResult.available;
    try {
      const pendingLocal = JSON.parse(localStorage.getItem(PENDING_CLOUD_SAVE_KEY) || "null");
      if (pendingLocal?.state && serializeStateSnapshot(pendingLocal.state) === serializeStateSnapshot(localSnapshot)) {
        localStorage.removeItem(PENDING_CLOUD_SAVE_KEY);
      }
    } catch {
      localStorage.removeItem(PENDING_CLOUD_SAVE_KEY);
    }
    cloudSync.status = "synced";
    cloudSync.error = "";
  } catch (error) {
    const message = error?.message || (error instanceof Error ? error.message : String(error || "Cloud sync failed"));
    if (/SYNC_CONFLICT/i.test(message)) {
      cloudSync.pendingSnapshot = null;
      await recoverCloudConflict(localSnapshot, expectedRevision);
    } else {
      cloudSync.error = friendlySyncError(message);
      cloudSync.status = "error";
    }
  } finally {
    cloudSync.inFlight = false;
    updateAuthUi();
    if (cloudSync.pendingSnapshot && cloudSync.status !== "conflict") {
      window.clearTimeout(cloudSync.timer);
      cloudSync.timer = window.setTimeout(flushCloudSave, 0);
    }
  }
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
      const sameHydratedUser = Boolean(session?.user?.id && session.user.id === cloudSync.hydratedUserId);
      cloudSync.session = session;
      cloudSync.status = session ? (sameHydratedUser ? "synced" : "syncing") : "private";
      cloudSync.error = "";
      updateAuthUi();
      if (session && !sameHydratedUser) await hydrateCloudState(session);
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
  const allowedAreas = new Set([...Object.keys(areaLabels), ...taskListIds()]);
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
    status: "open",
    linkedType: "",
    linkedId: "",
    createdAt: new Date().toISOString()
  };

  state.inboxItems.unshift(inboxItem);
  state.ui = state.ui || {};
  state.ui.selectedInboxId = inboxItem.id;
  state.ui.lastCaptureId = inboxItem.id;

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
    inboxItem.status = overload ? "needs_review" : "processed";
    inboxItem.linkedType = "project";
    inboxItem.linkedId = newProject.id;
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
    inboxItem.status = parsed.needsReview ? "needs_review" : "processed";
    inboxItem.linkedType = "task";
    inboxItem.linkedId = newTask.id;
    selectTask(newTask.id);
  } else {
    const now = new Date().toISOString();
    const newNote = {
      id: crypto.randomUUID(),
      type: parsed.kind,
      area: parsed.area,
      folderId: noteFolderForArea(parsed.area),
      title: parsed.title || text.split("\n")[0].slice(0, 90) || "Без названия",
      text,
      tags: [],
      createdAt: now,
      updatedAt: now
    };
    state.notes.unshift(newNote);
    inboxItem.status = parsed.needsReview ? "needs_review" : "processed";
    inboxItem.linkedType = "note";
    inboxItem.linkedId = newNote.id;
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
        "AI недоступен",
        "Gemini inbox недоступен, использована локальная классификация.",
        "needs_review"
      )
    );
  }

  rebalanceToday();
  saveState();
  return inboxItem;
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
  const noteCreatedAt = new Date().toISOString();
  state.notes.unshift({
    id: crypto.randomUUID(),
    type: "daily_context",
    area: energy === "low" ? "health" : "personal",
    folderId: "note-personal",
    title: `Итоги дня · ${todayIso}`,
    text,
    tags: ["review"],
    createdAt: noteCreatedAt,
    updatedAt: noteCreatedAt
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

function confirmProjectStage(projectItem) {
  if (!projectItem?.proposedStage) return false;
  const fromStage = projectItem.journeyStage;
  projectItem.journeyStage = projectItem.proposedStage;
  projectItem.stageReason = projectItem.proposedReason || projectItem.stageReason;
  projectItem.nextTransition = nextTransitionFor(projectItem.journeyStage);
  projectItem.proposedStage = null;
  projectItem.proposedReason = "";
  projectItem.updatedAt = new Date().toISOString();
  const pending = state.projectStageEvents.find((item) => item.projectId === projectItem.id && item.fromStage === fromStage && item.toStage === projectItem.journeyStage && item.status === "needs_confirmation");
  if (pending) pending.status = "confirmed";
  state.assistantActions.unshift(action("Переход стадии подтверждён", `${projectItem.title}: ${stageLabel(fromStage)} → ${stageLabel(projectItem.journeyStage)}.`, "confirmed"));
  return true;
}

function proposeProjectStage(projectItem, toStage, reason, proposedBy = "user") {
  if (!projectItem || !journeyStages.some(([stage]) => stage === toStage) || toStage === projectItem.journeyStage) return false;
  const cleanReason = String(reason || "").trim() || `Ручное предложение перейти в «${stageLabel(toStage)}».`;
  projectItem.proposedStage = toStage;
  projectItem.proposedReason = cleanReason;
  projectItem.nextTransition = `Подтвердить переход: ${stageLabel(projectItem.journeyStage)} → ${stageLabel(toStage)}.`;
  projectItem.lastStageReviewAt = new Date().toISOString();
  state.projectStageEvents.unshift(stageEvent(projectItem.id, projectItem.journeyStage, toStage, cleanReason, proposedBy));
  state.assistantActions.unshift(action("Предложен переход стадии", `${projectItem.title}: ${cleanReason}`, "needs_review"));
  return true;
}

function rejectProjectStage(projectItem) {
  if (!projectItem?.proposedStage) return false;
  const pending = state.projectStageEvents.find((item) => item.projectId === projectItem.id && item.fromStage === projectItem.journeyStage && item.toStage === projectItem.proposedStage && item.status === "needs_confirmation");
  if (pending) pending.status = "rejected";
  state.assistantActions.unshift(action("Переход стадии отклонён", `${projectItem.title}: ${stageLabel(projectItem.journeyStage)} → ${stageLabel(projectItem.proposedStage)}.`, "rejected"));
  projectItem.proposedStage = null;
  projectItem.proposedReason = "";
  projectItem.nextTransition = nextTransitionFor(projectItem.journeyStage);
  projectItem.updatedAt = new Date().toISOString();
  return true;
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
        action("Задача поднята в день", `"${candidate.title}" попала в Сегодня как высокий приоритет.`, "confirmed")
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
  if (document.querySelector("#simpleApp")) {
    renderSimpleApp();
    return;
  }
  renderShell();
  renderInbox();
  renderToday();
  renderNotes();
  renderWeek();
  renderProjects();
  renderBoard();
  renderFocusView();
  renderLog();
  renderAppInspector(state.settings.activeView);
  renderSimpleApp();
}

function viewTitle(view) {
  return {
    inbox: "Inbox",
    today: "Сегодня",
    week: "Неделя",
    projects: "Проекты",
    board: "Доска",
    focus: "Фокус",
    habits: "Привычки",
    notes: "Заметки",
    log: "Лог"
  }[view] || "Сегодня";
}

function viewSubtitle(view) {
  return {
    inbox: "Быстрый вход для мыслей, задач, заметок и сигналов, которые разберёт ассистент.",
    today: "Фокус и операционка дня без смешивания с трекерами.",
    week: "Фокусы недели, активные задачи и хвосты без лишней аналитики.",
    projects: "Цели, проекты, блокеры и путь проекта без дашбордного шума.",
    board: "Простая доска без Jira-шума: inbox, backlog, week, today, done.",
    focus: "Pomodoro, выбранная задача и звук для концентрации в отдельном режиме.",
    habits: "Отдельный трекер ритуалов: чек сегодня, 7 дней и streak без смешивания с задачами.",
    notes: "Все сохранённые мысли и контекст, которые не являются задачами.",
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
    focus: "Начать фокус",
    habits: "Проверить ритуалы",
    notes: "Обновить заметки",
    log: "Обновить лог"
  }[view] || "Проверить";
}

function inspectorIsUseful(view) {
  if (view === "habits" || view === "focus" || view === "notes") return false;
  if (getSelectedTask()) return true;
  if (view === "today") return true;
  if (view === "projects") return Boolean(state.selectedProjectId || state.projects[0]);
  if (view === "inbox") return Boolean(getSelectedInboxItem());
  return false;
}

function renderShell() {
  const activeView = state.settings.activeView;
  document.body.dataset.view = activeView;
  document.body.dataset.inspector = inspectorIsUseful(activeView) ? "on" : "off";
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

function slugifyListTitle(title) {
  const base = String(title || "list")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return base || `list-${Date.now()}`;
}

function taskLists() {
  state.lists = Array.isArray(state.lists) && state.lists.length ? state.lists : structuredClone(defaultTaskLists);
  return state.lists;
}

function taskListIds() {
  return taskLists().map((item) => item.id);
}

function taskListLabels() {
  return Object.fromEntries(taskLists().map((item) => [item.id, item.title]));
}

function listLabel(id) {
  return taskListLabels()[id] || areaLabels[id] || id || "Без списка";
}

function allTaskTags() {
  return [...new Set(state.tasks.flatMap((item) => Array.isArray(item.tags) ? item.tags : []))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ru"));
}

function ensureUniqueListId(title) {
  const base = slugifyListTitle(title);
  const existing = new Set(taskListIds());
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function createTaskList(title) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return null;
  const item = { id: ensureUniqueListId(cleanTitle), title: cleanTitle, group: "personal", icon: "list-todo", tone: "blue" };
  taskLists();
  state.lists.push(item);
  state.ui.simpleModule = "tasks";
  state.ui.simpleArea = item.id;
  state.ui.creatingList = false;
  state.settings.activeView = "board";
  state.assistantActions.unshift(action("Список создан", cleanTitle, "confirmed"));
  return item;
}

function renameTaskList(id, title) {
  const cleanTitle = String(title || "").trim();
  const item = taskLists().find((candidate) => candidate.id === id);
  if (!item || !cleanTitle) return;
  item.title = cleanTitle;
  state.ui.renamingListId = "";
  state.assistantActions.unshift(action("Список переименован", cleanTitle, "confirmed"));
}

function deleteTaskList(id) {
  const lists = taskLists();
  if (lists.length <= 1) return;
  const item = lists.find((candidate) => candidate.id === id);
  if (!item) return;
  const fallback = lists.find((candidate) => candidate.id !== id)?.id || "personal";
  state.tasks.forEach((taskItem) => {
    if (taskItem.area === id) taskItem.area = fallback;
  });
  state.notes.forEach((noteItem) => {
    if (noteItem.area === id) noteItem.area = fallback;
  });
  state.habits.forEach((habitItem) => {
    if (habitItem.area === id) habitItem.area = fallback;
  });
  state.lists = lists.filter((candidate) => candidate.id !== id);
  if (state.ui.simpleArea === id) state.ui.simpleArea = fallback;
  state.ui.renamingListId = "";
  state.ui.pendingDeleteListId = "";
  state.assistantActions.unshift(action("Список удалён", `${item.title}; объекты перенесены в ${listLabel(fallback)}`, "confirmed"));
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

function addDaysIso(days) {
  return new Date(Date.now() + days * dayMs).toISOString().slice(0, 10);
}

function taskDuePresetValue(item) {
  if (!item.dueDate) return "";
  if (item.dueDate === todayIso) return todayIso;
  if (item.dueDate === addDaysIso(1)) return addDaysIso(1);
  if (item.dueDate === addDaysIso(7)) return addDaysIso(7);
  return item.dueDate;
}

function formatShortDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
}

function renderOptionChips(field, options, current, labels = {}) {
  return options.map((value) => `<button
    class="option-chip ${String(current) === String(value) ? "active" : ""}"
    type="button"
    data-task-option="${escapeHtml(field)}"
    data-value="${escapeHtml(value)}"
  >${escapeHtml(labels[value] || value)}</button>`).join("");
}

function renderPropertyMenu(label, currentLabel, innerHtml, extraClass = "") {
  return `<details class="task-property-menu ${escapeHtml(extraClass)}">
    <summary>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(currentLabel)}</strong>
    </summary>
    <div class="property-menu-body">${innerHtml}</div>
  </details>`;
}

function renderOptionPopover(label, currentLabel, innerHtml, icon = "") {
  return `<details class="task-option-popover">
    <summary aria-label="${escapeHtml(label)}: ${escapeHtml(currentLabel)}">
      <span class="task-option-icon">${escapeHtml(icon)}</span>
      <strong>${escapeHtml(currentLabel)}</strong>
    </summary>
    <div class="task-option-menu">
      <span class="task-option-label">${escapeHtml(label)}</span>
      ${innerHtml}
    </div>
  </details>`;
}

function renderTaskQuickMenu(item) {
  const currentDue = taskDuePresetValue(item);
  const dueLabels = { "": "Без даты", [todayIso]: "Сегодня", [addDaysIso(1)]: "Завтра", [addDaysIso(7)]: "На неделе" };
  return `<details class="task-row-menu" data-task-id="${escapeHtml(item.id)}">
    <summary aria-label="Параметры задачи" title="Параметры">•••</summary>
    <div class="task-row-menu-panel">
      <div class="menu-block">
        <span>Дата</span>
        <div class="menu-icon-row">
          ${renderOptionChips("dueDate", ["", todayIso, addDaysIso(1), addDaysIso(7)], currentDue, dueLabels)}
        </div>
      </div>
      <div class="menu-block">
        <span>Приоритет</span>
        <div class="menu-icon-row priority-options">
          ${renderOptionChips("priority", priorities, item.priority, { low: "Низкий", medium: "Средний", high: "Высокий" })}
        </div>
      </div>
      <button type="button" class="menu-command" data-task-option="status" data-value="today">Перенести в Сегодня</button>
      <button type="button" class="menu-command" data-task-option="status" data-value="this_week">Перенести на неделю</button>
      <button type="button" class="menu-command" data-task-menu-action="start-focus">Начать фокус</button>
      <label class="menu-inline-field">
        <span>Теги</span>
        <input data-task-field="tags" value="${escapeHtml((item.tags || []).join(", "))}" placeholder="focus, admin" />
      </label>
    </div>
  </details>`;
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
        <span>Звук для фокуса</span>
        <select data-focus-field="soundCategory">${soundOptions}</select>
      </label>
      <div class="sound-controls">
        <button class="secondary-button" type="button" data-sound-action="${focusRuntime.isSoundPlaying ? "pause" : "play"}">${focusRuntime.isSoundPlaying ? "Выключить звук" : "Включить звук"}</button>
        <label class="volume-control">
          <span>громкость</span>
          <input type="range" min="0" max="1" step="0.05" value="${escapeHtml(focus.volume)}" data-focus-field="volume" />
        </label>
      </div>
    </div>
  </section>`;
}

function renderTaskInspector(item) {
  const category = categoryForTask(item);
  const statusLabels = {
    inbox: "Inbox",
    backlog: "Backlog",
    this_week: "Неделя",
    today: "Сегодня",
    done: "Готово"
  };
  const priorityLabels = { low: "Низкий", medium: "Средний", high: "Высокий" };
  const estimateOptions = [15, 25, 30, 45, 60];
  const dueOptions = ["", todayIso, addDaysIso(1), addDaysIso(7)];
  const dueLabels = { "": "Без даты", [todayIso]: "Сегодня", [addDaysIso(1)]: "Завтра", [addDaysIso(7)]: "На неделе" };
  const currentDue = taskDuePresetValue(item);
  const currentLink = categoryForTask(item);
  return `<section class="task-inspector-card" data-task-id="${escapeHtml(item.id)}">
    <div class="task-inspector-title">
      <span class="pill">Задача</span>
      <input data-task-field="title" value="${escapeHtml(item.title)}" aria-label="Название задачи" />
    </div>
    <div class="task-quick-options">
      ${renderOptionPopover("Статус", statusLabels[item.status] || item.status, `<div class="option-chip-row">${renderOptionChips("status", taskStatuses, item.status, statusLabels)}</div>`, "S")}
      ${renderOptionPopover("Список", listLabel(item.area), `<div class="option-chip-row">${renderOptionChips("area", taskListIds(), item.area, taskListLabels())}</div>`, "L")}
      ${renderOptionPopover("Приоритет", priorityLabels[item.priority] || item.priority, `<div class="option-chip-row priority-options">${renderOptionChips("priority", priorities, item.priority, priorityLabels)}</div>`, "P")}
      ${renderOptionPopover("Дата", item.dueDate ? (dueLabels[currentDue] || item.dueDate) : "Без даты", `<div class="option-chip-row">${renderOptionChips("dueDate", dueOptions, currentDue, dueLabels)}</div><input class="compact-date-input" data-task-field="dueDate" type="date" value="${escapeHtml(item.dueDate || "")}" aria-label="Точная дата" />`, "D")}
      ${renderOptionPopover("Длительность", `${item.estimate} мин`, `<div class="option-chip-row">${renderOptionChips("estimate", estimateOptions, item.estimate)}</div><input class="compact-number-input" data-task-field="estimate" type="number" min="5" step="5" value="${escapeHtml(item.estimate)}" aria-label="Длительность в минутах" />`, "T")}
      ${renderOptionPopover("Связь", currentLink.title, `<select class="compact-link-select" data-task-field="link">${renderTaskLinkOptions(item)}</select>`, "L")}
      ${renderOptionPopover("Теги", (item.tags || []).length ? item.tags.join(", ") : "Теги", `<input class="compact-tags-input" data-task-field="tags" value="${escapeHtml((item.tags || []).join(", "))}" placeholder="focus, job, admin" />`, "#")}
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

function getSelectedInboxItem() {
  return state.inboxItems.find((item) => item.id === state.ui?.selectedInboxId)
    || state.inboxItems.find((item) => item.status === "needs_review")
    || state.inboxItems[0]
    || null;
}

function inboxStatusLabel(status) {
  return {
    open: "raw",
    processed: "processed",
    needs_review: "review",
    archived: "archived"
  }[status] || status || "raw";
}

function getInboxLinkedObject(item) {
  if (!item?.linkedType || !item?.linkedId) return null;
  if (item.linkedType === "task") return state.tasks.find((candidate) => candidate.id === item.linkedId) || null;
  if (item.linkedType === "project") return state.projects.find((candidate) => candidate.id === item.linkedId) || null;
  if (item.linkedType === "note") return state.notes.find((candidate) => candidate.id === item.linkedId) || null;
  return null;
}

function createTaskFromInbox(item, status = "backlog") {
  if (!item) return null;
  const existing = item.linkedType === "task" ? getInboxLinkedObject(item) : null;
  if (existing) {
    if (taskStatuses.includes(status)) {
      existing.previousStatus = existing.status === "done" ? status : existing.status;
      existing.status = status;
      existing.updatedAt = new Date().toISOString();
    }
    item.status = "processed";
    state.assistantActions.unshift(action("Связанная задача обновлена", `${existing.title} → ${statusLabel(status)}`, "confirmed"));
    selectTask(existing.id);
    return existing;
  }
  const category = suggestCategoryForInbox(item);
  const projectItem = category.kind === "project" ? findByTitle(state.projects, category.title) : null;
  const routineItem = category.kind === "routine" ? findByTitle(state.routines, category.title) : null;
  const newTask = {
    ...task(item.parsed?.title || item.text, status, category.area || item.parsed?.area || "admin", item.parsed?.priority || "medium", 30, projectItem?.id || null),
    routineId: routineItem?.id || null,
    tags: ["inbox"],
    needsReview: item.status === "needs_review" || Boolean(item.parsed?.needsReview)
  };
  state.tasks.unshift(newTask);
  item.status = "processed";
  item.linkedType = "task";
  item.linkedId = newTask.id;
  state.assistantActions.unshift(action(
    status === "today" ? "Входящее стало задачей на сегодня" : "Входящее ушло в backlog",
    `${item.parsed?.title || item.text} → ${statusLabel(status)}`,
    "confirmed"
  ));
  selectTask(newTask.id);
  return newTask;
}

function saveInboxAsNote(item) {
  if (!item) return null;
  const existing = item.linkedType === "note" ? getInboxLinkedObject(item) : null;
  if (existing) return existing;
  const now = new Date().toISOString();
  const area = item.parsed?.area || "personal";
  const newNote = {
    id: crypto.randomUUID(),
    type: item.parsed?.kind || "note",
    area,
    folderId: noteFolderForArea(area),
    title: item.parsed?.title || item.text.split("\n")[0].slice(0, 90) || "Без названия",
    text: item.text,
    tags: [],
    createdAt: now,
    updatedAt: now
  };
  state.notes.unshift(newNote);
  item.status = "processed";
  item.linkedType = "note";
  item.linkedId = newNote.id;
  state.assistantActions.unshift(action("Входящее сохранено заметкой", item.parsed?.title || item.text, "confirmed"));
  return newNote;
}

function openInboxLinkedObject(item) {
  const linked = getInboxLinkedObject(item);
  if (!linked) return false;
  state.ui = state.ui || {};
  state.ui.selectedTaskId = null;
  if (item.linkedType === "task") {
    state.ui.simpleModule = "tasks";
    selectTask(linked.id, linked.status === "today" ? "today" : "board");
  }
  if (item.linkedType === "project") {
    state.selectedProjectId = linked.id;
    state.ui.simpleModule = "projects";
    state.settings.activeView = "projects";
  }
  if (item.linkedType === "note") {
    state.ui.selectedNoteId = linked.id;
    state.ui.selectedNoteFolderId = linked.folderId || "";
    state.ui.simpleModule = "notes";
    state.settings.activeView = "notes";
  }
  return true;
}

function deleteInboxItem(item) {
  if (!item) return;
  state.inboxItems = state.inboxItems.filter((candidate) => candidate.id !== item.id);
  if (state.ui?.selectedInboxId === item.id) state.ui.selectedInboxId = state.inboxItems[0]?.id || null;
  state.assistantActions.unshift(action("Входящее удалено", item.parsed?.title || item.text, "confirmed"));
}

function handleInboxAction(actionName, item) {
  if (!item) return false;
  state.ui = state.ui || {};
  state.ui.selectedInboxId = item.id;
  if (actionName === "task-today") createTaskFromInbox(item, "today");
  if (actionName === "task-backlog") createTaskFromInbox(item, "backlog");
  if (actionName === "note") saveInboxAsNote(item);
  if (actionName === "open-linked") openInboxLinkedObject(item);
  if (actionName === "delete") deleteInboxItem(item);
  return true;
}

function renderInboxInspector(item) {
  if (!item) {
    return `<section class="inspector-object-card accent-sky">
      <span class="pill">Inbox</span>
      <h2>Разобрать входящие</h2>
      <p>Добавь мысль или задачу слева. Здесь появятся действия: превратить в задачу, заметку или открыть связанный объект.</p>
    </section>`;
  }

  const category = suggestCategoryForInbox(item);
  const linked = getInboxLinkedObject(item);
  return `<section class="inspector-object-card accent-sky inbox-review-card" data-inbox-id="${escapeHtml(item.id)}">
    <span class="pill">${escapeHtml(inboxStatusLabel(item.status))}</span>
    <h2>${escapeHtml(item.parsed?.title || item.text)}</h2>
    <p>${escapeHtml(item.text)}</p>
    <div class="inspector-category-line">
      ${renderCategoryChip(category)}
      <span class="tag">${escapeHtml(labelForKind(item.parsed?.kind || "context"))}</span>
      <span class="tag">${escapeHtml(listLabel(item.parsed?.area || "personal"))}</span>
    </div>
    ${linked ? `<div class="inbox-linked-object">
      <span>Связано</span>
      <strong>${escapeHtml(linked.title || linked.text || "Заметка")}</strong>
    </div>` : ""}
    <div class="inbox-inspector-actions">
      ${linked ? `<button class="secondary-button" type="button" data-inbox-action="open-linked">Открыть объект</button>` : ""}
      <button class="primary-button" type="button" data-inbox-action="task-today">В Сегодня</button>
      <button class="secondary-button" type="button" data-inbox-action="task-backlog">В backlog</button>
      <button class="secondary-button" type="button" data-inbox-action="note">Заметкой</button>
      <button class="ghost-button danger" type="button" data-inbox-action="delete">Удалить</button>
    </div>
  </section>
  <section class="inspector-decision-list">
    <article class="inspector-decision">
      <strong>Следующий шаг</strong>
      <p>${escapeHtml(item.parsed?.suggestedAction || item.parsed?.reason || "Выбери действие выше. После этого запись перестанет быть мёртвой карточкой и попадёт в рабочую систему.")}</p>
    </article>
  </section>`;
}

function renderAppInspector(activeView) {
  const mode = document.querySelector("#inspectorMode");
  const root = document.querySelector("#appInspectorContent");
  if (!root) return;

  const selectedTask = getSelectedTask();
  if (selectedTask) {
    mode.textContent = "параметры задачи";
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
    mode.textContent = "оператор дня";
    root.innerHTML = `<section class="inspector-object-card accent-blue">
      <span class="pill blue">Выбранный блок</span>
      <h2>${escapeHtml(currentBlock?.title || "План дня")}</h2>
      <p>${escapeHtml(currentBlock?.nextAction || state.dailyPlan.focus)}</p>
      <div class="inspector-category-line">${renderCategoryChip(category)}</div>
      <div class="inspector-meta-grid">
        <div><span>Время</span><strong>${escapeHtml(currentBlock ? `${currentBlock.start}–${currentBlock.end}` : "сейчас")}</strong></div>
        <div><span>Статус</span><strong>${escapeHtml(currentBlock?.status || "draft")}</strong></div>
        <div><span>Сейчас</span><strong>${escapeHtml(nowMeta.label)}</strong></div>
        <div><span>Состояние</span><strong>${nowMeta.currentBlockIndex === currentBlock?.index ? "идёт сейчас" : nowMeta.nextBlockIndex === currentBlock?.index ? "следующий" : "не сейчас"}</strong></div>
      </div>
    </section>
    <section class="inspector-decision-list">
      <article class="inspector-decision">
        <strong>Открыто сегодня</strong>
        <p>${openTasks.length} задач в Сегодня. Выбери задачу, чтобы открыть параметры, таймер и звук.</p>
      </article>
    </section>`;
    return;
  }

  if (activeView === "inbox") {
    const reviewItem = getSelectedInboxItem();
    mode.textContent = "operator review";
    root.innerHTML = renderInboxInspector(reviewItem);
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
  mode.textContent = "выбранный объект";
  root.innerHTML = `<section class="inspector-object-card">
    <span class="pill">Object inspector</span>
    <h2>${escapeHtml(viewTitle(activeView))}</h2>
    <p>Выбери задачу в списке, доске или поиске — здесь откроются параметры, таймер и звук.</p>
  </section>
  <section class="inspector-decision-list">
    ${activeTasks.map((item) => `<article class="inspector-decision"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(listLabel(item.area))} · ${escapeHtml(item.priority)}</p></article>`).join("") || `<article class="inspector-decision"><strong>Нет активного объекта</strong><p>Выбери задачу или входящее, чтобы открыть инспектор.</p></article>`}
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
    ? state.inboxItems.slice(0, 10).map((item) => {
      const linked = getInboxLinkedObject(item);
      return `<article class="inbox-item ${state.ui?.selectedInboxId === item.id ? "selected" : ""}" data-inbox-id="${item.id}">
      <button class="inbox-object-button" type="button" data-action="select-inbox">
        <strong>${escapeHtml(item.parsed?.title || item.text)}</strong>
        <p>${escapeHtml(item.text)}</p>
      </button>
      <div class="task-meta">
        <span class="tag">${labelForKind(item.parsed?.kind || "context")}</span>
        <span class="tag">${escapeHtml(listLabel(item.parsed?.area || "personal"))}</span>
        <span class="tag strong-tag">${escapeHtml(suggestCategoryForInbox(item).title)}</span>
        <span class="tag">${escapeHtml(inboxStatusLabel(item.status))}</span>
        ${linked ? `<span class="tag">${escapeHtml(item.linkedType)}</span>` : ""}
        ${item.parsed?.needsReview ? `<span class="tag">нужна проверка</span>` : ""}
      </div>
      <div class="inbox-actions">
        ${linked ? `<button type="button" data-inbox-action="open-linked">Открыть</button>` : ""}
        <button type="button" data-inbox-action="task-today">В Сегодня</button>
        <button type="button" data-inbox-action="task-backlog">В backlog</button>
        <button type="button" data-inbox-action="delete">Удалить</button>
      </div>
    </article>`;
    }).join("")
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
  renderCaptureResult();
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

  renderTodayHabitSummary();
  renderHabits();
}

function renderCaptureResult() {
  const root = document.querySelector("#todayCaptureResult");
  if (!root) return;
  const item = state.inboxItems.find((candidate) => candidate.id === state.ui?.lastCaptureId);
  if (!item) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }
  const linked = getInboxLinkedObject(item);
  const kindLabel = item.linkedType === "task"
    ? "задача"
    : item.linkedType === "project"
      ? "проект"
      : item.linkedType === "note"
        ? "заметка"
        : labelForKind(item.parsed?.kind || "context").toLowerCase();
  root.hidden = false;
  root.innerHTML = `<article class="capture-result-card" data-inbox-id="${escapeHtml(item.id)}">
    <div>
      <span class="label">Результат сохранения</span>
      <strong>Запись сохранена как ${escapeHtml(kindLabel)}</strong>
      <p>${escapeHtml(linked?.title || linked?.text || item.parsed?.title || item.text)}</p>
    </div>
    <div class="capture-result-actions">
      <button type="button" class="secondary-button" data-inbox-action="open-linked">${linked ? "Открыть" : "Открыть inbox"}</button>
      <button type="button" class="ghost-button" data-action="clear-capture-result">Скрыть</button>
    </div>
  </article>`;
}

function renderTodayHabitSummary() {
  const score = document.querySelector("#todayHabitScore");
  const hint = document.querySelector("#todayHabitHint");
  if (!score || !hint) return;
  const doneHabits = state.habits.filter((item) => item.completions?.[todayIso]).length;
  score.textContent = `${doneHabits}/${state.habits.length}`;
  hint.textContent = doneHabits === state.habits.length && state.habits.length
    ? "Все ритуалы закрыты"
    : "Открыть отдельный трекер";
}

function renderNotes() {
  const list = document.querySelector("#notesList");
  const count = document.querySelector("#notesCount");
  if (!list || !count) return;
  count.textContent = `${state.notes.length}`;
  list.innerHTML = state.notes.length
    ? state.notes.map((item) => `<article class="note-item ${state.ui?.selectedNoteId === item.id ? "selected" : ""}" data-note-id="${escapeHtml(item.id)}">
      <div>
        <span class="label">${escapeHtml(labelForKind(item.type || "note"))}</span>
        <p>${escapeHtml(item.text)}</p>
      </div>
      <div class="task-meta">
        <span class="tag">${escapeHtml(listLabel(item.area || "personal"))}</span>
        <span class="tag">${escapeHtml(new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt)))}</span>
      </div>
    </article>`).join("")
    : `<div class="empty">Заметок пока нет. Напиши мысль в Inbox или быстрый inbox в Сегодня.</div>`;
}

function simpleViewMeta() {
  const module = currentSimpleModule();
  if (module === "capture") return { title: "Входящие", subtitle: "Сырая мысль превращается в понятный объект с объяснением ассистента.", kind: "inbox" };
  if (module === "notes") {
    const folder = noteFolders().find((item) => item.id === state.ui?.selectedNoteFolderId);
    return {
      title: folder?.title || (state.ui?.selectedNoteFolderId === "unfiled" ? "Без папки" : "Заметки"),
      subtitle: folder ? "Документы выбранной папки." : "Конспекты, мысли и контекст — отдельно от задач.",
      kind: "notes"
    };
  }
  if (module === "calendar") return { title: "Календарь", subtitle: "События и занятость без смешивания со списком задач.", kind: "calendar" };
  if (module === "habits") return { title: "Привычки", subtitle: "Ежедневные ритуалы, серии и отметки за сегодня.", kind: "habits" };
  if (module === "focus") return { title: "Фокус", subtitle: "Таймер, выбранная задача и звуковой фон.", kind: "focus" };
  if (module === "projects") return { title: "Проекты", subtitle: "Долгие цели, текущая стадия, препятствия и следующий переход.", kind: "projects" };
  if (module === "log") return { title: "Журнал", subtitle: "Что система изменила, почему и с каким статусом.", kind: "log" };

  const view = state.settings.activeView || "today";
  const area = state.ui?.simpleArea || "";
  if (area) {
    return {
      title: listLabel(area),
      subtitle: "Задачи выбранного списка.",
      kind: "area",
      area
    };
  }
  return {
    today: { title: "Сегодня", subtitle: "Задачи, которые реально в работе сегодня.", kind: "tasks", status: "today" },
    week: { title: "Следующие 7 дней", subtitle: "Пул недели без календарного шума.", kind: "tasks", status: "this_week" },
    inbox: { title: "Inbox", subtitle: "Задачи, которые ещё не разобраны.", kind: "tasks", status: "inbox" },
    board: { title: "Все задачи", subtitle: "Обычный список всех активных задач.", kind: "all_tasks" },
    done: { title: "Выполненные", subtitle: "Закрытые задачи, которые можно вернуть в работу.", kind: "done_tasks" }
  }[view] || { title: "Сегодня", subtitle: "Чистый список задач.", kind: "tasks", status: "today" };
}

function simpleCounts() {
  return {
    today: state.tasks.filter((item) => item.status === "today").length,
    week: state.tasks.filter((item) => item.status === "this_week").length,
    inbox: state.tasks.filter((item) => item.status === "inbox").length,
    done: state.tasks.filter((item) => item.status === "done").length,
    notes: state.notes.length,
    habits: state.habits.length,
    projects: state.projects.length,
    log: state.assistantActions.length
  };
}

function currentSimpleModule() {
  return simpleModules.has(state.ui?.simpleModule) ? state.ui.simpleModule : "tasks";
}

function noteFolders() {
  return Array.isArray(state.noteFolders) ? state.noteFolders : [];
}

function noteFolderLabel(folderId) {
  return noteFolders().find((item) => item.id === folderId)?.title || "Без списка";
}

function noteFolderForArea(area) {
  if (["work", "career"].includes(area)) return "note-work";
  if (area === "learning") return "note-learning";
  return "note-personal";
}

function visibleNotes() {
  const folderId = state.ui?.selectedNoteFolderId || "";
  const notes = folderId === "unfiled"
    ? state.notes.filter((item) => !item.folderId)
    : folderId
      ? state.notes.filter((item) => item.folderId === folderId)
      : state.notes;
  return [...notes].sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

function createNoteFolder(title) {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return null;
  const folder = { id: crypto.randomUUID(), title: cleanTitle, icon: "notebook-pen", tone: "blue" };
  state.noteFolders.push(folder);
  state.ui.selectedNoteFolderId = folder.id;
  state.ui.creatingNoteFolder = false;
  return folder;
}

function renameNoteFolder(folderId, title) {
  const folder = noteFolders().find((item) => item.id === folderId);
  const cleanTitle = String(title || "").trim();
  if (!folder || !cleanTitle) return;
  folder.title = cleanTitle;
  state.ui.renamingNoteFolderId = "";
}

function setSimpleModule(module) {
  if (!simpleModules.has(module)) return;
  const previousModule = currentSimpleModule();
  if (previousModule === "tasks" && simpleTaskViews.has(state.settings.activeView)) {
    state.ui.lastTaskView = state.settings.activeView;
  }
  state.ui.simpleModule = module;
  state.ui.simpleArea = "";
  state.ui.listMenuId = "";
  state.ui.taskMenuOpen = false;
  if (state.ui.simpleModule === "tasks") {
    state.ui.selectedNoteId = null;
    state.settings.activeView = simpleTaskViews.has(state.ui.lastTaskView) ? state.ui.lastTaskView : "today";
    return;
  }
  const viewByModule = { capture: "inbox", notes: "notes", habits: "habits", focus: "focus", calendar: "today", projects: "projects", log: "log" };
  state.settings.activeView = viewByModule[module] || "today";
  if (module !== "focus") state.ui.selectedTaskId = null;
  if (module !== "notes") state.ui.selectedNoteId = null;
}

function renderSimpleTaskListRow(item) {
  const count = state.tasks.filter((taskItem) => taskItem.area === item.id && taskItem.status !== "done").length;
  if (state.ui?.renamingListId === item.id) {
    return `<form class="simple-list-form" data-list-id="${escapeHtml(item.id)}" data-list-form="rename"><input name="title" type="text" value="${escapeHtml(item.title)}" autofocus /><button type="submit">OK</button><button type="button" data-simple-list-action="cancel-rename">×</button></form>`;
  }
  return `<div class="simple-list-row ${state.ui?.simpleArea === item.id ? "active" : ""} ${state.ui?.listMenuId === item.id ? "menu-open" : ""}" data-list-id="${escapeHtml(item.id)}">
    <button type="button" data-simple-area="${escapeHtml(item.id)}"><span class="simple-list-token ${escapeHtml(item.tone)}"><img src="/icons/${escapeHtml(item.icon)}.svg" alt="" /></span><span class="simple-list-title">${escapeHtml(item.title)}</span><strong>${count}</strong></button>
    <button type="button" class="simple-list-action" data-simple-list-action="menu" aria-label="Действия со списком ${escapeHtml(item.title)}" title="Действия со списком"><img src="/icons/ellipsis.svg" alt="" /></button>
    ${state.ui?.listMenuId === item.id ? `<div class="simple-list-menu simple-list-editor-menu">
      <button type="button" data-simple-list-action="rename">Переименовать</button>
      <span>Иконка</span><div class="simple-list-choice-row">${listIcons.map((iconName) => `<button type="button" class="${item.icon === iconName ? "selected" : ""}" data-simple-list-action="set-icon" data-list-icon="${escapeHtml(iconName)}" aria-label="${escapeHtml(iconName)}"><img src="/icons/${escapeHtml(iconName)}.svg" alt="" /></button>`).join("")}</div>
      <span>Цвет</span><div class="simple-list-choice-row">${listTones.map((tone) => `<button type="button" class="${item.tone === tone ? "selected" : ""}" data-simple-list-action="set-tone" data-list-tone="${tone}" aria-label="${tone}"><i class="simple-tone-dot ${tone}"></i></button>`).join("")}</div>
      <span>Область</span><div class="simple-list-group-row">${[["work","Работа"],["personal","Личное"],["health","Здоровье"]].map(([group, label]) => `<button type="button" class="${item.group === group ? "selected" : ""}" data-simple-list-action="set-group" data-list-group="${group}">${label}</button>`).join("")}</div>
      <button type="button" class="danger-text" data-simple-list-action="delete">Удалить</button>
    </div>` : ""}
  </div>`;
}

function renderSimpleNav(module, counts) {
  if (module === "tasks") {
    const navItems = [
      ["today", "Сегодня", counts.today, "list-todo"],
      ["week", "Следующие 7 дней", counts.week, "calendar-days"],
      ["inbox", "Inbox", counts.inbox, "notebook-pen"],
      ["board", "Все задачи", state.tasks.filter((item) => item.status !== "done").length, "list-todo"],
      ["done", "Выполненные", counts.done, "circle-check-big"]
    ];
    const groupLabels = { work: "Работа", personal: "Личное", health: "Здоровье" };
    const groupedLists = Object.entries(groupLabels).map(([group, label]) => ({ group, label, items: taskLists().filter((item) => item.group === group) }));
    return `<section>
      <span class="simple-nav-label">Задачи</span>
      ${navItems.map(([view, label, count, icon]) => `<button type="button" class="simple-system-item ${state.settings.activeView === view && !state.ui?.simpleArea ? "active" : ""}" data-simple-view="${escapeHtml(view)}"><img src="/icons/${icon}.svg" alt="" /><span>${escapeHtml(label)}</span><strong>${count}</strong></button>`).join("")}
    </section>
    <section>
      <div class="simple-nav-section-head">
        <span class="simple-nav-label">Списки</span>
        <button type="button" class="simple-add-list-button" data-simple-list-action="create" title="Создать список">+</button>
      </div>
      ${state.ui?.creatingList ? `<form class="simple-list-form" id="simpleListCreateForm">
        <input name="title" type="text" placeholder="Новый список" autofocus />
        <button type="submit">OK</button>
        <button type="button" data-simple-list-action="cancel-create">×</button>
      </form>` : ""}
      ${groupedLists.map(({ label, items }) => items.length ? `<div class="simple-area-group"><div class="simple-area-head"><span>${escapeHtml(label)}</span><small>${items.length}</small></div>${items.map(renderSimpleTaskListRow).join("")}</div>` : "").join("")}
    </section>`;
  }

  if (module === "notes") {
    const unfiledCount = state.notes.filter((item) => !item.folderId).length;
    return `<section>
      <span class="simple-nav-label">Библиотека</span>
      <button type="button" class="simple-system-item ${!state.ui?.selectedNoteFolderId ? "active" : ""}" data-note-folder=""><img src="/icons/notebook-pen.svg" alt="" /><span>Все заметки</span><strong>${counts.notes}</strong></button>
      <button type="button" class="simple-system-item ${state.ui?.selectedNoteFolderId === "unfiled" ? "active" : ""}" data-note-folder="unfiled"><img src="/icons/list-todo.svg" alt="" /><span>Без списка</span><strong>${unfiledCount}</strong></button>
    </section>
    <section>
      <div class="simple-nav-section-head">
        <span class="simple-nav-label">Списки заметок</span>
        <button type="button" class="simple-add-list-button" data-note-folder-action="create" title="Создать список заметок" aria-label="Создать список заметок">+</button>
      </div>
      ${state.ui?.creatingNoteFolder ? `<form class="simple-list-form" id="noteFolderCreateForm"><input name="title" type="text" placeholder="Новый список" aria-label="Название нового списка заметок" autofocus /><button type="submit" aria-label="Создать список">✓</button><button type="button" data-note-folder-action="cancel-create" aria-label="Отменить создание">×</button></form>` : ""}
      ${noteFolders().map((folder) => {
        const count = state.notes.filter((item) => item.folderId === folder.id).length;
        if (state.ui?.renamingNoteFolderId === folder.id) {
          return `<form class="simple-list-form" data-note-folder-id="${escapeHtml(folder.id)}" data-note-folder-form="rename"><input name="title" value="${escapeHtml(folder.title)}" autofocus /><button type="submit">OK</button><button type="button" data-note-folder-action="cancel-rename">×</button></form>`;
        }
        return `<div class="simple-list-row ${state.ui?.selectedNoteFolderId === folder.id ? "active" : ""} ${state.ui?.noteFolderMenuId === folder.id ? "menu-open" : ""}" data-note-folder-id="${escapeHtml(folder.id)}">
          <button type="button" data-note-folder="${escapeHtml(folder.id)}"><span class="simple-list-token ${escapeHtml(folder.tone)}"><img src="/icons/${escapeHtml(folder.icon)}.svg" alt="" /></span><span class="simple-list-title">${escapeHtml(folder.title)}</span><strong>${count}</strong></button>
          <button type="button" class="simple-list-action" data-note-folder-action="menu" aria-label="Действия с папкой ${escapeHtml(folder.title)}"><img src="/icons/ellipsis.svg" alt="" /></button>
          ${state.ui?.noteFolderMenuId === folder.id ? `<div class="simple-list-menu simple-list-editor-menu">
            <button type="button" data-note-folder-action="rename">Переименовать</button>
            <span>Иконка</span><div class="simple-list-choice-row">${listIcons.map((iconName) => `<button type="button" class="${folder.icon === iconName ? "selected" : ""}" data-note-folder-action="set-icon" data-folder-icon="${escapeHtml(iconName)}" aria-label="${escapeHtml(iconName)}"><img src="/icons/${escapeHtml(iconName)}.svg" alt="" /></button>`).join("")}</div>
            <span>Цвет</span><div class="simple-list-choice-row">${listTones.map((tone) => `<button type="button" class="${folder.tone === tone ? "selected" : ""}" data-note-folder-action="set-tone" data-folder-tone="${tone}" aria-label="${tone}"><i class="simple-tone-dot ${tone}"></i></button>`).join("")}</div>
            <button type="button" class="danger-text" data-note-folder-action="delete">Удалить</button>
          </div>` : ""}
        </div>`;
      }).join("")}
    </section>`;
  }

  const moduleNav = {
    capture: ["Неразобранное", state.inboxItems.filter((item) => item.status === "open" || item.status === "needs_review").length],
    calendar: ["Расписание", state.calendarEvents.length],
    habits: ["Все привычки", counts.habits],
    focus: ["Текущая сессия", state.focusSessions.length],
    projects: ["Активные проекты", counts.projects],
    log: ["Действия системы", counts.log]
  };
  const [label, count] = moduleNav[module] || ["Раздел", 0];
  return `<section>
    <span class="simple-nav-label">Раздел</span>
    <button type="button" class="active" data-simple-view="${escapeHtml(module)}"><span>${escapeHtml(label)}</span><strong>${count}</strong></button>
  </section>`;
}

function renderSimpleApp() {
  const root = document.querySelector("#simpleApp");
  if (!root) return;
  const module = currentSimpleModule();
  root.dataset.module = module;
  root.dataset.theme = state.settings.appearanceTheme;
  root.dataset.font = state.settings.appearanceFont;
  if (module !== "tasks") state.ui.simpleArea = "";
  const meta = simpleViewMeta();
  const counts = simpleCounts();

  const syncStatusLabels = {
    conflict: "нужно выбрать версию",
    error: "не сохранено",
    syncing: "сохраняю…",
    synced: "синхронизировано",
    private: "вход не выполнен",
    local: "только устройство"
  };
  document.querySelector("#simpleSyncStatus").textContent = syncStatusLabels[cloudSync.status] || (cloudSync.session ? "синхронизировано" : "только устройство");
  document.querySelectorAll("#simpleSyncToggle, #simpleMobileSyncToggle").forEach((syncToggle) => {
    syncToggle.dataset.status = cloudSync.status;
    syncToggle.setAttribute("aria-expanded", simpleSyncPanelOpen ? "true" : "false");
  });
  renderSimpleSyncPanel();
  document.querySelector("#simpleTitle").textContent = meta.title;
  document.querySelector("#simpleSubtitle").textContent = meta.subtitle;
  document.querySelector("#simpleNav").innerHTML = renderSimpleNav(module, counts);

  const placeholder = meta.kind === "inbox" ? "Мысль, задача, перенос, идея или контекст" : meta.kind === "notes" ? "+ Новая заметка" : meta.kind === "habits" ? "+ Новая привычка" : meta.kind === "projects" ? "+ Новый проект" : "+ Новая задача";
  document.querySelector("#simpleComposerInput").placeholder = placeholder;
  document.querySelector("#simpleComposer button[type='submit']").textContent = meta.kind === "inbox" ? "Разобрать" : ["notes", "habits", "projects"].includes(meta.kind) ? "Создать" : "Добавить";
  document.querySelector("#simpleComposer").hidden = ["calendar", "focus", "log"].includes(meta.kind);
  if (calendarInstance || calendarTaskDraggable) destroyInteractiveCalendar();
  document.querySelector("#simpleList").innerHTML = renderSimpleMainList(meta);
  const detailMarkup = renderSimpleDetail(meta);
  document.querySelector("#simpleDetail").innerHTML = detailMarkup;
  const hasSelectedDetail = module === "notes"
    ? state.notes.some((item) => item.id === state.ui?.selectedNoteId)
    : module === "tasks"
      ? state.tasks.some((item) => item.id === state.ui?.selectedTaskId)
      : module === "calendar" && Boolean(
          calendarPendingEdit?.draft?.id === state.ui?.selectedCalendarBlockId
          || state.dailyPlan.timeBlocks.some((item) => item.id === state.ui?.selectedCalendarBlockId)
        );
  root.classList.toggle("detail-open", hasSelectedDetail);
  document.querySelector("#simpleToastLayer").innerHTML = renderSimpleToasts();
  renderSimpleSearchResults(simpleSearchQuery);
  document.querySelector("#simpleAuthButton").hidden = Boolean(cloudSync.session) || !cloudSync.configured;
  document.querySelector("#simpleSignOutButton").hidden = !cloudSync.session;
  document.querySelectorAll(".simple-icon-rail [data-simple-module]").forEach((button) => {
    button.classList.toggle("active", button.dataset.simpleModule === module);
  });
  const appearanceMenu = document.querySelector("#simpleAppearanceMenu");
  const appearanceToggle = document.querySelector("#simpleAppearanceToggle");
  appearanceMenu.hidden = !state.ui.appearanceOpen;
  appearanceToggle.setAttribute("aria-expanded", state.ui.appearanceOpen ? "true" : "false");
  appearanceMenu.querySelectorAll("[data-appearance-theme]").forEach((button) => button.classList.toggle("active", button.dataset.appearanceTheme === state.settings.appearanceTheme));
  appearanceMenu.querySelectorAll("[data-appearance-font]").forEach((button) => button.classList.toggle("active", button.dataset.appearanceFont === state.settings.appearanceFont));
  if (module === "calendar") window.requestAnimationFrame(mountInteractiveCalendar);
  scheduleCalendarReminders();
}

function renderSimpleSyncPanel() {
  const panel = document.querySelector("#simpleSyncPanel");
  if (!panel) return;
  panel.hidden = !simpleSyncPanelOpen;
  if (panel.hidden) return;

  const lastSaved = cloudSync.remoteUpdatedAt
    ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(cloudSync.remoteUpdatedAt))
    : "ещё нет";
  const pending = cloudSync.inFlight || Boolean(cloudSync.pendingSnapshot) || Boolean(cloudSync.timer);
  const statusTitles = {
    conflict: "Нужно выбрать версию",
    error: "Не удалось сохранить",
    syncing: "Сохраняю изменения",
    synced: "Данные в облаке",
    private: "Требуется вход",
    local: "Локальный режим"
  };
  const statusTitle = statusTitles[cloudSync.status] || (cloudSync.session ? "Данные в облаке" : "Локальный режим");
  const message = cloudSync.status === "conflict"
    ? "Выбери облачную или локальную версию в уведомлении сверху. До выбора облако не перезаписывается."
    : cloudSync.error
      ? friendlySyncError(cloudSync.error)
      : cloudSync.session
        ? "Изменения с этого устройства проходят проверку версии перед записью."
        : cloudSync.configured
          ? "Войди через GitHub, чтобы продолжить работу на другом устройстве."
          : "Изменения сохраняются только в этом браузере.";
  const canRetry = Boolean(cloudSync.session && cloudSync.status === "error");
  const lastExportAt = localStorage.getItem(LAST_EXPORT_AT_KEY);
  const lastExportLabel = lastExportAt
    ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(lastExportAt))
    : "ещё нет";
  const canUndoImport = Boolean(localStorage.getItem(PRE_IMPORT_BACKUP_KEY));

  panel.innerHTML = `<header><strong>${escapeHtml(statusTitle)}</strong><span>${pending ? "есть очередь" : "очередь пуста"}</span></header>
    <dl class="simple-sync-facts">
      <div><dt>Аккаунт</dt><dd>${escapeHtml(cloudSync.session ? authLabel(cloudSync.session) : "не подключён")}</dd></div>
      <div><dt>Последнее облачное сохранение</dt><dd>${escapeHtml(lastSaved)}</dd></div>
      <div><dt>Версия</dt><dd>${Number.isFinite(cloudSync.revision) ? cloudSync.revision : "—"}</dd></div>
      <div><dt>Изменения</dt><dd>${pending ? "ожидают записи" : "сохранены"}</dd></div>
    </dl>
    <p class="simple-sync-message ${cloudSync.error ? "error" : ""}">${escapeHtml(message)}</p>
    ${canRetry ? `<button class="simple-sync-retry" type="button" data-simple-sync-action="retry">Повторить сохранение</button>` : ""}
    <section class="simple-backup-tools">
      <div><strong>Резервная копия</strong><span>Последняя: ${escapeHtml(lastExportLabel)}</span></div>
      <div class="simple-backup-actions"><button type="button" data-simple-backup-action="export">Скачать JSON</button><button type="button" data-simple-backup-action="choose">Восстановить</button></div>
      ${canUndoImport ? `<button class="simple-backup-undo" type="button" data-simple-backup-action="undo">Вернуть состояние до импорта</button>` : ""}
      ${backupMessage ? `<p class="simple-backup-message">${escapeHtml(backupMessage)}</p>` : ""}
      <small>Файл содержит личные задачи и заметки. Он остаётся на твоём устройстве.</small>
    </section>`;
}

function backupObjectCounts(backupState) {
  return {
    tasks: Array.isArray(backupState?.tasks) ? backupState.tasks.length : 0,
    notes: Array.isArray(backupState?.notes) ? backupState.notes.length : 0,
    habits: Array.isArray(backupState?.habits) ? backupState.habits.length : 0,
    projects: Array.isArray(backupState?.projects) ? backupState.projects.length : 0
  };
}

function downloadStateBackup() {
  const exportedAt = new Date().toISOString();
  const payload = createBackupPayload(state, { exportedAt });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `daily-os-backup-${exportedAt.slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  localStorage.setItem(LAST_EXPORT_AT_KEY, exportedAt);
  backupMessage = "Копия скачана.";
  renderSimpleApp();
}

function stageImportPayload(payload, source = "file", name = "") {
  pendingImportPayload = { payload, source, name };
  backupMessage = "";
  renderSimpleApp();
}

function renderSimpleToasts() {
  let conflictBackup = null;
  try {
    conflictBackup = JSON.parse(localStorage.getItem(CONFLICT_BACKUP_KEY) || "null");
  } catch {
    conflictBackup = null;
  }
  if (cloudSync.status === "conflict" && conflictBackup?.state) {
    const savedLabel = conflictBackup.savedAt
      ? new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(conflictBackup.savedAt))
      : "недавно";
    const remoteLabel = conflictBackup.remoteUpdatedAt
      ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(conflictBackup.remoteUpdatedAt))
      : "недавно";
    const revisionLabel = Number.isFinite(conflictBackup.remoteRevision) ? ` · версия ${conflictBackup.remoteRevision}` : "";
    return `<section class="simple-toast sync-conflict-toast" role="dialog" aria-label="Выбор версии данных">
      <div><span class="label">Нужно выбрать версию</span><strong>В облаке есть более свежие изменения</strong><p>Сейчас показана облачная версия от ${escapeHtml(remoteLabel)}${escapeHtml(revisionLabel)}. Версия этого устройства сохранена в ${escapeHtml(savedLabel)}.</p></div>
      <div class="confirm-actions"><button class="secondary-button" type="button" data-simple-sync-action="keep-cloud">Оставить облачную</button><button class="primary-button" type="button" data-simple-sync-action="restore-local">Вернуть локальную</button></div>
    </section>`;
  }
  if (pendingImportPayload?.payload?.state) {
    const counts = backupObjectCounts(pendingImportPayload.payload.state);
    const exportedLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(pendingImportPayload.payload.exportedAt));
    const title = pendingImportPayload.source === "rollback" ? "Вернуть состояние до импорта?" : "Восстановить резервную копию?";
    return `<section class="simple-toast backup-import-toast" role="dialog" aria-label="Подтверждение восстановления резервной копии">
      <div><span class="label">Резервная копия · ${escapeHtml(exportedLabel)}</span><strong>${escapeHtml(title)}</strong><p>${counts.tasks} задач · ${counts.notes} заметок · ${counts.habits} привычек · ${counts.projects} проектов. Текущее состояние сохранится для отката.</p></div>
      <div class="confirm-actions"><button class="secondary-button" type="button" data-simple-backup-action="cancel">Отмена</button><button class="primary-button" type="button" data-simple-backup-action="confirm">Восстановить</button></div>
    </section>`;
  }
  if (undoSnapshot && undoSnapshot.expiresAt >= Date.now()) {
    return `<section class="simple-toast undo-toast" role="status"><div><span class="label">Изменение сохранено</span><strong>${escapeHtml(undoSnapshot.label)}</strong></div><div class="confirm-actions"><button class="primary-button" type="button" data-simple-undo>Отменить</button></div></section>`;
  }
  if (networkOffline) {
    return `<section class="simple-toast offline-toast" role="status"><div><span class="label">Нет сети</span><strong>Работа продолжается на этом устройстве</strong><p>Изменения сохраняются локально и отправятся в облако после восстановления связи.</p></div></section>`;
  }
  const pendingTask = state.tasks.find((item) => item.id === state.ui?.pendingDeleteTaskId);
  if (pendingTask) {
    return `<section class="simple-toast confirm-toast" data-task-id="${escapeHtml(pendingTask.id)}" role="dialog" aria-label="Подтверждение удаления задачи">
      <div><span class="label">Удаление задачи</span><strong>Удалить “${escapeHtml(pendingTask.title)}”?</strong><p>Задача будет удалена из Daily OS.</p></div>
      <div class="confirm-actions"><button class="secondary-button" type="button" data-simple-delete-action="cancel">Отмена</button><button class="danger-button" type="button" data-simple-delete-action="task">Удалить</button></div>
    </section>`;
  }
  const pendingNote = state.notes.find((item) => item.id === state.ui?.pendingDeleteNoteId);
  if (pendingNote) {
    return `<section class="simple-toast confirm-toast" data-note-id="${escapeHtml(pendingNote.id)}" role="dialog" aria-label="Подтверждение удаления заметки">
      <div><span class="label">Удаление заметки</span><strong>Удалить заметку?</strong><p>${escapeHtml(pendingNote.text.slice(0, 120))}</p></div>
      <div class="confirm-actions"><button class="secondary-button" type="button" data-simple-delete-action="cancel">Отмена</button><button class="danger-button" type="button" data-simple-delete-action="note">Удалить</button></div>
    </section>`;
  }
  const pendingNoteFolder = noteFolders().find((item) => item.id === state.ui?.pendingDeleteNoteFolderId);
  if (pendingNoteFolder) {
    const noteCount = state.notes.filter((item) => item.folderId === pendingNoteFolder.id).length;
    return `<section class="simple-toast confirm-toast" data-note-folder-id="${escapeHtml(pendingNoteFolder.id)}" role="dialog" aria-label="Подтверждение удаления папки">
      <div><span class="label">Удаление папки</span><strong>Удалить “${escapeHtml(pendingNoteFolder.title)}”?</strong><p>${noteCount ? `${noteCount} заметок останутся в разделе “Без папки”.` : "Папка пуста."}</p></div>
      <div class="confirm-actions"><button class="secondary-button" type="button" data-simple-delete-action="cancel">Отмена</button><button class="danger-button" type="button" data-simple-delete-action="note-folder">Удалить</button></div>
    </section>`;
  }
  const pendingList = taskLists().find((item) => item.id === state.ui?.pendingDeleteListId);
  if (!pendingList) return "";
  const fallback = taskLists().find((item) => item.id !== pendingList.id);
  const taskCount = state.tasks.filter((item) => item.area === pendingList.id).length;
  return `<section class="simple-toast confirm-toast" data-list-id="${escapeHtml(pendingList.id)}" role="dialog" aria-label="Подтверждение удаления списка">
    <div>
      <span class="label">Удаление списка</span>
      <strong>Удалить “${escapeHtml(pendingList.title)}”?</strong>
      <p>${taskCount ? `${taskCount} задач будут перенесены в “${escapeHtml(fallback?.title || "другой список")}”.` : "В списке нет активных задач."}</p>
    </div>
    <div class="confirm-actions">
      <button class="secondary-button" type="button" data-simple-list-action="cancel-delete">Отмена</button>
      <button class="danger-button" type="button" data-simple-list-action="confirm-delete">Удалить</button>
    </div>
  </section>`;
}

function localDateIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarWeekDates() {
  const base = new Date(`${todayIso}T12:00:00`);
  const mondayDelta = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - mondayDelta + state.ui.calendarWeekOffset * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    return date;
  });
}

function timeMinutes(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
}

function renderCalendarEvent(item) {
  const start = Math.max(calendarStartHour * 60, timeMinutes(item.start));
  const end = Math.min(calendarEndHour * 60, Math.max(start + 15, timeMinutes(item.end)));
  const top = ((start - calendarStartHour * 60) / 60) * calendarHourHeight;
  const height = Math.max(28, ((end - start) / 60) * calendarHourHeight - 4);
  const tone = taskLists().find((list) => list.id === item.area)?.tone || "blue";
  return `<article class="calendar-event ${escapeHtml(tone)}" style="--event-top:${top}px;--event-height:${height}px" title="${escapeHtml(`${item.title}, ${item.start}–${item.end}`)}">
    <strong>${escapeHtml(item.title)}</strong>
    <span>${escapeHtml(item.start)}–${escapeHtml(item.end)}</span>
  </article>`;
}

function renderCalendarWorkspace() {
  const dates = calendarWeekDates();
  const weekStart = dates[0];
  const weekEnd = dates[6];
  const monthFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
  const dayFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
  const unscheduled = state.tasks.filter((item) => item.status !== "done" && !item.dueDate && ["today", "this_week"].includes(item.status));
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow = dates.some((date) => localDateIso(date) === todayIso) && nowMinutes >= calendarStartHour * 60 && nowMinutes <= calendarEndHour * 60;
  const nowTop = ((nowMinutes - calendarStartHour * 60) / 60) * calendarHourHeight;

  return `<section class="calendar-workspace">
    <header class="calendar-toolbar">
      <div class="calendar-period">
        <button type="button" data-calendar-action="previous" aria-label="Предыдущая неделя">‹</button>
        <button type="button" data-calendar-action="today">Сегодня</button>
        <button type="button" data-calendar-action="next" aria-label="Следующая неделя">›</button>
        <strong>${escapeHtml(monthFormatter.format(weekStart))} — ${escapeHtml(monthFormatter.format(weekEnd))}</strong>
      </div>
      <span class="calendar-readonly">Протяни по сетке, проверь черновик и сохрани · внешние события только чтение</span>
    </header>
    <section class="calendar-unscheduled" aria-label="Задачи без времени">
      <div><span class="label">Без времени</span><small>${unscheduled.length} задач</small></div>
      <div class="calendar-task-lane">${unscheduled.length
        ? unscheduled.slice(0, 8).map((item) => `<button type="button" data-calendar-task-id="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}"><span class="calendar-task-dot ${escapeHtml(taskLists().find((list) => list.id === item.area)?.tone || "blue")}"></span>${escapeHtml(item.title)}</button>`).join("")
        : `<span class="calendar-lane-empty">Все задачи уже имеют место или не приняты в неделю.</span>`}</div>
    </section>
    ${window.FullCalendar?.Calendar && !calendarEngineFailed ? `<div class="calendar-engine-shell"><div id="calendarEngine"></div></div>` : `<div class="calendar-scroll">
      <div class="calendar-grid">
        <div class="calendar-days-head"><span class="calendar-zone">GMT+3</span>${dates.map((date) => {
          const iso = localDateIso(date);
          return `<div class="calendar-day-head ${iso === todayIso ? "today" : ""}"><span>${escapeHtml(dayFormatter.format(date))}</span><strong>${date.getDate()}</strong></div>`;
        }).join("")}</div>
        <div class="calendar-days-body" style="--calendar-height:${(calendarEndHour - calendarStartHour) * calendarHourHeight}px">
          <div class="calendar-times">${Array.from({ length: calendarEndHour - calendarStartHour }, (_, index) => `<time>${String(calendarStartHour + index).padStart(2, "0")}:00</time>`).join("")}</div>
          ${dates.map((date) => {
            const iso = localDateIso(date);
            const events = state.calendarEvents.filter((item) => item.date === iso);
            return `<div class="calendar-day-column ${iso === todayIso ? "today" : ""}" data-calendar-date="${iso}">
              ${events.map(renderCalendarEvent).join("")}
              ${iso === todayIso && showNow ? `<span class="calendar-now-line" style="--now-top:${nowTop}px"><i></i></span>` : ""}
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>`}
  </section>`;
}

function calendarTimestamp(date, time) {
  return `${date}T${time}:00`;
}

function calendarTimeValue(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function calendarTone(area) {
  return taskLists().find((list) => list.id === area)?.tone || "blue";
}

function calendarBlockOccurrenceDates(block, dates = calendarWeekDates()) {
  const baseIso = block.date || state.dailyPlan.date || todayIso;
  const baseDate = new Date(`${baseIso}T12:00:00`);
  const recurrence = block.recurrence || "none";
  if (recurrence === "none") {
    const endIso = block.endDate && block.endDate >= baseIso ? block.endDate : baseIso;
    return dates
      .map((date) => typeof date === "string" ? date : localDateIso(date))
      .filter((dateIso) => dateIso >= baseIso && dateIso <= endIso);
  }
  return dates.filter((date) => {
    if (localDateIso(date) < baseIso) return false;
    if (recurrence === "daily") return true;
    if (recurrence === "weekdays") return date.getDay() >= 1 && date.getDay() <= 5;
    if (recurrence === "weekly") return date.getDay() === baseDate.getDay();
    return false;
  }).map(localDateIso);
}

function calendarDateDistance(startIso, endIso) {
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  return Math.max(0, Math.round((end - start) / dayMs));
}

function calendarShiftDate(dateIso, days) {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateIso(date);
}

function calendarBlockEndDate(block, occurrenceDate) {
  return occurrenceDate;
}

function calendarDraftBlocks() {
  const blocks = state.dailyPlan.timeBlocks.map((block) => {
    if (calendarPendingEdit?.mode === "update" && calendarPendingEdit.blockId === block.id) {
      return calendarPendingEdit.draft;
    }
    return block;
  });
  if (calendarPendingEdit?.mode === "create") blocks.push(calendarPendingEdit.draft);
  return blocks;
}

function openCalendarDraft(block, mode = "update", actionTitle = "Блок календаря изменён", linkedTaskId = "") {
  calendarPendingEdit = {
    mode,
    blockId: mode === "update" ? block.id : "",
    linkedTaskId,
    actionTitle,
    draft: structuredClone(block)
  };
  state.ui.selectedCalendarBlockId = block.id;
  window.requestAnimationFrame(render);
}

function cancelCalendarDraft() {
  calendarPendingEdit = null;
  state.ui.selectedCalendarBlockId = null;
  render();
}

function saveCalendarDraft() {
  if (!calendarPendingEdit?.draft) return;
  const pending = calendarPendingEdit;
  const block = structuredClone(pending.draft);
  block.title = String(block.title || "").trim() || "Новый блок";
  block.endDate = block.endDate && block.endDate >= block.date ? block.endDate : block.date;
  if (timeMinutes(block.end) <= timeMinutes(block.start)) {
    const adjustedEnd = new Date(`${block.date}T${block.start}:00`);
    adjustedEnd.setMinutes(adjustedEnd.getMinutes() + 30);
    block.end = calendarTimeValue(adjustedEnd);
  }
  block.updatedAt = new Date().toISOString();
  if (pending.mode === "create") {
    state.dailyPlan.timeBlocks.push(block);
  } else {
    const index = state.dailyPlan.timeBlocks.findIndex((item) => item.id === pending.blockId);
    if (index < 0) return cancelCalendarDraft();
    state.dailyPlan.timeBlocks[index] = block;
  }
  if (pending.linkedTaskId) {
    const taskItem = state.tasks.find((item) => item.id === pending.linkedTaskId);
    if (taskItem) {
      taskItem.status = "today";
      taskItem.updatedAt = new Date().toISOString();
    }
  }
  const days = calendarDateDistance(block.date, block.endDate || block.date) + 1;
  const dateSummary = days > 1 ? `${block.date} — ${block.endDate}, ежедневно` : block.date;
  state.assistantActions.unshift(action(pending.actionTitle, `${block.title}: ${dateSummary}, ${block.start}–${block.end}.`, "confirmed"));
  calendarPendingEdit = null;
  state.ui.selectedCalendarBlockId = null;
  saveState();
}

function scheduleCalendarReminders() {
  calendarReminderTimers.forEach((timer) => window.clearTimeout(timer));
  calendarReminderTimers = [];
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const now = Date.now();
  const horizon = now + 8 * dayMs;
  const dates = Array.from({ length: 8 }, (_, index) => new Date(now + index * dayMs));
  state.dailyPlan.timeBlocks.forEach((block) => {
    if (block.reminderMinutes === null || block.reminderMinutes === undefined || block.reminderMinutes === "") return;
    calendarBlockOccurrenceDates(block, dates).forEach((date) => {
      const startsAt = new Date(`${date}T${block.start}:00`).getTime();
      const notifyAt = startsAt - Number(block.reminderMinutes || 0) * 60 * 1000;
      if (notifyAt <= now || notifyAt > horizon) return;
      calendarReminderTimers.push(window.setTimeout(() => {
        const notification = new Notification(block.title, {
          body: `Начало в ${block.start}`,
          tag: `daily-os-${block.id}-${date}`
        });
        notification.onclick = () => window.focus();
      }, notifyAt - now));
    });
  });
}

function calendarEngineEvents() {
  const externalEvents = state.calendarEvents.map((item) => ({
    id: `external:${item.id}`,
    title: item.title,
    start: calendarTimestamp(item.date, item.start),
    end: calendarTimestamp(item.date, item.end),
    editable: false,
    classNames: ["daily-calendar-event", "is-external", `tone-${calendarTone(item.area)}`],
    extendedProps: { kind: "external", sourceId: item.id, area: item.area }
  }));
  const internalBlocks = calendarDraftBlocks().flatMap((block) => calendarBlockOccurrenceDates(block).map((date) => ({
    id: `block:${block.id}:${date}`,
    title: block.title,
    start: calendarTimestamp(date, block.start),
    end: calendarTimestamp(calendarBlockEndDate(block, date), block.end),
    editable: true,
    startEditable: true,
    durationEditable: true,
    classNames: ["daily-calendar-event", "is-internal", calendarPendingEdit?.draft?.id === block.id ? "is-draft" : "", `tone-${calendarTone(categoryForBlock(block).area)}`].filter(Boolean),
    extendedProps: {
      kind: "block",
      blockId: block.id,
      occurrenceDate: date
    }
  })));
  return [...externalEvents, ...internalBlocks];
}

function updateCalendarBlock(info, actionTitle) {
  const blockId = info.event.extendedProps.blockId;
  const sourceBlock = calendarPendingEdit?.draft?.id === blockId
    ? calendarPendingEdit.draft
    : state.dailyPlan.timeBlocks.find((item) => item.id === blockId);
  const block = sourceBlock ? structuredClone(sourceBlock) : null;
  if (!block || !info.event.start || !info.event.end) {
    info.revert?.();
    return;
  }
  const originalOccurrence = info.event.extendedProps.occurrenceDate || block.date;
  const targetDate = localDateIso(info.event.start);
  const dayShift = targetDate < originalOccurrence
    ? -calendarDateDistance(targetDate, originalOccurrence)
    : calendarDateDistance(originalOccurrence, targetDate);
  block.start = calendarTimeValue(info.event.start);
  block.end = calendarTimeValue(info.event.end);
  if (actionTitle === "Блок перенесён") {
    const originalStart = block.date || todayIso;
    const originalEnd = block.endDate || originalStart;
    block.date = calendarShiftDate(originalStart, dayShift);
    block.endDate = calendarShiftDate(originalEnd, dayShift);
  }
  info.revert?.();
  openCalendarDraft(block, state.dailyPlan.timeBlocks.some((item) => item.id === block.id) ? "update" : "create", actionTitle);
}

function destroyInteractiveCalendar() {
  calendarTaskDraggable?.destroy?.();
  calendarTaskDraggable = null;
  calendarInstance?.destroy?.();
  calendarInstance = null;
}

function mountInteractiveCalendar() {
  const root = document.querySelector("#calendarEngine");
  if (!root || !window.FullCalendar?.Calendar || currentSimpleModule() !== "calendar") return;
  destroyInteractiveCalendar();
  try {
    const dates = calendarWeekDates();
    calendarInstance = new window.FullCalendar.Calendar(root, {
    initialView: "timeGridWeek",
    initialDate: localDateIso(dates[0]),
    firstDay: 1,
    headerToolbar: false,
    allDaySlot: false,
    nowIndicator: true,
    expandRows: true,
    height: "100%",
    slotMinTime: `${String(calendarStartHour).padStart(2, "0")}:00:00`,
    slotMaxTime: `${String(calendarEndHour).padStart(2, "0")}:00:00`,
    slotDuration: "00:30:00",
    slotLabelInterval: "01:00:00",
    slotLabelFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
    eventTimeFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
    snapDuration: "00:15:00",
    editable: true,
    selectable: true,
    selectMirror: true,
    selectOverlap: false,
    unselectAuto: true,
    droppable: true,
    eventStartEditable: true,
    eventDurationEditable: true,
    dragScroll: true,
    eventOverlap: false,
    events: calendarEngineEvents(),
    select(selectionInfo) {
      const end = selectionInfo.end || new Date(selectionInfo.start.getTime() + 30 * 60 * 1000);
      let endTime = calendarTimeValue(end);
      if (timeMinutes(endTime) <= timeMinutes(calendarTimeValue(selectionInfo.start))) {
        endTime = calendarTimeValue(new Date(selectionInfo.start.getTime() + 30 * 60 * 1000));
      }
      const block = timeBlock(calendarTimeValue(selectionInfo.start), endTime, "Новый блок", "", "draft");
      block.date = localDateIso(selectionInfo.start);
      block.endDate = localDateIso(end);
      openCalendarDraft(block, "create", "Блок добавлен в календарь");
    },
    eventAllow(dropInfo, draggedEvent) {
      return draggedEvent.extendedProps.kind !== "external";
    },
    eventDrop(info) {
      updateCalendarBlock(info, "Блок перенесён");
    },
    eventResize(info) {
      updateCalendarBlock(info, "Длительность блока изменена");
    },
    eventClick(info) {
      if (info.event.extendedProps.kind !== "block") return;
      const blockId = info.event.extendedProps.blockId;
      const block = calendarPendingEdit?.draft?.id === blockId
        ? calendarPendingEdit.draft
        : state.dailyPlan.timeBlocks.find((item) => item.id === blockId);
      if (block) openCalendarDraft(block, state.dailyPlan.timeBlocks.some((item) => item.id === blockId) ? "update" : "create");
    },
    eventReceive(info) {
      const taskId = info.event.extendedProps.taskId;
      const taskItem = state.tasks.find((item) => item.id === taskId);
      if (!taskItem || !info.event.start || !info.event.end) {
        info.event.remove();
        return;
      }
      const date = localDateIso(info.event.start);
      const block = timeBlock(calendarTimeValue(info.event.start), calendarTimeValue(info.event.end), taskItem.title, taskItem.description || "Выполнить выбранную задачу", "draft");
      block.date = date;
      block.endDate = date;
      block.taskId = taskItem.id;
      info.event.remove();
      openCalendarDraft(block, "create", "Задача поставлена в календарь", taskItem.id);
    }
    });
    calendarInstance.render();
    calendarInstance.updateSize();

    const taskLane = document.querySelector(".calendar-task-lane");
    if (taskLane && window.FullCalendar.Draggable) {
      calendarTaskDraggable = new window.FullCalendar.Draggable(taskLane, {
        itemSelector: "button[data-calendar-task-id]",
        eventData(element) {
          const taskItem = state.tasks.find((item) => item.id === element.dataset.calendarTaskId);
          const durationMinutes = Math.max(15, taskItem?.estimate || 30);
          return {
            title: taskItem?.title || "Задача",
            duration: `${String(Math.floor(durationMinutes / 60)).padStart(2, "0")}:${String(durationMinutes % 60).padStart(2, "0")}:00`,
            classNames: ["daily-calendar-event", "is-internal", `tone-${calendarTone(taskItem?.area)}`],
            extendedProps: { kind: "task", taskId: taskItem?.id || "" }
          };
        }
      });
    }
  } catch (error) {
    console.error("Interactive calendar failed; using the built-in calendar grid.", error);
    calendarEngineFailed = true;
    destroyInteractiveCalendar();
    const list = document.querySelector("#simpleList");
    if (list && currentSimpleModule() === "calendar") list.innerHTML = renderCalendarWorkspace();
  }
}

function renderSimpleProjectsWorkspace() {
  const projects = state.projects.filter((item) => item.status !== "archived");
  const selected = projects.find((item) => item.id === state.selectedProjectId) || projects[0];
  if (!selected) return `<div class="simple-empty">Проектов пока нет. Создай первый проект сверху.</div>`;
  const stagePosition = stageIndex(selected.journeyStage);
  const relatedTasks = state.tasks.filter((item) => item.projectId === selected.id);
  const openTasks = relatedTasks.filter((item) => item.status !== "done");
  const obstacles = state.projectObstacles.filter((item) => item.projectId === selected.id && item.status === "open");
  const recentEvents = state.projectStageEvents.filter((item) => item.projectId === selected.id).slice(0, 4);
  const availableTasks = state.tasks.filter((item) => !item.projectId && item.status !== "done").slice(0, 30);
  return `<section class="simple-project-workspace" data-project-id="${escapeHtml(selected.id)}">
    <nav class="simple-project-index" aria-label="Активные проекты">
      ${projects.map((item) => {
        const taskCount = state.tasks.filter((taskItem) => taskItem.projectId === item.id && taskItem.status !== "done").length;
        return `<button type="button" class="${item.id === selected.id ? "active" : ""}" data-simple-project-id="${escapeHtml(item.id)}"><span class="simple-project-dot ${escapeHtml(calendarTone(item.area))}"></span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(stageLabel(item.journeyStage))} · ${taskCount} задач</small></span></button>`;
      }).join("")}
    </nav>
    <article class="simple-project-canvas">
      <header class="simple-project-hero">
        <div><span class="label">Проект · ${escapeHtml(listLabel(selected.area))}</span><input class="simple-project-title-input" data-project-field="title" value="${escapeHtml(selected.title)}" aria-label="Название проекта" /><p>${escapeHtml(stageLabel(selected.journeyStage))} · ${openTasks.length} открытых задач</p></div>
        <button type="button" data-simple-project-action="review">Проверить стадию</button>
      </header>
      <div class="simple-journey-track" aria-label="Путь проекта">
        ${journeyStages.map(([, label], index) => `<div class="${index < stagePosition ? "done" : ""} ${index === stagePosition ? "current" : ""}"><i>${index + 1}</i><span>${escapeHtml(label)}</span></div>`).join("")}
      </div>
      <div class="simple-project-grid">
        <section><span class="label">Критерий перехода</span><textarea data-project-field="nextTransition" placeholder="Что должно стать правдой, чтобы перейти дальше">${escapeHtml(selected.nextTransition || nextTransitionFor(selected.journeyStage))}</textarea><label><span>Почему проект на этой стадии</span><input data-project-field="stageReason" value="${escapeHtml(selected.stageReason || "")}" placeholder="Короткая диагностическая причина" /></label>${selected.proposedStage ? `<div class="simple-project-proposal"><p>Предложен переход в «${escapeHtml(stageLabel(selected.proposedStage))}»</p><div><button type="button" data-simple-project-action="reject">Отклонить</button><button type="button" class="primary" data-simple-project-action="confirm">Подтвердить</button></div></div>` : `<form class="simple-project-stage-form" data-simple-project-form="propose-stage"><select name="stage" aria-label="Следующая стадия">${journeyStages.filter(([stage]) => stage !== selected.journeyStage).map(([stage, label]) => `<option value="${stage}">${escapeHtml(label)}</option>`).join("")}</select><input name="reason" placeholder="Почему пора перейти" /><button type="submit">Предложить</button></form>`}</section>
        <section class="simple-project-obstacles"><span class="label">Препятствия</span>${obstacles.length ? obstacles.map((item) => `<article><span class="severity ${escapeHtml(item.severity)}">${escapeHtml({ low: "низкое", medium: "среднее", high: "высокое" }[item.severity] || item.severity)}</span><p><strong>${escapeHtml(item.type)}</strong>${escapeHtml(item.text)}</p><button type="button" data-simple-project-action="close-obstacle" data-obstacle-id="${escapeHtml(item.id)}" aria-label="Закрыть препятствие">×</button></article>`).join("") : `<p class="simple-project-muted">Открытых препятствий нет.</p>`}<form data-simple-project-form="add-obstacle"><input name="text" placeholder="Новое препятствие" required /><select name="severity" aria-label="Серьёзность"><option value="low">Низкая</option><option value="medium" selected>Средняя</option><option value="high">Высокая</option></select><button type="submit">Добавить</button></form></section>
      </div>
      <section class="simple-project-tasks">
        <div><span class="label">Связанные задачи</span><strong>${openTasks.length} открыто · ${relatedTasks.length} всего</strong></div>
        <div class="simple-project-task-tools">
          <form data-simple-project-form="create-task"><input name="title" placeholder="+ Новая задача проекта" required /><button type="submit">Добавить</button></form>
          ${availableTasks.length ? `<form data-simple-project-form="link-task"><select name="taskId" aria-label="Выбрать существующую задачу"><option value="">Привязать существующую...</option>${availableTasks.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)}</option>`).join("")}</select><button type="submit">Привязать</button></form>` : ""}
        </div>
        ${relatedTasks.length ? relatedTasks.map((item) => `<article data-simple-project-task-id="${escapeHtml(item.id)}"><button type="button" class="task-toggle ${item.status === "done" ? "done" : ""}" data-simple-project-task-action="toggle" aria-label="${item.status === "done" ? "Вернуть задачу" : "Завершить задачу"}"></button><button type="button" class="simple-project-task-title" data-simple-project-task-action="select"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(statusLabel(item.status))} · ${escapeHtml(priorityLabel(item.priority))} · ${item.estimate} мин</small></button><button type="button" class="simple-project-task-unlink" data-simple-project-task-action="unlink" aria-label="Отвязать задачу">×</button></article>`).join("") : `<p class="simple-project-muted">Связанных задач пока нет. Создай новую или привяжи существующую.</p>`}
      </section>
      ${recentEvents.length ? `<section class="simple-project-history"><span class="label">История переходов</span>${recentEvents.map((item) => `<p><time>${escapeHtml(new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(new Date(item.createdAt)))}</time><span>${escapeHtml(stageLabel(item.fromStage))} → ${escapeHtml(stageLabel(item.toStage))}</span><em>${escapeHtml(item.status)}</em></p>`).join("")}</section>` : ""}
    </article>
  </section>`;
}

function renderSimpleLogWorkspace() {
  const items = state.assistantActions.slice(0, 60);
  if (!items.length) return `<div class="simple-empty">Журнал пуст. Здесь появятся изменения задач, планов и заметок.</div>`;
  const statusLabels = { confirmed: "применено", applied: "применено", needs_review: "проверить", needs_confirmation: "подтвердить", rejected: "отклонено" };
  return `<section class="simple-log-table" aria-label="Журнал изменений">
    <header><span>Время</span><span>Действие и причина</span><span>Статус</span></header>
    ${items.map((item) => `<article><time>${escapeHtml(new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt)))}</time><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.reason || item.detail || "Причина не указана")}</p></div><span class="simple-log-status ${escapeHtml(item.status || "confirmed")}">${escapeHtml(statusLabels[item.status] || item.status || "применено")}</span></article>`).join("")}
  </section>`;
}

function renderSimpleMainList(meta) {
  if (meta.kind === "notes") {
    const notes = visibleNotes();
    return notes.length
      ? notes.map(renderSimpleNoteRow).join("")
      : `<div class="simple-empty">В этой папке пока нет заметок. Создай документ сверху.</div>`;
  }
  if (meta.kind === "inbox") {
    return state.inboxItems.length
      ? state.inboxItems.map(renderSimpleInboxRow).join("")
      : `<div class="simple-empty">Inbox пуст. Сюда можно скинуть сырую мысль.</div>`;
  }
  if (meta.kind === "habits") {
    return state.habits.length
      ? renderSimpleHabitGroups()
      : `<div class="simple-empty">Привычек пока нет.</div>`;
  }
  if (meta.kind === "calendar") {
    return renderCalendarWorkspace();
  }
  if (meta.kind === "focus") {
    const taskItem = getFocusTask();
    return taskItem ? renderFocusCompanion(taskItem) : `<div class="simple-empty">Выбери задачу для фокуса.</div>`;
  }
  if (meta.kind === "projects") {
    return renderSimpleProjectsWorkspace();
  }
  if (meta.kind === "log") {
    return renderSimpleLogWorkspace();
  }

  let tasks = state.tasks.filter((item) => item.status !== "done");
  if (meta.kind === "tasks") tasks = state.tasks.filter((item) => item.status === meta.status);
  if (meta.kind === "done_tasks") tasks = state.tasks.filter((item) => item.status === "done");
  if (meta.kind === "area") tasks = state.tasks.filter((item) => item.area === meta.area && item.status !== "done");
  tasks = [...tasks].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return tasks.length
    ? tasks.map(renderSimpleTaskRow).join("")
    : `<div class="simple-empty">Задач нет. Добавь первую сверху.</div>`;
}

function renderSimpleTaskRow(item) {
  return `<article class="simple-row ${state.ui?.selectedTaskId === item.id ? "active" : ""}" data-task-id="${escapeHtml(item.id)}" data-simple-object="task">
    <button type="button" class="task-toggle ${item.status === "done" ? "done" : ""}" data-action="toggle" title="Готово"></button>
    <div>
      <span>${item.pinned ? `<span class="simple-pin-mark" title="Закреплено">●</span>` : ""}${escapeHtml(item.title)}</span>
      <small><span class="simple-priority-flag ${escapeHtml(item.priority)}" aria-hidden="true">⚑</span>${escapeHtml(statusLabel(item.status))} · ${escapeHtml(listLabel(item.area))}${(item.tags || []).length ? ` · ${(item.tags || []).slice(0, 2).map((tag) => `#${escapeHtml(tag)}`).join(" ")}` : ""}</small>
    </div>
    <button type="button" class="simple-more" data-simple-action="select-task-menu" aria-label="Параметры задачи"><img src="/icons/ellipsis.svg" alt="" /></button>
  </article>`;
}

function noteTitle(item) {
  return String(item?.title || String(item?.text || "").split("\n")[0].slice(0, 90) || "Без названия");
}

function notePreview(item) {
  const text = String(item?.text || "").trim();
  if (!text || text === noteTitle(item)) return "Пустая заметка";
  return text.slice(0, 110);
}

function noteBody(item) {
  const text = String(item?.text || "");
  return text.trim() === noteTitle(item).trim() ? "" : text;
}

function renderSimpleNoteRow(item) {
  return `<article class="simple-row ${state.ui?.selectedNoteId === item.id ? "active" : ""}" data-note-id="${escapeHtml(item.id)}" data-simple-object="note">
    <div>
      <span>${escapeHtml(noteTitle(item))}</span>
      <small>${escapeHtml(notePreview(item))}</small>
      <small class="simple-note-list-label">${escapeHtml(noteFolderLabel(item.folderId))} · ${escapeHtml(new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(new Date(item.updatedAt || item.createdAt)))}</small>
    </div>
    <button type="button" class="simple-more" data-simple-action="select-note" aria-label="Открыть заметку"><img src="/icons/notebook-pen.svg" alt="" /></button>
  </article>`;
}

function renderSimpleInboxRow(item) {
  const linked = getInboxLinkedObject(item);
  const kindLabel = labelForKind(item.parsed?.kind || "note");
  return `<article class="simple-inbox-row ${item.status === "needs_review" ? "needs-review" : ""}" data-inbox-id="${escapeHtml(item.id)}">
    <div class="simple-inbox-state"><span>${escapeHtml(inboxStatusLabel(item.status))}</span><small>${escapeHtml(kindLabel)}</small></div>
    <div class="simple-inbox-copy"><strong>${escapeHtml(item.parsed?.title || item.text)}</strong><p>${escapeHtml(item.text)}</p><small>${escapeHtml(item.parsed?.reason || (linked ? `Сохранено как ${item.linkedType}` : "Ожидает решения"))}</small></div>
    <div class="simple-inbox-actions">
      ${linked ? `<button type="button" data-inbox-action="open-linked">Открыть</button>` : ""}
      <button type="button" data-inbox-action="task-today">В Сегодня</button>
      ${item.linkedType !== "note" ? `<button type="button" data-inbox-action="note">Заметкой</button>` : ""}
      <button type="button" class="danger-text" data-inbox-action="delete">Удалить</button>
    </div>
  </article>`;
}

function renderSimpleHabitRow(item) {
  const done = Boolean(item.completions?.[todayIso]);
  const dots = lastSevenDates()
    .map((date) => `<span class="simple-habit-dot ${item.completions?.[date] ? "done" : ""} ${date === todayIso ? "today" : ""}" title="${escapeHtml(date)}"></span>`)
    .join("");
  const streakLabel = `${item.streak} ${russianPlural(item.streak, "день", "дня", "дней")}`;
  return `<article class="simple-row simple-habit-row" data-habit-id="${escapeHtml(item.id)}">
    <button type="button" class="task-toggle ${done ? "done" : ""}" data-action="toggle-habit" title="Отметить"></button>
    <div><span>${escapeHtml(item.title)}</span><small>${escapeHtml(listLabel(item.area))} · серия ${escapeHtml(streakLabel)}</small></div>
    <div class="simple-habit-controls"><select data-habit-field="group" aria-label="Время привычки">${habitGroups.map((group) => `<option value="${group}" ${item.group === group ? "selected" : ""}>${escapeHtml(habitGroupLabels[group])}</option>`).join("")}</select><div class="simple-habit-week" aria-label="Последние семь дней">${dots}</div></div>
  </article>`;
}

function russianPlural(value, one, few, many) {
  const absolute = Math.abs(Number(value) || 0) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function renderSimpleHabitGroups() {
  const completed = state.habits.filter((item) => item.completions?.[todayIso]).length;
  const score = state.habits.length ? Math.round((completed / state.habits.length) * 100) : 0;
  return `<div class="simple-habits-summary"><div><span class="label">Сегодня</span><strong>${completed}/${state.habits.length}</strong></div><div class="simple-habits-progress"><i style="width:${score}%"></i></div><span>${score}%</span></div>
    ${habitGroups.map((group) => {
      const habits = state.habits.filter((item) => item.group === group);
      if (!habits.length) return "";
      return `<section class="simple-habit-group"><header><span>${escapeHtml(habitGroupLabels[group])}</span><strong>${habits.length}</strong></header>${habits.map(renderSimpleHabitRow).join("")}</section>`;
    }).join("")}`;
}

function renderSimpleDetail(meta) {
  const module = currentSimpleModule();
  const calendarBlock = module === "calendar"
    ? (calendarPendingEdit?.draft?.id === state.ui?.selectedCalendarBlockId
        ? calendarPendingEdit.draft
        : state.dailyPlan.timeBlocks.find((item) => item.id === state.ui?.selectedCalendarBlockId)) || null
    : null;
  if (calendarBlock) {
    return `<section class="simple-detail-card calendar-block-editor" data-calendar-block-id="${escapeHtml(calendarBlock.id)}">
      <div class="simple-detail-head">
        <span class="label">${calendarPendingEdit ? "Несохранённый блок" : "Блок календаря"}</span>
        <button type="button" class="simple-detail-close" data-simple-action="close-calendar-detail" aria-label="Закрыть блок"><img src="/icons/x.svg" alt="" /></button>
      </div>
      <label><span>Название</span><input data-calendar-block-field="title" value="${escapeHtml(calendarBlock.title)}" /></label>
      <div class="calendar-block-time-fields">
        <label><span>Дата начала</span><input type="date" data-calendar-block-field="date" value="${escapeHtml(calendarBlock.date || todayIso)}" /></label>
        <label><span>Дата окончания</span><input type="date" data-calendar-block-field="endDate" min="${escapeHtml(calendarBlock.date || todayIso)}" value="${escapeHtml(calendarBlock.endDate || calendarBlock.date || todayIso)}" /></label>
      </div>
      <div class="calendar-block-time-fields">
        <label><span>Начало</span><input type="time" step="900" data-calendar-block-field="start" value="${escapeHtml(calendarBlock.start)}" /></label>
        <label><span>Конец</span><input type="time" step="900" data-calendar-block-field="end" value="${escapeHtml(calendarBlock.end)}" /></label>
      </div>
      <div class="calendar-block-time-fields">
        <label><span>Повторение</span><select data-calendar-block-field="recurrence">
          <option value="none" ${(calendarBlock.recurrence || "none") === "none" ? "selected" : ""}>Не повторять</option>
          <option value="daily" ${calendarBlock.recurrence === "daily" ? "selected" : ""}>Каждый день</option>
          <option value="weekdays" ${calendarBlock.recurrence === "weekdays" ? "selected" : ""}>По будням</option>
          <option value="weekly" ${calendarBlock.recurrence === "weekly" ? "selected" : ""}>Каждую неделю</option>
        </select></label>
        <label><span>Напоминание</span><select data-calendar-block-field="reminderMinutes">
          <option value="" ${calendarBlock.reminderMinutes === null || calendarBlock.reminderMinutes === undefined || calendarBlock.reminderMinutes === "" ? "selected" : ""}>Без напоминания</option>
          <option value="0" ${calendarBlock.reminderMinutes !== null && calendarBlock.reminderMinutes !== undefined && Number(calendarBlock.reminderMinutes) === 0 ? "selected" : ""}>В момент начала</option>
          <option value="5" ${Number(calendarBlock.reminderMinutes) === 5 ? "selected" : ""}>За 5 минут</option>
          <option value="10" ${Number(calendarBlock.reminderMinutes) === 10 ? "selected" : ""}>За 10 минут</option>
          <option value="15" ${Number(calendarBlock.reminderMinutes) === 15 ? "selected" : ""}>За 15 минут</option>
          <option value="30" ${Number(calendarBlock.reminderMinutes) === 30 ? "selected" : ""}>За 30 минут</option>
          <option value="60" ${Number(calendarBlock.reminderMinutes) === 60 ? "selected" : ""}>За 1 час</option>
        </select></label>
      </div>
      <label><span>Комментарий</span><textarea data-calendar-block-field="nextAction" placeholder="Что должно произойти в этом блоке">${escapeHtml(calendarBlock.nextAction || "")}</textarea></label>
      <p class="calendar-block-hint">Диапазон дат создаёт одинаковый блок ${escapeHtml(calendarBlock.start)}–${escapeHtml(calendarBlock.end)} в каждом выбранном дне. Изменения попадут в календарь только после сохранения.</p>
      <div class="calendar-block-actions">
        <button type="button" class="simple-secondary-button" data-simple-action="cancel-calendar-block">Отмена</button>
        <button type="button" class="simple-primary-button" data-simple-action="save-calendar-block">Сохранить блок</button>
      </div>
      ${calendarPendingEdit?.mode === "update" ? `<button type="button" class="danger-text calendar-block-delete" data-simple-action="delete-calendar-block">Удалить блок</button>` : ""}
    </section>`;
  }
  const taskItem = module === "tasks"
    ? state.tasks.find((item) => item.id === state.ui?.selectedTaskId) || null
    : null;
  if (taskItem) {
    const dueLabels = { "": "Без даты", [todayIso]: "Сегодня", [addDaysIso(1)]: "Завтра", [addDaysIso(7)]: "На неделе" };
    const dueSummary = taskItem.dueDate ? dueLabels[taskItem.dueDate] || formatShortDate(taskItem.dueDate) : "Без даты";
    const knownTags = allTaskTags();
    const focusActive = state.focus?.selectedTaskId === taskItem.id && state.focus?.running;
    return `<section class="simple-detail-card" data-task-id="${escapeHtml(taskItem.id)}">
      <div class="simple-detail-head">
        <button type="button" class="task-toggle ${taskItem.status === "done" ? "done" : ""}" data-simple-action="toggle-selected" aria-label="${taskItem.status === "done" ? "Вернуть задачу" : "Завершить задачу"}"></button>
        <span class="label">Задача</span>
        <div class="simple-detail-head-actions">
          <button type="button" class="simple-detail-menu-button ${state.ui.taskMenuOpen ? "active" : ""}" data-simple-action="task-menu" aria-label="Параметры задачи" aria-expanded="${state.ui.taskMenuOpen ? "true" : "false"}"><img src="/icons/ellipsis.svg" alt="" /></button>
          <button type="button" class="simple-detail-close" data-simple-action="close-detail" aria-label="Закрыть задачу"><img src="/icons/x.svg" alt="" /></button>
        </div>
      </div>
      <input class="simple-title-input" data-task-field="title" value="${escapeHtml(taskItem.title)}" />
      <textarea class="simple-description-input" data-task-field="description" placeholder="Описание или заметки к задаче">${escapeHtml(taskItem.description || "")}</textarea>
      <div class="simple-task-summary" aria-label="Параметры задачи">
        <button type="button" data-simple-action="task-menu">${escapeHtml(dueSummary)}</button>
        <button type="button" data-simple-action="task-menu">${escapeHtml(priorityLabel(taskItem.priority))}</button>
        <button type="button" data-simple-action="task-menu">${escapeHtml(listLabel(taskItem.area))}</button>
        <button type="button" data-simple-action="task-menu">${taskItem.estimate} мин</button>
        <button type="button" class="simple-tags-summary ${state.ui.quickTagsOpen ? "active" : ""}" data-simple-action="quick-tags" aria-expanded="${state.ui.quickTagsOpen ? "true" : "false"}">${(taskItem.tags || []).length ? (taskItem.tags || []).slice(0, 2).map((tag) => `#${escapeHtml(tag)}`).join(" · ") : "+ Тег"}</button>
      </div>
      ${state.ui.quickTagsOpen ? `<section class="simple-quick-tags" aria-label="Быстрый выбор тегов">
        <div>${knownTags.map((tag) => `<button type="button" class="option-chip ${(taskItem.tags || []).includes(tag) ? "active" : ""}" data-task-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join("") || `<small>Тегов пока нет — добавь первый ниже.</small>`}</div>
        <label><span>Новый тег</span><input data-task-field="tags" value="${escapeHtml((taskItem.tags || []).join(", "))}" placeholder="например: зал, здоровье" /></label>
      </section>` : ""}
      <section class="simple-subtasks" aria-label="Подзадачи">
        <div class="simple-subtasks-head"><strong>Подзадачи</strong><span>${taskItem.subtasks.filter((item) => item.done).length}/${taskItem.subtasks.length}</span></div>
        <div class="simple-subtask-list">${taskItem.subtasks.map((subtask) => `<div class="simple-subtask-row" data-subtask-id="${escapeHtml(subtask.id)}"><button type="button" class="task-toggle ${subtask.done ? "done" : ""}" data-simple-action="toggle-subtask" aria-label="${subtask.done ? "Вернуть подзадачу" : "Завершить подзадачу"}"></button><span class="${subtask.done ? "done" : ""}">${escapeHtml(subtask.title)}</span><button type="button" class="simple-subtask-delete" data-simple-action="delete-subtask" aria-label="Удалить подзадачу">×</button></div>`).join("")}</div>
        <form class="simple-subtask-form" data-subtask-form="${escapeHtml(taskItem.id)}"><input name="title" placeholder="+ Добавить подзадачу" autocomplete="off" /><button type="submit">Добавить</button></form>
      </section>
      ${state.focus?.selectedTaskId === taskItem.id ? `<div class="simple-focus-strip ${focusActive ? "active" : ""}">
        <div><span>Фокус</span><strong id="focusTimerValue">${escapeHtml(formatSeconds(state.focus.remainingSeconds))}</strong></div>
        <button type="button" data-simple-action="${focusActive ? "pause-focus" : "start-focus"}">${focusActive ? "Пауза" : "Старт"}</button>
        <button type="button" data-simple-action="reset-focus">Сбросить</button>
      </div>` : ""}
      ${state.ui.taskMenuOpen ? `<div class="simple-task-menu ${state.ui.taskMenuPosition ? "is-contextual" : ""}" ${state.ui.taskMenuPosition ? `style="left:${state.ui.taskMenuPosition.x}px;top:${state.ui.taskMenuPosition.y}px"` : ""} role="dialog" aria-label="Параметры задачи">
        <div class="simple-task-menu-section"><span>Дата</span><div class="simple-option-row">${renderOptionChips("dueDate", ["", todayIso, addDaysIso(1), addDaysIso(7)], taskDuePresetValue(taskItem), dueLabels)}<input class="simple-date-input" type="date" data-task-field="dueDate" value="${escapeHtml(taskItem.dueDate || "")}" aria-label="Точная дата" /></div></div>
        <div class="simple-task-menu-section simple-priority-options"><span>Приоритет</span><div>${renderOptionChips("priority", priorities, taskItem.priority, { low: "⚑ Низкий", medium: "⚑ Средний", high: "⚑ Высокий" })}</div></div>
        <label class="simple-task-menu-field"><span>Список</span><select data-task-field="area">${taskLists().map(({ id, title }) => `<option value="${escapeHtml(id)}" ${taskItem.area === id ? "selected" : ""}>${escapeHtml(title)}</option>`).join("")}</select></label>
        <div class="simple-task-menu-section"><span>Статус</span><div>${renderOptionChips("status", taskStatuses, taskItem.status, Object.fromEntries(boardColumns))}</div></div>
        <div class="simple-task-menu-section"><span>Длительность</span><div>${renderOptionChips("estimate", [15, 25, 45, 60], taskItem.estimate, { 15: "15 мин", 25: "25 мин", 45: "45 мин", 60: "60 мин" })}</div></div>
        <div class="simple-task-menu-section"><span>Теги</span><div class="simple-tag-options">${knownTags.map((tag) => `<button type="button" class="option-chip ${(taskItem.tags || []).includes(tag) ? "active" : ""}" data-task-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join("") || `<small>Создай первый тег ниже</small>`}</div></div>
        <label class="simple-task-menu-field"><span>Добавить теги через запятую</span><input data-task-field="tags" value="${escapeHtml((taskItem.tags || []).join(", "))}" placeholder="например: звонок, дом" /></label>
        <div class="simple-task-menu-commands">
          <button type="button" data-simple-action="toggle-pin">${taskItem.pinned ? "Открепить" : "Закрепить"}</button>
          <button type="button" data-simple-action="start-focus">Начать фокус</button>
          <button type="button" data-simple-action="duplicate-task">Дублировать</button>
        </div>
        <div class="simple-task-menu-actions"><button type="button" data-simple-action="toggle-selected">${taskItem.status === "done" ? "Вернуть в работу" : "Завершить"}</button><button class="danger-text" type="button" data-simple-action="delete-task">Удалить</button></div>
      </div>` : ""}
    </section>`;
  }
  const noteItem = module === "notes" ? state.notes.find((item) => item.id === state.ui?.selectedNoteId) : null;
  if (noteItem) {
    const wordCount = noteBody(noteItem).trim() ? noteBody(noteItem).trim().split(/\s+/).length : 0;
    return `<section class="simple-detail-card simple-note-editor" data-note-id="${escapeHtml(noteItem.id)}">
      <div class="simple-note-editor-bar">
        <div class="simple-note-path"><span>Заметки</span><b>/</b><select data-note-field="folderId" aria-label="Список заметки" title="Переместить в список"><option value="">Без списка</option>${noteFolders().map(({ id, title }) => `<option value="${escapeHtml(id)}" ${noteItem.folderId === id ? "selected" : ""}>${escapeHtml(title)}</option>`).join("")}</select></div>
        <span class="simple-save-hint">Сохранено · ${wordCount} слов</span>
        <button class="danger-link" type="button" data-simple-action="delete-note">Удалить</button>
        <button type="button" class="simple-detail-close" data-simple-action="close-detail" aria-label="Закрыть заметку"><img src="/icons/x.svg" alt="" /></button>
      </div>
      <textarea class="simple-note-title" data-note-field="title" rows="2" placeholder="Без названия">${escapeHtml(noteTitle(noteItem))}</textarea>
      <textarea class="simple-note-body" data-note-field="text" placeholder="Начни писать…">${escapeHtml(noteBody(noteItem))}</textarea>
      <label class="simple-note-tags"><span>Теги</span><input data-note-field="tags" value="${escapeHtml((noteItem.tags || []).join(", "))}" placeholder="например: обучение, идея" /></label>
    </section>`;
  }
  if (module === "notes") {
    return `<section class="simple-note-empty-editor"><strong>Выбери заметку</strong><p>Или создай новую слева — редактор откроется здесь.</p></section>`;
  }
  return "";
}

function addSimpleComposerItem(text, meta) {
  if (meta.kind === "notes") {
    const folderId = state.ui?.selectedNoteFolderId && state.ui.selectedNoteFolderId !== "unfiled" ? state.ui.selectedNoteFolderId : "";
    const now = new Date().toISOString();
    const note = { id: crypto.randomUUID(), type: "note", folderId, title: text, text: "", tags: [], createdAt: now, updatedAt: now };
    state.notes.unshift(note);
    state.ui.selectedNoteId = note.id;
    state.ui.selectedTaskId = null;
    state.assistantActions.unshift(action("Заметка сохранена", text, "confirmed"));
    return;
  }
  if (meta.kind === "habits") {
    addHabitFromForm(text, "personal", "anytime");
    return;
  }
  if (meta.kind === "projects") {
    const item = project({ title: text, area: "work", journeyStage: "call", stageReason: "Новый проект: нужно уточнить ценность, объём и ограничение." });
    state.projects.unshift(item);
    state.selectedProjectId = item.id;
    state.assistantActions.unshift(action("Проект создан", text, "confirmed"));
    return;
  }
  const status = meta.kind === "tasks" && meta.status !== "done" ? meta.status : "inbox";
  const area = meta.area || state.ui?.simpleArea || suggestedTaskArea(text);
  const item = task(text, status || "inbox", area, "medium", 25, null);
  state.tasks.unshift(item);
  selectTask(item.id);
  state.assistantActions.unshift(action("Задача добавлена", text, "confirmed"));
}

function suggestedTaskArea(title) {
  const text = String(title || "").toLowerCase();
  const available = new Set(taskListIds());
  const choose = (preferred, fallback = "personal") => available.has(preferred) ? preferred : (available.has(fallback) ? fallback : taskLists()[0]?.id || "personal");

  if (/зал|спорт|трениров|фитнес|бег|йог|bjj|сон|здоров|восстанов/.test(text)) return choose("health");
  if (/учеб|обуч|курс|лекц|конспект|экзамен|математ|английск/.test(text)) return choose("learning");
  if (/работ|созвон|клиент|отч[её]т|презентац|ваканси|резюме/.test(text)) return choose("work");
  return choose("personal");
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
      <div class="task-meta"><span class="tag">${escapeHtml(listLabel(item.area))}</span><span class="tag">${item.streak} дней</span></div>
    </div>
    <div class="habit-week">${dots}</div>
  </article>`;
}

function getFocusTask() {
  return state.tasks.find((item) => item.id === state.focus?.selectedTaskId)
    || state.tasks.find((item) => item.id === state.ui?.selectedTaskId)
    || state.tasks.find((item) => item.status === "today" && item.status !== "done")
    || state.tasks.find((item) => item.status !== "done")
    || state.tasks[0]
    || null;
}

function renderFocusView() {
  const root = document.querySelector("#focusWorkspace");
  if (!root) return;
  const selectedTask = getFocusTask();
  const activeTasks = state.tasks.filter((item) => item.status !== "done").slice(0, 8);
  root.innerHTML = `<section class="panel focus-main-panel">
    <div class="panel-header">
      <div>
        <span class="label">Режим фокуса</span>
        <p class="panel-help">Выбери задачу, включи pomodoro и звук для концентрации. Это отдельный режим, не часть дневного плана.</p>
      </div>
      <span class="pill">${escapeHtml(soundCategories[state.focus.soundCategory] || "Sound")}</span>
    </div>
    <div class="focus-view-grid">
      <div class="focus-task-picker">
        <span class="label">Задача</span>
        <div class="focus-task-list">
          ${activeTasks.map((item) => `<button type="button" class="focus-task-option ${selectedTask?.id === item.id ? "active" : ""}" data-focus-task-id="${escapeHtml(item.id)}">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(listLabel(item.area))} · ${escapeHtml(item.estimate)} мин</span>
          </button>`).join("") || `<div class="empty">Нет активных задач для фокуса</div>`}
        </div>
      </div>
      <div>
        ${selectedTask ? renderFocusCompanion(selectedTask) : `<div class="empty">Создай или выбери задачу, чтобы включить focus mode.</div>`}
      </div>
    </div>
  </section>`;
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
  const area = listLabel(item.area);
  const category = categoryForTask(item);
  return `<article class="task-item ${state.ui?.selectedTaskId === item.id ? "selected" : ""}" data-task-id="${item.id}" data-action="select-task">
    <button class="task-toggle ${item.status === "done" ? "done" : ""}" title="Готово" data-action="toggle"></button>
    <div>
      <div class="task-title">${escapeHtml(item.title)}</div>
      <div class="task-meta">
        ${renderCategoryChip(category)}
        <span class="tag">${item.estimate} мин</span>
        ${item.needsReview ? `<span class="tag">нужна проверка</span>` : ""}
      </div>
    </div>
    <span class="task-cell">${area}</span>
    <span class="task-cell">${item.priority}</span>
    <span class="task-cell">${statusLabel(item.status)}</span>
    ${renderTaskQuickMenu(item)}
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
    ${renderTaskQuickMenu(item)}
  </article>`;
}

function renderWeek() {
  document.querySelector("#weeklyFocusList").innerHTML = state.weeklyPlan.focus
    .map((item) => `<article class="weekly-item focus-stake"><span class="focus-type">Ставка недели</span><strong>${escapeHtml(item.title)}</strong><div class="task-meta"><span class="tag">${escapeHtml(listLabel(item.area))}</span><span class="tag">${item.progress}% направления</span></div></article>`)
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
  const statusIndex = taskStatuses.indexOf(item.status);
  const previousStatus = taskStatuses[Math.max(0, statusIndex - 1)];
  const nextStatus = taskStatuses[Math.min(taskStatuses.length - 1, statusIndex + 1)];
  return `<article class="board-card ${item.status === "done" ? "is-done" : ""} ${state.ui?.selectedTaskId === item.id ? "selected" : ""}" data-task-id="${item.id}" data-action="select-task">
    <button class="task-toggle ${item.status === "done" ? "done" : ""}" title="Готово" data-action="toggle"></button>
    <div class="board-card-main">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="task-meta">
        <span>${escapeHtml(listLabel(item.area))}</span>
        <span>${escapeHtml(priorityLabel(item.priority))}</span>
        <span>${item.estimate} мин</span>
        ${projectItem ? `<span>${escapeHtml(projectItem.title)}</span>` : ""}
      </div>
      <div class="board-card-actions">
        ${item.status !== "inbox" ? `<button type="button" data-board-action="move" data-status="${escapeHtml(previousStatus)}">Назад</button>` : ""}
        ${item.status !== "today" ? `<button type="button" data-board-action="move" data-status="today">В Сегодня</button>` : ""}
        ${item.status !== "done" ? `<button type="button" data-board-action="move" data-status="${escapeHtml(nextStatus)}">Дальше</button>` : `<button type="button" data-board-action="move" data-status="${escapeHtml(item.previousStatus || "today")}">Вернуть</button>`}
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
    inbox: "Inbox",
    backlog: "Backlog",
    this_week: "Неделя",
    today: "Сегодня",
    done: "Готово"
  }[status] || status;
}

function priorityLabel(priority) {
  return {
    low: "низкий",
    medium: "средний",
    high: "высокий"
  }[priority] || priority;
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
  updateTaskRecord(item, field, value, {
    statuses: taskStatuses,
    areas: taskListIds(),
    priorities,
    projects: state.projects,
    routines: state.routines
  });
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
  stopFocusTimer();
  focusRuntime.startedAt = new Date();
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
  const length = sampleRate * 4;
  const buffer = audioContext.createBuffer(2, length, sampleRate);
  const config = {
    deep_work: { base: 72, harmonic: 144, overtone: 216, tone: 0.115, noise: 0.045, pulse: 0.055, lowpass: 0.992 },
    calm_focus: { base: 110, harmonic: 220, overtone: 330, tone: 0.09, noise: 0.03, pulse: 0.025, lowpass: 0.996 },
    coding: { base: 146.83, harmonic: 293.66, overtone: 440, tone: 0.1, noise: 0.055, pulse: 0.19, lowpass: 0.986 },
    reading: { base: 92.5, harmonic: 185, overtone: 277.5, tone: 0.075, noise: 0.025, pulse: 0.012, lowpass: 0.997 },
    rain: { base: 0, harmonic: 0, overtone: 0, tone: 0, noise: 0.58, pulse: 0.34, lowpass: 0.58 },
    brown_noise: { base: 0, harmonic: 0, overtone: 0, tone: 0, noise: 0.44, pulse: 0, lowpass: 0.997 }
  }[category] || { base: 72, harmonic: 144, overtone: 216, tone: 0.115, noise: 0.045, pulse: 0.055, lowpass: 0.992 };

  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    let filtered = 0;
    let shimmer = 0;
    for (let index = 0; index < length; index += 1) {
      const t = index / sampleRate;
      const white = Math.random() * 2 - 1;
      filtered = filtered * config.lowpass + white * (1 - config.lowpass);
      shimmer = shimmer * 0.76 + white * 0.24;
      const pulse = config.pulse ? (Math.sin(2 * Math.PI * config.pulse * t) + 1) / 2 : 0.5;
      const tone = config.base
        ? (
          Math.sin(2 * Math.PI * config.base * t) * config.tone
          + Math.sin(2 * Math.PI * config.harmonic * t) * (config.tone * 0.42)
          + Math.sin(2 * Math.PI * config.overtone * t) * (config.tone * 0.18)
        )
        : 0;
      const rainDrops = category === "rain" && Math.random() > 0.985 ? (Math.random() * 2 - 1) * 0.22 : 0;
      const codingTick = category === "coding" && Math.sin(2 * Math.PI * 1.7 * t) > 0.985 ? 0.045 : 0;
      const breath = category === "calm_focus" || category === "reading"
        ? 0.82 + Math.sin(2 * Math.PI * (category === "reading" ? 0.035 : 0.055) * t) * 0.12
        : 1;
      const noiseLayer = category === "rain"
        ? shimmer * config.noise + rainDrops
        : filtered * config.noise * (0.72 + pulse * 0.42);
      data[index] = Math.max(-0.8, Math.min(0.8, (noiseLayer + tone + codingTick) * breath));
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
      results.push({ type: "task", id: item.id, title: item.title, detail: `${statusLabel(item.status)} · ${listLabel(item.area)}` });
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
    if (`${noteTitle(item)} ${item.text || ""}`.toLowerCase().includes(needle)) {
      results.push({ type: "note", id: item.id, title: noteTitle(item), detail: `Заметка · ${noteFolderLabel(item.folderId)}` });
    }
  });
  return results.slice(0, 8);
}

function renderSimpleSearchResults(query) {
  const root = document.querySelector("#simpleSearchResults");
  if (!root) return;
  const needle = String(query || "").trim();
  const results = searchDailyOs(needle).filter((item) => item.type === "task" || item.type === "note");
  root.hidden = !needle;
  root.innerHTML = !needle
    ? ""
    : results.length
      ? results.map((item) => `<button type="button" data-simple-search-type="${escapeHtml(item.type)}" data-simple-search-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></button>`).join("")
      : `<div class="simple-search-empty">Ничего не найдено</div>`;
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
    if (button.dataset.view === "habits") {
      state.ui.selectedTaskId = null;
      state.focus.selectedTaskId = null;
    }
    saveState();
  });
});

document.querySelector("#simpleApp")?.addEventListener("click", (event) => {
  if (event.target.closest("[data-simple-undo]")) {
    restoreUndo();
    return;
  }

  const backupAction = event.target.closest("[data-simple-backup-action]");
  if (backupAction) {
    const action = backupAction.dataset.simpleBackupAction;
    if (action === "export") {
      downloadStateBackup();
      return;
    }
    if (action === "choose") {
      document.querySelector("#simpleBackupInput")?.click();
      return;
    }
    if (action === "undo") {
      try {
        const payload = parseBackupPayload(localStorage.getItem(PRE_IMPORT_BACKUP_KEY) || "");
        stageImportPayload(payload, "rollback");
      } catch {
        backupMessage = "Точка отката повреждена или недоступна.";
        renderSimpleApp();
      }
      return;
    }
    if (action === "cancel") {
      pendingImportPayload = null;
      renderSimpleApp();
      return;
    }
    if (action === "confirm" && pendingImportPayload?.payload?.state) {
      const rollback = createBackupPayload(state);
      localStorage.setItem(PRE_IMPORT_BACKUP_KEY, JSON.stringify(rollback));
      state = normalizeState({ ...structuredClone(seedState), ...pendingImportPayload.payload.state });
      state.assistantActions.unshift({
        id: crypto.randomUUID(),
        title: "Резервная копия восстановлена",
        reason: pendingImportPayload.source === "rollback" ? "Возвращено состояние до последнего импорта." : `Импортирован файл ${pendingImportPayload.name || "Daily OS"}.`,
        sourceType: "backup",
        sourceId: "",
        status: "confirmed",
        createdAt: new Date().toISOString()
      });
      pendingImportPayload = null;
      backupMessage = "Данные восстановлены. Предыдущая версия доступна для отката.";
      simpleSyncPanelOpen = true;
      saveState();
      return;
    }
  }

  const syncAction = event.target.closest("[data-simple-sync-action]");
  if (syncAction) {
    if (syncAction.dataset.simpleSyncAction === "retry") {
      cloudSync.error = "";
      cloudSync.status = "syncing";
      queueCloudSave({ immediate: true });
      renderSimpleApp();
      return;
    }
    if (syncAction.dataset.simpleSyncAction === "restore-local") {
      try {
        const backup = JSON.parse(localStorage.getItem(CONFLICT_BACKUP_KEY) || "null");
        if (backup?.state) state = normalizeState({ ...structuredClone(seedState), ...backup.state });
      } catch {
        cloudSync.error = "Не удалось прочитать локальную резервную копию.";
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.removeItem(CONFLICT_BACKUP_KEY);
      cloudSync.pendingSnapshot = null;
      cloudSync.status = "syncing";
      cloudSync.error = "";
      queueCloudSave();
      render();
      return;
    }
    if (syncAction.dataset.simpleSyncAction === "keep-cloud") {
      localStorage.removeItem(CONFLICT_BACKUP_KEY);
      cloudSync.pendingSnapshot = null;
      cloudSync.status = "synced";
      cloudSync.error = "";
      updateAuthUi();
      render();
      return;
    }
  }

  const syncToggle = event.target.closest("#simpleSyncToggle, #simpleMobileSyncToggle");
  if (syncToggle) {
    simpleSyncPanelOpen = !simpleSyncPanelOpen;
    state.ui.appearanceOpen = false;
    renderSimpleApp();
    return;
  }

  const appearanceToggle = event.target.closest("#simpleAppearanceToggle");
  if (appearanceToggle) {
    state.ui.appearanceOpen = !state.ui.appearanceOpen;
    simpleSyncPanelOpen = false;
    renderSimpleApp();
    return;
  }

  const themeButton = event.target.closest("[data-appearance-theme]");
  if (themeButton) {
    state.settings.appearanceTheme = themeButton.dataset.appearanceTheme;
    saveState();
    return;
  }

  const fontButton = event.target.closest("[data-appearance-font]");
  if (fontButton) {
    state.settings.appearanceFont = fontButton.dataset.appearanceFont;
    saveState();
    return;
  }

  const moduleButton = event.target.closest("[data-simple-module]");
  if (moduleButton) {
    if (moduleButton.dataset.simpleModule === "search") {
      document.querySelector("#simpleSearch")?.focus();
      return;
    }
    setSimpleModule(moduleButton.dataset.simpleModule);
    saveState();
    return;
  }

  const calendarAction = event.target.closest("[data-calendar-action]");
  if (calendarAction) {
    if (calendarAction.dataset.calendarAction === "previous") state.ui.calendarWeekOffset -= 1;
    if (calendarAction.dataset.calendarAction === "next") state.ui.calendarWeekOffset += 1;
    if (calendarAction.dataset.calendarAction === "today") state.ui.calendarWeekOffset = 0;
    saveState();
    return;
  }

  const calendarTask = event.target.closest("[data-calendar-task-id]");
  if (calendarTask) {
    state.ui.simpleModule = "tasks";
    state.settings.activeView = "today";
    state.ui.lastTaskView = "today";
    state.ui.selectedTaskId = calendarTask.dataset.calendarTaskId;
    state.ui.simpleArea = "";
    saveState();
    return;
  }

  const projectButton = event.target.closest("[data-simple-project-id]");
  if (projectButton) {
    state.selectedProjectId = projectButton.dataset.simpleProjectId;
    saveState();
    return;
  }

  const projectTaskAction = event.target.closest("[data-simple-project-task-action]");
  if (projectTaskAction) {
    const taskRoot = projectTaskAction.closest("[data-simple-project-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskRoot?.dataset.simpleProjectTaskId);
    if (!item) return;
    const command = projectTaskAction.dataset.simpleProjectTaskAction;
    if (command === "toggle") {
      if (item.status === "done") item.status = item.previousStatus || "this_week";
      else {
        item.previousStatus = item.status;
        item.status = "done";
      }
      item.updatedAt = new Date().toISOString();
      state.assistantActions.unshift(action(item.status === "done" ? "Задача проекта завершена" : "Задача проекта возвращена", item.title, "confirmed"));
      saveState();
      return;
    }
    if (command === "unlink") {
      const projectTitle = state.projects.find((projectItem) => projectItem.id === item.projectId)?.title || "Проект";
      item.projectId = null;
      item.updatedAt = new Date().toISOString();
      state.assistantActions.unshift(action("Задача отвязана от проекта", `${projectTitle}: ${item.title}`, "confirmed"));
      saveState();
      return;
    }
    if (command === "select") {
      state.ui.simpleModule = "tasks";
      state.settings.activeView = item.status === "done" ? "done" : item.status;
      state.ui.lastTaskView = state.settings.activeView;
      state.ui.simpleArea = "";
      state.ui.selectedTaskId = item.id;
      state.focus.selectedTaskId = item.id;
      saveState();
      return;
    }
  }

  const projectTask = event.target.closest("[data-simple-project-task-id]");
  if (projectTask) {
    state.ui.simpleModule = "tasks";
    state.settings.activeView = "board";
    state.ui.lastTaskView = "board";
    state.ui.simpleArea = "";
    state.ui.selectedTaskId = projectTask.dataset.simpleProjectTaskId;
    saveState();
    return;
  }

  const projectAction = event.target.closest("[data-simple-project-action]");
  if (projectAction) {
    const projectItem = state.projects.find((item) => item.id === state.selectedProjectId) || state.projects[0];
    if (!projectItem) return;
    if (projectAction.dataset.simpleProjectAction === "review") reviewProjectJourney(projectItem);
    if (projectAction.dataset.simpleProjectAction === "confirm") confirmProjectStage(projectItem);
    if (projectAction.dataset.simpleProjectAction === "reject") rejectProjectStage(projectItem);
    if (projectAction.dataset.simpleProjectAction === "close-obstacle") {
      const item = state.projectObstacles.find((candidate) => candidate.id === projectAction.dataset.obstacleId && candidate.projectId === projectItem.id);
      if (item) {
        item.status = "closed";
        item.closedAt = new Date().toISOString();
        state.assistantActions.unshift(action("Препятствие закрыто", `${projectItem.title}: ${item.text}`, "confirmed"));
      }
    }
    saveState();
    return;
  }

  const viewButton = event.target.closest("[data-simple-view]");
  if (viewButton) {
    if (simpleModules.has(viewButton.dataset.simpleView) && viewButton.dataset.simpleView !== "tasks") {
      setSimpleModule(viewButton.dataset.simpleView);
      saveState();
      return;
    }
    state.settings.activeView = viewButton.dataset.simpleView;
    if (simpleTaskViews.has(viewButton.dataset.simpleView)) state.ui.lastTaskView = viewButton.dataset.simpleView;
    state.ui.simpleArea = "";
    state.ui.simpleModule = "tasks";
    state.ui.selectedTaskId = null;
    state.ui.selectedNoteId = null;
    state.ui.listMenuId = "";
    state.ui.taskMenuOpen = false;
    saveState();
    return;
  }

  const noteFolderButton = event.target.closest("[data-note-folder]");
  if (noteFolderButton) {
    state.ui.selectedNoteFolderId = noteFolderButton.dataset.noteFolder || "";
    state.ui.selectedNoteId = null;
    state.ui.noteFolderMenuId = "";
    saveState();
    return;
  }

  const noteFolderAction = event.target.closest("[data-note-folder-action]");
  if (noteFolderAction) {
    const actionType = noteFolderAction.dataset.noteFolderAction;
    const folderRoot = noteFolderAction.closest("[data-note-folder-id]");
    if (actionType === "create") {
      state.ui.creatingNoteFolder = true;
      state.ui.renamingNoteFolderId = "";
    }
    if (actionType === "cancel-create") state.ui.creatingNoteFolder = false;
    if (actionType === "menu" && folderRoot?.dataset.noteFolderId) {
      state.ui.noteFolderMenuId = state.ui.noteFolderMenuId === folderRoot.dataset.noteFolderId ? "" : folderRoot.dataset.noteFolderId;
    }
    if (actionType === "rename" && folderRoot?.dataset.noteFolderId) {
      state.ui.renamingNoteFolderId = folderRoot.dataset.noteFolderId;
      state.ui.creatingNoteFolder = false;
      state.ui.noteFolderMenuId = "";
    }
    if (actionType === "set-icon" && folderRoot?.dataset.noteFolderId && listIcons.includes(noteFolderAction.dataset.folderIcon)) {
      const folder = noteFolders().find((item) => item.id === folderRoot.dataset.noteFolderId);
      if (folder) folder.icon = noteFolderAction.dataset.folderIcon;
    }
    if (actionType === "set-tone" && folderRoot?.dataset.noteFolderId && listTones.includes(noteFolderAction.dataset.folderTone)) {
      const folder = noteFolders().find((item) => item.id === folderRoot.dataset.noteFolderId);
      if (folder) folder.tone = noteFolderAction.dataset.folderTone;
    }
    if (actionType === "cancel-rename") state.ui.renamingNoteFolderId = "";
    if (actionType === "delete" && folderRoot?.dataset.noteFolderId) {
      state.ui.pendingDeleteNoteFolderId = folderRoot.dataset.noteFolderId;
      state.ui.noteFolderMenuId = "";
    }
    saveState();
    return;
  }

  const listAction = event.target.closest("[data-simple-list-action]");
  if (listAction) {
    const actionType = listAction.dataset.simpleListAction;
    const listRoot = listAction.closest("[data-list-id]");
    if (actionType === "create") {
      state.ui.creatingList = true;
      state.ui.renamingListId = "";
    }
    if (actionType === "cancel-create") state.ui.creatingList = false;
    if (actionType === "menu" && listRoot?.dataset.listId) {
      state.ui.listMenuId = state.ui.listMenuId === listRoot.dataset.listId ? "" : listRoot.dataset.listId;
    }
    if (actionType === "rename" && listRoot?.dataset.listId) {
      state.ui.renamingListId = listRoot.dataset.listId;
      state.ui.creatingList = false;
      state.ui.listMenuId = "";
    }
    if (actionType === "set-icon" && listRoot?.dataset.listId && listIcons.includes(listAction.dataset.listIcon)) {
      const list = taskLists().find((item) => item.id === listRoot.dataset.listId);
      if (list) list.icon = listAction.dataset.listIcon;
    }
    if (actionType === "set-tone" && listRoot?.dataset.listId && listTones.includes(listAction.dataset.listTone)) {
      const list = taskLists().find((item) => item.id === listRoot.dataset.listId);
      if (list) list.tone = listAction.dataset.listTone;
    }
    if (actionType === "set-group" && listRoot?.dataset.listId && ["work", "personal", "health"].includes(listAction.dataset.listGroup)) {
      const list = taskLists().find((item) => item.id === listRoot.dataset.listId);
      if (list) list.group = listAction.dataset.listGroup;
    }
    if (actionType === "cancel-rename") state.ui.renamingListId = "";
    if (actionType === "delete" && listRoot?.dataset.listId) {
      state.ui.pendingDeleteListId = listRoot.dataset.listId;
      state.ui.renamingListId = "";
      state.ui.creatingList = false;
      state.ui.listMenuId = "";
    }
    if (actionType === "cancel-delete") state.ui.pendingDeleteListId = "";
    if (actionType === "confirm-delete") {
      const pendingId = state.ui.pendingDeleteListId || listRoot?.dataset.listId;
      if (pendingId) deleteTaskList(pendingId);
      state.ui.pendingDeleteListId = "";
    }
    saveState();
    return;
  }

  const areaButton = event.target.closest("[data-simple-area]");
  if (areaButton) {
    state.ui.simpleArea = areaButton.dataset.simpleArea;
    state.ui.simpleModule = "tasks";
    state.settings.activeView = "board";
    state.ui.lastTaskView = "board";
    state.ui.selectedTaskId = null;
    state.ui.listMenuId = "";
    state.ui.taskMenuOpen = false;
    saveState();
    return;
  }

  const deleteAction = event.target.closest("[data-simple-delete-action]");
  if (deleteAction) {
    const type = deleteAction.dataset.simpleDeleteAction;
    if (type === "task" && state.ui.pendingDeleteTaskId) {
      stageUndo("Задача удалена");
      state.tasks = state.tasks.filter((item) => item.id !== state.ui.pendingDeleteTaskId);
      state.ui.selectedTaskId = null;
    }
    if (type === "note" && state.ui.pendingDeleteNoteId) {
      stageUndo("Заметка удалена");
      state.notes = state.notes.filter((item) => item.id !== state.ui.pendingDeleteNoteId);
      state.ui.selectedNoteId = null;
    }
    if (type === "note-folder" && state.ui.pendingDeleteNoteFolderId) {
      const folderId = state.ui.pendingDeleteNoteFolderId;
      state.notes.forEach((item) => {
        if (item.folderId === folderId) item.folderId = "";
      });
      state.noteFolders = noteFolders().filter((item) => item.id !== folderId);
      if (state.ui.selectedNoteFolderId === folderId) state.ui.selectedNoteFolderId = "unfiled";
    }
    state.ui.pendingDeleteTaskId = "";
    state.ui.pendingDeleteNoteId = "";
    state.ui.pendingDeleteNoteFolderId = "";
    saveState();
    return;
  }

  const inboxAction = event.target.closest("[data-inbox-action]");
  if (inboxAction) {
    const row = inboxAction.closest("[data-inbox-id]");
    const item = state.inboxItems.find((candidate) => candidate.id === row?.dataset.inboxId);
    handleInboxAction(inboxAction.dataset.inboxAction, item);
    saveState();
    return;
  }

  const taskOption = event.target.closest(".simple-detail [data-task-option]");
  if (taskOption) {
    const taskRoot = taskOption.closest("[data-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskRoot?.dataset.taskId);
    updateTaskField(item, taskOption.dataset.taskOption, taskOption.dataset.value);
    saveState();
    return;
  }

  const taskTag = event.target.closest(".simple-detail [data-task-tag]");
  if (taskTag) {
    const taskRoot = taskTag.closest("[data-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskRoot?.dataset.taskId);
    if (!item) return;
    const tag = taskTag.dataset.taskTag;
    item.tags = (item.tags || []).includes(tag)
      ? item.tags.filter((candidate) => candidate !== tag)
      : [...(item.tags || []), tag].slice(0, 8);
    item.updatedAt = new Date().toISOString();
    saveState();
    return;
  }

  const detailAction = event.target.closest("[data-simple-action]");
  if (detailAction?.dataset.simpleAction === "select-task-menu") {
    const row = detailAction.closest('[data-simple-object="task"]');
    if (row && selectTask(row.dataset.taskId)) state.ui.taskMenuOpen = true;
    state.ui.taskMenuPosition = null;
    state.ui.quickTagsOpen = false;
    state.ui.selectedNoteId = null;
    saveState();
    return;
  }
  if (detailAction?.dataset.simpleAction === "task-menu") {
    state.ui.quickTagsOpen = false;
    state.ui.taskMenuOpen = !state.ui.taskMenuOpen;
    state.ui.taskMenuPosition = null;
    saveState();
    return;
  }
  if (detailAction?.dataset.simpleAction === "quick-tags") {
    state.ui.taskMenuOpen = false;
    state.ui.taskMenuPosition = null;
    state.ui.quickTagsOpen = !state.ui.quickTagsOpen;
    saveState();
    return;
  }
  if (detailAction?.dataset.simpleAction === "close-calendar-detail") {
    cancelCalendarDraft();
    return;
  }
  if (detailAction?.dataset.simpleAction === "cancel-calendar-block") {
    cancelCalendarDraft();
    return;
  }
  if (detailAction?.dataset.simpleAction === "save-calendar-block") {
    saveCalendarDraft();
    return;
  }
  if (detailAction?.dataset.simpleAction === "delete-calendar-block") {
    const blockId = detailAction.closest("[data-calendar-block-id]")?.dataset.calendarBlockId;
    const block = state.dailyPlan.timeBlocks.find((item) => item.id === blockId);
    if (block) {
      state.dailyPlan.timeBlocks = state.dailyPlan.timeBlocks.filter((item) => item.id !== blockId);
      state.assistantActions.unshift(action("Блок удалён из календаря", `${block.title}, ${block.start}–${block.end}.`, "confirmed"));
    }
    state.ui.selectedCalendarBlockId = null;
    calendarPendingEdit = null;
    saveState();
    return;
  }
  if (detailAction?.dataset.simpleAction === "close-detail") {
    state.ui.selectedTaskId = null;
    state.ui.selectedNoteId = null;
    state.ui.taskMenuOpen = false;
    state.ui.taskMenuPosition = null;
    state.ui.quickTagsOpen = false;
    saveState();
    return;
  }
  if (detailAction?.dataset.simpleAction === "toggle-selected") {
    const item = getSelectedTask();
    if (!item) return;
    stageUndo(item.status === "done" ? "Задача возвращена" : "Задача завершена");
    if (item.status === "done") restoreTaskRecord(item);
    else {
      item.previousStatus = item.status;
      item.status = "done";
      item.updatedAt = new Date().toISOString();
    }
    saveState();
    return;
  }
  if (detailAction?.dataset.simpleAction === "toggle-pin") {
    const item = getSelectedTask();
    if (!item) return;
    item.pinned = !item.pinned;
    item.updatedAt = new Date().toISOString();
    state.assistantActions.unshift(action(item.pinned ? "Задача закреплена" : "Задача откреплена", item.title, "confirmed"));
    state.ui.taskMenuOpen = false;
    state.ui.taskMenuPosition = null;
    saveState();
    return;
  }
  if (detailAction?.dataset.simpleAction === "duplicate-task") {
    const item = getSelectedTask();
    if (!item) return;
    const duplicate = duplicateTaskRecord(item);
    state.tasks.unshift(duplicate);
    selectTask(duplicate.id);
    state.ui.taskMenuOpen = false;
    state.ui.taskMenuPosition = null;
    state.assistantActions.unshift(action("Задача продублирована", duplicate.title, "confirmed"));
    saveState();
    return;
  }
  if (detailAction?.dataset.simpleAction === "toggle-subtask") {
    const item = getSelectedTask();
    const subtaskId = detailAction.closest("[data-subtask-id]")?.dataset.subtaskId;
    const subtask = item?.subtasks.find((candidate) => candidate.id === subtaskId);
    if (!subtask) return;
    subtask.done = !subtask.done;
    item.updatedAt = new Date().toISOString();
    state.assistantActions.unshift(action(subtask.done ? "Подзадача закрыта" : "Подзадача возвращена", subtask.title, "confirmed"));
    saveState();
    return;
  }
  if (detailAction?.dataset.simpleAction === "delete-subtask") {
    const item = getSelectedTask();
    const subtaskId = detailAction.closest("[data-subtask-id]")?.dataset.subtaskId;
    if (!item || !subtaskId) return;
    item.subtasks = item.subtasks.filter((candidate) => candidate.id !== subtaskId);
    item.updatedAt = new Date().toISOString();
    saveState();
    return;
  }
  if (detailAction?.dataset.simpleAction === "start-focus") {
    const item = getSelectedTask();
    if (!item) return;
    state.focus.selectedTaskId = item.id;
    state.ui.taskMenuOpen = false;
    state.ui.taskMenuPosition = null;
    state.assistantActions.unshift(action("Фокус запущен", item.title, "confirmed"));
    startFocusTimer();
    return;
  }
  if (detailAction?.dataset.simpleAction === "pause-focus") {
    pauseFocusTimer();
    return;
  }
  if (detailAction?.dataset.simpleAction === "reset-focus") {
    resetFocusTimer();
    return;
  }
  if (detailAction?.dataset.simpleAction === "delete-task") {
    const item = getSelectedTask();
    if (item) state.ui.pendingDeleteTaskId = item.id;
    saveState();
    return;
  }
  if (detailAction?.dataset.simpleAction === "delete-note") {
    const item = state.notes.find((candidate) => candidate.id === state.ui.selectedNoteId);
    if (item) state.ui.pendingDeleteNoteId = item.id;
    saveState();
    return;
  }

  const taskRow = event.target.closest('[data-simple-object="task"]');
  if (taskRow && !event.target.closest('[data-action="toggle"]')) {
    selectTask(taskRow.dataset.taskId);
    state.ui.selectedNoteId = null;
    state.ui.taskMenuOpen = false;
    state.ui.quickTagsOpen = false;
    saveState();
    return;
  }

  const noteRow = event.target.closest('[data-simple-object="note"]');
  if (noteRow) {
    state.ui.selectedNoteId = noteRow.dataset.noteId;
    state.ui.selectedTaskId = null;
    saveState();
    return;
  }

  const focusSelected = event.target.closest('[data-simple-action="focus-selected"]');
  if (focusSelected) {
    const taskItem = getSelectedTask();
    if (taskItem) {
      selectTask(taskItem.id, "focus");
      startFocusTimer();
      saveState();
    }
  }
});

document.querySelector("#simpleApp")?.addEventListener("contextmenu", (event) => {
  const taskRow = event.target.closest('[data-simple-object="task"]');
  if (!taskRow) return;
  event.preventDefault();

  if (!selectTask(taskRow.dataset.taskId)) return;
  const menuWidth = 330;
  const menuHeight = 620;
  state.ui.taskMenuOpen = true;
  state.ui.taskMenuPosition = {
    x: Math.max(12, Math.min(event.clientX, window.innerWidth - menuWidth - 12)),
    y: Math.max(12, Math.min(event.clientY, window.innerHeight - menuHeight - 12))
  };
  state.ui.selectedNoteId = null;
  saveState();
});

document.addEventListener("click", (event) => {
  if (simpleSyncPanelOpen && !event.target.closest("#simpleSyncPanel, #simpleSyncToggle, #simpleMobileSyncToggle")) {
    simpleSyncPanelOpen = false;
    renderSimpleApp();
  }
  if (state.ui?.appearanceOpen && !event.target.closest("#simpleAppearanceMenu, #simpleAppearanceToggle")) {
    state.ui.appearanceOpen = false;
    renderSimpleApp();
  }
  if (state.ui?.quickTagsOpen && !event.target.closest(".simple-quick-tags, [data-simple-action='quick-tags']")) {
    state.ui.quickTagsOpen = false;
    renderSimpleApp();
  }
  if (!state.ui?.taskMenuOpen) return;
  if (event.target.closest(".simple-task-menu, [data-simple-action='task-menu'], [data-simple-action='select-task-menu']")) return;
  state.ui.taskMenuOpen = false;
  state.ui.taskMenuPosition = null;
  renderSimpleApp();
});

document.querySelector("#simpleComposer")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#simpleComposerInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  const meta = simpleViewMeta();
  if (meta.kind === "inbox") {
    input.disabled = true;
    input.placeholder = "Ассистент разбирает входящее...";
    await processInbox(text);
    input.disabled = false;
    input.placeholder = "Мысль, задача, перенос, идея или контекст";
    input.focus();
    return;
  }
  addSimpleComposerItem(text, meta);
  saveState();
});

document.querySelector("#simpleBackupInput")?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error("Backup file is too large");
    const payload = parseBackupPayload(await file.text());
    stageImportPayload(payload, "file", file.name);
  } catch {
    backupMessage = "Файл не похож на резервную копию Daily OS версии 1.";
    simpleSyncPanelOpen = true;
    renderSimpleApp();
  }
});

document.querySelector("#simpleSearch")?.addEventListener("input", (event) => {
  simpleSearchQuery = event.target.value;
  renderSimpleSearchResults(simpleSearchQuery);
});

document.querySelector("#simpleSearchResults")?.addEventListener("click", (event) => {
  const result = event.target.closest("[data-simple-search-type]");
  if (!result) return;
  if (result.dataset.simpleSearchType === "task") {
    state.ui.simpleModule = "tasks";
    state.settings.activeView = "board";
    state.ui.simpleArea = "";
    state.ui.selectedNoteId = null;
    selectTask(result.dataset.simpleSearchId);
  }
  if (result.dataset.simpleSearchType === "note") {
    state.ui.simpleModule = "notes";
    state.settings.activeView = "notes";
    state.ui.selectedTaskId = null;
    state.ui.selectedNoteId = result.dataset.simpleSearchId;
    const note = state.notes.find((item) => item.id === result.dataset.simpleSearchId);
    state.ui.selectedNoteFolderId = note?.folderId || "";
  }
  simpleSearchQuery = "";
  const searchInput = document.querySelector("#simpleSearch");
  if (searchInput) searchInput.value = "";
  saveState();
});

document.querySelector("#simpleApp")?.addEventListener("submit", (event) => {
  const subtaskForm = event.target.closest("[data-subtask-form]");
  if (subtaskForm) {
    event.preventDefault();
    const item = state.tasks.find((candidate) => candidate.id === subtaskForm.dataset.subtaskForm);
    const title = new FormData(subtaskForm).get("title")?.trim();
    if (!item || !title) return;
    item.subtasks.push({ id: crypto.randomUUID(), title, done: false });
    item.updatedAt = new Date().toISOString();
    state.assistantActions.unshift(action("Подзадача добавлена", title, "confirmed"));
    saveState();
    return;
  }
  const noteFolderCreateForm = event.target.closest("#noteFolderCreateForm");
  const noteFolderRenameForm = event.target.closest('[data-note-folder-form="rename"]');
  if (noteFolderCreateForm || noteFolderRenameForm) {
    event.preventDefault();
    const form = noteFolderCreateForm || noteFolderRenameForm;
    const title = new FormData(form).get("title");
    if (noteFolderCreateForm) createNoteFolder(title);
    if (noteFolderRenameForm) renameNoteFolder(noteFolderRenameForm.dataset.noteFolderId, title);
    saveState();
    return;
  }
  const projectForm = event.target.closest("[data-simple-project-form]");
  if (projectForm) {
    event.preventDefault();
    const projectItem = state.projects.find((item) => item.id === state.selectedProjectId);
    if (!projectItem) return;
    const formData = new FormData(projectForm);
    if (projectForm.dataset.simpleProjectForm === "create-task") {
      const title = String(formData.get("title") || "").trim();
      if (!title) return;
      const item = task(title, "this_week", projectItem.area || "work", "medium", 25, projectItem.id);
      state.tasks.unshift(item);
      state.assistantActions.unshift(action("Задача проекта добавлена", `${projectItem.title}: ${title}`, "confirmed"));
    }
    if (projectForm.dataset.simpleProjectForm === "link-task") {
      const item = state.tasks.find((candidate) => candidate.id === formData.get("taskId"));
      if (!item) return;
      item.projectId = projectItem.id;
      item.updatedAt = new Date().toISOString();
      state.assistantActions.unshift(action("Задача привязана к проекту", `${projectItem.title}: ${item.title}`, "confirmed"));
    }
    if (projectForm.dataset.simpleProjectForm === "add-obstacle") {
      const text = String(formData.get("text") || "").trim();
      const severity = ["low", "medium", "high"].includes(formData.get("severity")) ? formData.get("severity") : "medium";
      if (!text) return;
      state.projectObstacles.unshift(obstacle(projectItem.id, "manual", text, severity));
      state.assistantActions.unshift(action("Препятствие добавлено", `${projectItem.title}: ${text}`, "confirmed"));
    }
    if (projectForm.dataset.simpleProjectForm === "propose-stage") {
      proposeProjectStage(projectItem, String(formData.get("stage") || ""), formData.get("reason"), "user");
    }
    saveState();
    return;
  }
  const createForm = event.target.closest("#simpleListCreateForm");
  const renameForm = event.target.closest('[data-list-form="rename"]');
  if (!createForm && !renameForm) return;
  event.preventDefault();
  const form = createForm || renameForm;
  const title = new FormData(form).get("title");
  if (createForm) createTaskList(title);
  if (renameForm) renameTaskList(renameForm.dataset.listId, title);
  saveState();
});

document.querySelector("#simpleApp")?.addEventListener("change", (event) => {
  const projectField = event.target.closest("[data-project-field]");
  if (projectField) {
    const projectRoot = projectField.closest("[data-project-id]");
    const item = state.projects.find((candidate) => candidate.id === projectRoot?.dataset.projectId);
    if (!item) return;
    const field = projectField.dataset.projectField;
    if (field === "title") item.title = projectField.value.trim() || item.title;
    if (field === "stageReason") item.stageReason = projectField.value.trim();
    if (field === "nextTransition") item.nextTransition = projectField.value.trim();
    item.updatedAt = new Date().toISOString();
    state.assistantActions.unshift(action("Проект обновлён", `${item.title}: ${field}.`, "confirmed"));
    saveState();
    return;
  }
  const habitField = event.target.closest("[data-habit-field]");
  if (habitField) {
    const habitRoot = habitField.closest("[data-habit-id]");
    const item = state.habits.find((candidate) => candidate.id === habitRoot?.dataset.habitId);
    if (!item) return;
    if (habitField.dataset.habitField === "group" && habitGroups.includes(habitField.value)) item.group = habitField.value;
    state.assistantActions.unshift(action("Привычка обновлена", `${item.title}: ${habitGroupLabels[item.group]}.`, "confirmed"));
    saveState();
    return;
  }
  const calendarBlockField = event.target.closest("[data-calendar-block-field]");
  if (calendarBlockField) {
    const blockRoot = calendarBlockField.closest("[data-calendar-block-id]");
    const blockId = blockRoot?.dataset.calendarBlockId;
    if (!calendarPendingEdit || calendarPendingEdit.draft.id !== blockId) {
      const sourceBlock = state.dailyPlan.timeBlocks.find((item) => item.id === blockId);
      if (sourceBlock) calendarPendingEdit = { mode: "update", blockId, linkedTaskId: "", actionTitle: "Блок календаря изменён", draft: structuredClone(sourceBlock) };
    }
    const block = calendarPendingEdit?.draft;
    if (!block) return;
    const field = calendarBlockField.dataset.calendarBlockField;
    const value = calendarBlockField.value;
    if (["title", "date", "endDate", "start", "end", "nextAction", "recurrence"].includes(field)) block[field] = value;
    if (field === "reminderMinutes") {
      block.reminderMinutes = value === "" ? null : Number(value);
      if (value !== "" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().then(scheduleCalendarReminders);
      }
    }
    if (!block.endDate || block.endDate < block.date) block.endDate = block.date;
    if (!block.title.trim()) block.title = "Новый блок";
    if (block.endDate === block.date && timeMinutes(block.end) <= timeMinutes(block.start)) {
      block.end = calendarTimeValue(new Date(new Date(`${block.date || todayIso}T${block.start}:00`).getTime() + 30 * 60 * 1000));
    }
    block.updatedAt = new Date().toISOString();
    return;
  }
  const taskField = event.target.closest("[data-task-field]");
  if (taskField) {
    const taskRoot = taskField.closest("[data-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskRoot?.dataset.taskId);
    updateTaskField(item, taskField.dataset.taskField, taskField.value);
    saveState();
    return;
  }
  const focusField = event.target.closest("[data-focus-field]");
  if (focusField) {
    if (focusField.dataset.focusField === "soundCategory") {
      state.focus.soundCategory = focusField.value;
      if (focusRuntime.isSoundPlaying) playFocusSound();
    }
    if (focusField.dataset.focusField === "volume") updateFocusVolume(focusField.value);
    saveState();
    return;
  }
  const noteField = event.target.closest("[data-note-field]");
  if (noteField) {
    const noteRoot = noteField.closest("[data-note-id]");
    const item = state.notes.find((candidate) => candidate.id === noteRoot?.dataset.noteId);
    if (!item) return;
    if (noteField.dataset.noteField === "title") item.title = noteField.value.trim() || "Без названия";
    if (noteField.dataset.noteField === "text") item.text = noteField.value;
    if (noteField.dataset.noteField === "folderId" && (!noteField.value || noteFolders().some((folder) => folder.id === noteField.value))) item.folderId = noteField.value;
    if (noteField.dataset.noteField === "tags") item.tags = noteField.value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
    item.updatedAt = new Date().toISOString();
    saveState();
  }
});

document.querySelector("#simpleApp")?.addEventListener("input", (event) => {
  const focusVolume = event.target.closest('[data-focus-field="volume"]');
  if (focusVolume) {
    updateFocusVolume(focusVolume.value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    queueCloudSave();
    return;
  }
  const taskTagsField = event.target.closest('input[data-task-field="tags"]');
  if (taskTagsField) {
    const taskRoot = taskTagsField.closest("[data-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskRoot?.dataset.taskId);
    if (!item) return;
    updateTaskField(item, "tags", taskTagsField.value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    queueCloudSave();
    return;
  }
  const noteField = event.target.closest('[data-note-field="title"], textarea[data-note-field="text"], input[data-note-field="tags"]');
  if (!noteField) return;
  const noteRoot = noteField.closest("[data-note-id]");
  const item = state.notes.find((candidate) => candidate.id === noteRoot?.dataset.noteId);
  if (!item) return;
  if (noteField.dataset.noteField === "title") item.title = noteField.value;
  if (noteField.dataset.noteField === "text") item.text = noteField.value;
  if (noteField.dataset.noteField === "tags") item.tags = noteField.value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
  item.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueCloudSave();
});

document.querySelector("#simpleApp")?.addEventListener("click", async (event) => {
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
      if (selectTask(taskRoot?.dataset.taskId, "focus")) saveState();
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

document.querySelector("#simpleAuthButton")?.addEventListener("click", beginGithubSignIn);
document.querySelector("#simpleSignOutButton")?.addEventListener("click", async () => {
  await signOut();
  cloudSync.session = null;
  cloudSync.hydratedUserId = "";
  cloudSync.status = "private";
  updateAuthUi();
});

window.addEventListener("offline", () => {
  networkOffline = true;
  renderSimpleApp();
});

window.addEventListener("online", () => {
  networkOffline = false;
  if (cloudSync.session) queueCloudSave({ immediate: true });
  renderSimpleApp();
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
  const inboxAction = event.target.closest("[data-inbox-action]");
  if (inboxAction) {
    const row = inboxAction.closest("[data-inbox-id]");
    const item = state.inboxItems.find((candidate) => candidate.id === row?.dataset.inboxId);
    handleInboxAction(inboxAction.dataset.inboxAction, item);
    saveState();
    return;
  }

  const inboxObject = event.target.closest('[data-action="select-inbox"]');
  if (!inboxObject) return;
  const row = inboxObject.closest("[data-inbox-id]");
  state.ui = state.ui || {};
  state.ui.selectedInboxId = row?.dataset.inboxId || null;
  state.ui.selectedTaskId = null;
  saveState();
});

document.body.addEventListener("click", (event) => {
  const clearCapture = event.target.closest('[data-action="clear-capture-result"]');
  if (clearCapture) {
    state.ui.lastCaptureId = null;
    saveState();
    return;
  }

  const openHabits = event.target.closest('[data-action="open-habits"]');
  if (openHabits) {
    state.settings.activeView = "habits";
    state.ui.selectedTaskId = null;
    state.focus.selectedTaskId = null;
    saveState();
    return;
  }

  const captureInboxAction = event.target.closest(".capture-result [data-inbox-action]");
  if (captureInboxAction) {
    const row = captureInboxAction.closest("[data-inbox-id]");
    const item = state.inboxItems.find((candidate) => candidate.id === row?.dataset.inboxId);
    if (captureInboxAction.dataset.inboxAction === "open-linked" && !getInboxLinkedObject(item)) {
      state.settings.activeView = "inbox";
      state.ui.selectedInboxId = item?.id || null;
    } else {
      handleInboxAction(captureInboxAction.dataset.inboxAction, item);
    }
    saveState();
    return;
  }

  const inboxAction = event.target.closest(".app-inspector [data-inbox-action]");
  if (inboxAction) {
    const row = inboxAction.closest("[data-inbox-id]");
    const item = state.inboxItems.find((candidate) => candidate.id === row?.dataset.inboxId);
    handleInboxAction(inboxAction.dataset.inboxAction, item);
    saveState();
    return;
  }

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

  const focusTaskButton = event.target.closest("[data-focus-task-id]");
  if (focusTaskButton) {
    selectTask(focusTaskButton.dataset.focusTaskId, "focus");
    saveState();
    return;
  }

  const boardAction = event.target.closest("[data-board-action]");
  if (boardAction) {
    const taskRoot = boardAction.closest("[data-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskRoot?.dataset.taskId);
    if (!item) return;
    if (boardAction.dataset.boardAction === "move" && taskStatuses.includes(boardAction.dataset.status)) {
      const nextStatus = boardAction.dataset.status;
      if (nextStatus === "done") item.previousStatus = item.status;
      if (item.status === "done" && nextStatus !== "done") item.previousStatus = nextStatus;
      item.status = nextStatus;
      item.updatedAt = new Date().toISOString();
      selectTask(item.id, "board");
      state.assistantActions.unshift(action("Задача перемещена", `${item.title} → ${statusLabel(item.status)}`, "confirmed"));
      saveState();
    }
    return;
  }

  const taskMenuOption = event.target.closest(".task-row-menu [data-task-option]");
  if (taskMenuOption) {
    const taskRoot = taskMenuOption.closest("[data-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskRoot?.dataset.taskId);
    updateTaskField(item, taskMenuOption.dataset.taskOption, taskMenuOption.dataset.value);
    if (item) state.assistantActions.unshift(action("Параметр задачи изменён", item.title, "confirmed"));
    saveState();
    return;
  }

  const taskMenuAction = event.target.closest(".task-row-menu [data-task-menu-action]");
  if (taskMenuAction) {
    const taskRoot = taskMenuAction.closest("[data-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskRoot?.dataset.taskId);
    if (taskMenuAction.dataset.taskMenuAction === "start-focus" && item) {
      selectTask(item.id, "focus");
      state.assistantActions.unshift(action("Фокус выбран", item.title, "confirmed"));
      saveState();
    }
    return;
  }

  if (event.target.closest(".task-row-menu")) {
    return;
  }

  const toggle = event.target.closest('[data-action="toggle"]');
  if (toggle) {
    const taskItem = toggle.closest("[data-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskItem.dataset.taskId);
    if (!item) return;
    stageUndo(item.status === "done" ? "Задача возвращена" : "Задача завершена");
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

document.body.addEventListener("change", (event) => {
  const taskMenuField = event.target.closest(".task-row-menu [data-task-field]");
  if (!taskMenuField) return;
  const taskRoot = taskMenuField.closest("[data-task-id]");
  const item = state.tasks.find((candidate) => candidate.id === taskRoot?.dataset.taskId);
  updateTaskField(item, taskMenuField.dataset.taskField, taskMenuField.value);
  if (item) state.assistantActions.unshift(action("Параметры задачи обновлены", item.title, "confirmed"));
  saveState();
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
  } else if (view === "focus") {
    const taskItem = getFocusTask();
    if (taskItem) selectTask(taskItem.id, "focus");
    startFocusTimer();
    state.assistantActions.unshift(action("Фокус запущен", taskItem?.title || "Режим фокуса", "confirmed"));
  } else if (view === "habits") {
    state.assistantActions.unshift(action("Ритуалы проверены", "Habit tracker обновлён без смешивания с задачами дня.", "confirmed"));
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

document.querySelector("#appInspectorContent").addEventListener("input", (event) => {
  const focusVolume = event.target.closest('[data-focus-field="volume"]');
  if (!focusVolume) return;
  updateFocusVolume(focusVolume.value);
});

document.querySelector("#appInspectorContent").addEventListener("keydown", (event) => {
  const taskField = event.target.closest("[data-task-field]");
  if (!taskField || event.key !== "Enter" || event.target.tagName === "TEXTAREA") return;
  event.preventDefault();
  taskField.blur();
});

document.querySelector("#appInspectorContent").addEventListener("click", async (event) => {
  const taskOption = event.target.closest("[data-task-option]");
  if (taskOption) {
    const taskRoot = taskOption.closest("[data-task-id]");
    const item = state.tasks.find((candidate) => candidate.id === taskRoot?.dataset.taskId);
    updateTaskField(item, taskOption.dataset.taskOption, taskOption.dataset.value);
    state.assistantActions.unshift(action("Задача обновлена", item?.title || "Параметры задачи изменены.", "confirmed"));
    saveState();
    return;
  }

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
    state.ui.selectedTaskId = null;
    state.settings.activeView = "inbox";
  }
  if (type === "note") {
    state.ui.selectedNoteId = id;
    state.settings.activeView = "notes";
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
    document.querySelector("#simpleSearch")?.focus();
  }
  if (event.key === "Escape") {
    if (simpleSyncPanelOpen || state.ui?.appearanceOpen) {
      simpleSyncPanelOpen = false;
      state.ui.appearanceOpen = false;
      renderSimpleApp();
      return;
    }
    if (state.ui?.taskMenuOpen) {
      state.ui.taskMenuOpen = false;
      state.ui.taskMenuPosition = null;
      renderSimpleApp();
      return;
    }
    simpleSearchQuery = "";
    const simpleSearch = document.querySelector("#simpleSearch");
    if (simpleSearch) simpleSearch.value = "";
    renderSimpleSearchResults("");
    state.ui.selectedTaskId = null;
    state.ui.selectedNoteId = null;
    renderSimpleApp();
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
    cloudSync.hydratedUserId = "";
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
