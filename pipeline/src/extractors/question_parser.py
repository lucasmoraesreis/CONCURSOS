"""
Parser de questões de provas de concurso.

Segmenta o texto bruto extraído dos PDFs em questões individuais,
detectando número, tipo (Múltipla Escolha / Certo ou Errado) e alternativas.

Suporta padrões de diversas bancas:
- Cebraspe: Certo/Errado (itens numerados)
- FGV, FCC, Vunesp: Múltipla Escolha (A-E)
- Idecan, AOCP: Variações de formatação
"""

import re
from dataclasses import dataclass, field
from loguru import logger


@dataclass
class AlternativaParsed:
    """Alternativa extraída do texto."""
    letra: str
    texto: str


@dataclass
class QuestaoParsed:
    """Questão individual extraída e segmentada."""
    numero: int
    enunciado: str
    tipo: str  # 'Múltipla Escolha' ou 'Certo/Errado'
    alternativas: list[AlternativaParsed] = field(default_factory=list)
    texto_bruto: str = ""


# =============================================
# REGEX PATTERNS POR BANCA
# =============================================

# Padrão genérico para início de questão
QUESTAO_PATTERNS = [
    # "QUESTÃO 1", "Questão 01", "questão 1."
    re.compile(r"(?:QUEST[ÃA]O|Quest[ãa]o)\s*[:\-–]?\s*(\d{1,3})", re.IGNORECASE),
    # "1.", "01.", "1)" no início de linha — questão numerada simples
    re.compile(r"^\s*(\d{1,3})\s*[.)\-–]", re.MULTILINE),
    # "1 -", "01 –" com traço
    re.compile(r"^\s*(\d{1,3})\s*[–\-]\s", re.MULTILINE),
]

# Padrão para alternativas de múltipla escolha
ALTERNATIVA_PATTERN = re.compile(
    r"^\s*\(?([A-Ea-e])\)?[\s.\-–:)]+(.+?)$",
    re.MULTILINE
)

# Padrão para questões Certo/Errado (Cebraspe)
CERTO_ERRADO_INDICATORS = [
    re.compile(r"\(\s*\)\s*Certo\s+\(\s*\)\s*Errado", re.IGNORECASE),
    re.compile(r"Julgue\s+o[s]?\s+(?:item|itens)", re.IGNORECASE),
    re.compile(r"julgue\s+o[s]?\s+(?:próximo|seguinte)", re.IGNORECASE),
    re.compile(r"Marque\s+(?:C|E)\s+para", re.IGNORECASE),
]


def _detect_question_type(text: str) -> str:
    """Detecta se a questão é Certo/Errado ou Múltipla Escolha."""
    for pattern in CERTO_ERRADO_INDICATORS:
        if pattern.search(text):
            return "Certo/Errado"

    # Verifica se há alternativas A-E
    alternativas = ALTERNATIVA_PATTERN.findall(text)
    if len(alternativas) >= 3:
        return "Múltipla Escolha"

    return "Múltipla Escolha"  # Default


def _extract_alternativas(text: str) -> tuple[str, list[AlternativaParsed]]:
    """
    Extrai alternativas do texto de uma questão.
    Retorna o enunciado limpo (sem alternativas) e a lista de alternativas.
    """
    alternativas = []
    matches = list(ALTERNATIVA_PATTERN.finditer(text))

    if not matches:
        return text.strip(), []

    # O enunciado é tudo antes da primeira alternativa
    enunciado = text[:matches[0].start()].strip()

    for i, match in enumerate(matches):
        letra = match.group(1).upper()
        # O texto da alternativa vai até o início da próxima ou fim do texto
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)

        texto_completo = text[start:end]
        # Remove o prefixo da letra (ex: "(A) " ou "A) " ou "A. ")
        texto_limpo = re.sub(
            r"^\s*\(?[A-Ea-e]\)?[\s.\-–:)]+",
            "",
            texto_completo,
            count=1
        ).strip()

        alternativas.append(AlternativaParsed(letra=letra, texto=texto_limpo))

    return enunciado, alternativas


