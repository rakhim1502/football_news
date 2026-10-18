import { GoogleGenAI, Type } from "@google/genai";
import { fetchRecentNews, type NewsItem } from "./news.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const TOP_N = 5;
const CACHE_MS = 30 * 60 * 1000;

const SYSTEM = `You are the editor of a football news digest for Uzbek readers.
From the numbered list of recent football headlines, pick the ${TOP_N} most important stories of the day:
big transfers, major match results, managerial changes, serious injuries, big-club or national-team news.
Avoid duplicates (same story from several sources) and minor gossip. Prefer variety.
For each, write a brief summary in Uzbek (Latin script), 1-2 short sentences. Keep names of players, clubs and competitions in their usual Latin spelling.
Use only facts from the provided headline and snippet; do not add details.
Return the ids of the chosen items, most important first.`;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    stories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          summary_uz: { type: Type.STRING },
        },
        required: ["id", "summary_uz"],
      },
    },
  },
  required: ["stories"],
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Gemini returns 503/429 during demand spikes; a short retry usually gets through.
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (i >= attempts || (status !== 503 && status !== 429 && status !== 500)) throw err;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

async function buildDigest(): Promise<string> {
  const news = await fetchRecentNews();
  if (news.length === 0) return "Hozircha yangiliklar topilmadi. Keyinroq qayta urinib ko'ring.";

  const list = news
    .map((n, i) => `[${i}] (${n.source}) ${n.title}${n.summary ? ` — ${n.summary}` : ""}`)
    .join("\n");

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: list,
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    }),
  );

  if (!response.text) throw new Error("Empty response from Gemini");
  const { stories } = JSON.parse(response.text) as { stories: { id: number; summary_uz: string }[] };

  const picked = stories
    .flatMap((s) => (news[s.id] ? [{ item: news[s.id] as NewsItem, summary: s.summary_uz }] : []))
    .slice(0, TOP_N);
  if (picked.length === 0) throw new Error("Model returned no valid story ids");

  const blocks = picked.map(
    ({ item, summary }, i) =>
      `${i + 1}. ${esc(summary)}\n<a href="${esc(item.url)}">Manba: ${esc(item.source)}</a>`,
  );
  return `⚽ <b>Bugungi asosiy futbol yangiliklari</b>\n\n${blocks.join("\n\n")}`;
}

// One digest is shared by all users and reused for 30 minutes,
// so API/feed calls don't scale with the number of /start presses.
let cached: { at: number; text: string } | null = null;
let inflight: Promise<string> | null = null;

export async function getDigest(): Promise<string> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.text;
  inflight ??= buildDigest()
    .then((text) => {
      cached = { at: Date.now(), text };
      return text;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
