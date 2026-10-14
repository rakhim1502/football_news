"""
1-bosqich uchun asosiy testlar: formatter va konfiguratsiya tekshiruvi
"""
import pytest
from app.utils.formatter import escape_html, format_news_post

def test_escape_html():
    raw = "Real Madrid <vs> Barcelona & Manchester United"
    escaped = escape_html(raw)
    assert "<" not in escaped
    assert ">" not in escaped
    assert "&lt;" in escaped
    assert "&gt;" in escaped
    assert "&amp;" in escaped

def test_format_news_post_empty():
    res = format_news_post([])
    assert len(res) == 1
    assert "topilmadi" in res[0]

def test_format_news_post_items():
    sample = [
        {
            "title": "Mbappe dubl qayd etdi",
            "summary": "Real Madrid o'z uyida g'alabaga erishdi.",
            "source_name": "BBC Sport",
            "link": "https://bbc.com/sport/football/123"
        }
    ]
    res = format_news_post(sample)
    assert len(res) == 1
    assert "BUGUNGI FUTBOL YANGILIKLARI" in res[0]
    assert "Mbappe dubl qayd etdi" in res[0]
    assert "https://bbc.com/sport/football/123" in res[0]