def _find_question_boundaries(text: str) -> list[tuple[int, int, int]]:
    """
    Encontra os limites (início, fim) de cada questão no texto.
    Retorna lista de (numero_questao, start_pos, end_pos).
    """
    boundaries = []

    for pattern in QUESTAO_PATTERNS:
        for match in pattern.finditer(text):
            numero = int(match.group(1))
            start = match.start()
            boundaries.append((numero, start, match.end()))

    if not boundaries:
        return []

    # Ordena por posição no texto
    boundaries.sort(key=lambda x: x[1])

    # Remove duplicatas (mesmo número de questão, mantém a primeira ocorrência)
    seen_numbers = set()
    unique_boundaries = []
    for numero, start, end in boundaries:
        if numero not in seen_numbers:
            seen_numbers.add(numero)
            unique_boundaries.append((numero, start, end))

    return unique_boundaries


def parse_questions(text: str, banca: str = "auto") -> list[QuestaoParsed]:
    """
    Segmenta o texto completo de uma prova em questões individuais.

    Args:
        text: Texto bruto extraído do PDF.
        banca: Nome da banca (para ajustar heurísticas). 'auto' para detecção.

    Returns:
        Lista de questões parseadas com enunciado, alternativas e tipo.
    """
    if not text or len(text.strip()) < 50:
        logger.warning("Texto insuficiente para parsing de questões.")
        return []

    # Detecta tipo predominante da prova
    tipo_prova = _detect_question_type(text)
    logger.info(f"Tipo de prova detectado: {tipo_prova} | Banca: {banca}")

    # Encontra limites de cada questão
    boundaries = _find_question_boundaries(text)

    if not boundaries:
        logger.warning("Nenhuma questão encontrada no texto. Verifique o formato.")
        return []

    logger.info(f"Encontradas {len(boundaries)} questões no texto.")

    questoes = []
    for i, (numero, start, _) in enumerate(boundaries):
        # O texto da questão vai do início até o início da próxima questão
        if i + 1 < len(boundaries):
            question_text = text[start:boundaries[i + 1][1]]
        else:
            question_text = text[start:]

        # Remove o cabeçalho "Questão X" do texto
        for pattern in QUESTAO_PATTERNS:
            question_text = pattern.sub("", question_text, count=1)
        question_text = question_text.strip()

        # Detecta tipo individual e extrai alternativas
        tipo = _detect_question_type(question_text)

        if tipo == "Múltipla Escolha":
            enunciado, alternativas = _extract_alternativas(question_text)
        else:
            enunciado = question_text.strip()
            # Limpa indicadores de Certo/Errado do enunciado
            for indicator in CERTO_ERRADO_INDICATORS:
                enunciado = indicator.sub("", enunciado).strip()
            alternativas = [
                AlternativaParsed(letra="C", texto="Certo"),
                AlternativaParsed(letra="E", texto="Errado"),
            ]

        # Limpeza final do enunciado
        enunciado = re.sub(r"\s+", " ", enunciado).strip()
        enunciado = re.sub(r"^\s*[.\-–:]\s*", "", enunciado).strip()

        if len(enunciado) < 20:
            logger.debug(f"Questão {numero} com enunciado muito curto ({len(enunciado)} chars). Pulando.")
            continue

        questoes.append(QuestaoParsed(
            numero=numero,
            enunciado=enunciado,
            tipo=tipo,
            alternativas=alternativas,
            texto_bruto=question_text,
        ))

    logger.info(f"Parsing concluído: {len(questoes)} questões válidas de {len(boundaries)} detectadas.")
    return questoes


def parse_gabarito(text: str) -> dict[int, str]:
    """
    Parse do texto de um gabarito oficial.
    Retorna dict: { numero_questao: alternativa_correta }

    Suporta formatos:
    - "1 A  2 B  3 C" (tabular em linha)
    - "1. A", "01 - B" (lista)
    - "1)A 2)B" (compacto)
    """
    gabarito = {}

    # Padrão 1: "01 A" ou "1. A" ou "1 - A" ou "1) A"
    pattern_list = re.compile(
        r"(\d{1,3})\s*[.):\-–\s]\s*([A-Ea-eCe])\b",
        re.MULTILINE
    )

    matches = pattern_list.findall(text)
    for num_str, resp in matches:
        numero = int(num_str)
        resposta = resp.upper()
        if numero > 0 and resposta in {"A", "B", "C", "D", "E"}:
            gabarito[numero] = resposta

    if gabarito:
        logger.info(f"Gabarito parseado: {len(gabarito)} respostas encontradas.")
    else:
        logger.warning("Nenhuma resposta encontrada no gabarito.")

    return gabarito
