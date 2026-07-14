export function createTaskRecord({
  title,
  status = "inbox",
  area = "work",
  priority = "medium",
  estimate = 30,
  projectId = null,
  id = crypto.randomUUID(),
  now = new Date().toISOString()
}) {
  return {
    id,
    projectId,
    title,
    status,
    area,
    priority,
    estimate,
    previousStatus: status === "done" ? "today" : status,
    dueDate: "",
    tags: [],
    pinned: false,
    description: "",
    subtasks: [],
    needsReview: false,
    createdAt: now,
    updatedAt: now
  };
}

export function updateTaskRecord(item, field, value, options = {}) {
  if (!item) return null;
  const {
    statuses = [],
    areas = [],
    priorities = [],
    projects = [],
    routines = [],
    now = new Date().toISOString()
  } = options;

  if (field === "title") item.title = String(value || "").trim() || item.title;
  if (field === "description") item.description = String(value || "");
  if (field === "status" && statuses.includes(value)) {
    if (value !== "done") item.previousStatus = value;
    if (item.status !== "done" && value === "done") item.previousStatus = item.status;
    item.status = value;
  }
  if (field === "area" && areas.includes(value)) item.area = value;
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
    if (kind === "project" && projects.some((project) => project.id === id)) item.projectId = id;
    if (kind === "routine" && routines.some((routine) => routine.id === id)) item.routineId = id;
  }
  item.updatedAt = now;
  return item;
}

export function serializeStateSnapshot(value) {
  return JSON.stringify(value);
}

export function parseStateSnapshot(serialized) {
  const parsed = JSON.parse(serialized);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError("Invalid Daily OS state snapshot");
  return parsed;
}

export function createBackupPayload(state, {
  exportedAt = new Date().toISOString(),
  version = 1
} = {}) {
  const checkedState = parseStateSnapshot(serializeStateSnapshot(state));
  return {
    format: "daily-os-backup",
    version,
    exportedAt,
    state: checkedState
  };
}

export function parseBackupPayload(serialized) {
  const payload = JSON.parse(serialized);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("Invalid Daily OS backup");
  if (payload.format !== "daily-os-backup") throw new TypeError("Unknown Daily OS backup format");
  if (payload.version !== 1) throw new TypeError("Unsupported Daily OS backup version");
  if (!payload.exportedAt || Number.isNaN(new Date(payload.exportedAt).getTime())) throw new TypeError("Invalid Daily OS backup date");
  return {
    ...payload,
    state: parseStateSnapshot(JSON.stringify(payload.state))
  };
}

export function createInboxRecord({
  text,
  id = crypto.randomUUID(),
  now = new Date().toISOString()
}) {
  return {
    id,
    text: String(text || "").trim(),
    status: "raw",
    parsed: null,
    createdAt: now,
    updatedAt: now
  };
}

export function resolveInboxRecord(item, { kind, linkedId, reason = "", now = new Date().toISOString() }) {
  if (!item || !["task", "note"].includes(kind) || !linkedId) return null;
  item.status = "processed";
  item.parsed = { kind, linkedId, reason: String(reason || "") };
  item.updatedAt = now;
  return item;
}

export function scheduleTaskRecord(item, {
  blockId = crypto.randomUUID(),
  date,
  start,
  end,
  now = new Date().toISOString()
}) {
  if (!item || !date || !start || !end || start >= end) return null;
  item.status = "today";
  item.updatedAt = now;
  return {
    id: blockId,
    taskId: item.id,
    title: item.title,
    date,
    endDate: date,
    start,
    end,
    status: "confirmed",
    createdAt: now,
    updatedAt: now
  };
}

export function completeTaskRecord(item, { now = new Date().toISOString() } = {}) {
  if (!item) return null;
  if (item.status !== "done") item.previousStatus = item.status;
  item.status = "done";
  item.updatedAt = now;
  return item;
}

export function restoreTaskRecord(item, { now = new Date().toISOString() } = {}) {
  if (!item) return null;
  item.status = item.previousStatus || "today";
  item.updatedAt = now;
  return item;
}

export function duplicateTaskRecord(item, {
  id = crypto.randomUUID(),
  now = new Date().toISOString(),
  subtaskIdFactory = () => crypto.randomUUID()
} = {}) {
  if (!item) return null;
  const duplicate = structuredClone(item);
  duplicate.id = id;
  duplicate.title = `Копия — ${item.title}`;
  duplicate.status = item.status === "done" ? (item.previousStatus || "today") : item.status;
  duplicate.previousStatus = duplicate.status;
  duplicate.pinned = false;
  duplicate.createdAt = now;
  duplicate.updatedAt = now;
  duplicate.subtasks = (duplicate.subtasks || []).map((subtask) => ({ ...subtask, id: subtaskIdFactory() }));
  return duplicate;
}

export function createFocusSessionRecord({
  taskId,
  startedAt,
  endedAt,
  soundCategory = "deep_work",
  id = crypto.randomUUID()
}) {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (!taskId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return {
    id,
    taskId,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    durationMinutes: Math.max(1, Math.round((end - start) / 60000)),
    soundCategory
  };
}

export function createAuditRecord({
  title,
  reason,
  sourceType,
  sourceId,
  status = "confirmed",
  id = crypto.randomUUID(),
  now = new Date().toISOString()
}) {
  return { id, title, reason, sourceType, sourceId, status, createdAt: now };
}
