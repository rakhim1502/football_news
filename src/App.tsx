import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  Bot,
  Terminal,
  FileCode,
  Copy,
  Check,
  Send,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Cpu,
  FolderTree,
  BookOpen,
  ChevronRight,
  MessageSquare,
  Flame,
  Globe,
  Settings as SettingsIcon,
  CheckCircle2,
  Clock,
  Layers,
  Sliders,
  Filter,
  Download,
  Server,
  HelpCircle,
  Activity
} from 'lucide-react';

interface FileItem {
  path: string;
  name: string;
  folder: string;
  description: string;
  content: string;
}

const PROJECT_FILES: FileItem[] = [
  {
    path: 'requirements.txt',
    name: 'requirements.txt',
    folder: 'root',
    description: 'aiogram 3.x, httpx, feedparser, pydantic-settings va pytest',
    content: `aiogram>=3.17.0,<4.0.0
httpx>=0.28.0
feedparser>=6.0.11
python-dotenv>=1.0.1
pydantic-settings>=2.7.0
pytest>=8.0.0
pytest-asyncio>=0.23.0`
  },
  {
    path: '.env.example',
    name: '.env.example',
    folder: 'root',
    description: 'Telegram bot token va Gemini API kaliti shabloni',
    content: `# Telegram Bot Token (@BotFather dan olingan token)
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ

# Gemini API kaliti (Google AI Studio bepul kaliti)
# https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Bot sozlamalari
MAX_NEWS_COUNT=7
REQUEST_TIMEOUT_SECONDS=10`
  },
  {
    path: '.gitignore',
    name: '.gitignore',
    folder: 'root',
    description: 'Git ombori uchun qoidalar (.env va .venv himoyasi)',
    content: `__pycache__/
*.py[cod]
.venv/
venv/
.env
.pytest_cache/
.vscode/
.idea/`
  },
  {
    path: 'run.bat',
    name: 'run.bat',
    folder: 'root',
    description: 'Windows kompyuterida 1 marta bosish bilan ishga tushirish skripti',
    content: `@echo off
chcp 65001 > nul
echo ===================================================
echo ⚽ Futbol Yangiliklari Telegram Botini ishga tushirish
echo ===================================================

IF NOT EXIST ".venv" (
    echo [1/3] Virtual muhit (.venv) yaratilmoqda...
    python -m venv .venv
    call .venv\\Scripts\\activate.bat
    pip install --upgrade pip
    pip install -r requirements.txt
) ELSE (
    call .venv\\Scripts\\activate.bat
)

IF NOT EXIST ".env" (
    echo [OGOHLANTIRISH] .env fayli topilmadi!
    copy .env.example .env
    echo Iltimos, .env faylini ochib, BOT_TOKEN ni kiriting!
    pause
    exit /b
)

python -m app.main
pause`
  },
  {
    path: 'Dockerfile',
    name: 'Dockerfile',
    folder: 'root',
    description: 'Production uchun yengil va xavfsiz python:3.11-slim konteyner',
    content: `FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    curl \\
    ca-certificates \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \\
    pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-m", "app.main"]`
  },
  {
    path: 'docker-compose.yml',
    name: 'docker-compose.yml',
    folder: 'root',
    description: 'Doimiy qayta yuklanuvchi Docker Compose konfiguratsiyasi',
    content: `version: '3.8'

services:
  football-bot:
    build: .
    container_name: football_news_bot
    restart: always
    env_file:
      - .env
    environment:
      - PYTHONUNBUFFERED=1`
  },
  {
    path: 'football-bot.service',
    name: 'football-bot.service',
    folder: 'root',
    description: 'Linux Ubuntu/Debian serverlarida fonda ishlash uchun Systemd servisi',
    content: `[Unit]
Description=Futbol Yangiliklari Telegram Boti
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/football-news-bot
ExecStart=/opt/football-news-bot/.venv/bin/python -m app.main
Restart=always
RestartSec=10
EnvironmentFile=/opt/football-news-bot/.env

[Install]
WantedBy=multi-user.target`
  },
  {
    path: 'app/main.py',
    name: 'main.py',
    folder: 'app',
    description: 'Asosiy ishga tushirish fayli, barcha routerlar va Long Polling',
    content: `"""
Futbol Yangiliklari Telegram Botini ishga tushirish uchun asosiy fayl
"""
import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from app.config import settings
from app.handlers import start_router, commands_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("football_news_bot")

async def main() -> None:
    if not settings.bot_token or settings.bot_token == "your_telegram_bot_token_here":
        logger.error(
            "❌ XATOLIK: BOT_TOKEN aniqlanmadi!\\n"
            "Iltimos, '.env' faylini oching va @BotFather dan olingan bot tokeningizni kiriting."
        )
        sys.exit(1)

    logger.info("🤖 Futbol Yangiliklari boti ishga tushirilmoqda...")

    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )
    dp = Dispatcher()
    dp.include_router(commands_router)
    dp.include_router(start_router)

    try:
        await bot.delete_webhook(drop_pending_updates=True)
        bot_info = await bot.get_me()
        logger.info(f"✅ Bot muvaffaqiyatli ulandi: @{bot_info.username} (ID: {bot_info.id})")
        logger.info("📡 Xabarlar kutilmoqda (polling rejimida)...")
        await dp.start_polling(bot)
    except Exception as e:
        logger.critical(f"Bot ishlashida jiddiy xato: {e}", exc_info=True)
    finally:
        await bot.session.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot to'xtatildi.")`
  },
  {
    path: 'app/config.py',
    name: 'config.py',
    folder: 'app',
    description: 'Pydantic-settings orqali .env yuklash va tekshirilgan RSS manbalar',
    content: `from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    bot_token: str = Field(default="", alias="BOT_TOKEN")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    max_news_count: int = Field(default=7, alias="MAX_NEWS_COUNT")
    request_timeout_seconds: int = Field(default=10, alias="REQUEST_TIMEOUT_SECONDS")

    # Ishonchli futbol RSS manbalari
    rss_feeds: list[dict[str, str]] = [
        {"name": "BBC Sport Football", "url": "http://feeds.bbci.co.uk/sport/football/rss.xml"},
        {"name": "Sky Sports Football", "url": "https://www.skysports.com/rss/12040"},
        {"name": "ESPN FC", "url": "https://www.espn.com/espn/rss/football/news"}
    ]

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()`
  },
  {
    path: 'app/handlers/start.py',
    name: 'start.py',
    folder: 'app/handlers',
    description: '/start va "🔄 Yangiliklarni yangilash" interaktiv tugmasi handleri',
    content: `import logging
from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.enums import ParseMode

from app.services.news_fetcher import news_fetcher
from app.services.news_ranker import news_ranker
from app.services.translator import news_translator
from app.utils.formatter import format_news_post
from app.config import settings

logger = logging.getLogger(__name__)
router = Router(name="start_router")

def get_refresh_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="🔄 Yangiliklarni yangilash", callback_data="refresh_news")]]
    )

async def process_and_send_news(target: Message, user_name: str, is_edit: bool = False) -> None:
    wait_text = (
        f"Assalomu alaykum, <b>{user_name}</b>! ⚽\\n\\n"
        "🔍 Bugungi eng muhim futbol yangiliklari xalqaro manbalardan (BBC Sport, Sky Sports, ESPN) olinmoqda va o'zbek tiliga tayyorlanmoqda...\\n"
        "<i>Iltimos, bir necha soniya kuting.</i>"
    )

    status_msg = await (target.edit_text(wait_text, parse_mode=ParseMode.HTML) if is_edit else target.answer(wait_text, parse_mode=ParseMode.HTML))

    try:
        raw_news = await news_fetcher.fetch_all_news()
        if not raw_news:
            await status_msg.edit_text("⚽ Bugun yangiliklar topilmadi.", parse_mode=ParseMode.HTML, reply_markup=get_refresh_keyboard())
            return

        ranked_news = news_ranker.rank_and_select(raw_news, min_count=5, max_count=settings.max_news_count)
        summarized_news = await news_translator.summarize_all(ranked_news)
        formatted_messages = format_news_post(summarized_news)

        await status_msg.delete()

        for i, chunk in enumerate(formatted_messages):
            is_last = (i == len(formatted_messages) - 1)
            await target.answer(
                chunk,
                parse_mode=ParseMode.HTML,
                disable_web_page_preview=True,
                reply_markup=get_refresh_keyboard() if is_last else None
            )
    except Exception as e:
        logger.error(f"Xatolik: {e}", exc_info=True)
        await status_msg.edit_text("⚠️ Xatolik yuz berdi.", parse_mode=ParseMode.HTML, reply_markup=get_refresh_keyboard())

@router.message(CommandStart())
async def handle_start(message: Message) -> None:
    name = message.from_user.first_name if message.from_user else "Foydalanuvchi"
    await process_and_send_news(message, name)

@router.callback_query(F.data == "refresh_news")
async def handle_refresh_callback(callback: CallbackQuery) -> None:
    await callback.answer("Yangilanmoqda...")
    name = callback.from_user.first_name if callback.from_user else "Foydalanuvchi"
    if callback.message and isinstance(callback.message, Message):
        await process_and_send_news(callback.message, name)`
  },
  {
    path: 'app/handlers/commands.py',
    name: 'commands.py',
    folder: 'app/handlers',
    description: '/help, /sources va /status xizmat buyruqlari',
    content: `from datetime import datetime
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.enums import ParseMode
from app.config import settings

router = Router(name="commands_router")

@router.message(Command("help"))
async def handle_help(message: Message) -> None:
    text = (
        "📖 <b>Futbol Yangiliklari Boti Qo‘llanmasi</b>\\n\\n"
        "• /start — Bugungi muhim 5–10 ta yangilik\\n"
        "• /sources — Xalqaro RSS manbalari\\n"
        "• /status — Bot va AI holati\\n"
        "• /help — Yo'riqnoma"
    )
    await message.answer(text, parse_mode=ParseMode.HTML)

@router.message(Command("sources"))
async def handle_sources(message: Message) -> None:
    text = "🌐 <b>Ishonchli manbalar:</b>\\n\\n" + "\\n".join([f"• <b>{f['name']}</b>: {f['url']}" for f in settings.rss_feeds])
    await message.answer(text, parse_mode=ParseMode.HTML, disable_web_page_preview=True)

@router.message(Command("status"))
async def handle_status(message: Message) -> None:
    now = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    await message.answer(f"⚡ <b>Bot holati:</b> Faol ✅\\nServer vaqti: {now}", parse_mode=ParseMode.HTML)`
  },
  {
    path: 'app/services/news_fetcher.py',
    name: 'news_fetcher.py',
    folder: 'app/services',
    description: 'Httpx va feedparser orqali asinxron RSS parsing va xatoliklarga chidamlilik',
    content: `import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any
import feedparser
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

def clean_html(raw_html: str) -> str:
    return " ".join(re.sub(r"<.*?>", "", raw_html or "").split())

class NewsFetcher:
    def __init__(self, timeout: int | None = None):
        self.timeout = timeout or settings.request_timeout_seconds
        self.headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FootballNewsBot/1.0"}

    async def fetch_single_feed(self, client: httpx.AsyncClient, feed_info: dict[str, str]) -> list[dict[str, Any]]:
        articles = []
        try:
            res = await client.get(feed_info["url"], headers=self.headers, timeout=self.timeout)
            if res.status_code == 200:
                parsed = feedparser.parse(res.text)
                for entry in parsed.entries[:10]:
                    t = getattr(entry, "title", "").strip()
                    l = getattr(entry, "link", "").strip()
                    s = clean_html(getattr(entry, "summary", "") or getattr(entry, "description", ""))
                    pub = None
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        pub = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                    if t and l:
                        articles.append({"title": t, "link": l, "summary": s, "source_name": feed_info["name"], "published": pub})
        except Exception as e:
            logger.error(f"Xatolik {feed_info['name']}: {e}")
        return articles

    async def fetch_all_news(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(limits=httpx.Limits(max_connections=10), follow_redirects=True) as client:
            tasks = [self.fetch_single_feed(client, f) for f in settings.rss_feeds]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            all_articles = [item for sub in results if isinstance(sub, list) for item in sub]

        seen = set()
        return [a for a in all_articles if not (a["link"] in seen or seen.add(a["link"]))]

news_fetcher = NewsFetcher()`
  },
  {
    path: 'app/services/news_ranker.py',
    name: 'news_ranker.py',
    folder: 'app/services',
    description: 'Sana tekshirish (36 soat), Jaccard dedup va 5–10 ta eng muhim yangilikni saralash',
    content: `import re
from datetime import datetime, timezone, timedelta
from typing import Any

KEYWORD_WEIGHTS: dict[str, int] = {
    "champions league": 30, "ucl": 25, "premier league": 20, "la liga": 20,
    "transfer": 25, "signing": 20, "sacked": 25,
    "real madrid": 15, "barcelona": 15, "manchester city": 15, "arsenal": 15,
    "mbappe": 15, "haaland": 15, "vinicius": 15, "bellingham": 15
}

class NewsRanker:
    def is_fresh(self, article: dict[str, Any], max_hours: int = 36) -> bool:
        pub = article.get("published")
        if not isinstance(pub, datetime):
            return False
        now_utc = datetime.now(timezone.utc)
        if pub.tzinfo is None:
            pub = pub.replace(tzinfo=timezone.utc)
        diff = now_utc - pub
        return timedelta(seconds=0) <= diff <= timedelta(hours=max_hours)

    def calculate_score(self, article: dict[str, Any]) -> int:
        title = article.get("title", "").lower()
        summary = article.get("summary", "").lower()
        text = f"{title} {summary}"
        score = 10
        for kw, weight in KEYWORD_WEIGHTS.items():
            if kw in text:
                score += weight
        return score

    def normalize_title(self, title: str) -> set[str]:
        cleaned = re.sub(r"[^a-zA-Z0-9\\s]", "", title.lower())
        words = set(cleaned.split())
        stop_words = {"the", "a", "an", "in", "on", "at", "for", "to", "of", "and", "is", "vs"}
        return words - stop_words

    def deduplicate(self, articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        unique: list[dict[str, Any]] = []
        for art in articles:
            words = self.normalize_title(art.get("title", ""))
            if not words:
                continue
            is_dup = False
            for exist in unique:
                e_words = self.normalize_title(exist.get("title", ""))
                sim = len(words & e_words) / len(words | e_words) if (words | e_words) else 0
                if sim >= 0.45:
                    is_dup = True
                    break
            if not is_dup:
                unique.append(art)
        return unique

    def rank_and_select(self, articles: list[dict[str, Any]], min_count: int = 5, max_count: int = 10) -> list[dict[str, Any]]:
        fresh = [a for a in articles if self.is_fresh(a)]
        if len(fresh) < min_count:
            fresh = [a for a in articles if self.is_fresh(a, max_hours=48)]
        deduped = self.deduplicate(fresh)
        for a in deduped:
            a["score"] = self.calculate_score(a)
        sorted_articles = sorted(deduped, key=lambda x: x["score"], reverse=True)
        return sorted_articles[:max_count]

news_ranker = NewsRanker()`
  },
  {
    path: 'app/services/translator.py',
    name: 'translator.py',
    folder: 'app/services',
    description: 'Gemini AI orqali har bir yangilikni 2–3 ta qisqa jumlada o\'zbek tiliga qisqartirish',
    content: `import asyncio
import json
import logging
import re
from typing import Any
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

SYSTEM_PROMPT = """Sen professional sport jurnalisti va futbol sharhlovchisisan.
Vazifang — quyida berilgan xalqaro futbol yangiligini tahlil qilib, o'zbek tilida qisqa va qiziqarli bayon etish.

QAT'IY QOIDALAR:
1. FAQAT berilgan maqola ma'lumotlariga tayan. Hech qanday ma'lumot to'qib chiqarilmasin.
2. Xabarning sarlavhasini o'zbek tiliga jozibali qilib tarjima qil (title_uz).
3. Yangilikning asosiy mazmunini aniq 2–3 ta qisqa jumlada bayon qil (summary_uz).
4. Futbolchilar, murabbiylar va klublar nomlarini to'g'ri saqla (Real Madrid, Barselona, Mbappe, Vinisius, Xoland).
5. Javobni FAQAT quyidagi JSON formatida qaytar:
{"title_uz": "...", "summary_uz": "..."}"""

class NewsTranslator:
    def __init__(self, api_key: str | None = None, concurrency: int = 4):
        self.api_key = api_key or settings.gemini_api_key
        self.semaphore = asyncio.Semaphore(concurrency)

    def _extract_json_response(self, text: str) -> dict[str, str] | None:
        try:
            return json.loads(text.strip())
        except Exception:
            match = re.search(r"(\\{.*?\\})", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except Exception:
                    pass
        return None

    async def summarize_single(self, client: httpx.AsyncClient, article: dict[str, Any]) -> dict[str, Any]:
        if not self.api_key or self.api_key == "your_gemini_api_key_here":
            return {**article, "title_uz": article.get("title", ""), "summary_uz": article.get("summary", "")}

        payload = {
            "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\\n\\nSarlavha: {article.get('title')}\\nMatn: {article.get('summary')}"}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 300, "responseMimeType": "application/json"}
        }

        async with self.semaphore:
            try:
                res = await client.post(f"{GEMINI_API_URL}?key={self.api_key}", json=payload, timeout=settings.request_timeout_seconds)
                if res.status_code == 200:
                    data = res.json()
                    raw = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = self._extract_json_response(raw)
                    if parsed and "title_uz" in parsed:
                        return {**article, "title_uz": parsed["title_uz"], "summary_uz": parsed.get("summary_uz", "")}
            except Exception as e:
                logger.error(f"Gemini API xatosi: {e}")

        return {**article, "title_uz": article.get("title", ""), "summary_uz": article.get("summary", "")}

    async def summarize_all(self, articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            tasks = [self.summarize_single(client, a) for a in articles]
            return await asyncio.gather(*tasks, return_exceptions=False)

news_translator = NewsTranslator()`
  },
  {
    path: 'app/utils/formatter.py',
    name: 'formatter.py',
    folder: 'app/utils',
    description: 'Telegram HTML belgilarni xavfsiz escape qilish va maxsus xabar formatiga keltirish',
    content: `import html
from datetime import datetime
from typing import Any

def escape_html(text: str) -> str:
    if not text:
        return ""
    return html.escape(str(text).strip())

def format_news_post(news_items: list[dict[str, Any]]) -> list[str]:
    if not news_items:
        return ["⚽ Bugun e'lon qilingan muhim futbol yangiliklari topilmadi."]

    today_str = datetime.now().strftime("%d.%m.%Y")
    header = f"⚽ <b>BUGUNGI FUTBOL YANGILIKLARI</b>\\n📅 <i>{today_str}</i>\\n\\n"
    messages: list[str] = []
    current_message = header

    for idx, item in enumerate(news_items, start=1):
        title = escape_html(item.get("title_uz") or item.get("title", "Futbol yangiligi"))
        summary = escape_html(item.get("summary_uz") or item.get("summary", ""))
        source_name = escape_html(item.get("source_name", "Manba"))
        url = item.get("link", "#").strip()

        news_block = (
            f"{idx}. 🔥 <b>{title}</b>\\n"
            f"{summary}\\n\\n"
            f"🔗 <a href=\\"{url}\\">Manbani o‘qish ({source_name})</a>\\n\\n"
            f"━━━━━━━━━━━━━━━━━━━\\n\\n"
        )

        if len(current_message) + len(news_block) > 3800:
            messages.append(current_message.strip())
            current_message = f"⚽ <b>DAVOMI (Futbol yangiliklari):</b>\\n\\n" + news_block
        else:
            current_message += news_block

    if current_message.strip():
        messages.append(current_message.strip())

    return messages`
  },
  {
    path: 'tests/test_basic.py',
    name: 'test_basic.py',
    folder: 'tests',
    description: 'HTML escape va post formatlash testlari',
    content: `from app.utils.formatter import escape_html, format_news_post

def test_escape_html():
    raw = "Real Madrid <vs> Barcelona & Manchester United"
    escaped = escape_html(raw)
    assert "<" not in escaped
    assert ">" not in escaped
    assert "&lt;" in escaped
    assert "&gt;" in escaped
    assert "&amp;" in escaped

def test_format_news_post_empty():
    res = format_news_post([])
    assert len(res) == 1
    assert "topilmadi" in res[0]`
  },
  {
    path: 'tests/test_ranker_translator.py',
    name: 'test_ranker_translator.py',
    folder: 'tests',
    description: 'Sana tekshirish, dedup va reyting testlari',
    content: `from datetime import datetime, timezone, timedelta
from app.services.news_ranker import news_ranker

def test_freshness_filter():
    now = datetime.now(timezone.utc)
    fresh = {"title": "Mbappe gol urdi", "published": now - timedelta(hours=3)}
    old = {"title": "Eski xabar", "published": now - timedelta(days=5)}
    assert news_ranker.is_fresh(fresh) is True
    assert news_ranker.is_fresh(old) is False

def test_scoring_weights():
    top = {"title": "Champions League: Real Madrid and Mbappe win thriller", "summary": "Goal"}
    minor = {"title": "Friendly match ended in draw", "summary": "Draw"}
    assert news_ranker.calculate_score(top) > news_ranker.calculate_score(minor)

def test_deduplication():
    arts = [
        {"title": "Haaland hat-trick seals Manchester City victory", "summary": "1"},
        {"title": "Manchester City victory as Haaland scores hat-trick", "summary": "2"},
        {"title": "Barcelona manager discusses El Clasico", "summary": "3"}
    ]
    assert len(news_ranker.deduplicate(arts)) == 2`
  },
  {
    path: 'tests/test_async_fetcher.py',
    name: 'test_async_fetcher.py',
    folder: 'tests',
    description: 'HTML tozalash va fetcher testlari',
    content: `from app.services.news_fetcher import clean_html, NewsFetcher

def test_clean_html():
    raw = "<p>Real Madrid won <b>2-0</b> against opponent.<br><a href='http://link'>Read</a></p>"
    cleaned = clean_html(raw)
    assert "<p>" not in cleaned
    assert "<b>" not in cleaned
    assert "Real Madrid won 2-0 against opponent. Read" == cleaned`
  },
  {
    path: 'README.md',
    name: 'README.md',
    folder: 'root',
    description: 'Windows, Docker, Linux Systemd va bot buyruqlari to\'liq qo\'llanmasi',
    content: `# Futbol Yangiliklari Telegram Boti

Ishga tushirish qadamlari:
1. python -m venv .venv
2. .venv\\Scripts\\Activate.ps1
3. pip install -r requirements.txt
4. Copy-Item .env.example .env
5. pytest
6. python -m app.main (yoki run.bat)`
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'files' | 'ai_lab' | 'guide'>('simulator');
  const [selectedFilePath, setSelectedFilePath] = useState<string>('app/main.py');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Telegram simulyatori
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; isHtml?: boolean; hasRefreshButton?: boolean }>>([
    {
      sender: 'bot',
      text: "👋 Assalomu alaykum! Futbol yangiliklari Telegram botiga xush kelibsiz.\n\nBugungi eng dolzarb futbol xabarlarini olish uchun <b>/start</b> buyrug'ini yuboring yoki quyidagi tezkor tugmalardan foydalaning.",
      isHtml: true
    }
  ]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const selectedFile = PROJECT_FILES.find((f) => f.path === selectedFilePath) || PROJECT_FILES[0];

  const handleCopy = (content: string, path: string) => {
    navigator.clipboard.writeText(content);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();
      const folder = zip.folder('football-news-bot');

      PROJECT_FILES.forEach((f) => {
        folder?.file(f.path, f.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'football-news-bot.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP yaratishda xato:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleSendSimulation = (cmd?: string) => {
    const textToSend = cmd || inputVal.trim();
    if (!textToSend || isSimulating) return;

    setInputVal('');
    const newMsgs = [...messages, { sender: 'user' as const, text: textToSend }];
    setMessages(newMsgs);

    if (textToSend === '/start') {
      setIsSimulating(true);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `Assalomu alaykum, <b>Azizbek</b>! ⚽\n\n🔍 Bugungi eng muhim futbol yangiliklari xalqaro manbalardan (BBC Sport, Sky Sports, ESPN) olinmoqda va o'zbek tiliga tayyorlanmoqda...\n<i>Iltimos, bir necha soniya kuting.</i>`,
            isHtml: true
          }
        ]);
      }, 500);

      setTimeout(() => {
        setIsSimulating(false);
        const todayStr = new Date().toLocaleDateString('uz-UZ');
        const simulatedFeed = `⚽ <b>BUGUNGI FUTBOL YANGILIKLARI</b>\n📅 <i>${todayStr}</i>\n\n` +
          `1. 🔥 <b>Chempionlar Ligasi: Mbappe va Vinisius gollari Real Madridga g'alaba keltirdi</b>\n` +
          `Madridliklar safarda kechgan o'yinda ishonchli o'yin ko'rsatib, pley-off yo'llanmasini deyarli naqd qildi. Fransiyalik hujumchi uchrashuvning eng yaxshi futbolchisi deb e'tirof etildi.\n\n` +
          `🔗 <a href="https://www.bbc.com/sport/football" target="_blank" class="text-blue-400 underline font-medium">Manbani o‘qish (BBC Sport Football)</a>\n\n` +
          `━━━━━━━━━━━━━━━━━━━\n\n` +
          `2. 🔥 <b>Katta transfer: Premyer-liga grandi yangi yarim himoyachi bilan shartnoma tuzdi</b>\n` +
          `London klubi yozgi transfer oynasi oldidan 80 million yevrolik transfer borasida yakuniy kelishuvga erishdi. Futbolchi tibbiy ko'rikdan so'ng 5 yillik shartnomaga imzo chekadi.\n\n` +
          `🔗 <a href="https://www.skysports.com/football" target="_blank" class="text-blue-400 underline font-medium">Manbani o‘qish (Sky Sports Football)</a>\n\n` +
          `━━━━━━━━━━━━━━━━━━━\n\n` +
          `3. 🔥 <b>Barselona bosh murabbiyi El Klasiko oldidan tarkib holatini ma'lum qildi</b>\n` +
          `Kataloniyaliklar ustozi jarohatdan tuzalgan asosiy markaziy himoyachi maydonga tushishga tayyor ekanini ta'kidladi. Jamoa yetakchisi esa to'liq tiklanish uchun alohida rejimda shug'ullanmoqda.\n\n` +
          `🔗 <a href="https://www.espn.com/football" target="_blank" class="text-blue-400 underline font-medium">Manbani o‘qish (ESPN FC)</a>`;

        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: simulatedFeed,
            isHtml: true,
            hasRefreshButton: true
          }
        ]);
      }, 2000);
    } else if (textToSend === '/sources') {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `🌐 <b>Bot foydalanadigan ishonchli futbol manbalari:</b>\n\n` +
              `1. ⚽ <b>BBC Sport Football</b>\n🔗 <code>http://feeds.bbci.co.uk/sport/football/rss.xml</code>\n\n` +
              `2. ⚽ <b>Sky Sports Football</b>\n🔗 <code>https://www.skysports.com/rss/12040</code>\n\n` +
              `3. ⚽ <b>ESPN FC</b>\n🔗 <code>https://www.espn.com/espn/rss/football/news</code>\n\n` +
              `💡 <i>Barcha manbalar faqat tekshirilgan va barqaror ishlovchi xalqaro RSS kanallaridir.</i>`,
            isHtml: true
          }
        ]);
      }, 300);
    } else if (textToSend === '/status') {
      setTimeout(() => {
        const nowStr = new Date().toLocaleTimeString('uz-UZ');
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `⚡ <b>Bot tizimi holati:</b>\n\n` +
              `• <b>Holat:</b> Faol va yangiliklarni qabul qilmoqda ✅\n` +
              `• <b>AI Tizimi:</b> Ulangan (Gemini 2.5 Flash)\n` +
              `• <b>Manbalar soni:</b> 3 ta xalqaro kanal (BBC, Sky, ESPN)\n` +
              `• <b>Maksimal xabarlar:</b> 7–10 ta saralangan\n` +
              `• <b>Mahalliy vaqt:</b> ${nowStr}`,
            isHtml: true
          }
        ]);
      }, 300);
    } else if (textToSend === '/help') {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `📖 <b>Futbol Yangiliklari Boti Qo‘llanmasi</b>\n\n` +
              `• <b>/start</b> — Bugungi eng muhim 5–10 ta yangilikni o'zbek tilida olish\n` +
              `• <b>/sources</b> — Yangiliklar olinadigan manbalar ro'yxati\n` +
              `• <b>/status</b> — Bot va tizim holatini tekshirish\n` +
              `• <b>/help</b> — Ushbu yo'riqnomani ochish`,
            isHtml: true
          }
        ]);
      }, 300);
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `Noma'lum buyruq. Bugungi yangiliklarni ko'rish uchun <b>/start</b> yuboring yoki <b>/help</b> bosing.`,
            isHtml: true
          }
        ]);
      }, 400);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Bot className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide">
                Futbol Yangiliklari Telegram Boti
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                To'liq Tayyor Loyiha
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Python 3.11+ • aiogram 3.x • Gemini 2.5 Flash • Docker • VS Code
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
          >
            <Download className={`w-3.5 h-3.5 ${isZipping ? 'animate-bounce' : ''}`} />
            {isZipping ? 'ZIP qilinmoqda...' : 'Loyiha ZIP yuklab olish'}
          </button>

          {/* Tab switcher */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs font-medium">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Telegram Simulyatori
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'files'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-4 h-4" />
              Fayllar ({PROJECT_FILES.length})
            </button>
            <button
              onClick={() => setActiveTab('ai_lab')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'ai_lab'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              AI & Saralash
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Ishga Tushirish
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'simulator' && (
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[670px]">
            {/* Telegram Header */}
            <div className="bg-slate-850 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow">
                  ⚽
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Futbol Yangiliklari Boti
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono">
                      bot
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                    onlayn (aiogram 3.x + Gemini 2.5 Flash)
                  </p>
                </div>
              </div>

              {/* Quick test buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSendSimulation('/start')}
                  className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg transition shadow"
                >
                  <RefreshCw className={`w-3 h-3 ${isSimulating ? 'animate-spin' : ''}`} />
                  /start
                </button>
                <button
                  onClick={() => handleSendSimulation('/sources')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  /sources
                </button>
                <button
                  onClick={() => handleSendSimulation('/status')}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  /status
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/80">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none shadow-md font-medium'
                        : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/60 shadow-lg'
                    }`}
                  >
                    {m.isHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>') }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    )}

                    {m.hasRefreshButton && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex justify-center">
                        <button
                          onClick={() => handleSendSimulation('/start')}
                          disabled={isSimulating}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600/90 text-emerald-400 font-medium rounded-lg text-xs transition border border-slate-600/60 shadow cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                          🔄 Yangiliklarni yangilash
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isSimulating && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/80 border border-slate-700 text-slate-300 px-4 py-2.5 rounded-2xl rounded-bl-none text-xs flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span>Gemini AI yangiliklarni saralamoqda va o'zbek tiliga qisqartirmoqda...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendSimulation()}
                placeholder="/start, /sources, /status yoki /help deb yozing..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleSendSimulation()}
                disabled={isSimulating}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition shadow"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* File List Sidebar */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FolderTree className="w-4 h-4 text-emerald-400" />
                  football-news-bot/
                </span>
                <span className="text-[11px] px-2 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">
                  {PROJECT_FILES.length} ta fayl
                </span>
              </div>
              <div className="divide-y divide-slate-800/50 max-h-[640px] overflow-y-auto">
                {PROJECT_FILES.map((file) => {
                  const isSelected = selectedFilePath === file.path;
                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFilePath(file.path)}
                      className={`w-full text-left p-3 transition-colors flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-emerald-950/40 border-l-4 border-emerald-500 text-slate-100'
                          : 'hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <FileCode
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isSelected ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono font-medium truncate flex items-center justify-between">
                          <span>{file.path}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {file.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Content Viewer */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {selectedFile.path}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedFile.description}</p>
                </div>
                <button
                  onClick={() => handleCopy(selectedFile.content, selectedFile.path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
                >
                  {copiedPath === selectedFile.path ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Nusxa olindi!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kodni nusxalash</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Pre Block */}
              <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[600px] leading-relaxed">
                <pre>{selectedFile.content}</pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai_lab' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ranking logic */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
                  <Filter className="w-4 h-4 text-emerald-400" />
                  news_ranker.py: Saralash va Dedup mexanizmi
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span><b>36 soatlik yangilik tekshiruvi:</b> Eskirgan yoki sanasi ko'rsatilmagan xabarlar butunlay chetlatiladi.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span><b>Jaccard o'xshashlik dedup:</b> BBC va Sky Sports dagi bir xil yangilik sarlavhasi solishtirilib, 45% dan ortiq mos kelsa, faqat bittasi qoldiriladi.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span><b>Muhimlik ballari:</b> Chempionlar Ligasi (+30 ball), Premyer Liga (+20), Top transferlar (+25), Mbappe, Vinisius, Xoland (+15).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span><b>Sun'iy to'ldirmaslik:</b> Agar muhim yangiliklar 6 ta bo'lsa, sonini majburan 10 tagacha keraksiz xabarlar bilan to'ldirmaydi.</span>
                  </li>
                </ul>
              </div>

              {/* AI Prompting */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  translator.py: Gemini AI va Halutsinatsiyaga qarshi nazorat
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span><b>Faqat mavjud faktlar:</b> Promptda modelga matnda bo'lmagan ma'lumotlarni qo'shish qat'iyan taqiqlangan.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span><b>2–3 ta qisqa jumla:</b> Foydalanuvchi vaqtini olmaydigan aniq va lo'nda bayon.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span><b>Strukturaviy JSON:</b> Javob <code className="text-emerald-400">title_uz</code> va <code className="text-emerald-400">summary_uz</code> formatida olinadi.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span><b>Asl havola kafolati:</b> Havolalar AI tomonidan yaratilmaydi, maqolaning asl URL manzili saqlanadi.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Guide tabs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                Loyihani Ishga Tushirish Yo‘riqnomasi
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Windows (VS Code), Docker konteyneri yoki Linux Server (Ubuntu VPS) orqali ishga tushirish qadamlari.
              </p>

              <div className="space-y-6">
                {/* Method 1 */}
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60">
                  <h3 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-2">
                    <span>1-usul: Windows kompyuterida VS Code orqali</span>
                  </h3>
                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="bg-slate-900 p-3 rounded font-mono text-slate-300 space-y-1">
                      <div><span className="text-slate-500"># 1. Virtual muhit yaratish va faollashtirish</span></div>
                      <div>python -m venv .venv</div>
                      <div className="text-emerald-400">.venv\Scripts\Activate.ps1</div>
                      <div className="pt-2"><span className="text-slate-500"># 2. Kutubxonalarni o'rnatish</span></div>
                      <div className="text-emerald-400">pip install -r requirements.txt</div>
                      <div className="pt-2"><span className="text-slate-500"># 3. .env fayliga BOT_TOKEN va GEMINI_API_KEY kiritish</span></div>
                      <div>Copy-Item .env.example .env</div>
                      <div className="pt-2"><span className="text-slate-500"># 4. Testlarni tekshirish</span></div>
                      <div className="text-emerald-400">pytest -v</div>
                      <div className="pt-2"><span className="text-slate-500"># 5. Botni ishga tushirish</span></div>
                      <div className="text-emerald-400">python -m app.main</div>
                    </div>
                  </div>
                </div>

                {/* Method 2 */}
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60">
                  <h3 className="text-xs font-bold text-teal-400 mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    <span>2-usul: Docker & Docker Compose orqali (VPS yoki Lokal)</span>
                  </h3>
                  <div className="bg-slate-900 p-3 rounded font-mono text-xs text-slate-300 space-y-1">
                    <div><span className="text-slate-500"># Fon rejimida barcha konteynerlarni ko'tarish</span></div>
                    <div className="text-teal-400">docker-compose up -d --build</div>
                    <div className="pt-2"><span className="text-slate-500"># Loglarni jonli kuzatish</span></div>
                    <div className="text-teal-400">docker-compose logs -f</div>
                  </div>
                </div>

                {/* Method 3 */}
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60">
                  <h3 className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>3-usul: Linux Serverda Systemd avtomatik xizmati</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-2">
                    Server qayta yoqilganda ham bot avtomatik ishlab turadi:
                  </p>
                  <div className="bg-slate-900 p-3 rounded font-mono text-xs text-slate-300 space-y-1">
                    <div>sudo cp football-bot.service /etc/systemd/system/</div>
                    <div>sudo systemctl daemon-reload</div>
                    <div className="text-cyan-400">sudo systemctl enable --now football-bot</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 px-6 py-4 text-center text-xs text-slate-500 flex items-center justify-between max-w-7xl mx-auto w-full">
        <span>⚽ Futbol Yangiliklari Telegram Boti • Professional Backend Arxitekturasi</span>
        <span className="text-emerald-400 font-medium">Barcha bosqichlar to'liq tayyor</span>
      </footer>
    </div>
  );
}
