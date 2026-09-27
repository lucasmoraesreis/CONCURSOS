import asyncio
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from httpx import AsyncClient, ASGITransport
from src.main import app
from src.database import init_db

SAMPLE_EDITAL_TEXT = """
LÍNGUA PORTUGUESA:
1. Compreensão e interpretação de textos de gêneros variados.
2. Reconhecimento de tipos e gêneros textuais.
3. Domínio da ortografia oficial e acentuação gráfica.
4. Emprego do sinal indicativo de crase.

DIREITO CONSTITUCIONAL:
1. Direitos e garantias fundamentais: direitos individuais e coletivos.
2. Ações constitucionais: habeas corpus, mandado de segurança.
3. Organização do Estado: competências da União.
"""

async def test_edital_and_stats():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Test POST /api/study/edital/import
        payload = {
            "banca_nome": "Fundação Getulio Vargas - FGV",
            "orgao": "Tribunal de Justiça de SP",
            "cargo": "Analista Judiciário",
            "ano": 2026,
            "nivel": "Superior",
            "conteudo_programatico_texto": SAMPLE_EDITAL_TEXT,
            "gerar_ineditas_quantidade": 2
        }
        print("Enviando requisição de importação de edital...")
        r = await client.post("/api/study/edital/import", json=payload)
        print("Status importação:", r.status_code)
        assert r.status_code == 200, r.text
        data = r.json()
        print("✅ Edital Importado com Sucesso:")
        print(f"   - Título: {data['titulo']}")
        print(f"   - Total Disciplinas: {data['total_disciplinas']}")
        print(f"   - Total Tópicos: {data['total_topicos']}")
        print(f"   - Questões Passadas Vinculadas: {data['total_questoes_vinculadas']}")
        print(f"   - Questões Inéditas Geradas e Salvas no Banco: {data['total_questoes_geradas']}")
        for d in data["disciplinas"]:
            print(f"     * {d['disciplina']}: {len(d['topicos'])} tópicos (Passadas: {d['questoes_passadas_encontradas']}, Inéditas: {d['questoes_ineditas_geradas']})")

        # 2. Test GET /api/questoes/{id}/estatisticas
        # Grab a question from the DB
        rq = await client.get("/api/questoes?limit=1")
        assert rq.status_code == 200
        q_item = rq.json()["items"][0]
        q_id = q_item["id"]

        r_stat = await client.get(f"/api/questoes/{q_id}/estatisticas")
        print("Status estatísticas questão:", r_stat.status_code)
        assert r_stat.status_code == 200, r_stat.text
        s_data = r_stat.json()
        print("✅ Estatísticas & Pegadinha da Banca Calculadas:")
        print(f"   - Índice de Acerto: {s_data['indice_acerto']}%")
        print(f"   - Índice de Pegadinha: {s_data['indice_pegadinha']}%")
        print(f"   - Alternativa Pegadinha: {s_data['pegadinha_letra']}")
        print(f"   - Dica Antídoto: {s_data['dica_antidoto']}")
        for opt in s_data["distribuicao"]:
            tag = " [GABARITO]" if opt["is_correta"] else " [PEGADINHA]" if opt["is_pegadinha"] else ""
            print(f"     [{opt['letra']}]: {opt['percentual']}%{tag}")

        print("\n🎉 TODOS OS TESTES DO BACKEND PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    asyncio.run(test_edital_and_stats())
