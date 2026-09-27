"""
Engine e Session assíncrono do SQLAlchemy para o backend FastAPI.
"""

from loguru import logger
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.config import settings, PROJECT_ROOT
from src.models import Base


def create_engine_for_url(url: str):
    """Cria engine assíncrona com configurações adequadas ao dialeto e otimizada para hiperescala (C10M)."""
    if "sqlite" in url:
        return create_async_engine(
            url,
            connect_args={"check_same_thread": False, "timeout": 30},
            echo=False,
        )
    return create_async_engine(
        url,
        pool_size=50,
        max_overflow=50,
        pool_timeout=5.0,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=False,
    )


import socket


def resolve_database_url() -> str:
    """Detecta automaticamente se o PostgreSQL local está rodando; caso contrário, seleciona SQLite."""
    url = settings.async_database_url
    if "localhost:5432" in url or "127.0.0.1:5432" in url:
        try:
            with socket.create_connection(("localhost", 5432), timeout=0.3):
                return url
        except Exception:
            sqlite_path = PROJECT_ROOT / "questoes.db"
            logger.info("ℹ️ PostgreSQL não detectado em localhost:5432. Ativando banco de dados local SQLite (questoes.db).")
            return f"sqlite+aiosqlite:///{sqlite_path.as_posix()}"
    return url


active_db_url = resolve_database_url()
engine = create_engine_for_url(active_db_url)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    """
    Inicializa o banco de dados.
    Verifica a conectividade e, se o PostgreSQL local estiver desligado/inacessível,
    ativa automaticamente o fallback local SQLite (questoes.db) para garantir que
    o usuário consiga acessar a plataforma imediatamente.
    """
    global engine, AsyncSessionLocal

    is_postgres = "postgresql" in settings.async_database_url
    if is_postgres:
        try:
            async with engine.connect() as conn:
                pass
            logger.info("✅ Conexão com PostgreSQL ativa e validada.")
        except Exception as e:
            logger.warning(
                f"⚠️ PostgreSQL local inacessível ({e}). "
                "Ativando fallback autônomo local SQLite (questoes.db) para acesso imediato sem Docker!"
            )
            sqlite_path = PROJECT_ROOT / "questoes.db"
            sqlite_url = f"sqlite+aiosqlite:///{sqlite_path.as_posix()}"
            await engine.dispose()
            engine = create_engine_for_url(sqlite_url)
            AsyncSessionLocal = async_sessionmaker(
                bind=engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )

    # Cria todas as tabelas mapeadas no ORM se não existirem
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Estrutura de tabelas verificada e sincronizada.")


from contextlib import asynccontextmanager


@asynccontextmanager
async def get_db_session():
    """Context manager dinâmico para sessões do banco."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_db():
    """Dependency injection para endpoints FastAPI."""
    async with get_db_session() as session:
        yield session
