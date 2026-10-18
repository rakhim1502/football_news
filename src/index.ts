import { Bot, InlineKeyboard } from "grammy";
import { getDigest } from "./digest.js";
import { sendOpts, startScheduler, TIMEZONE } from "./scheduler.js";
import { getSubscriber, remove, setTime } from "./subscribers.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set (see .env.example)");

const bot = new Bot(token);

const PRESETS = ["07:00", "08:00", "09:00", "12:00", "18:00", "21:00"];
const TIME_RE = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/;

function timeKeyboard() {
  const kb = new InlineKeyboard();
  PRESETS.forEach((t, i) => {
    kb.text(t, `t:${t}`);
    if (i % 3 === 2) kb.row();
  });
  return kb.text("🔕 O'chirish", "off");
}

const confirm = (time: string) =>
  `✅ Tayyor! Har kuni soat <b>${time}</b> da (${TIMEZONE}) yangiliklar yuboriladi.\nVaqtni o'zgartirish: /time, o'chirish: /off`;

bot.command("start", async (ctx) => {
  await ctx.replyWithChatAction("typing");
  try {
    await ctx.reply(await getDigest(), sendOpts);
  } catch (err) {
    console.error("Digest failed:", err);
    await ctx.reply("Kechirasiz, yangiliklarni olishda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.");
  }
  const sub = getSubscriber(ctx.chat.id);
  await ctx.reply(
    sub
      ? `🕗 Kunlik yangiliklar soat <b>${sub.time}</b> da yuboriladi. O'zgartirish: /time`
      : "🕗 Yangiliklarni har kuni avtomatik olishni xohlaysizmi? Vaqtni tanlang:",
    { parse_mode: "HTML", reply_markup: sub ? undefined : timeKeyboard() },
  );
});

bot.command("time", async (ctx) => {
  const arg = ctx.match.trim();
  if (!arg) {
    return ctx.reply(
      `Yangiliklar har kuni qaysi vaqtda kelsin? Tanlang yoki o'zingiz yozing, masalan: /time 08:30\n(Vaqt zonasi: ${TIMEZONE})`,
      { reply_markup: timeKeyboard() },
    );
  }
  const m = TIME_RE.exec(arg);
  if (!m) return ctx.reply("Vaqt formati noto'g'ri. Masalan: /time 08:30");
  const time = `${m[1].padStart(2, "0")}:${m[2]}`;
  setTime(ctx.chat.id, time);
  return ctx.reply(confirm(time), { parse_mode: "HTML" });
});

bot.command("off", async (ctx) => {
  await ctx.reply(remove(ctx.chat.id) ? "🔕 Kunlik yuborish o'chirildi. Qayta yoqish: /time" : "Kunlik yuborish yoqilmagan. Yoqish: /time");
});

bot.callbackQuery(/^t:(\d\d:\d\d)$/, async (ctx) => {
  const time = ctx.match[1];
  setTime(ctx.chat!.id, time);
  await ctx.answerCallbackQuery(`Soat ${time}`);
  await ctx.editMessageText(confirm(time), { parse_mode: "HTML" });
});

bot.callbackQuery("off", async (ctx) => {
  remove(ctx.chat!.id);
  await ctx.answerCallbackQuery("O'chirildi");
  await ctx.editMessageText("🔕 Kunlik yuborish o'chirildi. Qayta yoqish: /time");
});

bot.catch((err) => console.error("Bot error:", err.error));

await bot.api.setMyCommands([
  { command: "start", description: "Bugungi futbol yangiliklari" },
  { command: "time", description: "Kunlik yuborish vaqtini belgilash" },
  { command: "off", description: "Kunlik yuborishni o'chirish" },
]);

startScheduler(bot);
bot.start({ onStart: (me) => console.log(`Bot @${me.username} is running (timezone: ${TIMEZONE})`) });
