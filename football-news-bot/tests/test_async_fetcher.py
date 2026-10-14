"""
Asinxron fetcher va feed parser unit testlari
"""
import pytest
from app.services.news_fetcher import clean_html, NewsFetcher

def test_clean_html():
    raw = "<p>Real Madrid won <b>2-0</b> against opponent.<br><a href='http://link'>Read</a></p>"
    cleaned = clean_html(raw)
    assert "<p>" not in cleaned
    assert "<b>" not in cleaned
    assert "Real Madrid won 2-0 against opponent. Read" == cleaned

@pytest.mark.asyncio
async def test_fetcher_initialization():
    fetcher = NewsFetcher(timeout=5)
    assert fetcher.timeout == 5
    assert "FootballNewsBot" in fetcher.headers["User-Agent"]
