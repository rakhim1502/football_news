"""
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

# Log tizimini sozlash
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("football_news_bot")

async def main() -> None:
    """Botni sozlash va ishga tushirish (Long Polling)"""
    if not settings.bot_token or settings.bot_token == "your_telegram_bot_token_here":
        logger.error(
            "❌ XATOLIK: BOT_TOKEN aniqlanmadi!\n"
            "Iltimos, '.env' faylini oching va @BotFather dan olingan bot tokeningizni kiriting:\n"
            "BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
        )
        sys.exit(1)

    logger.info("🤖 Futbol Yangiliklari boti ishga tushirilmoqda...")

    # Bot va Dispatcher obyektlari
    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )
    dp = Dispatcher()

    # Routerlarni ulash
    dp.include_router(commands_router)
    dp.include_router(start_router)

    try:
        # Eski kutilayotgan yangilanishlarni tozalash
        await bot.delete_webhook(drop_pending_updates=True)
        bot_info = await bot.get_me()
        logger.info(f"✅ Bot muvaffaqiyatli ulandi: @{bot_info.username} (ID: {bot_info.id})")
        logger.info("📡 Xabarlar kutilmoqda (polling rejimida)... To'xtatish uchun Ctrl+C bosing.")
        
        await dp.start_polling(bot)
    except Exception as e:
        logger.critical(f"Bot ishlashida jiddiy xato: {e}", exc_info=True)
    finally:
        await bot.session.close()
        logger.info("Bot sessiyasi yopildi.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot to'xtatildi.")
