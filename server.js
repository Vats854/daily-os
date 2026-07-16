import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
loadEnvFile(path.join(__dirname, ".env"));
const port = Number.parseInt(process.env.PORT || "4173", 10);
const aiProvider = process.env.AI_PROVIDER || "gemini";
const openaiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const maxTextLength = 24000;
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const appUrl = process.env.APP_URL || `http://127.0.0.1:${port}`;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  try {
    const raw = readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Ignore local env loading errors; explicit environment variables still work.
  }
}

function headersFor(ext) {
  const headers = {
    "content-type": contentTypes[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-store" : "no-store, must-revalidate"
  };

  if (ext === ".html") {
    headers["clear-site-data"] = '"cache"';
  }

  return headers;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function publicConfig() {
  return {
    ok: true,
    appUrl,
    supabase: {
      enabled: Boolean(supabaseUrl && supabaseAnonKey),
      url: supabaseUrl,
      anonKey: supabaseAnonKey
    },
    auth: {
      provider: "github"
    }
  };
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function clampText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, maxTextLength);
}

function wordSet(text) {
  const stop = new Set(["и", "в", "на", "для", "с", "по", "к", "от", "до", "ищем", "нужны", "нужен", "нужна", "опыт", "работал", "работала", "the", "and", "with", "of", "to", "a", "in"]);
  return new Set(
    clampText(text)
      .toLowerCase()
      .replace(/[\/.,;:()[\]{}|_-]+/g, " ")
      .match(/[a-zа-яё][a-zа-яё0-9+#]{1,}/gi)
      ?.flatMap((word) => {
        const normalized = word.endsWith("tests") ? "test" : word;
        return normalized.endsWith("s") && /^[a-z]+$/i.test(normalized)
          ? [normalized, normalized.slice(0, -1)]
          : [normalized];
      })
      .filter((word) => !stop.has(word) && word.length > 1) || []
  );
}

function keywordOverlap(cvText, jobText) {
  const cv = wordSet(cvText);
  const job = [...wordSet(jobText)].slice(0, 120);
  const matched = job.filter((word) => cv.has(word));
  return {
    score: job.length ? Math.round((matched.length / job.length) * 100) : 0,
    matched: matched.slice(0, 16),
    missing: job.filter((word) => !cv.has(word)).slice(0, 16)
  };
}

function statusForScore(score) {
  if (score >= 76) return "success";
  if (score >= 42) return "warning";
  return "error";
}

function compactPhrase(value, fallback = "") {
  return String(value || fallback)
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function pickSentences(text, patterns, limit = 2, options = {}) {
  const sentences = clampText(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => compactPhrase(sentence))
    .filter(Boolean);
  const matches = sentences.filter((sentence) => patterns.some((pattern) => pattern.test(sentence)));
  const source = matches.length || options.fallback !== false ? (matches.length ? matches : sentences) : [];
  return source.slice(0, limit);
}

function keywordList(words, fallback) {
  return words.length ? words.join(", ") : fallback;
}

function uniqueList(items) {
  const seen = new Set();
  return items.filter((item) => {
    const normalized = compactPhrase(item).toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function careerSkillPhrases(cvText, jobText) {
  const text = `${cvText}\n${jobText}`.toLowerCase();
  const skills = [];

  const phraseRules = [
    { label: "операционная эффективность", patterns: [/операционн/i, /эффективност/i] },
    { label: "финансовая эффективность", patterns: [/финансов/i, /p&l|pl\b|юнит-эконом/i, /бюджет/i] },
    { label: "административная эффективность", patterns: [/административ/i] },
    { label: "исследования и аналитика", patterns: [/исследован/i, /аналитик/i, /анализ/i] },
    { label: "управление командой", patterns: [/команд/i, /сотрудник/i, /управлен/i, /руковод/i] },
    { label: "клиентский сервис", patterns: [/клиентск/i, /сервис/i, /поддержк/i, /\bcx\b/i] },
    { label: "метрики сервиса и качества", patterns: [/\bsla\b/i, /\bcsat\b/i, /\bfcr\b/i, /\bnps\b/i, /метрик/i, /\bkpi\b/i] },
    { label: "оптимизация процессов", patterns: [/процесс/i, /оптимизац/i, /улучшени/i] },
    { label: "кросс-функциональное взаимодействие", patterns: [/кросс/i, /взаимодейств/i, /смежн/i] },
    { label: "управление изменениями", patterns: [/изменени/i, /трансформац/i, /внедрен/i] },
    { label: "бюджетирование", patterns: [/бюджет/i, /млн/i, /финанс/i] },
    { label: "ИИ и автоматизация", patterns: [/\bai\b/i, /ии\b/i, /genai/i, /gpt/i, /автоматизац/i, /ботизац/i] },
    { label: "SQL и работа с данными", patterns: [/\bsql\b/i, /данн/i, /отчет/i, /дашборд/i] },
    { label: "CRM и retention", patterns: [/\bcrm\b/i, /retention/i, /воронк/i, /коммуникац/i] }
  ];

  for (const rule of phraseRules) {
    if (hasAny(text, rule.patterns)) skills.push(rule.label);
  }

  return uniqueList(skills).slice(0, 10);
}

function careerTitle(cvText, jobText, skills) {
  const source = `${jobText}\n${cvText}`;
  const roleMatch = source.match(/(?:руководител[ья]|менеджер|директор|lead|head)[^.\n,;:]{0,80}/i);
  if (roleMatch) return normalizeRoleTitle(roleMatch[0]);

  if (hasAny(source, [/клиентск/i, /сервис/i, /поддержк/i]) && hasAny(source, [/операционн/i, /эффективност/i, /процесс/i])) {
    return "Руководитель операционной эффективности и клиентского сервиса";
  }

  if (skills.includes("управление командой")) return "Руководитель операционных и аналитических команд";
  return "Адаптированное резюме под вакансию";
}

function normalizeRoleTitle(value) {
  const replacements = [
    [/^руководителя\b/i, "Руководитель"],
    [/^руководитель\b/i, "Руководитель"],
    [/^менеджера\b/i, "Менеджер"],
    [/^менеджер\b/i, "Менеджер"],
    [/^директора\b/i, "Директор"],
    [/^директор\b/i, "Директор"],
    [/^head\b/i, "Head"],
    [/^lead\b/i, "Lead"]
  ];
  let title = compactPhrase(value).replace(/\s+$/g, "");
  for (const [pattern, replacement] of replacements) {
    title = title.replace(pattern, replacement);
  }
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function localTailoredProfile(cvText, overlap) {
  const matched = keywordList(overlap.matched.slice(0, 5), "релевантными задачами вакансии");
  const facts = pickSentences(cvText, [/управ/i, /процесс/i, /клиент/i, /crm/i, /retention/i, /аналит/i, /поддерж/i], 1)[0];
  if (facts) {
    return compactPhrase(`${facts} Фокус для этой роли: ${matched}, улучшение процессов, работа с метриками и кросс-функциональное взаимодействие.`);
  }
  return `Специалист с опытом в задачах, близких к вакансии: ${matched}, оптимизация процессов, аналитика результата и взаимодействие с командами.`;
}

function localTailoredAchievements(cvText, hasMetrics) {
  const metricFacts = pickSentences(cvText, [/\d+[%+x]?|млн|тыс|kpi|okr|конверс|retention|sla|csat|fcr|nps/i, /запустил|улучшил|оптимиз|снизил|увеличил|масштаб/i], 2);
  if (metricFacts.length) {
    return metricFacts
      .map((fact) => compactPhrase(`Запуск и развитие релевантных процессов: ${fact}`))
      .join(" ");
  }
  return hasMetrics
    ? "В первых пунктах опыта показать самые сильные результаты: масштаб зоны ответственности, метрики сервиса, скорость обработки, качество клиентского опыта и эффект от изменений."
    : "В первых пунктах опыта описать результат через действие и эффект: какие процессы улучшены, для какой команды или клиентского сегмента, что стало быстрее, точнее или стабильнее.";
}

function localTailoredSkills(cvText, overlap) {
  const matched = overlap.matched.slice(0, 8);
  const missing = overlap.missing.slice(0, 5);
  const sourceSkills = pickSentences(cvText, [/sql|crm|аналит|метрик|процесс|автомат|поддерж|project|product|excel|google/i], 1, { fallback: false })[0];
  const priority = matched.length ? matched : missing;
  const base = keywordList(priority, "аналитика, процессы, клиентский опыт, метрики и кросс-функциональные проекты");
  return compactPhrase(`${sourceSkills ? `${sourceSkills} ` : ""}Ключевые навыки: ${base}.`);
}

function localTailoredAdditional(cvText, jobText) {
  const wantsAi = wantsAutomationOrAi(jobText);
  const hasAi = wantsAutomationOrAi(cvText);
  if (wantsAi && hasAi) {
    return "Дополнительно: практический опыт применения ИИ и автоматизации в рабочих процессах, отчётности, анализе данных или обработке клиентских обращений.";
  }
  if (wantsAi) {
    return "Дополнительно можно указать опыт автоматизации рабочих процессов только там, где он подтверждается реальными задачами в резюме.";
  }
  return "Дополнительно: курсы, инструменты и сертификаты оставить только те, которые усиливают выбранную роль и подтверждают опыт из основных разделов.";
}

function localResumeRewrite(cvText, jobText, backgroundText = "") {
  const profileText = [backgroundText, cvText].filter(Boolean).join("\n");
  const overlap = keywordOverlap(profileText, jobText);
  const matchedTerms = overlap.matched.slice(0, 8);
  const skills = careerSkillPhrases(profileText, jobText);
  const title = careerTitle(profileText, jobText, skills);
  const summary = localTailoredProfile(profileText, overlap);
  const achievements = pickSentences(profileText, [/\d+[%+x]?|млн|тыс|kpi|okr|конверс|retention|sla|csat|fcr|nps/i, /запустил|улучшил|оптимиз|снизил|увеличил|масштаб|управ/i], 4);
  const bullets = achievements.length
    ? achievements.map((fact) => compactPhrase(fact))
    : [
      "Описать релевантный опыт через действие, контекст задачи и результат для бизнеса или команды.",
      "Поднять ближе к началу резюме проекты, которые подтверждают требования вакансии."
    ];
  const additional = [localTailoredAdditional(cvText, jobText).replace(/^Дополнительно:\s*/i, "")];
  const fullText = [
    title,
    "",
    "Профессиональное резюме",
    summary,
    "",
    "Ключевые навыки",
    (skills.length ? skills : matchedTerms.slice(0, 8)).join(", "),
    "",
    "Опыт",
    ...bullets.map((bullet) => `- ${bullet}`),
    "",
    "Дополнительно",
    ...additional.map((line) => `- ${line}`)
  ].join("\n");

  return {
    title,
    summary,
    skills: skills.length ? skills : matchedTerms.slice(0, 8),
    experience: [
      {
        role: "Релевантный опыт",
        company: "",
        bullets
      }
    ],
    additional,
    fullText
  };
}

function wantsAutomationOrAi(text) {
  return /\b(ai|genai|gpt|llm|chatgpt)\b|искусственн\w+\s+интеллект|нейросет|автоматизац|ботизац/i.test(text);
}

function fallbackCareerResult(kind, cvText, jobText, backgroundText = "") {
  const profileText = [backgroundText, cvText].filter(Boolean).join("\n");
  const overlap = keywordOverlap(profileText, jobText);
  const hasMetrics = /\d+[%+x]?|млн|тыс|kpi|okr|выруч|конверс|retention|latency|sla/i.test(profileText);
  const hasImpact = /достиг|снизил|увеличил|запустил|улучшил|оптимиз|сэконом|рост|результат/i.test(profileText);
  const hasStack = /(javascript|typescript|python|react|node|sql|postgres|docker|kubernetes|figma|analytics|crm|api|java|go|php|swift|kotlin)/i.test(profileText);

  if (kind === "cover-letter") {
    return {
      kind,
      provider: "local",
      title: "Сопроводительное письмо",
      coverLetter: `Здравствуйте. Меня заинтересовала эта вакансия: по описанию в ней важны задачи, близкие к моему опыту, а также стек и контекст, которые я могу быстро сопоставить со своими проектами.\n\nВ резюме у меня уже есть релевантная база: ${overlap.matched.slice(0, 5).join(", ") || "практический опыт, навыки и проектная работа"}. Отдельно готов обсудить, как мой опыт можно применить к вашим задачам, и где потребуется быстро добрать контекст.\n\nБуду рад коротко созвониться и понять, какие результаты вы ждёте от человека на этой позиции в первые месяцы.`,
      summary: "Локальный черновик письма готов. Для более точной персонализации добавь OpenAI API key."
    };
  }

  if (kind === "resume-tailor") {
    const matchedTerms = keywordList(overlap.matched.slice(0, 8), "релевантные требования вакансии");
    const missingTerms = keywordList(overlap.missing.slice(0, 8), "часть ключевых требований вакансии");
    const tailoredProfile = localTailoredProfile(profileText, overlap);
    const tailoredAchievements = localTailoredAchievements(profileText, hasMetrics);
    const tailoredSkills = localTailoredSkills(profileText, overlap);
    const tailoredAdditional = localTailoredAdditional(profileText, jobText);
    const jobWantsAutomation = wantsAutomationOrAi(jobText);
    return {
      kind,
      provider: "local",
      summary: "Резюме можно адаптировать под вакансию точнее: ниже уже даны готовые формулировки для вставки. Локальный режим использует только факты из резюме и ключевые слова вакансии, поэтому спорные детали оставлены как зоны ручной проверки.",
      ats_keywords: overlap.matched.slice(0, 12),
      used_facts: pickSentences(profileText, [/\d+|команд|бюджет|клиент|процесс|метрик|автомат/i], 5),
      clarifying_questions: overlap.missing.slice(0, 5).map((word) => `Есть ли подтверждённый опыт по требованию "${word}"?`),
      suggestions: [
        {
          section: "Заголовок и профессиональное резюме",
          status: "warning",
          headline: "Заголовок должен точнее отражать требуемую позицию и ключевые слова вакансии",
          reason: `В первых строках стоит явно связать профиль с вакансией: ${matchedTerms}.`,
          before: "Общее описание опыта без явной привязки к вакансии.",
          after: tailoredProfile,
          vacancy_signal: `Вакансия ищет совпадение по темам: ${matchedTerms}.`,
          risk: "Проверь вручную: нельзя добавлять технологии или результаты, которых не было в реальном опыте.",
          confidence: "review"
        },
        {
          section: "Опыт и достижения",
          status: hasMetrics ? "success" : "warning",
          headline: hasMetrics ? "Метрики стоит поднять ближе к релевантному опыту" : "Не хватает измеримых результатов рядом с ключевыми задачами",
          reason: hasMetrics ? "Метрики есть, их стоит привязать к процессам, командам и клиентскому опыту." : "Вакансия, вероятно, будет оценивать масштаб и эффект, а не только список обязанностей.",
          before: hasMetrics ? "Метрики есть, но могут быть спрятаны в тексте." : "Формулировки выглядят как список обязанностей.",
          after: tailoredAchievements,
          vacancy_signal: "Для управленческих и процессных ролей рекрутер ищет масштаб ответственности и результат изменений.",
          risk: "Если точных цифр нет, используй качественный результат, но не придумывай проценты.",
          confidence: "medium"
        },
        {
          section: "Навыки",
          status: "warning",
          headline: "Навыки нужно переупорядочить под требования вакансии",
          reason: `Часть ключевых слов вакансии не читается в резюме достаточно явно: ${missingTerms}.`,
          before: "Список навыков может быть широким и не показывать приоритет под конкретную позицию.",
          after: tailoredSkills,
          vacancy_signal: "ATS и рекрутер сначала считывают первые строки блока навыков.",
          risk: "Оставь только те навыки, которые подтверждаются опытом ниже.",
          confidence: "review"
        },
        {
          section: "Дополнительная информация",
          status: "warning",
          headline: jobWantsAutomation ? "Можно добавить релевантный контекст про ИИ и автоматизацию" : "Дополнительную информацию стоит оставить только релевантной вакансии",
          reason: jobWantsAutomation ? "Если вакансия упоминает AI/автоматизацию, это лучше показать через реальные процессы, а не как абстрактный интерес." : "Дополнительные курсы и инструменты должны усиливать выбранную роль, а не распылять фокус резюме.",
          before: "Курсы и дополнительные навыки перечислены без связи с рабочими задачами.",
          after: tailoredAdditional,
          vacancy_signal: jobWantsAutomation ? "Работодатель ищет практическое применение инструментов, а не просто знание терминов." : `Вакансия сильнее реагирует на профильные сигналы: ${matchedTerms}.`,
          risk: jobWantsAutomation ? "Не добавляй GenAI/ботизацию, если в реальном опыте этого не было." : "Не добавляй нерелевантные курсы и технологии только ради объема.",
          confidence: "review"
        }
      ]
    };
  }

  if (kind === "resume-rewrite") {
    const resume = localResumeRewrite(cvText, jobText, backgroundText);
    return {
      kind,
      provider: "local",
      summary: "Собрана цельная версия резюме под вакансию. Локальный режим сохраняет только видимые факты из исходного текста и помечает спорные места для проверки.",
      resume,
      fullText: resume.fullText,
      ats_keywords: resume.skills || overlap.matched.slice(0, 12),
      used_facts: pickSentences(profileText, [/\d+|команд|бюджет|клиент|процесс|метрик|автомат/i], 6),
      clarifying_questions: overlap.missing.slice(0, 5).map((word) => `Можно ли подтвердить требование "${word}" реальным примером?`),
      risks: [
        "Проверь, что все ключевые слова действительно подтверждаются опытом.",
        "Не отправляй эту версию без ручной проверки должностей, дат, компаний и метрик.",
        "Для более сильной редакторской версии подключи OpenAI API key."
      ]
    };
  }

  if (kind === "resume-match") {
    const score = Math.max(18, Math.min(92, Math.round(overlap.score * 0.7 + (hasStack ? 12 : 0) + (hasImpact ? 10 : 0))));
    return {
      kind,
      provider: "local",
      match_percentage: score,
      summary: `Совпадение выглядит ${score >= 70 ? "сильным" : score >= 45 ? "частичным" : "слабым"}: пересекаются ${overlap.matched.slice(0, 8).join(", ") || "неявные общие формулировки"}.`,
      dimensions: [
        { title: "Ключевые навыки", score: overlap.score, status: statusForScore(overlap.score), comment: "Оценка по пересечению терминов резюме и вакансии.", current_issue: overlap.missing.length ? `Не видно: ${overlap.missing.slice(0, 8).join(", ")}.` : "", recommendation: "Подними релевантные навыки ближе к началу, если они реально есть в опыте." },
        { title: "Достижения", score: hasImpact ? 76 : 38, status: hasImpact ? "success" : "warning", comment: hasImpact ? "В тексте есть язык результата." : "Мало видимых результатов.", recommendation: "Добавь outcomes: что изменилось после твоей работы." },
        { title: "Стек и инструменты", score: hasStack ? 72 : 34, status: hasStack ? "warning" : "error", comment: hasStack ? "Стек частично читается." : "Стек не считывается уверенно.", recommendation: "Сгруппируй стек отдельной строкой и свяжи его с проектами." }
      ]
    };
  }

  return {
    kind,
    provider: "local",
    overall_score: Math.round((Number(hasMetrics) * 20 + Number(hasImpact) * 25 + Number(hasStack) * 20 + 35)),
    summary: "Локальная проверка нашла базовые сильные и слабые места. Для качества уровня карьерного редактора включи OpenAI API.",
    criteria: [
      { name: "Релевантность опыта", status: "warning", comment: "Без вакансии оценивается только структура и язык резюме.", recommendation: "Для точной оценки вставь текст вакансии и запусти мэтч." },
      { name: "Измеримые результаты", status: hasMetrics ? "success" : "warning", comment: hasMetrics ? "В резюме есть цифры или KPI." : "Не хватает цифр и масштаба.", current_issue: hasMetrics ? "" : "Формулировки могут выглядеть как обязанности.", recommendation: "Добавь метрики, масштаб, сроки или бизнес-эффект там, где это правда." },
      { name: "Язык достижений", status: hasImpact ? "success" : "warning", comment: hasImpact ? "Есть глаголы действия и результата." : "Мало сигналов личного вклада.", recommendation: "Пиши bullets как: сделал -> для чего -> что изменилось." },
      { name: "Стек и инструменты", status: hasStack ? "success" : "error", comment: hasStack ? "Технологии считываются." : "Технологии и инструменты не видны.", recommendation: "Добавь отдельный блок навыков и привяжи ключевые инструменты к опыту." }
    ]
  };
}

function schemaForCareerKind(kind) {
  if (kind === "cover-letter") {
    return {
      name: "cover_letter_result",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { title: { type: "string" }, summary: { type: "string" }, coverLetter: { type: "string" } },
        required: ["title", "summary", "coverLetter"]
      }
    };
  }

  if (kind === "resume-tailor") {
    return {
      name: "resume_tailor_result",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          summary: { type: "string" },
          ats_keywords: { type: "array", items: { type: "string" } },
          used_facts: { type: "array", items: { type: "string" } },
          clarifying_questions: { type: "array", items: { type: "string" } },
          suggestions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                section: { type: "string" },
                status: { type: "string", enum: ["success", "warning", "error"] },
                headline: { type: "string" },
                reason: { type: "string" },
                before: { type: "string" },
                after: { type: "string" },
                vacancy_signal: { type: "string" },
                risk: { type: "string" },
                confidence: { type: "string" }
              },
              required: ["section", "status", "headline", "reason", "before", "after", "vacancy_signal", "risk", "confidence"]
            }
          }
        },
        required: ["summary", "ats_keywords", "used_facts", "clarifying_questions", "suggestions"]
      }
    };
  }

  if (kind === "resume-rewrite") {
    return {
      name: "resume_rewrite_result",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          summary: { type: "string" },
          fullText: { type: "string" },
          risks: { type: "array", items: { type: "string" } },
          ats_keywords: { type: "array", items: { type: "string" } },
          used_facts: { type: "array", items: { type: "string" } },
          clarifying_questions: { type: "array", items: { type: "string" } },
          resume: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              skills: { type: "array", items: { type: "string" } },
              experience: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    role: { type: "string" },
                    company: { type: "string" },
                    bullets: { type: "array", items: { type: "string" } }
                  },
                  required: ["role", "company", "bullets"]
                }
              },
              additional: { type: "array", items: { type: "string" } }
            },
            required: ["title", "summary", "skills", "experience", "additional"]
          }
        },
        required: ["summary", "resume", "fullText", "risks", "ats_keywords", "used_facts", "clarifying_questions"]
      }
    };
  }

  if (kind === "resume-match") {
    const dimensionItem = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        score: { type: "number" },
        status: { type: "string", enum: ["success", "warning", "error"] },
        comment: { type: "string" },
        current_issue: { type: "string" },
        recommendation: { type: "string" }
      },
      required: ["title", "score", "status", "comment", "current_issue", "recommendation"]
    };
    return {
      name: "resume_match_result",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          match_percentage: { type: "number" },
          summary: { type: "string" },
          dimensions: { type: "array", items: dimensionItem }
        },
        required: ["match_percentage", "summary", "dimensions"]
      }
    };
  }

  const criterionItem = {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      status: { type: "string", enum: ["success", "warning", "error"] },
      comment: { type: "string" },
      current_issue: { type: "string" },
      recommendation: { type: "string" }
    },
    required: ["name", "status", "comment", "current_issue", "recommendation"]
  };

  return {
    name: "cv_check_result",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        overall_score: { type: "number" },
        summary: { type: "string" },
        criteria: { type: "array", items: criterionItem }
      },
      required: ["overall_score", "summary", "criteria"]
    }
  };
}

