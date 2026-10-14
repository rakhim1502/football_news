"""
Yangiliklarni Gemini AI orqali o'zbek tiliga qisqartirish va tarjima qilish servisi (2-bosqich)
"""
import asyncio
import json
import logging
import re
from typing import Any
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

SYSTEM_PROMPT = """Sen professional sport jurnalisti va futbol sharhlovchisisan.
Sening vazifang — quyida berilgan xalqaro futbol yangiligini tahlil qilib, o'zbek tilida qisqa va qiziqarli qilib bayon etish.

QAT'IY QOIDALAR:
1. FAQAT berilgan maqola ma'lumotlariga tayangan holda yoz. Berilmagan faktlarni to'qib chiqarish (halutsinatsiya) QAT'IYAN TAQIQLANADI.
2. Xabarning sarlavhasini o'zbek tiliga jozibali qilib tarjima qil (title_uz).
3. Yangilikning asosiy mazmunini aniq 2–3 ta qisqa jumlada bayon qil (summary_uz).
4. Futbolchilar, murabbiylar va klublar nomlarini to'g'ri saqla (Masalan: Real Madrid, Barselona, Mbappe, Vinisius, Xoland, Manchester Siti, Gvardiola).
5. Javobni FAQAT quyidagi JSON formatida qaytar:
{
  "title_uz": "O'zbekcha sarlavha",
  "summary_uz": "2-3 jumlali qisqa mazmun."
}"""

class NewsTranslator:
    """
    Gemini API yordamida yangiliklarni o'zbek tiliga qisqartiruvchi servis
    """
    def __init__(self, api_key: str | None = None, concurrency: int = 4):
        self.api_key = api_key or settings.gemini_api_key
        self.semaphore = asyncio.Semaphore(concurrency)

    def _extract_json_response(self, text: str) -> dict[str, str] | None:
        """AI javobidan JSON blokini xavfsiz ajratib oladi"""
        try:
            # Agar to'g'ridan-to'g'ri JSON bo'lsa
            return json.loads(text.strip())
        except json.JSONDecodeError:
            pass

        # Markdown ```json ``` kod blokini qidirish
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Shunchaki qavslar orasidagi obyektni topish
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        return None

    async def summarize_single(
        self,
        client: httpx.AsyncClient,
        article: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Bitta yangilikni Gemini orqali o'zbekchaga o'giradi.
        Agar API kaliti bo'lmasa yoki xato bersa, xavfsiz fallback qaytaradi.
        """
        original_title = article.get("title", "")
        original_summary = article.get("summary", "")
        source_name = article.get("source_name", "Manba")

        # Agar Gemini kaliti belgilanmagan bo'lsa
        if not self.api_key or self.api_key in ("your_gemini_api_key_here", ""):
            return {
                **article,
                "title_uz": original_title,
                "summary_uz": original_summary or "Batafsil ma'lumotni quyidagi havola orqali o'qing."
            }

        prompt = (
            f"Manba: {source_name}\n"
            f"Sarlavha (Original): {original_title}\n"
            f"Mazmuni: {original_summary}\n\n"
            f"Iltimos, yuqoridagi qoidalarga binoan JSON shaklida o'zbekcha qisqartirib ber."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{SYSTEM_PROMPT}\n\n{prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 300,
                "responseMimeType": "application/json"
            }
        }

        async with self.semaphore:
            try:
                url = f"{GEMINI_API_URL}?key={self.api_key}"
                response = await client.post(
                    url,
                    json=payload,
                    timeout=settings.request_timeout_seconds
                )

                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        content_part = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        parsed_json = self._extract_json_response(content_part)
                        if parsed_json and "title_uz" in parsed_json:
                            return {
                                **article,
                                "title_uz": parsed_json["title_uz"].strip(),
                                "summary_uz": parsed_json.get("summary_uz", "").strip()
                            }

                logger.warning(
                    f"Gemini API javobida muammo bo'ldi (status: {response.status_code}): {response.text[:150]}"
                )
            except httpx.TimeoutException:
                logger.error(f"Gemini API so'rovida vaqt tugadi (Timeout: {original_title[:30]}...)")
            except Exception as e:
                logger.error(f"Gemini API xatoligi: {e}")

        # Fallback (xato yuz berganda bot to'xtab qolmasligi uchun)
        return {
            **article,
            "title_uz": original_title,
            "summary_uz": original_summary or "Batafsil ma'lumot quyidagi manba havolasida keltirilgan."
        }

    async def summarize_all(self, articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Barcha saralangan yangiliklarni parallel ravishda o'zbek tiliga qisqartiradi
        """
        if not articles:
            return []

        async with httpx.AsyncClient() as client:
            tasks = [self.summarize_single(client, art) for art in articles]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            processed: list[dict[str, Any]] = []
            for idx, res in enumerate(results):
                if isinstance(res, dict):
                    processed.append(res)
                else:
                    # Agar biror vazifada istisno bo'lsa, asl nusxasini qo'shamiz
                    orig = articles[idx]
                    processed.append({
                        **orig,
                        "title_uz": orig.get("title", ""),
                        "summary_uz": orig.get("summary", "")
                    })

            return processed

news_translator = NewsTranslator()
