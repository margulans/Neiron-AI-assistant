#!/usr/bin/env bun
/**
 * Smart Digest — пайплайн глубокого анализа статей
 *
 * Принимает URL'ы, извлекает контент, определяет автора,
 * формирует структурированный JSON для агента.
 *
 * Использование:
 *   bun smart-digest.ts <url1> <url2> ...
 *   echo "url1\nurl2" | bun smart-digest.ts --stdin
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// --- Типы ---

interface ExtractedArticle {
  url: string;
  title: string;
  author: string;
  date: string | null;
  mainContent: string;
  keyQuotes: string[];
  category: Category;
  tags: string[];
  isStale: boolean;
  error: string | null;
}

interface DigestEntry {
  date: string;
  digest: string;
  title: string;
  url: string;
  source: string;
  category: string;
  keywords: string[];
}

interface SentDigests {
  version: string;
  description: string;
  maxAge: string;
  entries: DigestEntry[];
}

type Category =
  | "ИИ"
  | "Вайбкодинг"
  | "Робототехника"
  | "eVTOL"
  | "Технологии"
  | "Бизнес"
  | "Инвестиции"
  | "Прочее";

// --- Константы ---

const CATEGORY_EMOJI: Record<Category, string> = {
  "ИИ": "🤖",
  "Вайбкодинг": "💻",
  "Робототехника": "🦾",
  "eVTOL": "✈️",
  "Технологии": "⚡",
  "Бизнес": "💼",
  "Инвестиции": "💰",
  "Прочее": "📰",
};

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  "ИИ": [
    "ai", "artificial intelligence", "machine learning", "llm", "gpt",
    "neural", "deep learning", "transformer", "claude", "openai",
    "anthropic", "gemini", "нейросет", "искусственн", "модел",
  ],
  "Вайбкодинг": [
    "vibe coding", "no-code", "low-code", "cursor", "copilot",
    "code generation", "вайбкодинг", "кодогенерац",
  ],
  "Робототехника": [
    "robot", "robotics", "humanoid", "boston dynamics", "automation",
    "робот", "автоматизац",
  ],
  "eVTOL": [
    "evtol", "electric aircraft", "urban air", "flying taxi",
    "drone delivery", "joby", "lilium", "аэротакс",
  ],
  "Технологии": [
    "tech", "software", "hardware", "chip", "semiconductor", "quantum",
    "технолог", "инновац", "процессор",
  ],
  "Бизнес": [
    "startup", "business", "company", "ceo", "founder", "стартап",
    "бизнес", "компания", "предпринимат",
  ],
  "Инвестиции": [
    "invest", "funding", "vc", "series", "valuation", "ipo",
    "инвестиц", "финанс", "капитал", "crypto", "крипт",
  ],
  "Прочее": [],
};

const STALE_THRESHOLD_HOURS = 48;
const DATA_DIR = join(import.meta.dir, "data");
const SENT_DIGESTS_PATH = join(DATA_DIR, "sent-digests.json");

// --- Утилиты ---

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();
  let bestCategory: Category = "Прочее";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "Прочее") continue;
    const score = keywords.reduce(
      (acc, kw) => acc + (lower.includes(kw) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as Category;
    }
  }

  return bestCategory;
}

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw) && !found.includes(kw)) {
        found.push(kw);
      }
    }
  }

  return found.slice(0, 6);
}

/**
 * Извлекает цитаты — фрагменты в кавычках длиной от 20 символов
 */
function extractQuotes(text: string): string[] {
  const patterns = [
    /«([^»]{20,300})»/g,
    /"([^"]{20,300})"/g,
    /"([^"]{20,300})"/g,
    /„([^"]{20,300})"/g,
  ];

  const quotes: string[] = [];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const quote = match[1].trim();
      if (!quotes.includes(quote)) {
        quotes.push(quote);
      }
    }
  }

  return quotes.slice(0, 5);
}

/**
 * Проверяет, не просрочена ли статья (>48ч)
 */
function isStale(dateStr: string | null): boolean {
  if (!dateStr) return false; // неизвестна — пропускаем проверку
  const pubDate = new Date(dateStr);
  if (isNaN(pubDate.getTime())) return false;
  const hoursAgo = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
  return hoursAgo > STALE_THRESHOLD_HOURS;
}

/**
 * Проверяет дедупликацию по sent-digests.json
 */
