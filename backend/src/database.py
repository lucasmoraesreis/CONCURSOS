"""
Engine e Session assíncrono do SQLAlchemy para o backend FastAPI.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.config import settings


engine = create_async_engine(
    settings.async_database_url,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """Dependency injection para sessão do banco."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
