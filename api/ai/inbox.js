const maxTextLength = 24000;
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

function clampText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, maxTextLength);
}

function compactPhrase(value, fallback = "") {
  return String(value || fallback)
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function extractGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("\n")
    .trim() || "";
}

function extractBalancedJson(text) {
  const value = String(text || "");
  const start = value.search(/[\[{]/);
  if (start === -1) return "";

  const stack = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const open = stack.pop();
      if ((char === "}" && open !== "{") || (char === "]" && open !== "[")) return "";
      if (stack.length === 0) return value.slice(start, index + 1);
    }
  }

  return "";
}

function parseJsonModelOutput(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return JSON.parse(candidate);
  } catch (error) {
    const extracted = extractBalancedJson(candidate);
    if (extracted) return JSON.parse(extracted);
    throw error;
  }
}

function friendlyProviderError(message) {
  if (/API key not valid|INVALID_ARGUMENT/i.test(message)) {
    return "Gemini API key не принят Google. Проверь, что это ключ из Google AI Studio для Gemini API, и что API включён для проекта.";
  }
  if (/quota|rate limit|RESOURCE_EXHAUSTED/i.test(message)) {
    return "AI-провайдер ограничил запрос по квоте или лимиту. Попробуй позже или переключи модель.";
  }
  return message.replace(/\s+/g, " ").slice(0, 260);
}

function dailyInboxPrompt(text, context = {}) {
  const safeContext = {
    activeView: context.activeView || "today",
    dayStatus: context.dayStatus || "",
    dayFocus: clampText(context.dayFocus || "").slice(0, 240),
    todayTaskCount: Number.isFinite(context.todayTaskCount) ? context.todayTaskCount : 0,
    projects: Array.isArray(context.projects) ? context.projects.slice(0, 8) : []
  };

  return `Ты AI-оператор личной Daily OS / Second Brain.

Твоя задача: разобрать входящее сообщение пользователя и вернуть строго один JSON-объект.

Контекст системы:
${JSON.stringify(safeContext, null, 2)}

Правила:
- task: конкретное исполнимое действие.
- note: заметка, факт, обучение, наблюдение.
- idea: сырая идея без обязательства.
- plan_change: перенос, изменение плана дня/недели.
- health_signal: энергия, сон, тревога, спорт, боль, восстановление.
- project: новая крупная цель/направление, не мелкая задача.
- daily_context: общий контекст дня или review.
- status today ставь только если явно нужно сегодня или срочно.
- needsReview=true, если изменение рискованное, неясное, конфликтует с нагрузкой или похоже на новый проект.
- title должен быть коротким рабочим названием, не длиннее 90 символов.
- reason объясняет, почему так классифицировано.
- suggestedAction говорит, что системе сделать дальше.

Сообщение пользователя:
${clampText(text)}

Верни только валидный JSON без markdown.`;
}

function normalizeDailyInboxResult(value, fallbackTitle) {
  const allowedKinds = new Set(["task", "note", "idea", "plan_change", "health_signal", "project", "daily_context"]);
  const allowedAreas = new Set(["career", "work", "learning", "personal", "health", "admin"]);
  const allowedStatuses = new Set(["inbox", "backlog", "this_week", "today", "done"]);
  const allowedPriorities = new Set(["low", "medium", "high"]);
  const parsed = value && typeof value === "object" ? value : {};
  return {
    kind: allowedKinds.has(parsed.kind) ? parsed.kind : "note",
    title: compactPhrase(parsed.title, fallbackTitle).slice(0, 92),
    area: allowedAreas.has(parsed.area) ? parsed.area : "personal",
    status: allowedStatuses.has(parsed.status) ? parsed.status : "inbox",
    priority: allowedPriorities.has(parsed.priority) ? parsed.priority : "medium",
    needsReview: Boolean(parsed.needsReview),
    reason: compactPhrase(parsed.reason, "Классифицировано AI-оператором.").slice(0, 240),
    suggestedAction: compactPhrase(parsed.suggestedAction, "Сохранить в Daily OS.").slice(0, 240),
    provider: "gemini"
  };
}

async function callGeminiDailyInbox(text, context = {}) {
  if (!process.env.GEMINI_API_KEY) return null;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: dailyInboxPrompt(text, context) }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${message.slice(0, 240)}`);
  }

  const data = await response.json();
  const parsed = parseJsonModelOutput(extractGeminiText(data));
  const fallbackTitle = clampText(text).replace(/\s+/g, " ").slice(0, 92);
  return normalizeDailyInboxResult(parsed, fallbackTitle);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const text = clampText(request.body?.text);
  if (!text) {
    response.status(400).json({ ok: false, error: "Missing inbox text" });
    return;
  }

  if ((process.env.AI_PROVIDER || "gemini") !== "gemini") {
    response.status(400).json({ ok: false, error: `Unsupported AI_PROVIDER for Daily OS: ${process.env.AI_PROVIDER}` });
    return;
  }

  try {
    const parsed = await callGeminiDailyInbox(text, request.body?.context || {});
    if (!parsed) {
      response.status(503).json({ ok: false, error: "Gemini API key is not configured" });
      return;
    }
    response.status(200).json({ ok: true, parsed, provider: "gemini", model: geminiModel });
  } catch (error) {
    response.status(502).json({
      ok: false,
      error: friendlyProviderError(error instanceof Error ? error.message : "Gemini API error")
    });
  }
}
