"""
Futbol yangiliklarini ishonchli RSS manbalardan asinxron yuklab oluvchi servis
"""
import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any
import feedparser
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

def clean_html(raw_html: str) -> str:
    """Matndan ortiqcha HTML teglarni tozalaydi"""
    if not raw_html:
        return ""
    clean = re.sub(r"<.*?>", "", raw_html)
    return " ".join(clean.split())

class NewsFetcher:
    """
    RSS feedlardan yangiliklarni asinxron yuklovchi va qayta ishlovchi sinf
    """
    def __init__(self, timeout: int | None = None):
        self.timeout = timeout or settings.request_timeout_seconds
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FootballNewsBot/1.0"
        }

    async def fetch_single_feed(self, client: httpx.AsyncClient, feed_info: dict[str, str]) -> list[dict[str, Any]]:
        """Bitta RSS manzilidan yangiliklarni yuklaydi"""
        source_name = feed_info["name"]
        url = feed_info["url"]
        articles: list[dict[str, Any]] = []

        try:
            response = await client.get(url, headers=self.headers, timeout=self.timeout)
            if response.status_code != 200:
                logger.warning(f"[{source_name}] manbasidan xato status qaytdi: {response.status_code}")
                return articles

            parsed = feedparser.parse(response.text)
            for entry in parsed.entries[:10]:
                title = getattr(entry, "title", "").strip()
                link = getattr(entry, "link", "").strip()
                summary = clean_html(getattr(entry, "summary", "") or getattr(entry, "description", ""))

                # Chop etilgan sana
                published = None
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                    published = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)

                if title and link:
                    articles.append({
                        "title": title,
                        "link": link,
                        "summary": summary,
                        "source_name": source_name,
                        "published": published,
                    })

            logger.info(f"[{source_name}] dan {len(articles)} ta yangilik muvaffaqiyatli yuklandi.")
        except httpx.TimeoutException:
            logger.error(f"[{source_name}] uchun so'rov vaqti tugadi (Timeout: {self.timeout}s).")
        except Exception as e:
            logger.error(f"[{source_name}] yangiliklarini yuklashda kutilmagan xatolik: {e}")

        return articles

    async def fetch_all_news(self) -> list[dict[str, Any]]:
        """Barcha sozlangan manbalardan parallel ravishda yangiliklarni yuklaydi"""
        all_articles: list[dict[str, Any]] = []
        limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)

        async with httpx.AsyncClient(limits=limits, follow_redirects=True) as client:
            tasks = [
                self.fetch_single_feed(client, feed)
                for feed in settings.rss_feeds
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for res in results:
                if isinstance(res, list):
                    all_articles.extend(res)
                elif isinstance(res, Exception):
                    logger.error(f"Parallel yuklashda xatolik yuz berdi: {res}")

        # Takroriy yangiliklarni (link bo'yicha) filtrlash
        seen_links = set()
        unique_articles = []
        for item in all_articles:
            if item["link"] not in seen_links:
                seen_links.add(item["link"])
                unique_articles.append(item)

        logger.info(f"Jami {len(unique_articles)} ta takrorlanmagan yangilik olindi.")
        return unique_articles

news_fetcher = NewsFetcher()
