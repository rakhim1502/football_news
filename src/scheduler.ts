import { GrammyError, type Bot } from "grammy";
import { getDigest } from "./digest.js";
import { allSubscribers, markSent, remove } from "./subscribers.js";

export const TIMEZONE = process.env.TIMEZONE ?? "Asia/Tashkent";

const TICK_MS = 30_000;
const CATCH_UP_MIN = 60; // if the bot was down at the scheduled time, still send within this window
const RETRY_AFTER_FAILURE_MS = 5 * 60_000;

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function now() {
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

export const sendOpts = { parse_mode: "HTML", link_preview_options: { is_disabled: true } } as const;

let retryAt = 0;
let running = false;

async function tick(bot: Bot) {
  if (running || Date.now() < retryAt) return;
  running = true;
  try {
    const { date, minutes } = now();
    const due = allSubscribers().filter((s) => {
      const late = minutes - toMinutes(s.time);
      return s.lastSent !== date && late >= 0 && late <= CATCH_UP_MIN;
    });
    if (due.length === 0) return;

    let text: string;
    try {
      text = await getDigest();
    } catch (err) {
      console.error("Scheduled digest failed, will retry:", err);
      retryAt = Date.now() + RETRY_AFTER_FAILURE_MS;
      return;
    }

    for (const s of due) {
      try {
        await bot.api.sendMessage(s.chatId, text, sendOpts);
        markSent(s.chatId, date);
      } catch (err) {
        if (err instanceof GrammyError && (err.error_code === 403 || err.error_code === 400)) {
          console.log(`Removing unreachable chat ${s.chatId}: ${err.description}`);
          remove(s.chatId);
        } else {
          console.error(`Send to ${s.chatId} failed:`, err);
        }
      }
      await new Promise((r) => setTimeout(r, 50)); // stay well under Telegram's ~30 msg/s limit
    }
  } finally {
    running = false;
  }
}

export function startScheduler(bot: Bot) {
  setInterval(() => void tick(bot), TICK_MS);
}
