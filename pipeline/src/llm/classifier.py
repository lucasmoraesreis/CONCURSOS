"""
Classificador de questões usando Google Gemini.

Classifica cada questão em:
- disciplina (matéria geral): Ex: "Direito Administrativo"
- assunto (tópico específico): Ex: "Atos Administrativos - Invalidação"
"""

import json
import re
from loguru import logger
from google import genai

from src.llm.client import call_gemini
from src.extractors.question_parser import QuestaoParsed


SYSTEM_INSTRUCTION = """Você é um especialista em concursos públicos brasileiros.
Sua tarefa é classificar questões de prova em disciplina e assunto com base no conteúdo.

REGRAS:
1. A "disciplina" é a matéria geral (ex: "Direito Administrativo", "Português", "Raciocínio Lógico", "Informática").
2. O "assunto" é o tópico específico dentro da disciplina (ex: "Atos Administrativos - Invalidação", "Concordância Verbal", "Lógica Proposicional").
3. Use nomenclatura padrão de editais de concursos públicos brasileiros.
4. Seja preciso e consistente na classificação.

Responda APENAS com JSON válido, sem texto adicional."""


def classify_question(
    client: genai.Client,
    questao: QuestaoParsed,
) -> dict[str, str]:
    """
    Classifica uma questão em disciplina e assunto.

    Returns:
        {"disciplina": "...", "assunto": "..."}
    """
    alternativas_text = ""
    if questao.alternativas:
        alternativas_text = "\n".join(
            f"  {a.letra}) {a.texto}" for a in questao.alternativas
        )

    prompt = f"""Classifique a seguinte questão de concurso público:

ENUNCIADO:
{questao.enunciado}

{f"ALTERNATIVAS:{chr(10)}{alternativas_text}" if alternativas_text else ""}

Responda EXATAMENTE neste formato JSON:
{{"disciplina": "Nome da Disciplina", "assunto": "Tópico Específico"}}"""

    try:
        response_text = call_gemini(
            client=client,
            prompt=prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.1,
            max_tokens=200,
        )

        # Extrai JSON da resposta (pode vir com markdown)
        json_match = re.search(r"\{[^}]+\}", response_text)
        if json_match:
            result = json.loads(json_match.group())
            return {
                "disciplina": result.get("disciplina", "Não classificado"),
                "assunto": result.get("assunto", "Geral"),
            }

        logger.warning(f"Resposta do Gemini sem JSON válido: {response_text[:200]}")
        return {"disciplina": "Não classificado", "assunto": "Geral"}

    except Exception as e:
        logger.error(f"Erro ao classificar questão {questao.numero}: {e}")
        return {"disciplina": "Não classificado", "assunto": "Geral"}


def classify_batch(
    client: genai.Client,
    questoes: list[QuestaoParsed],
    batch_size: int = 5,
) -> list[dict[str, str]]:
    """
    Classifica questões em lotes para eficiência.

    Agrupa questões e envia para o Gemini em lotes, reduzindo chamadas à API.
    """
    results = []

    for i in range(0, len(questoes), batch_size):
        batch = questoes[i:i + batch_size]

        # Monta prompt com múltiplas questões
        items = []
        for q in batch:
            alt_text = ""
            if q.alternativas:
                alt_text = " | ".join(f"{a.letra}){a.texto[:80]}" for a in q.alternativas)
            items.append(f"Q{q.numero}: {q.enunciado[:300]} {alt_text}")

        prompt = f"""Classifique CADA uma das {len(batch)} questões abaixo:

{chr(10).join(items)}

Responda com um JSON array, um objeto para cada questão, na mesma ordem:
[{{"questao": 1, "disciplina": "...", "assunto": "..."}}, ...]"""

        try:
            response_text = call_gemini(
                client=client,
                prompt=prompt,
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.1,
                max_tokens=1000,
            )

            # Extrai array JSON
            json_match = re.search(r"\[.*\]", response_text, re.DOTALL)
            if json_match:
                batch_results = json.loads(json_match.group())
                for item in batch_results:
                    results.append({
                        "disciplina": item.get("disciplina", "Não classificado"),
                        "assunto": item.get("assunto", "Geral"),
                    })
            else:
                # Fallback: classifica individualmente
                logger.warning("Batch falhou, classificando individualmente...")
                for q in batch:
                    results.append(classify_question(client, q))

        except Exception as e:
            logger.error(f"Erro no batch {i}-{i+len(batch)}: {e}")
            # Fallback individual
            for q in batch:
                results.append(classify_question(client, q))

        logger.info(f"Classificadas {min(i + batch_size, len(questoes))}/{len(questoes)} questões")

    return results
