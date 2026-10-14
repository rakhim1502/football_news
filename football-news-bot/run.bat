@echo off
chcp 65001 > nul
echo ===================================================
echo ⚽ Futbol Yangiliklari Telegram Botini ishga tushirish
echo ===================================================

REM 1. Virtual muhit mavjudligini tekshirish
IF NOT EXIST ".venv" (
    echo [1/3] Virtual muhit (.venv) topilmadi. Yaratilmoqda...
    python -m venv .venv
    echo [2/3] Kutubxonalar o'rnatilmoqda...
    call .venv\Scripts\activate.bat
    pip install --upgrade pip
    pip install -r requirements.txt
) ELSE (
    call .venv\Scripts\activate.bat
)

REM 2. .env mavjudligini tekshirish
IF NOT EXIST ".env" (
    echo [OGOHLANTIRISH] .env fayli topilmadi!
    echo .env.example dan nusxa olinmoqda...
    copy .env.example .env
    echo Iltimos, .env faylini ochib, BOT_TOKEN ni kiriting va qayta ishga tushiring!
    pause
    exit /b
)

echo [3/3] Bot ishga tushirilmoqda...
python -m app.main
pause
