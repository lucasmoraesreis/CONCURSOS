import asyncio
import os
import sys

# Ensure utf-8 output encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from httpx import AsyncClient, ASGITransport
from src.main import app
from src.database import init_db

async def run_tests():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health check
        r = await client.get("/health")
        assert r.status_code == 200
        print("1. Health OK:", r.json()["status"])

        # 2. Gamification endpoint
        r = await client.get("/api/study/gamification")
        assert r.status_code == 200
        data = r.json()
        print("2. Gamification OK:")
        print(f"   - XP Total: {data['xp_total']}")
        print(f"   - Liga: {data['liga']['nome']} (Nível {data['liga']['nivel']})")
        print(f"   - Conquistas: {data['conquistas_desbloqueadas']}/{data['conquistas_total']}")
        for badge in data["badges"]:
            status_str = "Desbloqueado" if badge["unlocked"] else f"{badge['progresso_pct']}%"
            print(f"     * {badge['icone']} {badge['titulo']}: {status_str}")

        # 3. Questões list
        r = await client.get("/api/questoes?limit=2")
        assert r.status_code == 200
        q_data = r.json()
        print(f"3. Questões OK: {len(q_data['items'])} questões retornadas (Total banco: {q_data['total']})")

        # 4. Study streak
        r = await client.get("/api/study/streak")
        assert r.status_code == 200
        s_data = r.json()
        print(f"4. Study Streak OK: {s_data['dias_consecutivos']} dias consecutivos, respondidas hoje: {s_data['respondidas_hoje']}")

        print("\n✅ TODAS AS INTEGRAÇÕES E EVOLUÇÕES PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(run_tests())
