import test from "node:test";
import assert from "node:assert/strict";
import {
  completeTaskRecord,
  createBackupPayload,
  createAuditRecord,
  duplicateTaskRecord,
  createFocusSessionRecord,
  createInboxRecord,
  createTaskRecord,
  getTodayTaskSections,
  parseStateSnapshot,
  parseBackupPayload,
  normalizeTaskRecord,
  reorderTaskRecords,
  resolveInboxRecord,
  restoreTaskRecord,
  scheduleTaskRecord,
  setTaskPlanBucket,
  setTaskWorkflowStatus,
  serializeStateSnapshot,
  updateTaskRecord
} from "../public/task-state.js";

test("backup envelope survives export and import", () => {
  const exportedAt = "2026-07-13T18:00:00.000Z";
  const source = {
    tasks: [{ id: "task-backup", title: "Проверить backup" }],
    notes: [{ id: "note-backup", title: "Контекст", text: "Сохранён" }],
    habits: [{ id: "habit-backup", title: "План дня" }],
    projects: [{ id: "project-backup", title: "Daily OS" }]
  };
  const envelope = createBackupPayload(source, { exportedAt });
  const restored = parseBackupPayload(JSON.stringify(envelope));

  assert.equal(restored.format, "daily-os-backup");
  assert.equal(restored.version, 1);
  assert.equal(restored.exportedAt, exportedAt);
  assert.deepEqual(restored.state, source);
});

test("foreign and unsupported backups are rejected", () => {
  assert.throws(() => parseBackupPayload(JSON.stringify({ format: "other", version: 1, exportedAt: new Date().toISOString(), state: {} })), /Unknown Daily OS backup format/);
  assert.throws(() => parseBackupPayload(JSON.stringify({ format: "daily-os-backup", version: 2, exportedAt: new Date().toISOString(), state: {} })), /Unsupported Daily OS backup version/);
  assert.throws(() => parseBackupPayload("not json"), /Unexpected token|not valid JSON/);
});

test("task survives create, edit and reload", () => {
  const createdAt = "2026-07-13T10:00:00.000Z";
  const updatedAt = "2026-07-13T10:05:00.000Z";
  const task = createTaskRecord({
    id: "smoke-task",
    title: "Проверить сохранение",
    status: "today",
    area: "work",
    priority: "medium",
    estimate: 25,
    now: createdAt
  });

  updateTaskRecord(task, "title", "Проверить сохранение после reload", { now: updatedAt });
  updateTaskRecord(task, "priority", "high", { priorities: ["low", "medium", "high"], now: updatedAt });
  updateTaskRecord(task, "tags", "smoke, persistence", { now: updatedAt });
  updateTaskRecord(task, "dueDate", "2026-07-15", { now: updatedAt });
  updateTaskRecord(task, "dueTime", "09:30", { now: updatedAt });
  updateTaskRecord(task, "reminderMinutes", "15", { now: updatedAt });

  const restored = parseStateSnapshot(serializeStateSnapshot({ tasks: [task] }));
  assert.deepEqual(restored.tasks[0], {
    ...task,
    title: "Проверить сохранение после reload",
    priority: "high",
    tags: ["smoke", "persistence"],
    dueDate: "2026-07-15",
    dueTime: "09:30",
    reminderMinutes: 15,
    updatedAt
  });
});

test("task reminder is normalized and cleared with its schedule", () => {
  const task = createTaskRecord({ id: "task-reminder", title: "Задача с напоминанием", now: "2026-07-15T08:00:00.000Z" });

  updateTaskRecord(task, "dueDate", "2026-07-16");
  updateTaskRecord(task, "dueTime", "10:45");
  updateTaskRecord(task, "reminderMinutes", "30");
  assert.equal(task.dueTime, "10:45");
  assert.equal(task.reminderMinutes, 30);

  updateTaskRecord(task, "dueDate", "");
  assert.equal(task.dueDate, "");
  assert.equal(task.dueTime, "");
  assert.equal(task.reminderMinutes, null);

  const legacy = normalizeTaskRecord({ id: "legacy-reminder", title: "Старая задача" });
  assert.equal(legacy.dueTime, "");
  assert.equal(legacy.reminderMinutes, null);
});

