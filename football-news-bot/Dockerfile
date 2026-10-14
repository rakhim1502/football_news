FROM python:3.11-slim

# Muhit o'zgaruvchilari: buferlashni o'chirish va pycache yaratmaslik
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Tizim paketlarini yangilash
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Kutubxonalarni o'rnatish
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Loyiha kodini ko'chirish
COPY . .

# Botni ishga tushirish
CMD ["python", "-m", "app.main"]
