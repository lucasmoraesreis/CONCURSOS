"""
Gerador de justificativas usando Google Gemini.

Para cada questão, gera uma explicação passo a passo sobre:
- Por que a alternativa correta está certa
- Por que as alternativas erradas estão erradas
"""

import re
from loguru import logger
from google import genai

from src.llm.client import call_gemini
from src.extractors.question_parser import QuestaoParsed


SYSTEM_INSTRUCTION = """Você é um professor especialista em concursos públicos brasileiros.
Sua tarefa é criar justificativas didáticas e detalhadas para questões de prova.

REGRAS:
1. Explique de forma clara e passo a passo.
2. Cite a base legal, doutrinária ou conceitual quando aplicável.
3. Para Múltipla Escolha: explique por que a correta está certa E por que cada errada está errada.
4. Para Certo/Errado: explique o raciocínio completo.
5. Use linguagem acessível mas tecnicamente precisa.
6. Seja conciso — máximo 500 palavras."""


def generate_justification(
    client: genai.Client,
    questao: QuestaoParsed,
    alternativa_correta: str,
    disciplina: str = "",
    assunto: str = "",
) -> str:
    """
    Gera justificativa detalhada para uma questão.

    Args:
        client: Cliente Gemini.
        questao: Questão parseada.
        alternativa_correta: Letra da alternativa correta (ex: "A", "C", "E").
        disciplina: Disciplina da questão (contexto).
        assunto: Assunto da questão (contexto).

    Returns:
        Texto da justificativa gerada.
    """
    alternativas_text = ""
    if questao.alternativas:
        alternativas_text = "\n".join(
            f"  {a.letra}) {a.texto}" for a in questao.alternativas
        )

    context = ""
    if disciplina:
        context += f"Disciplina: {disciplina}\n"
    if assunto:
        context += f"Assunto: {assunto}\n"

    prompt = f"""Crie uma justificativa passo a passo para a seguinte questão de concurso:

{context}
ENUNCIADO:
{questao.enunciado}

{f"ALTERNATIVAS:{chr(10)}{alternativas_text}" if alternativas_text else ""}

GABARITO OFICIAL: {alternativa_correta}

Forneça uma explicação detalhada e didática sobre:
1. Por que a alternativa "{alternativa_correta}" é a correta
{"2. Por que cada uma das outras alternativas está errada" if questao.tipo == "Múltipla Escolha" else ""}"""

    try:
        justificativa = call_gemini(
            client=client,
            prompt=prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.3,
            max_tokens=2000,
        )

        # Limpeza básica
        justificativa = justificativa.strip()
        # Remove possíveis prefixos como "Justificativa:" ou "Resposta:"
        justificativa = re.sub(
            r"^(?:Justificativa|Resposta|Explicação)\s*:\s*",
            "",
            justificativa,
            flags=re.IGNORECASE
        ).strip()

        return justificativa

    except Exception as e:
        logger.error(f"Erro ao gerar justificativa para questão {questao.numero}: {e}")
        return f"Justificativa não disponível. Gabarito: {alternativa_correta}"
