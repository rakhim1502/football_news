"""
Telegram /start buyrug'i va interaktiv callback tugmalari uchun handler
"""
import logging
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
    """Xabar ostiga 'Yangilash' tugmasini qo'yish"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🔄 Yangiliklarni yangilash",
                    callback_data="refresh_news"
                )
            ]
        ]
    )

async def process_and_send_news(target: Message, user_name: str, is_edit: bool = False) -> None:
    """Yangiliklarni yuklash, saralash, AI qisqartirish va Telegramga yetkazishning to'liq sikli"""
    wait_text = (
        f"Assalomu alaykum, <b>{user_name}</b>! ⚽\n\n"
        "🔍 Bugungi eng muhim futbol yangiliklari xalqaro manbalardan (BBC Sport, Sky Sports, ESPN) olinmoqda va o'zbek tiliga tayyorlanmoqda...\n"
        "<i>Iltimos, bir necha soniya kuting.</i>"
    )

    if is_edit:
        status_msg = await target.edit_text(wait_text, parse_mode=ParseMode.HTML)
    else:
        status_msg = await target.answer(wait_text, parse_mode=ParseMode.HTML)

    try:
        # 1. Yangiliklarni yuklab olish
        raw_news = await news_fetcher.fetch_all_news()

        if not raw_news:
            await status_msg.edit_text(
                "⚽ Afsuski, ayni paytda bugungi futbol yangiliklari topilmadi yoki internetga ulanishda uzilish bor. "
                "Birozdan so'ng qayta urinib ko'ring.",
                parse_mode=ParseMode.HTML,
                reply_markup=get_refresh_keyboard()
            )
            return

        # 2. Muhimlik va bugungi sana bo'yicha saralash (5–10 ta)
        ranked_news = news_ranker.rank_and_select(
            raw_news,
            min_count=5,
            max_count=settings.max_news_count
        )

        if not ranked_news:
            await status_msg.edit_text(
                "⚽ Bugun e'lon qilingan yangi futbol xabarlari yetarli emas yoki barcha xabarlar eskirgan. "
                "Yangi voqealar e'lon qilingach, qayta urinib ko'ring.",
                parse_mode=ParseMode.HTML,
                reply_markup=get_refresh_keyboard()
            )
            return

        # 3. Gemini AI orqali o'zbek tiliga 2-3 jumlada qisqartirish
        summarized_news = await news_translator.summarize_all(ranked_news)

        # 4. Telegram uchun HTML shaklida formatlash
        formatted_messages = format_news_post(summarized_news)

        # 5. Status xabarini o'chirish
        await status_msg.delete()

        # 6. Xabarlarni jo'natish (oxirgi qismga 'Yangilash' tugmasini ilova qilish)
        for i, chunk in enumerate(formatted_messages):
            is_last = (i == len(formatted_messages) - 1)
            await target.answer(
                chunk,
                parse_mode=ParseMode.HTML,
                disable_web_page_preview=True,
                reply_markup=get_refresh_keyboard() if is_last else None
            )

    except Exception as e:
        logger.error(f"Yangiliklarni tayyorlashda xatolik: {e}", exc_info=True)
        await status_msg.edit_text(
            "⚠️ Yangiliklarni yuklash yoki tarjima qilishda texnik nosozlik yuz berdi. "
            "Iltimos, birozdan so'ng qayta urinib ko'ring.",
            parse_mode=ParseMode.HTML,
            reply_markup=get_refresh_keyboard()
        )

@router.message(CommandStart())
async def handle_start(message: Message) -> None:
    """/start buyrug'ini qabul qiladi"""
    user_name = message.from_user.first_name if message.from_user else "Foydalanuvchi"
    await process_and_send_news(message, user_name)

@router.callback_query(F.data == "refresh_news")
async def handle_refresh_callback(callback: CallbackQuery) -> None:
    """'Yangiliklarni yangilash' tugmasi bosilganda yangiliklarni qayta olib beradi"""
    await callback.answer("Eng so'nggi yangiliklar tekshirilmoqda...")
    user_name = callback.from_user.first_name if callback.from_user else "Foydalanuvchi"
    if callback.message and isinstance(callback.message, Message):
        await process_and_send_news(callback.message, user_name, is_edit=False)
