export function createTaskRecord({
  title,
  status = "inbox",
  planBucket = "",
  workflowStatus = "",
  area = "work",
  priority = "medium",
  estimate = 30,
  projectId = null,
  id = crypto.randomUUID(),
  now = new Date().toISOString()
}) {
  const normalizedPlanBucket = ["inbox", "backlog", "this_week", "today"].includes(planBucket)
    ? planBucket
    : (["inbox", "backlog", "this_week", "today"].includes(status) ? status : "today");
  const normalizedWorkflowStatus = ["todo", "in_progress", "done"].includes(workflowStatus)
    ? workflowStatus
    : (status === "done" ? "done" : "todo");
  return {
    id,
    projectId,
    title,
    planBucket: normalizedPlanBucket,
    workflowStatus: normalizedWorkflowStatus,
    status: normalizedWorkflowStatus === "done" ? "done" : normalizedPlanBucket,
    area,
    priority,
    estimate,
    previousStatus: normalizedPlanBucket,
    previousWorkflowStatus: normalizedWorkflowStatus === "done" ? "todo" : normalizedWorkflowStatus,
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
    if (value === "done") setTaskWorkflowStatus(item, "done", { now });
    else setTaskPlanBucket(item, value, { now });
  }
  if (field === "planBucket") setTaskPlanBucket(item, value, { now });
  if (field === "workflowStatus") setTaskWorkflowStatus(item, value, { now });
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

export function normalizeTaskRecord(item) {
  if (!item) return null;
  const planBuckets = ["inbox", "backlog", "this_week", "today"];
  const workflowStatuses = ["todo", "in_progress", "done"];
  const legacyPlanBucket = planBuckets.includes(item.previousStatus) ? item.previousStatus : "today";
  item.planBucket = planBuckets.includes(item.planBucket)
    ? item.planBucket
    : (planBuckets.includes(item.status) ? item.status : legacyPlanBucket);
  item.workflowStatus = workflowStatuses.includes(item.workflowStatus)
    ? item.workflowStatus
    : (item.status === "done" ? "done" : "todo");
  item.previousWorkflowStatus = workflowStatuses.includes(item.previousWorkflowStatus) && item.previousWorkflowStatus !== "done"
    ? item.previousWorkflowStatus
    : "todo";
  syncLegacyTaskStatus(item);
  return item;
}

export function setTaskPlanBucket(item, planBucket, { now = new Date().toISOString() } = {}) {
  if (!item || !["inbox", "backlog", "this_week", "today"].includes(planBucket)) return null;
  item.planBucket = planBucket;
  item.previousStatus = planBucket;
  syncLegacyTaskStatus(item);
  item.updatedAt = now;
  return item;
}

export function setTaskWorkflowStatus(item, workflowStatus, { now = new Date().toISOString() } = {}) {
  if (!item || !["todo", "in_progress", "done"].includes(workflowStatus)) return null;
  if (item.workflowStatus !== "done" && workflowStatus === "done") {
    item.previousWorkflowStatus = item.workflowStatus || "todo";
  }
  item.workflowStatus = workflowStatus;
  syncLegacyTaskStatus(item);
  item.updatedAt = now;
  return item;
}

function syncLegacyTaskStatus(item) {
  item.previousStatus = item.planBucket || "today";
  item.status = item.workflowStatus === "done" ? "done" : item.previousStatus;
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
  setTaskPlanBucket(item, "today", { now });
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
  normalizeTaskRecord(item);
  return setTaskWorkflowStatus(item, "done", { now });
}

export function restoreTaskRecord(item, { now = new Date().toISOString() } = {}) {
  if (!item) return null;
  normalizeTaskRecord(item);
  return setTaskWorkflowStatus(item, item.previousWorkflowStatus || "todo", { now });
}

export function duplicateTaskRecord(item, {
  id = crypto.randomUUID(),
  now = new Date().toISOString(),
  subtaskIdFactory = () => crypto.randomUUID()
} = {}) {
  if (!item) return null;
  const duplicate = structuredClone(item);
  normalizeTaskRecord(duplicate);
  duplicate.id = id;
  duplicate.title = `Копия — ${item.title}`;
  duplicate.workflowStatus = duplicate.workflowStatus === "done" ? "todo" : duplicate.workflowStatus;
  duplicate.previousWorkflowStatus = "todo";
  syncLegacyTaskStatus(duplicate);
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
