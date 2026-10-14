# ⚽ Futbol Yangiliklari Telegram Boti

Ushbu bot **Python 3.11+**, **aiogram 3.x**, **httpx** va **Google Gemini AI** texnologiyalari asosida yaratilgan professional Telegram bot hisoblanadi.

Foydalanuvchi `/start` buyrug'ini yuborganida:
1. Xalqaro nufuzli futbol OAVlaridan (**BBC Sport**, **Sky Sports**, **ESPN**) bugungi yangiliklarni asinxron yuklaydi.
2. 36 soatdan eski yoki sanasi noma'lum xabarlarni chetlatadi.
3. Jaccard o'xshashlik tahlili orqali turli manbalardagi bir xil yangiliklarni filtrlaydi (deduplication).
4. Chempionlar Ligasi, top ligalar, muhim transferlar va yulduzlar bo'yicha baholab, eng muhim 5–10 tasini saralaydi.
5. Gemini AI orqali har bir xabarni **2–3 ta tabiiy o'zbekcha jumlada** qisqartirib bayon qiladi (faktlarni to'qib chiqarish qat'iyan taqiqlangan).
6. Har bir xabar ostiga asl maqola havolasi va `🔄 Yangiliklarni yangilash` inline tugmasini joylashtiradi.

---

## 📁 Loyiha tuzilishi

```text
football-news-bot/
├── app/
│   ├── handlers/
│   │   ├── __init__.py
│   │   ├── start.py          # /start va '🔄 Yangilash' tugmasi
│   │   └── commands.py       # /help, /sources, /status buyruqlari
│   ├── services/
│   │   ├── __init__.py
│   │   ├── news_fetcher.py   # BBC Sport, Sky Sports, ESPN RSS asinxron parser
│   │   ├── news_ranker.py    # Sana tekshiruvi, Jaccard dedup va reyting
│   │   └── translator.py     # Gemini AI orqali o'zbek tiliga qisqartirish
│   ├── utils/
│   │   ├── __init__.py
│   │   └── formatter.py      # Xavfsiz HTML escape va xabar shabloni
│   ├── __init__.py
│   ├── config.py             # Pydantic-settings va RSS manbalar
│   └── main.py               # Botni ishga tushirish (Long Polling)
├── tests/
│   ├── __init__.py
│   ├── test_basic.py         # Formatlash va HTML escape unit testlari
│   ├── test_ranker_translator.py # Saralash, dedup va AI prompt testlari
│   └── test_async_fetcher.py # Asinxron yuklash va tozalash testlari
├── .env.example              # Muhit o'zgaruvchilari namunasi
├── .gitignore                # Git ombori qoidalari
├── requirements.txt          # Kerakli Python kutubxonalari
├── Dockerfile                # Konteynerlash konfiguratsiyasi
├── docker-compose.yml        # Docker Compose sozlamasi
├── football-bot.service      # Linux VPS uchun Systemd xizmat fayli
├── run.bat                   # Windows uchun 1-klik bilan ishga tushirish
└── README.md                 # To'liq yo'riqnoma
```

---

## 🖥️ 1-usul: Windows kompyuterida VS Code orqali ishga tushirish

### 1-qadam: Virtual muhit (venv)
VS Code terminalida (`Ctrl + \``) bajaring:
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```
*(Agar ruxsat xatosi chiqsa: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` qiling).*

### 2-qadam: Kutubxonalarni o'rnatish
```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

### 3-qadam: `.env` faylini to'ldirish
```powershell
Copy-Item .env.example .env
```
`.env` faylini ochib:
```ini
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
GEMINI_API_KEY=AIzaSy...
```

### 4-qadam: Testlarni yurgizish
```powershell
pytest -v
```

### 5-qadam: Botni yoqish! 🚀
```powershell
python -m app.main
```
*(Yoki shunchaki `run.bat` faylini ikki marta bosing).*

---

## 🐳 2-usul: Docker va Docker Compose orqali ishga tushirish

Docker o'rnatilgan har qanday tizimda (Windows, Linux, macOS):
```bash
# 1. Sozlamalarni kiritish
cp .env.example .env
nano .env

# 2. Ishga tushirish
docker-compose up -d --build

# 3. Loglarni kuzatish
docker-compose logs -f
```

---

## 🐧 3-usul: Linux Serverda (Ubuntu / Debian VPS) Systemd xizmati sifatida

Bot server o'chib yonganda ham avtomatik qayta yonishi uchun:
```bash
# 1. Loyihani /opt katalogiga joylashtiring
sudo cp -r football-news-bot /opt/football-news-bot
cd /opt/football-news-bot

# 2. Virtual muhit va kutubxonalar
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
nano .env

# 3. Xizmatni yoqish
sudo cp football-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable football-bot
sudo systemctl start football-bot

# 4. Holatni tekshirish
sudo systemctl status football-bot
```

---

## 🤖 Bot buyruqlari

| Buyruq | Tavsifi |
|---|---|
| `/start` | Bugungi eng muhim futbol xabarlarini o'zbek tilida olish |
| `/help` | Botdan foydalanish bo'yicha qo'llanma |
| `/sources` | Xalqaro ishonchli RSS manbalari ro'yxati (BBC, Sky Sports, ESPN) |
| `/status` | Bot va server tizimi holati |
| `🔄 Yangiliklarni yangilash` | Bir marta bosish bilan xabarlarni qayta yangilash tugmasi |
