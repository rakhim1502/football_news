from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os
from pathlib import Path

# Loyihaning asosiy yo'li (football-news-bot papkasi)
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    """
    Bot konfiguratsiyasi va muhit o'zgaruvchilari
    """
    bot_token: str = Field(default="", alias="BOT_TOKEN")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    max_news_count: int = Field(default=7, alias="MAX_NEWS_COUNT")
    request_timeout_seconds: int = Field(default=10, alias="REQUEST_TIMEOUT_SECONDS")

    # Ishonchli futbol RSS manbalari ro'yxati
    rss_feeds: list[dict[str, str]] = [
        {
            "name": "BBC Sport Football",
            "url": "http://feeds.bbci.co.uk/sport/football/rss.xml"
        },
        {
            "name": "Sky Sports Football",
            "url": "https://www.skysports.com/rss/12040"
        },
        {
            "name": "ESPN FC",
            "url": "https://www.espn.com/espn/rss/football/news"
        }
    ]

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
