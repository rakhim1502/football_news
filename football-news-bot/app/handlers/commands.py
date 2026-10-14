"""
Qo'shimcha bot buyruqlari: /help, /sources, /status
"""
from datetime import datetime
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.enums import ParseMode

from app.config import settings

router = Router(name="commands_router")

@router.message(Command("help"))
async def handle_help(message: Message) -> None:
    """Yordam va qo'llanma xabari"""
    text = (
        "📖 <b>Futbol Yangiliklari Boti Qo‘llanmasi</b>\n\n"
        "Ushbu bot xalqaro maydondagi eng ishonchli manbalardan (BBC Sport, Sky Sports, ESPN) bugungi futbol xabarlarini avtomatik tahlil qiladi va tabiiy o‘zbek tilida taqdim etadi.\n\n"
        "<b>Mavjud buyruqlar:</b>\n"
        "• /start — Bugungi eng muhim 5–10 ta futbol yangiliklarini olish\n"
        "• /sources — Yangiliklar olinadigan ishonchli manbalar ro‘yxati\n"
        "• /status — Bot va AI tizimi holatini tekshirish\n"
        "• /help — Ushbu yo‘riqnomani ko‘rsatish\n\n"
        "<i>Eslatma: Xabarlar ostidagi '🔄 Yangiliklarni yangilash' tugmasi orqali yangiliklarni tezkor yangilashingiz mumkin.</i>"
    )
    await message.answer(text, parse_mode=ParseMode.HTML)

@router.message(Command("sources"))
async def handle_sources(message: Message) -> None:
    """Ishonchli manbalar ro'yxatini ko'rsatish"""
    sources_text = "🌐 <b>Bot foydalanadigan ishonchli futbol manbalari:</b>\n\n"
    for idx, feed in enumerate(settings.rss_feeds, start=1):
        sources_text += f"{idx}. ⚽ <b>{feed['name']}</b>\n🔗 <code>{feed['url']}</code>\n\n"

    sources_text += (
        "💡 <i>Barcha manbalar faqat tekshirilgan va barqaror ishlovchi xalqaro RSS kanallaridir. "
        "Har bir yangilikka asl maqola havolasi ilova qilinadi.</i>"
    )
    await message.answer(sources_text, parse_mode=ParseMode.HTML, disable_web_page_preview=True)

@router.message(Command("status"))
async def handle_status(message: Message) -> None:
    """Bot holatini ko'rsatish"""
    now_str = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    ai_status = "Ulangan (Gemini 2.5 Flash)" if settings.gemini_api_key else "Standart rejimda"

    text = (
        "⚡ <b>Bot tizimi holati:</b>\n\n"
        f"• <b>Holat:</b> Faol va yangiliklarni qabul qilmoqda ✅\n"
        f"• <b>AI Tizimi:</b> {ai_status}\n"
        f"• <b>Manbalar soni:</b> {len(settings.rss_feeds)} ta xalqaro kanal\n"
        f"• <b>Maksimal yangiliklar soni:</b> {settings.max_news_count} ta\n"
        f"• <b>Server vaqti:</b> {now_str}\n"
    )
    await message.answer(text, parse_mode=ParseMode.HTML)
