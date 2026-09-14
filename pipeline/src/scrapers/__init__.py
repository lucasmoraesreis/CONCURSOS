"""Scrapers modulares por banca e minerador DF."""

from src.scrapers.base_scraper import BaseScraper, ConcursoInfo
from src.scrapers.cebraspe import CebraspeScraper
from src.scrapers.iades import IADESScraper
from src.scrapers.quadrix import QuadrixScraper
from src.scrapers.df_historical_scraper import DFHistoricalScraper

__all__ = [
    "BaseScraper",
    "ConcursoInfo",
    "CebraspeScraper",
    "IADESScraper",
    "QuadrixScraper",
    "DFHistoricalScraper",
]
