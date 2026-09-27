import asyncio
import httpx
from httpx import ASGITransport
from src.main import app

async def test_suite():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        h = await client.get("/health")
        print("Health check:", h.status_code, h.json())

        # 2. Prompt Security Check
        sec_payload = {"prompt": "Explique o art. 5 da CF/88"}
        sec_resp = await client.post("/api/questoes/prompt-check", json=sec_payload)
        print("Security Check:", sec_resp.status_code, sec_resp.json())

        # 3. List questions to get an ID for Appeal & Jurisprudence test
        q_resp = await client.get("/api/questoes?limit=1")
        print("Questions status:", q_resp.status_code)
        items = q_resp.json().get("items", [])
        if items:
            qid = items[0]["id"]
            print("Testing on Questao ID:", qid)

            # 4. Appeal simulator
            rec_payload = {
                "alternativa_marcada": "E",
                "argumentacao": "A questão possui evidente ambiguidade doutrinária, haja vista que a corrente majoritária entende de forma contrária ao gabarito preliminar.",
                "tipo_pedido": "anulacao"
            }
            rec_resp = await client.post(f"/api/questoes/{qid}/recurso", json=rec_payload)
            print("Recurso Banca:", rec_resp.status_code, rec_resp.json().get("parecer"))

            # 5. Jurisprudência
            jur_resp = await client.get(f"/api/questoes/{qid}/jurisprudencia")
            print("Jurisprudencia:", jur_resp.status_code, jur_resp.json().get("tema_central"))

        # 6. Redação Temas
        temas_resp = await client.get("/api/redacao/temas")
        print("Redacao Temas:", temas_resp.status_code, len(temas_resp.json()))

        # 7. Redação Corrigir
        red_payload = {
            "tema": "O papel das polícias judiciárias no enfrentamento ao crime organizado",
            "texto_aluno": "O enfrentamento ao crime organizado exige atuação integrada entre as forças policiais e o uso de inteligência financeira. Nesse sentido, o bloqueio de bens ilícitos mostra-se essencial para a desarticulação das organizações criminosas.",
            "banca": "Cebraspe",
            "tipo_redacao": "Dissertação Argumentativa"
        }
        red_corr = await client.post("/api/redacao/corrigir", json=red_payload)
        print("Redacao Corrigida:", red_corr.status_code, "Nota:", red_corr.json().get("nota_final"))

        # 8. Psicólogo
        psi_payload = {
            "mensagem": "Estou muito ansioso com a proximidade da prova do concurso e com medo de esquecer tudo.",
            "nivel_ansiedade": 8,
            "contexto_estudo": "Reta final PF"
        }
        psi_resp = await client.post("/api/mentoria/psicologo/consultar", json=psi_payload)
        print("Psicologo:", psi_resp.status_code, "Técnica:", psi_resp.json().get("tecnica_sugerida"))

        # 9. Cronograma
        crono_resp = await client.get("/api/mentoria/cronograma")
        print("Cronograma:", crono_resp.status_code, "Dias:", len(crono_resp.json().get("dias", [])))

        # 10. Ranking
        rank_resp = await client.get("/api/mentoria/ranking")
        print("Ranking:", rank_resp.status_code, "Posicao:", rank_resp.json().get("posicao_usuario"))

if __name__ == "__main__":
    asyncio.run(test_suite())