test("Today contains overdue, timed and remaining tasks exactly once", () => {
  const overdue = createTaskRecord({ id: "overdue", title: "Просрочено", status: "backlog", priority: "high" });
  overdue.dueDate = "2026-07-15";
  const timed = createTaskRecord({ id: "timed", title: "По времени", status: "today", priority: "medium" });
  timed.dueDate = "2026-07-16";
  timed.dueTime = "11:30";
  const remaining = createTaskRecord({ id: "remaining", title: "Остальное", status: "today", priority: "low" });
  const future = createTaskRecord({ id: "future", title: "Позже", status: "this_week", priority: "high" });
  future.dueDate = "2026-07-17";

  const sections = getTodayTaskSections([remaining, future, timed, overdue], { today: "2026-07-16" });
  assert.deepEqual(sections.overdue.map((item) => item.id), ["overdue"]);
  assert.deepEqual(sections.timed.map((item) => item.id), ["timed"]);
  assert.deepEqual(sections.remaining.map((item) => item.id), ["remaining"]);
  assert.equal([...sections.overdue, ...sections.timed, ...sections.remaining].length, 3);
});

test("invalid persisted snapshots are rejected", () => {
  assert.throws(() => parseStateSnapshot("[]"), /Invalid Daily OS state snapshot/);
});

test("completion restores the previous status", () => {
  const task = createTaskRecord({ id: "task-restore", title: "Вернуть в неделю", status: "this_week", now: "2026-07-14T08:00:00.000Z" });
  completeTaskRecord(task, { now: "2026-07-14T09:00:00.000Z" });
  restoreTaskRecord(task, { now: "2026-07-14T09:05:00.000Z" });

  assert.equal(task.status, "this_week");
  assert.equal(task.previousStatus, "this_week");
  assert.equal(task.planBucket, "this_week");
  assert.equal(task.workflowStatus, "todo");
  assert.equal(task.updatedAt, "2026-07-14T09:05:00.000Z");
});

test("planning horizon and workflow stage change independently", () => {
  const task = createTaskRecord({ id: "task-two-axis", title: "Проверить две оси", status: "backlog", now: "2026-07-15T08:00:00.000Z" });

  setTaskWorkflowStatus(task, "in_progress", { now: "2026-07-15T08:05:00.000Z" });
  assert.equal(task.planBucket, "backlog");
  assert.equal(task.workflowStatus, "in_progress");

  setTaskPlanBucket(task, "today", { now: "2026-07-15T08:10:00.000Z" });
  assert.equal(task.planBucket, "today");
  assert.equal(task.workflowStatus, "in_progress");
  assert.equal(task.status, "today");
});

test("legacy completed task migrates without losing its planning bucket", () => {
  const legacy = { id: "legacy-done", title: "Старая задача", status: "done", previousStatus: "this_week" };
  normalizeTaskRecord(legacy);

  assert.equal(legacy.planBucket, "this_week");
  assert.equal(legacy.workflowStatus, "done");
  restoreTaskRecord(legacy, { now: "2026-07-15T09:00:00.000Z" });
  assert.equal(legacy.planBucket, "this_week");
  assert.equal(legacy.workflowStatus, "todo");
  assert.equal(legacy.status, "this_week");
});

