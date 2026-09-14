"""
Engine e Session do SQLAlchemy para o pipeline.
Usa conexão síncrona para processamento batch.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from src.config import settings


engine = create_engine(
    settings.database_url_sync,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_session() -> Session:
    """Retorna uma sessão do banco de dados."""
    return SessionLocal()
