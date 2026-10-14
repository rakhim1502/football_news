"""
Yangiliklarni saralash, takroriylardan tozalash va muhimligini baholash servisi (2-bosqich)
"""
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Any

logger = logging.getLogger(__name__)

# Futboldagi eng muhim kalit so'zlar va ularning vaznlari
KEYWORD_WEIGHTS: dict[str, int] = {
    # Musobaqalar
    "champions league": 30,
    "ucl": 25,
    "premier league": 20,
    "la liga": 20,
    "serie a": 15,
    "bundesliga": 15,
    "world cup": 30,
    "euro": 25,
    "el clasico": 30,

    # Transferlar va muhim voqealar
    "transfer": 25,
    "signing": 20,
    "agrees deal": 20,
    "contract": 15,
    "sacked": 25,
    "appointed": 20,
    "injury": 15,
    "hat-trick": 20,
    "winner": 15,

    # Top klublar
    "real madrid": 15,
    "barcelona": 15,
    "manchester city": 15,
    "manchester united": 15,
    "liverpool": 15,
    "arsenal": 15,
    "bayern munich": 15,
    "psg": 15,
    "juventus": 12,
    "inter milan": 12,

    # Mashhur shaxslar
    "mbappe": 15,
    "haaland": 15,
    "vinicius": 15,
    "bellingham": 15,
    "messi": 15,
    "ronaldo": 15,
    "guardiola": 12,
    "ancelotti": 12,
}

class NewsRanker:
    """
    Futbol yangiliklarini sanasi, muhimligi va takrorlanmasligi bo'yicha saralovchi sinf
    """

    def is_fresh(self, article: dict[str, Any], max_hours: int = 36) -> bool:
        """
        Xabar oxirgi belgilangan soat (standart: 36 soat) ichida e'lon qilinganini tekshiradi.
        Eskirgan yoki sanasi noma'lum va shubhali xabarlarni bugungi yangilik deb ko'rsatmaydi.
        """
        pub = article.get("published")
        if not isinstance(pub, datetime):
            # Agar sana ko'rsatilmagan bo'lsa, xavfsizlik uchun rad etamiz
            return False

        # UTC vaqtiga moslash
        now_utc = datetime.now(timezone.utc)
        if pub.tzinfo is None:
            pub = pub.replace(tzinfo=timezone.utc)

        difference = now_utc - pub
        # Agar yangilik kelajak sanasida bo'lmasa va 36 soatdan eski bo'lmasa
        return timedelta(seconds=0) <= difference <= timedelta(hours=max_hours)

    def calculate_score(self, article: dict[str, Any]) -> int:
        """
        Yangilik sarlavhasi va mazmunidagi kalit so'zlarga qarab muhimlik ballini hisoblaydi
        """
        title = article.get("title", "").lower()
        summary = article.get("summary", "").lower()
        combined_text = f"{title} {summary}"

        score = 10  # Boshlang'ich ball

        for keyword, weight in KEYWORD_WEIGHTS.items():
            if keyword in combined_text:
                score += weight

        # Yangilik qanchalik yangi bo'lsa, qo'shimcha ball oladi
        pub = article.get("published")
        if isinstance(pub, datetime):
            now_utc = datetime.now(timezone.utc)
            if pub.tzinfo is None:
                pub = pub.replace(tzinfo=timezone.utc)
            hours_ago = (now_utc - pub).total_seconds() / 3600
            if hours_ago <= 6:
                score += 15
            elif hours_ago <= 12:
                score += 10
            elif hours_ago <= 24:
                score += 5

        return score

    def normalize_title(self, title: str) -> set[str]:
        """Sarlavhadan kalit so'zlar to'plamini ajratib oladi"""
        cleaned = re.sub(r"[^a-zA-Z0-9\s]", "", title.lower())
        words = set(cleaned.split())
        # Umumiy mayda so'zlarni tozalash (stop words)
        stop_words = {"the", "a", "an", "in", "on", "at", "for", "to", "of", "and", "is", "vs", "with"}
        return words - stop_words

    def deduplicate(self, articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Har xil manbalardagi bir xil voqea haqidagi xabarlarni aniqlaydi va takrorlarni olib tashlaydi.
        Jaccard o'xshashlik koeffitsiyenti asosida ishlaydi.
        """
        unique_articles: list[dict[str, Any]] = []

        for article in articles:
            article_words = self.normalize_title(article.get("title", ""))
            if not article_words:
                continue

            is_duplicate = False
            for existing in unique_articles:
                existing_words = self.normalize_title(existing.get("title", ""))
                intersection = article_words & existing_words
                union = article_words | existing_words

                similarity = len(intersection) / len(union) if union else 0.0

                # Agar ikki sarlavha 45% dan ortiq mos tushsa - bu bitta yangilik deb hisoblanadi
                if similarity >= 0.45:
                    is_duplicate = True
                    # Agar yangisi muhimroq manbadan yoki mazmuni uzunroq bo'lsa, almashtirish mumkin
                    if len(article.get("summary", "")) > len(existing.get("summary", "")):
                        unique_articles.remove(existing)
                        unique_articles.append(article)
                    break

            if not is_duplicate:
                unique_articles.append(article)

        return unique_articles

    def rank_and_select(
        self,
        articles: list[dict[str, Any]],
        min_count: int = 5,
        max_count: int = 10
    ) -> list[dict[str, Any]]:
        """
        1. Eskirgan xabarlarni chetlatadi.
        2. Takroriy yangiliklarni filtrlaydi.
        3. Muhimlik balli bo'yicha saralaydi.
        4. Eng muhim 5–10 ta yangilikni qaytaradi (yetarli bo'lmasa sun'iy to'ldirmaydi).
        """
        # 1. Faqat yangi xabarlar
        fresh_articles = [art for art in articles if self.is_fresh(art)]
        logger.info(f"{len(articles)} ta yangilikdan {len(fresh_articles)} tasi bugungi/yangi deb topildi.")

        # Agar yangi xabarlar juda kam bo'lsa (masalan tunda), mezonni 48 soatga kengaytiramiz
        if len(fresh_articles) < min_count:
            fresh_articles = [art for art in articles if self.is_fresh(art, max_hours=48)]

        # 2. Takroriylardan tozalash
        deduped = self.deduplicate(fresh_articles)
        logger.info(f"Takrorlanishlar o'chirilgach {len(deduped)} ta yangilik qoldi.")

        # 3. Muhimlik ballini hisoblash
        for item in deduped:
            item["score"] = self.calculate_score(item)

        # 4. Ball bo'yicha kamayish tartibida saralash
        sorted_articles = sorted(deduped, key=lambda x: x["score"], reverse=True)

        # 5. Belgilangan limitda tanlash (hech qachon sun'iy to'ldirilmaydi)
        selected = sorted_articles[:max_count]
        logger.info(f"Yakuniy saralangan eng muhim yangiliklar soni: {len(selected)}")
        return selected

news_ranker = NewsRanker()
