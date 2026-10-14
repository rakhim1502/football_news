"""
2-bosqich testlari: news_ranker va translator modullarini tekshirish
"""
from datetime import datetime, timezone, timedelta
import pytest
from app.services.news_ranker import news_ranker
from app.services.translator import news_translator
from app.utils.formatter import format_news_post

def test_freshness_filter():
    """Yangi va eskirgan maqolalarni to'g'ri ajrata olishi"""
    now = datetime.now(timezone.utc)

    fresh_article = {
        "title": "Mbappe gol urdi",
        "published": now - timedelta(hours=3),
        "link": "https://example.com/1"
    }

    old_article = {
        "title": "O'tgan haftadagi o'yin",
        "published": now - timedelta(days=5),
        "link": "https://example.com/2"
    }

    undated_article = {
        "title": "Noma'lum sanadagi xabar",
        "published": None,
        "link": "https://example.com/3"
    }

    assert news_ranker.is_fresh(fresh_article) is True
    assert news_ranker.is_fresh(old_article) is False
    assert news_ranker.is_fresh(undated_article) is False

def test_scoring_weights():
    """Champions League va Real Madrid yangiligi oddiy xabardan yuqori ball olishi kerak"""
    top_article = {
        "title": "Champions League: Real Madrid and Mbappe win thriller",
        "summary": "Late goal decided the match.",
        "published": datetime.now(timezone.utc) - timedelta(hours=2)
    }

    minor_article = {
        "title": "Friendly match ended in draw",
        "summary": "Both teams tested new tactics.",
        "published": datetime.now(timezone.utc) - timedelta(hours=20)
    }

    top_score = news_ranker.calculate_score(top_article)
    minor_score = news_ranker.calculate_score(minor_article)

    assert top_score > minor_score
    assert top_score >= 50

def test_deduplication():
    """Turli manbalardagi bir xil mavzudagi xabarlar takrorlanmasligi kerak"""
    articles = [
        {
            "title": "Haaland hat-trick seals Manchester City victory",
            "summary": "Short summary 1",
            "link": "https://bbc.com/sport/football/1",
            "source_name": "BBC Sport"
        },
        {
            "title": "Manchester City victory as Haaland scores hat-trick",
            "summary": "More detailed summary 2 from Sky Sports",
            "link": "https://skysports.com/football/1",
            "source_name": "Sky Sports"
        },
        {
            "title": "Barcelona manager discusses upcoming El Clasico",
            "summary": "Press conference summary",
            "link": "https://espn.com/football/2",
            "source_name": "ESPN"
        }
    ]

    deduped = news_ranker.deduplicate(articles)
    assert len(deduped) == 2  # Haaland haqidagi ikkita xabar 1 taga qisqarishi kerak

def test_json_extraction():
    """Gemini AI qaytargan JSON matnini xavfsiz o'qiy olishi"""
    raw_json_str = '```json\n{\n  "title_uz": "Real Madrid g\'alaba qozondi",\n  "summary_uz": "Mbappe dubl qayd etdi."\n}\n```'
    parsed = news_translator._extract_json_response(raw_json_str)

    assert parsed is not None
    assert parsed["title_uz"] == "Real Madrid g'alaba qozondi"
    assert parsed["summary_uz"] == "Mbappe dubl qayd etdi."

def test_format_news_post_with_uzbek_fields():
    """O'zbekcha tarjima qilingan xabarlarni to'g'ri HTML shaklga keltirish"""
    articles = [
        {
            "title": "Champions League preview",
            "title_uz": "Chempionlar Ligasi: Bugungi hal qiluvchi bahslar",
            "summary": "English summary",
            "summary_uz": "Bugun yarim final yo'llanmasi uchun eng kuchli klublar to'qnash keladi.",
            "source_name": "Sky Sports",
            "link": "https://skysports.com/ucl"
        }
    ]

    formatted = format_news_post(articles)
    assert len(formatted) == 1
    post = formatted[0]

    assert "BUGUNGI FUTBOL YANGILIKLARI" in post
    assert "Chempionlar Ligasi: Bugungi hal qiluvchi bahslar" in post
    assert "Bugun yarim final yo'llanmasi" in post
    assert "https://skysports.com/ucl" in post
    assert "Sky Sports" in post
