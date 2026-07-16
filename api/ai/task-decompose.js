const geminiModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

function compact(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function extractText(data) {
  return (data?.candidates || []).flatMap((item) => item.content?.parts || []).map((part) => part.text || "").join("\n").trim();
}

function parseJson(text) {
  const raw = String(text || "").replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  try { return JSON.parse(raw); } catch {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
  throw new Error("Gemini returned invalid JSON");
}

function safeTask(context = {}) {
  const task = context.task || {};
  return {
    title: compact(task.title).slice(0, 160),
    description: compact(task.description).slice(0, 1200),
    estimateMinutes: Math.max(5, Math.min(480, Number(task.estimateMinutes) || 30)),
    dueDate: compact(task.dueDate).slice(0, 20),
    list: compact(task.list).slice(0, 80),
    project: compact(task.project).slice(0, 120),
    existingSubtasks: (Array.isArray(task.existingSubtasks) ? task.existingSubtasks : []).slice(0, 12).map((item) => compact(item).slice(0, 140)).filter(Boolean)
  };
}

function prompt(context) {
  return `Ты помогаешь декомпозировать одну задачу в личном task tracker. Реши, нужна ли декомпозиция. Если задача уже является одним конкретным действием, верни needed=false и не создавай искусственные шаги. Иначе предложи 3–7 исполнимых подзадач в правильном порядке. Каждый шаг должен начинаться с глагола, давать проверяемый результат, не повторять существующие подзадачи и обычно занимать 10–60 минут. Не меняй срок, приоритет, список и проект. Пиши по-русски, конкретно, без объяснительного текста.\n\nЗадача:\n${JSON.stringify(safeTask(context), null, 2)}\n\nВерни только JSON: {"needed": boolean, "reason": string, "steps": [{"title": string, "estimateMinutes": number}]}.`;
}

function normalize(value) {
  const parsed = value && typeof value === "object" ? value : {};
  const needed = parsed.needed !== false;
  return {
    needed,
    reason: compact(parsed.reason, needed ? "Проверь шаги перед добавлением." : "Задача уже достаточно конкретна.").slice(0, 260),
    steps: needed ? (Array.isArray(parsed.steps) ? parsed.steps : []).map((item) => ({
      title: compact(item?.title).slice(0, 160),
      estimateMinutes: Math.max(5, Math.min(120, Number(item?.estimateMinutes) || 25))
    })).filter((item) => item.title).slice(0, 7) : [],
    provider: "gemini"
  };
}

function friendly(message) {
  if (/API key not valid|INVALID_ARGUMENT/i.test(message)) return "Gemini API key не принят Google.";
  if (/quota|rate limit|RESOURCE_EXHAUSTED/i.test(message)) return "AI-провайдер ограничил запрос по квоте. Попробуй позже.";
  return compact(message).slice(0, 260);
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ ok: false, error: "Method not allowed" });
  const context = request.body || {};
  if (!context.task?.title) return response.status(400).json({ ok: false, error: "Missing task context" });
  if ((process.env.AI_PROVIDER || "gemini") !== "gemini") return response.status(400).json({ ok: false, error: "Unsupported AI provider" });
  if (!process.env.GEMINI_API_KEY) return response.status(503).json({ ok: false, error: "Gemini API key is not configured" });
  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt(context) }] }], generationConfig: { temperature: 0.15, responseMimeType: "application/json" } })
    });
    if (!geminiResponse.ok) throw new Error(`Gemini API error: ${geminiResponse.status} ${(await geminiResponse.text()).slice(0, 240)}`);
    return response.status(200).json({ ok: true, result: normalize(parseJson(extractText(await geminiResponse.json()))), provider: "gemini", model: geminiModel });
  } catch (error) {
    return response.status(502).json({ ok: false, error: friendly(error instanceof Error ? error.message : "Gemini API error") });
  }
}
