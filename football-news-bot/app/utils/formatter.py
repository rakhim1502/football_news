"""
Telegram xabarlarini formatlash va HTML belgilarni xavfsiz escape qilish moduli
"""
import html
from datetime import datetime
from typing import Any

def escape_html(text: str) -> str:
    """HTML maxsus belgilarini xavfsiz shaklga keltiradi (<, >, &)"""
    if not text:
        return ""
    return html.escape(str(text).strip())

def format_news_post(news_items: list[dict[str, Any]]) -> list[str]:
    """
    Yangiliklar ro'yxatini Telegram uchun talab qilingan HTML formatiga keltiradi.
    Agar xabar 4000 belgidan oshsa, Telegram limitiga mos ravishda qismlarga bo'ladi.
    """
    if not news_items:
        return ["⚽ Bugun e'lon qilingan muhim futbol yangiliklari topilmadi."]

    today_str = datetime.now().strftime("%d.%m.%Y")
    header = f"⚽ <b>BUGUNGI FUTBOL YANGILIKLARI</b>\n📅 <i>{today_str}</i>\n\n"

    messages: list[str] = []
    current_message = header

    for idx, item in enumerate(news_items, start=1):
        # O'zbek tilidagi sarlavha va qisqartma (yoki asliga qaytish)
        title = escape_html(item.get("title_uz") or item.get("title", "Futbol yangiligi"))
        summary = escape_html(item.get("summary_uz") or item.get("summary", ""))
        source_name = escape_html(item.get("source_name", "Manba"))
        url = item.get("link", "#").strip()

        # Har bir yangilik bloki:
        # 1. 🔥 Yangilik sarlavhasi
        # Qisqa o‘zbekcha mazmuni.
        #
        # 🔗 <a href="ASL_MAQOLA_URL">Manbani o‘qish (Manba)</a>
        news_block = (
            f"{idx}. 🔥 <b>{title}</b>\n"
            f"{summary}\n\n"
            f"🔗 <a href=\"{url}\">Manbani o‘qish ({source_name})</a>\n\n"
            f"━━━━━━━━━━━━━━━━━━━\n\n"
        )

        # Telegram xabar limiti (4096 belgidan oshib ketmasligi uchun 3800 belgida qirqamiz)
        if len(current_message) + len(news_block) > 3800:
            messages.append(current_message.strip())
            current_message = f"⚽ <b>DAVOMI (Futbol yangiliklari):</b>\n\n" + news_block
        else:
            current_message += news_block

    if current_message.strip():
        messages.append(current_message.strip())

    return messages
