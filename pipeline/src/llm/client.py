"""
Cliente Google Gemini para o pipeline.
Centraliza a criação e configuração do cliente.

Correções do Code Review:
- Retry com discriminação de erros (429/5xx vs 400/auth)
- Rate limiting integrado para respeitar quotas
- Suporte a embeddings (text-embedding)
"""

import time
from google import genai
from google.genai import types
from loguru import logger
from tenacity import (
    retry, stop_after_attempt, wait_exponential,
    retry_if_exception_type, before_sleep_log,
)

from src.config import settings


# Exceções recuperáveis (transitórias)
RETRYABLE_EXCEPTIONS = (
    ConnectionError,
    TimeoutError,
    OSError,
)


def get_gemini_client() -> genai.Client:
    """Cria e retorna um cliente Gemini configurado."""
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY não configurada. Verifique o arquivo .env")
    client = genai.Client(api_key=settings.gemini_api_key)
    logger.info(f"Cliente Gemini configurado com modelo: {settings.gemini_model}")
    return client


def _should_retry(exception: BaseException) -> bool:
    """Determina se uma exceção é recuperável (deve tentar novamente)."""
    error_str = str(exception).lower()
    # Erros de rate limit e server errors são recuperáveis
    if any(kw in error_str for kw in ["429", "rate limit", "quota", "503", "500", "overloaded", "resource_exhausted"]):
        return True
    # Erros de autenticação, validação NÃO são recuperáveis
    if any(kw in error_str for kw in ["401", "403", "400", "invalid", "permission", "api_key"]):
        return False
    # Exceções de rede são recuperáveis
    if isinstance(exception, RETRYABLE_EXCEPTIONS):
        return True
    # Default: tenta novamente (conservador)
    return True


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=2, min=3, max=60),
    retry=lambda retry_state: _should_retry(retry_state.outcome.exception()) if retry_state.outcome and retry_state.outcome.failed else False,
    reraise=True,
)
def call_gemini(
    client: genai.Client,
    prompt: str,
    system_instruction: str = "",
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> str:
    """
    Faz uma chamada ao Gemini com retry inteligente.

    Retry apenas para erros transitórios (429, 5xx, rede).
    Erros de autenticação/validação falham imediatamente.
    """
    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=max_tokens,
        system_instruction=system_instruction if system_instruction else None,
    )

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=config,
    )

    if not response.text:
        raise ValueError("Resposta vazia do Gemini.")

    return response.text.strip()


def generate_embedding(
    client: genai.Client,
    text: str,
    model: str = "text-embedding-004",
) -> list[float]:
    """
    Gera embedding vetorial de um texto usando o modelo de embeddings do Gemini.

    Args:
        client: Cliente Gemini.
        text: Texto para gerar embedding.
        model: Modelo de embeddings (default: text-embedding-004, 768 dimensões).

    Returns:
        Lista de floats representando o vetor.
    """
    # Trunca textos muito longos (limite do modelo)
    if len(text) > 8000:
        text = text[:8000]

    result = client.models.embed_content(
        model=model,
        contents=text,
    )

    return result.embeddings[0].values


def generate_embeddings_batch(
    client: genai.Client,
    texts: list[str],
    model: str = "text-embedding-004",
    batch_size: int = 20,
) -> list[list[float]]:
    """
    Gera embeddings em lote para eficiência.

    Args:
        client: Cliente Gemini.
        texts: Lista de textos.
        model: Modelo de embeddings.
        batch_size: Tamanho do lote.

    Returns:
        Lista de vetores.
    """
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        # Trunca textos longos
        batch = [t[:8000] if len(t) > 8000 else t for t in batch]

        try:
            result = client.models.embed_content(
                model=model,
                contents=batch,
            )
            for emb in result.embeddings:
                all_embeddings.append(emb.values)

            logger.info(f"Embeddings: {min(i + batch_size, len(texts))}/{len(texts)}")

        except Exception as e:
            logger.warning(f"Batch embedding falhou ({i}-{i+len(batch)}): {e}. Tentando individual...")
            for text in batch:
                try:
                    emb = generate_embedding(client, text, model)
                    all_embeddings.append(emb)
                except Exception as e2:
                    logger.error(f"Embedding individual falhou: {e2}")
                    all_embeddings.append([0.0] * 768)  # Zero vector como fallback

        # Rate limit entre batches
        time.sleep(0.5)

    return all_embeddings