function promptForCareerKind(kind, cvText, jobText, backgroundText = "") {
  const shared = `Ты карьерный редактор для IT/Digital кандидатов. Пиши на русском, конкретно и без канцелярита.
Нельзя выдумывать компании, опыт, метрики, технологии, уровень английского или достижения.
Если факт не подтвержден резюме, помечай это как риск проверки.
Давай результат, который можно сразу показать кандидату перед откликом.
Персональная база фактов — доверенный источник: используй её для истории, навыков, цифр и ограничений.
ATS-задача: повышай совпадение с вакансией через подтверждённые ключевые слова, синонимы должности, домен, метрики и инструменты.
Если требование вакансии нельзя подтвердить базой фактов или резюме, не добавляй его в резюме, а вынеси в clarifying_questions или risks.`;

  const tasks = {
    "cv-check": "Проверь резюме по критериям: структура, релевантность, достижения, метрики, стек, ясность грейда, ATS-читаемость, риски для рекрутера. Верни 8-12 критериев.",
    "resume-match": "Сравни резюме с вакансией по измерениям: ключевые навыки, релевантный опыт, уровень/грейд, домен задач, стек, условия. Не ставь высокий score только из-за похожих слов.",
    "resume-tailor": `Предложи 6-10 точечных правок резюме под вакансию в стиле карьерного редактора.
Формат каждой правки: конкретная секция резюме, короткий заголовок проблемы, почему это важно для вакансии, что сейчас написано, готовая новая формулировка, какой сигнал вакансии она закрывает, риск проверки факта.
Пиши "after" как готовый фрагмент резюме, который можно вставить почти без редактуры.
Не давай общие советы вроде "добавьте больше деталей". Каждая правка должна менять конкретную формулировку.
Приоритеты: заголовок/summary, опыт по релевантной компании или роли, метрики, процессы, автоматизация, навыки, дополнительная информация.
Меняй только упаковку уже имеющихся фактов; если хочется добавить новый факт, обязательно вынеси это в risk.
Верни ats_keywords: ключи и фразы вакансии, которые стоит встроить в резюме.
Верни used_facts: какие факты из базы/резюме ты использовал.
Верни clarifying_questions: что надо уточнить у кандидата для усиления ATS и правдивости.`,
    "resume-rewrite": `Собери адаптированную версию резюме под вакансию целиком.
Верни структурированное резюме: title, summary, skills, experience, additional, а также fullText как цельный текст для копирования.
Нельзя добавлять новые компании, даты, роли, метрики, технологии или достижения.
Можно переставлять акценты, уплотнять формулировки, поднимать релевантные навыки и связывать опыт с языком вакансии.
Если факт нужен для вакансии, но его нет в резюме, не добавляй его в резюме; вынеси в risks.
Стиль: деловой, плотный, без воды, готово к вставке в резюме.
Верни ats_keywords, used_facts и clarifying_questions. ATS-ключи должны быть фразами, а не случайными одиночными словами.`,
    "cover-letter": "Сгенерируй живое короткое сопроводительное письмо 120-180 слов. Оно должно связывать опыт кандидата с вакансией, не повторять резюме и не звучать шаблонно."
  };

  return `${shared}\n\nЗадача: ${tasks[kind]}\n\nПерсональная база фактов:\n${backgroundText || "Не передана."}\n\nРезюме:\n${cvText}\n\nВакансия:\n${jobText || "Вакансия не передана."}`;
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const part of item.content || []) {
      if (part.type === "output_text" && part.text) chunks.push(part.text);
      if (part.type === "text" && part.text) chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

function extractGeminiText(data) {
  return (data.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n")
    .trim();
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

function friendlyProviderError(message) {
  if (/API key not valid|INVALID_ARGUMENT/i.test(message)) {
    return "Gemini API key не принят Google. Проверь, что это ключ из Google AI Studio для Gemini API, и что API включён для проекта.";
  }
  if (/quota|rate limit|RESOURCE_EXHAUSTED/i.test(message)) {
    return "AI-провайдер ограничил запрос по квоте или лимиту. Попробуй позже или переключи модель.";
  }
  return message.replace(/\s+/g, " ").slice(0, 260);
}

function schemaForDailyInbox() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      kind: {
        type: "string",
        enum: ["task", "note", "idea", "plan_change", "health_signal", "project", "daily_context"]
      },
      title: { type: "string" },
      area: {
        type: "string",
        enum: ["career", "work", "learning", "personal", "health", "admin"]
      },
      status: {
        type: "string",
        enum: ["inbox", "backlog", "this_week", "today", "done"]
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"]
      },
      needsReview: { type: "boolean" },
      reason: { type: "string" },
      suggestedAction: { type: "string" }
    },
    required: ["kind", "title", "area", "status", "priority", "needsReview", "reason", "suggestedAction"]
  };
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

async function handleDailyInboxRoute(request, response) {
  const body = await readJson(request);
  const text = clampText(body.text);
  if (!text) {
    sendJson(response, 400, { ok: false, error: "Missing inbox text" });
    return;
  }

  if (aiProvider !== "gemini") {
    sendJson(response, 400, { ok: false, error: `Unsupported AI_PROVIDER for Daily OS: ${aiProvider}` });
    return;
  }

  try {
    const parsed = await callGeminiDailyInbox(text, body.context || {});
    if (!parsed) {
      sendJson(response, 503, { ok: false, error: "Gemini API key is not configured" });
      return;
    }
    sendJson(response, 200, { ok: true, parsed, provider: "gemini", model: geminiModel });
  } catch (error) {
    sendJson(response, 502, {
      ok: false,
      error: friendlyProviderError(error instanceof Error ? error.message : "Gemini API error")
    });
  }
}

const journeyStageKeys = ["call", "commitment", "preparation", "trial", "crisis", "result", "integration"];

function normalizeJourneyReviewResult(value, currentStage) {
  const parsed = value && typeof value === "object" ? value : {};
  const proposedStage = journeyStageKeys.includes(parsed.proposedStage) && parsed.proposedStage !== currentStage
    ? parsed.proposedStage
    : null;
  return {
    diagnosis: compactPhrase(parsed.diagnosis, "Проекту нужна ручная проверка текущего состояния.").slice(0, 320),
    challenge: compactPhrase(parsed.challenge, "Какой результат подтвердит, что проект действительно движется?").slice(0, 320),
    recommendation: compactPhrase(parsed.recommendation, "Выбери один проверяемый следующий шаг.").slice(0, 320),
    evidence: (Array.isArray(parsed.evidence) ? parsed.evidence : [])
      .map((item) => compactPhrase(item).slice(0, 180))
      .filter(Boolean)
      .slice(0, 4),
    proposedStage,
    reason: compactPhrase(parsed.reason, "Недостаточно оснований для автоматического перехода.").slice(0, 280),
    confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "medium",
    provider: "gemini"
  };
}

function journeyReviewPrompt(context = {}) {
  const safeContext = {
    project: {
      title: compactPhrase(context.project?.title).slice(0, 120),
      area: compactPhrase(context.project?.area).slice(0, 40),
      journeyStage: journeyStageKeys.includes(context.project?.journeyStage) ? context.project.journeyStage : "call",
      stageReason: clampText(context.project?.stageReason).slice(0, 300),
      nextTransition: clampText(context.project?.nextTransition).slice(0, 300),
      status: compactPhrase(context.project?.status).slice(0, 40)
    },
    tasks: (Array.isArray(context.tasks) ? context.tasks : []).slice(0, 20).map((item) => ({
      title: compactPhrase(item.title).slice(0, 120),
      status: compactPhrase(item.status).slice(0, 40),
      priority: compactPhrase(item.priority).slice(0, 20),
      dueDate: compactPhrase(item.dueDate).slice(0, 20)
    })),
    obstacles: (Array.isArray(context.obstacles) ? context.obstacles : []).slice(0, 10).map((item) => ({
      type: compactPhrase(item.type).slice(0, 50),
      text: compactPhrase(item.text).slice(0, 180),
      severity: compactPhrase(item.severity).slice(0, 20)
    })),
    day: {
      energy: compactPhrase(context.day?.energy).slice(0, 30),
      todayTaskCount: Number.isFinite(context.day?.todayTaskCount) ? context.day.todayTaskCount : 0
    }
  };

  return `Ты строгий, спокойный наставник проекта в личной Daily OS. Твоя задача — диагностировать движение, оспорить самообман и предложить один практичный следующий шаг.

Стадии: call, commitment, preparation, trial, crisis, result, integration.
Не предлагай новую стадию ради мотивации. Переход допустим только если задачи, завершения или препятствия дают наблюдаемое основание. Не придумывай факты, деньги, сроки или психологические диагнозы. Пиши на русском, конкретно, без героического пафоса.

Контекст:
${JSON.stringify(safeContext, null, 2)}

Верни один JSON-объект:
- diagnosis: что реально происходит;
- challenge: неудобный, но полезный вопрос или возражение;
- recommendation: одно следующее действие;
- evidence: до 4 коротких фактов только из контекста;
- proposedStage: следующая подходящая стадия или null;
- reason: почему переход обоснован или не нужен;
- confidence: low, medium или high.

Верни только валидный JSON без markdown.`;
}

async function callGeminiJourneyReview(context = {}) {
  if (!process.env.GEMINI_API_KEY) return null;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: journeyReviewPrompt(context) }] }],
      generationConfig: { temperature: 0.15, responseMimeType: "application/json" }
    })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${message.slice(0, 240)}`);
  }
  const parsed = parseJsonModelOutput(extractGeminiText(await response.json()));
  return normalizeJourneyReviewResult(parsed, context.project?.journeyStage);
}

async function handleJourneyReviewRoute(request, response) {
  const body = await readJson(request);
  if (!body.context?.project?.title) {
    sendJson(response, 400, { ok: false, error: "Missing project context" });
    return;
  }
  if (aiProvider !== "gemini") {
    sendJson(response, 400, { ok: false, error: `Unsupported AI_PROVIDER for Daily OS: ${aiProvider}` });
    return;
  }
  try {
    const review = await callGeminiJourneyReview(body.context);
    if (!review) {
      sendJson(response, 503, { ok: false, error: "Gemini API key is not configured" });
      return;
    }
    sendJson(response, 200, { ok: true, review, provider: "gemini", model: geminiModel });
  } catch (error) {
    sendJson(response, 502, { ok: false, error: friendlyProviderError(error instanceof Error ? error.message : "Gemini API error") });
  }
}

async function callOpenAiCareer(kind, cvText, jobText, backgroundText = "") {
  if (!process.env.OPENAI_API_KEY) return null;
  const schema = schemaForCareerKind(kind);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: openaiModel,
      input: promptForCareerKind(kind, cvText, jobText, backgroundText),
      text: {
        format: {
          type: "json_schema",
          name: schema.name,
          schema: schema.schema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${message.slice(0, 240)}`);
  }

  const data = await response.json();
  const parsed = parseJsonModelOutput(extractOutputText(data));
  return { ...parsed, kind, provider: "openai" };
}