test("duplicate is independent and is not pinned automatically", () => {
  const task = createTaskRecord({ id: "task-source", title: "Исходная задача", status: "today", now: "2026-07-14T08:00:00.000Z" });
  task.pinned = true;
  task.tags = ["core"];
  task.subtasks = [{ id: "subtask-source", title: "Шаг", done: true }];

  const duplicate = duplicateTaskRecord(task, {
    id: "task-copy",
    now: "2026-07-14T10:00:00.000Z",
    subtaskIdFactory: () => "subtask-copy"
  });

  assert.equal(duplicate.id, "task-copy");
  assert.equal(duplicate.title, "Копия — Исходная задача");
  assert.equal(duplicate.pinned, false);
  assert.deepEqual(duplicate.tags, ["core"]);
  assert.equal(duplicate.subtasks[0].id, "subtask-copy");
  assert.notEqual(duplicate.subtasks[0], task.subtasks[0]);
});

test("manual task order survives serialization without changing task meaning", () => {
  const first = createTaskRecord({ id: "order-a", title: "Первая", status: "today", area: "work", position: 0 });
  const second = createTaskRecord({ id: "order-b", title: "Вторая", status: "today", area: "work", position: 1000 });
  const before = structuredClone([first, second]);

  reorderTaskRecords([first, second], [second.id, first.id]);
  const restored = parseStateSnapshot(serializeStateSnapshot({ tasks: [first, second] })).tasks;

  assert.equal(restored.find((item) => item.id === second.id).position, 0);
  assert.equal(restored.find((item) => item.id === first.id).position, 1000);
  for (const item of restored) {
    const original = before.find((candidate) => candidate.id === item.id);
    assert.equal(item.planBucket, original.planBucket);
    assert.equal(item.workflowStatus, original.workflowStatus);
    assert.equal(item.area, original.area);
    assert.equal(item.dueDate, original.dueDate);
  }
});

test("new tasks stay unpositioned until the app places them", () => {
  const task = createTaskRecord({ id: "order-new", title: "Новая задача" });
  assert.equal(task.position, null);
  normalizeTaskRecord(task);
  assert.equal(task.position, null);
});

test("core daily workflow survives serialization and reload", () => {
  const capturedAt = "2026-07-13T08:00:00.000Z";
  const focusedAt = "2026-07-13T09:00:00.000Z";
  const completedAt = "2026-07-13T09:25:00.000Z";
  const inboxItem = createInboxRecord({ id: "inbox-1", text: "Подготовить план недели", now: capturedAt });
  const task = createTaskRecord({ id: "task-1", title: inboxItem.text, status: "inbox", now: capturedAt });

  resolveInboxRecord(inboxItem, {
    kind: "task",
    linkedId: task.id,
    reason: "Запись содержит конкретное действие.",
    now: capturedAt
  });
  updateTaskRecord(task, "priority", "high", { priorities: ["low", "medium", "high"], now: capturedAt });
  const block = scheduleTaskRecord(task, {
    blockId: "block-1",
    date: "2026-07-13",
    start: "09:00",
    end: "09:25",
    now: focusedAt
  });
  const focusSession = createFocusSessionRecord({
    id: "focus-1",
    taskId: task.id,
    startedAt: focusedAt,
    endedAt: completedAt,
    soundCategory: "calm_focus"
  });
  completeTaskRecord(task, { now: completedAt });
  const audit = createAuditRecord({
    id: "audit-1",
    title: "Задача завершена",
    reason: "Завершена после фокус-сессии.",
    sourceType: "task",
    sourceId: task.id,
    now: completedAt
  });

  const restored = parseStateSnapshot(serializeStateSnapshot({
    inboxItems: [inboxItem],
    tasks: [task],
    calendarEvents: [block],
    focusSessions: [focusSession],
    assistantActions: [audit]
  }));

  assert.equal(restored.inboxItems[0].parsed.linkedId, "task-1");
  assert.equal(restored.tasks[0].status, "done");
  assert.equal(restored.tasks[0].previousStatus, "today");
  assert.equal(restored.tasks[0].planBucket, "today");
  assert.equal(restored.tasks[0].workflowStatus, "done");
  assert.equal(restored.calendarEvents[0].taskId, "task-1");
  assert.equal(restored.focusSessions[0].durationMinutes, 25);
  assert.equal(restored.assistantActions[0].sourceId, "task-1");
});
