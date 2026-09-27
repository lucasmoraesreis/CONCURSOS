import asyncio
from src.database import AsyncSessionLocal, active_db_url
from sqlalchemy import select, func
from src.models import Concurso, Banca, Questao

async def main():
    print("Active DB URL:", active_db_url)
    async with AsyncSessionLocal() as session:
        c_count = await session.scalar(select(func.count(Concurso.id)))
        b_count = await session.scalar(select(func.count(Banca.id)))
        q_count = await session.scalar(select(func.count(Questao.id)))
        print(f"Counts in Active DB: Concursos={c_count}, Bancas={b_count}, Questoes={q_count}")

if __name__ == "__main__":
    asyncio.run(main())