async function callGeminiCareer(kind, cvText, jobText, backgroundText = "") {
  if (!process.env.GEMINI_API_KEY) return null;
  const schema = schemaForCareerKind(kind);
  const prompt = `${promptForCareerKind(kind, cvText, jobText, backgroundText)}

Верни только валидный JSON без markdown. JSON должен соответствовать этой схеме:
${JSON.stringify(schema.schema)}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.35,
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
  return { ...parsed, kind, provider: "gemini" };
}

async function handleCareerRoute(request, response, kind) {
  if (!["cv-check", "resume-match", "resume-tailor", "resume-rewrite", "cover-letter"].includes(kind)) {
    sendJson(response, 404, { ok: false, error: "Unknown career action" });
    return;
  }

  const body = await readJson(request);
  const backgroundText = clampText(body.backgroundText);
  const cvText = clampText(body.cvText);
  const jobText = clampText(body.jobText);
  if ((!cvText && !backgroundText) || (kind !== "cv-check" && !jobText)) {
    sendJson(response, 400, { ok: false, error: "Missing required text" });
    return;
  }

  let warning = "";
  let result = null;
  try {
    result = await callGeminiCareer(kind, cvText, jobText, backgroundText);
  } catch (error) {
    warning = friendlyProviderError(error instanceof Error ? error.message : "Gemini API error");
  }

  if (!result) {
    try {
      result = await callOpenAiCareer(kind, cvText, jobText, backgroundText);
    } catch (error) {
      warning = warning || friendlyProviderError(error instanceof Error ? error.message : "OpenAI API error");
    }
  }

  result = result || fallbackCareerResult(kind, cvText, jobText, backgroundText);
  if (warning && result.provider === "local") {
    result.provider_warning = warning;
  }
  sendJson(response, 200, { ok: true, result });
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const safePath = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = safePath === "/" ? "/index.html" : safePath;
  let filePath = path.join(publicDir, requestedPath);
  if (existsSync(filePath) && path.extname(filePath) === "") {
    filePath = path.join(filePath, "index.html");
  }

  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    const fallback = path.join(publicDir, "index.html");
    const body = await readFile(fallback);
    response.writeHead(200, headersFor(".html"));
    response.end(body);
    return;
  }

  const ext = path.extname(filePath);
  const body = await readFile(filePath);
  response.writeHead(200, headersFor(ext));
  response.end(body);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.url?.startsWith("/api/health")) {
      sendJson(response, 200, {
        ok: true,
        app: "Second Brain Command Center",
        mode: "pwa-first-mvp",
        dailyAi: process.env.GEMINI_API_KEY ? "gemini" : "local",
        careerAi: process.env.GEMINI_API_KEY ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : "local",
        supabase: Boolean(supabaseUrl && supabaseAnonKey)
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/config") {
      sendJson(response, 200, publicConfig());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ai/inbox") {
      await handleDailyInboxRoute(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ai/journey-review") {
      await handleJourneyReviewRoute(request, response);
      return;
    }

    const careerMatch = url.pathname.match(/^\/api\/career\/([^/]+)$/);
    if (request.method === "POST" && careerMatch) {
      await handleCareerRoute(request, response, careerMatch[1]);
      return;
    }

    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Second Brain PWA running at http://127.0.0.1:${port}`);
});
