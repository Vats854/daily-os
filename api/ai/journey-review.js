const geminiModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const stages = ["call", "commitment", "preparation", "trial", "crisis", "result", "integration"];

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

function normalize(value, currentStage) {
  const parsed = value && typeof value === "object" ? value : {};
  return {
    diagnosis: compact(parsed.diagnosis, "Проекту нужна ручная проверка текущего состояния.").slice(0, 320),
    challenge: compact(parsed.challenge, "Какой результат подтвердит, что проект действительно движется?").slice(0, 320),
    recommendation: compact(parsed.recommendation, "Выбери один проверяемый следующий шаг.").slice(0, 320),
    evidence: (Array.isArray(parsed.evidence) ? parsed.evidence : []).map((item) => compact(item).slice(0, 180)).filter(Boolean).slice(0, 4),
    proposedStage: stages.includes(parsed.proposedStage) && parsed.proposedStage !== currentStage ? parsed.proposedStage : null,
    reason: compact(parsed.reason, "Недостаточно оснований для автоматического перехода.").slice(0, 280),
    confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "medium",
    provider: "gemini"
  };
}

function prompt(context) {
  const safe = {
    project: {
      title: compact(context.project?.title).slice(0, 120), area: compact(context.project?.area).slice(0, 40),
      journeyStage: stages.includes(context.project?.journeyStage) ? context.project.journeyStage : "call",
      stageReason: compact(context.project?.stageReason).slice(0, 300), nextTransition: compact(context.project?.nextTransition).slice(0, 300)
    },
    tasks: (Array.isArray(context.tasks) ? context.tasks : []).slice(0, 20).map((item) => ({ title: compact(item.title).slice(0, 120), status: compact(item.status).slice(0, 40), priority: compact(item.priority).slice(0, 20), dueDate: compact(item.dueDate).slice(0, 20) })),
    obstacles: (Array.isArray(context.obstacles) ? context.obstacles : []).slice(0, 10).map((item) => ({ type: compact(item.type).slice(0, 50), text: compact(item.text).slice(0, 180), severity: compact(item.severity).slice(0, 20) })),
    day: { energy: compact(context.day?.energy).slice(0, 30), todayTaskCount: Number(context.day?.todayTaskCount) || 0 }
  };
  return `Ты строгий, спокойный наставник проекта в личной Daily OS. Диагностируй движение, оспорь самообман и предложи один практичный шаг. Стадии: ${stages.join(", ")}. Не выдумывай факты и не предлагай переход без наблюдаемых оснований. Пиши на русском без пафоса.\nКонтекст:\n${JSON.stringify(safe, null, 2)}\nВерни JSON: diagnosis, challenge, recommendation, evidence (до 4 фактов), proposedStage (стадия или null), reason, confidence (low|medium|high). Только JSON.`;
}

function friendly(message) {
  if (/API key not valid|INVALID_ARGUMENT/i.test(message)) return "Gemini API key не принят Google.";
  if (/quota|rate limit|RESOURCE_EXHAUSTED/i.test(message)) return "AI-провайдер ограничил запрос по квоте. Попробуй позже.";
  return String(message).replace(/\s+/g, " ").slice(0, 260);
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ ok: false, error: "Method not allowed" });
  const context = request.body?.context || {};
  if (!context.project?.title) return response.status(400).json({ ok: false, error: "Missing project context" });
  if ((process.env.AI_PROVIDER || "gemini") !== "gemini") return response.status(400).json({ ok: false, error: "Unsupported AI provider" });
  if (!process.env.GEMINI_API_KEY) return response.status(503).json({ ok: false, error: "Gemini API key is not configured" });
  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt(context) }] }], generationConfig: { temperature: 0.15, responseMimeType: "application/json" } })
    });
    if (!geminiResponse.ok) throw new Error(`Gemini API error: ${geminiResponse.status} ${(await geminiResponse.text()).slice(0, 240)}`);
    const review = normalize(parseJson(extractText(await geminiResponse.json())), context.project.journeyStage);
    return response.status(200).json({ ok: true, review, provider: "gemini", model: geminiModel });
  } catch (error) {
    return response.status(502).json({ ok: false, error: friendly(error instanceof Error ? error.message : "Gemini API error") });
  }
}
