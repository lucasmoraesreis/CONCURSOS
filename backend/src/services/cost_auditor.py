"""
Módulo de Auditoria e Telemetria de Custos da IA (Google Gemini).

Registra o consumo exato de tokens (prompt, completion e total)
e estima o custo financeiro em USD de cada operação (Geração de Inéditas,
Classificação e Busca Semântica).
"""

import os
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any
from loguru import logger

# Diretório de logs (/app/logs no container ou local)
LOGS_DIR = Path(os.getenv("LOGS_DIR", "logs"))
LOGS_DIR.mkdir(parents=True, exist_ok=True)
AUDIT_FILE = LOGS_DIR / "ai_cost_audit.jsonl"

# Tabela de Preços Referencial Google Gemini (por 1 milhão de tokens)
PRICING_PER_MILLION = {
    "gemini-2.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
    "text-embedding-004": {"input": 0.02, "output": 0.00},
}


class AICostAuditor:
    """Gerenciador de telemetria e custo de IA."""

    @staticmethod
    def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int = 0) -> float:
        """Calcula o custo estimado em USD com base nos tokens consumidos."""
        rates = PRICING_PER_MILLION.get(
            model,
            {"input": 0.075, "output": 0.30}  # default Flash
        )
        input_cost = (prompt_tokens / 1_000_000) * rates["input"]
        output_cost = (completion_tokens / 1_000_000) * rates["output"]
        return round(input_cost + output_cost, 7)

    @classmethod
    def log_operation(
        cls,
        operation: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int = 0,
        metadata: Optional[dict[str, Any]] = None,
    ) -> dict:
        """
        Registra uma entrada de auditoria em arquivo JSONL e no logger da aplicação.
        """
        total_tokens = prompt_tokens + completion_tokens
        cost_usd = cls.calculate_cost(model, prompt_tokens, completion_tokens)

        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "operation": operation,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "estimated_cost_usd": cost_usd,
            "metadata": metadata or {},
        }

        # 1. Log formatado no terminal / stdout
        logger.info(
            f"💰 [AI CUSTO & TOKENS] {operation} ({model}) | "
            f"Prompt: {prompt_tokens} | Completion: {completion_tokens} | "
            f"Total: {total_tokens} tokens | Custo Est.: ${cost_usd:.6f} USD"
        )

        # 2. Persistência em arquivo JSON Lines para auditoria em produção
        try:
            with open(AUDIT_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
        except Exception as e:
            logger.warning(f"Não foi possível persistir log de auditoria de IA: {e}")

        return record

    @classmethod
    def get_summary(cls) -> dict:
        """Retorna sumário consolidado de custos e tokens a partir do arquivo de log."""
        if not AUDIT_FILE.exists():
            return {"total_operacoes": 0, "total_tokens": 0, "total_cost_usd": 0.0}

        total_ops = 0
        total_tokens = 0
        total_cost = 0.0

        try:
            with open(AUDIT_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        data = json.loads(line)
                        total_ops += 1
                        total_tokens += data.get("total_tokens", 0)
                        total_cost += data.get("estimated_cost_usd", 0.0)
        except Exception as e:
            logger.error(f"Erro ao ler sumário de custos: {e}")

        return {
            "total_operacoes": total_ops,
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_cost, 4),
        }
