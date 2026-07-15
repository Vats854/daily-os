import { readFile } from "node:fs/promises";

const [html, app, styles, worker, supabaseClient] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/app.js", import.meta.url), "utf8"),
  readFile(new URL("../public/task-core.css", import.meta.url), "utf8"),
  readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  readFile(new URL("../public/supabase-client.js", import.meta.url), "utf8")
]);

const unreferencedTopLevelFunctions = [...app.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)]
  .map((match) => match[1])
  .filter((name) => (app.match(new RegExp(`\\b${name}\\b`, "g")) || []).length === 1);

const assetVersions = [...html.matchAll(/(?:styles\.css|task-core\.css|app\.js)\?v=(\d+)/g)].map((match) => match[1]);
const workerVersion = worker.match(/CACHE_NAME\s*=\s*"[^"]+-v(\d+)"/)?.[1];

const contracts = [
  ["all primary modules exist", ["capture", "tasks", "calendar", "habits", "focus", "notes", "projects", "log"].every((module) => html.includes(`data-simple-module="${module}"`))],
  ["production shell is the only shell", html.includes('id="simpleApp"') && !html.includes('legacyDashboardArchive') && !html.includes('class="app-shell')],
  ["legacy dashboard markup is absent", !["todayView", "weekView", "projectsView", "boardView", "appInspectorContent"].some((id) => html.includes(`id="${id}"`))],
  ["render has one production path", /function render\(\) \{\s*renderSimpleApp\(\);\s*\}/m.test(app)],
  ["no unreferenced top-level functions remain", unreferencedTopLevelFunctions.length === 0],
  ["task view memory is normalized", app.includes("nextState.ui.lastTaskView") && app.includes("state.ui.lastTaskView = state.settings.activeView")],
  ["focus controls are wired to the active shell", app.includes('document.querySelector("#simpleApp")?.addEventListener("click", async (event) =>') && app.includes('event.target.closest("[data-sound-action]")')],
  ["live focus volume is wired", app.includes('event.target.closest(\'[data-focus-field="volume"]\')') && app.includes("focusRuntime.gain.gain.value")],
  ["habit schedule editor is wired", app.includes("data-habit-weekday") && app.includes("selectedHabitId") && styles.includes(".simple-habit-weekday-field")],
  ["cloud saves are serialized", app.includes("cloudSync.inFlight") && app.includes("cloudSync.pendingSnapshot") && /if \(cloudSync\.inFlight \|\| !cloudSync\.pendingSnapshot/.test(app)],
  ["rapid edits are coalesced", app.includes("cloudSync.pendingSnapshot = structuredClone(state)") && app.includes("window.setTimeout(flushCloudSave, 0)")],
  ["pending cloud edits survive reload", app.includes("PENDING_CLOUD_SAVE_KEY") && app.includes("PRE_HYDRATE_BACKUP_KEY")],
  ["unresolved conflicts block cloud writes", /if \(cloudSync\.status === "conflict"\) return;/.test(app) && app.includes("cloudSync.pendingSnapshot = null")],
  ["unsafe legacy upsert is disabled", supabaseClient.includes("SYNC_UPGRADE_REQUIRED") && !supabaseClient.includes('.from("daily_os_states").upsert')],
  ["sync diagnostics are accessible", html.includes('id="simpleSyncToggle"') && html.includes('id="simpleSyncPanel"') && app.includes("renderSimpleSyncPanel")],
  ["sync retry uses the safe queue", app.includes('data-simple-sync-action="retry"') && app.includes("queueCloudSave({ immediate: true })")],
  ["asset versions match", assetVersions.length === 3 && assetVersions.every((version) => version === workerVersion)],
  ["open detail grid overrides authenticated shell", styles.includes('body[data-auth] .simple-app.detail-open')],
  ["notes grid overrides authenticated shell", styles.includes('body[data-auth] .simple-app[data-module="notes"]')],
  ["Inbox composer does not default to the first custom list", !app.includes('meta.area || state.ui?.simpleArea || taskLists()[0]?.id')],
  ["Inbox requires confirmation before object creation", app.includes('data-inbox-action="accept-suggestion"') && app.includes('status: parsed.needsReview ? "needs_review" : "open"') && app.includes('if (actionName === "accept-suggestion")')],
  ["task summary properties are independent controls", app.includes('data-simple-action="quick-tags"') && styles.includes(".simple-task-summary button:hover")],
  ["task duplication uses the tested state contract", app.includes("duplicateTaskRecord(item)") && app.includes("restoreTaskRecord(item)")],
  ["backup input exists", html.includes('id="simpleBackupInput"') && html.includes('accept="application/json,.json"')],
  ["backup actions are wired", app.includes("createBackupPayload") && app.includes("parseBackupPayload") && app.includes('data-simple-backup-action="confirm"')],
  ["auth is non-blocking", !styles.includes('body[data-auth="signed-out"] .auth-gate') && styles.includes('body[data-auth="signed-out"] .simple-app')],
  ["fresh state is clean", app.includes("function createCleanInitialState") && app.includes("initial.tasks = []") && app.includes("initial.projects = []")],
  ["undo is available", app.includes("function stageUndo") && app.includes("function restoreUndo") && app.includes("data-simple-undo")],
  ["offline work is explicit", app.includes('window.addEventListener("offline"') && app.includes("Работа продолжается на этом устройстве")]
];

const failed = contracts.filter(([, valid]) => !valid);
contracts.forEach(([name, valid]) => console.log(`${valid ? "ok" : "fail"} - ${name}`));
if (failed.length) process.exitCode = 1;