function isDuplicate(url: string): boolean {
  if (!existsSync(SENT_DIGESTS_PATH)) return false;

  try {
    const data: SentDigests = JSON.parse(
      readFileSync(SENT_DIGESTS_PATH, "utf-8"),
    );
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return data.entries.some((entry) => {
      const entryDate = new Date(entry.date);
      return entry.url === url && entryDate >= sevenDaysAgo;
    });
  } catch {
    return false;
  }
}

// --- Извлечение контента ---

/**
 * Извлекает основной контент страницы через HTML-парсинг.
 * Убирает nav, footer, sidebar, ads — оставляет article/main.
 */
function extractMainContent(html: string): {
  title: string;
  author: string;
  date: string | null;
  content: string;
} {
  let title = "";
  let author = "";
  let date: string | null = null;

  // Заголовок: og:title → <title> → первый h1
  const ogTitle = html.match(
    /<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i,
  );
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const h1Tag = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  title = ogTitle?.[1] || titleTag?.[1] || h1Tag?.[1] || "Без заголовка";
  title = decodeHtmlEntities(title).trim();

  // Автор: meta author → schema.org → byline → article:author
  const metaAuthor = html.match(
    /<meta\s+(?:name|property)="(?:author|article:author)"\s+content="([^"]+)"/i,
  );
  const schemaAuthor = html.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i);
  const byline = html.match(
    /class="[^"]*(?:byline|author-name|post-author)[^"]*"[^>]*>([^<]+)/i,
  );
  author =
    metaAuthor?.[1] || schemaAuthor?.[1] || byline?.[1] || "Неизвестный автор";
  author = decodeHtmlEntities(author).trim();

  // Дата публикации
  const metaDate = html.match(
    /<meta\s+(?:property|name)="(?:article:published_time|datePublished|date)"\s+content="([^"]+)"/i,
  );
  const schemaDate = html.match(/"datePublished"\s*:\s*"([^"]+)"/i);
  const timeTag = html.match(/<time[^>]+datetime="([^"]+)"/i);
  date = metaDate?.[1] || schemaDate?.[1] || timeTag?.[1] || null;

  // Основной контент: берём article или main, убираем HTML-теги
  let content = "";
  const articleMatch = html.match(
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  );
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const contentDiv = html.match(
    /<div[^>]*class="[^"]*(?:post-content|article-body|entry-content|story-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  );

  const rawHtml = articleMatch?.[1] || mainMatch?.[1] || contentDiv?.[1] || "";

  // Очистка HTML → текст
  content = stripHtml(rawHtml);

  // Если контент слишком короткий — берём весь body
  if (content.length < 200) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      content = stripHtml(bodyMatch[1]);
    }
  }

  // Обрезаем до разумного размера
  if (content.length > 15000) {
    content = content.slice(0, 15000) + "…";
  }

  return { title, author, date, content };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

// --- Основной обработчик URL ---

async function processUrl(url: string): Promise<ExtractedArticle> {
  // Проверяем дедупликацию
  if (isDuplicate(url)) {
    return {
      url,
      title: "",
      author: "",
      date: null,
      mainContent: "",
      keyQuotes: [],
      category: "Прочее",
      tags: [],
      isStale: false,
      error: `DUPLICATE: уже отправлялся за последние 7 дней`,
    };
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        url,
        title: "",
        author: "",
        date: null,
        mainContent: "",
        keyQuotes: [],
        category: "Прочее",
        tags: [],
        isStale: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();
    const { title, author, date, content } = extractMainContent(html);
    const combinedText = `${title} ${content}`;
    const category = detectCategory(combinedText);
    const keyQuotes = extractQuotes(content);
    const tags = extractKeywords(combinedText);
    const stale = isStale(date);

    return {
      url,
      title,
      author,
      date,
      mainContent: content,
      keyQuotes,
      category,
      tags,
      isStale: stale,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      url,
      title: "",
      author: "",
      date: null,
      mainContent: "",
      keyQuotes: [],
      category: "Прочее",
      tags: [],
      isStale: false,
      error: `FETCH_ERROR: ${message}`,
    };
  }
}

// --- Форматирование для Telegram ---

function formatForTelegram(article: ExtractedArticle): string {
  const emoji = CATEGORY_EMOJI[article.category];
  const authorLabel = article.author || "Неизвестный автор";

  // Краткий пересказ из первых ~500 символов контента
  const preview = article.mainContent.slice(0, 500).replace(/\s+/g, " ");

  const quotePart =
    article.keyQuotes.length > 0
      ? `\n\n\"${article.keyQuotes[0]}\"`
      : "";

  return [
    `${emoji} **${authorLabel} — ${article.title}**`,
    article.category,
    "",
    preview + (article.mainContent.length > 500 ? "…" : ""),
    quotePart,
    "",
    `🔗 ${new URL(article.url).hostname} — ${article.url}`,
  ]
    .join("\n")
    .trim();
}

// --- Сохранение в sent-digests.json ---

function saveToSentDigests(articles: ExtractedArticle[]): void {
  let data: SentDigests;

  if (existsSync(SENT_DIGESTS_PATH)) {
    try {
      data = JSON.parse(readFileSync(SENT_DIGESTS_PATH, "utf-8"));
    } catch {
      data = {
        version: "1.0",
        description: "Трекинг отправленных новостей для дедупликации",
        maxAge: "7d",
        entries: [],
      };
    }
  } else {
    data = {
      version: "1.0",
      description: "Трекинг отправленных новостей для дедупликации",
      maxAge: "7d",
      entries: [],
    };
  }

  const today = new Date().toISOString().split("T")[0];

  // Удаляем записи старше 7 дней
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  data.entries = data.entries.filter(
    (e) => new Date(e.date) >= sevenDaysAgo,
  );

  // Добавляем новые
  for (const article of articles) {
    if (article.error) continue;
    data.entries.push({
      date: today,
      digest: "smart-digest",
      title: article.title,
      url: article.url,
      source: article.author,
      category: article.category,
      keywords: article.tags,
    });
  }

  writeFileSync(SENT_DIGESTS_PATH, JSON.stringify(data, null, 2));
}

// --- CLI ---

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let urls: string[] = [];

  if (args.includes("--stdin")) {
    // Читаем URL из stdin
    const input = readFileSync("/dev/stdin", "utf-8");
    urls = input
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));
  } else if (args.includes("--help") || args.length === 0) {
    console.log(`
Smart Digest — глубокий анализ статей по URL

Использование:
  bun smart-digest.ts <url1> <url2> ...
  echo "url1\\nurl2" | bun smart-digest.ts --stdin

Опции:
  --stdin       Читать URL из stdin (через \\n или запятые)
  --json        Вывести только JSON (без форматированных сообщений)
  --save        Сохранить результаты в sent-digests.json
  --help        Показать справку

Примеры:
  bun smart-digest.ts https://example.com/article1 https://example.com/article2
  bun smart-digest.ts --save https://techcrunch.com/2026/02/18/some-article
    `);
    process.exit(0);
  } else {
    urls = args.filter((a) => a.startsWith("http"));
  }

  if (urls.length === 0) {
    console.error("Ошибка: не указаны URL. Используйте --help для справки.");
    process.exit(1);
  }

  const jsonOnly = args.includes("--json");
  const shouldSave = args.includes("--save");

  console.error(`📥 Обработка ${urls.length} URL...\n`);

  const results: ExtractedArticle[] = [];

  for (const url of urls) {
    console.error(`  🔗 ${url}`);
    const article = await processUrl(url);

    if (article.error) {
      console.error(`    ❌ ${article.error}`);
    } else {
      console.error(`    ✅ "${article.title}" — ${article.author}`);
      if (article.isStale) {
        console.error(`    ⚠️  Статья старше 48 часов (${article.date})`);
      }
    }

    results.push(article);
  }

  const successful = results.filter((r) => !r.error);

  if (jsonOnly) {
    // Структурированный вывод для агента
    const output = {
      timestamp: new Date().toISOString(),
      totalUrls: urls.length,
      processed: successful.length,
      errors: results.filter((r) => r.error).length,
      articles: results.map((r) => ({
        url: r.url,
        title: r.title,
        author: r.author,
        date: r.date,
        category: r.category,
        tags: r.tags,
        keyQuotes: r.keyQuotes,
        contentPreview: r.mainContent.slice(0, 1000),
        isStale: r.isStale,
        error: r.error,
      })),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Форматированный вывод для отправки
    console.log("\n--- SMART DIGEST ---\n");

    for (const article of successful) {
      console.log(formatForTelegram(article));
      console.log("\n---\n");
    }
  }

  if (shouldSave) {
    saveToSentDigests(successful);
    console.error(`\n💾 Сохранено ${successful.length} записей в sent-digests.json`);
  }

  console.error(`\n📊 Итого: ${successful.length}/${urls.length} обработано`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
