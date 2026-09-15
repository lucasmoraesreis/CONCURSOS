"""
FastAPI Application — Plataforma de Questões de Concurso

Endpoints principais:
  GET /api/bancas                              → Lista bancas
  GET /api/concursos                           → Lista concursos (com filtros)
  GET /api/concursos/{id}/disciplinas          → Disciplinas de um concurso (cascata)
  GET /api/disciplinas/{id}/assuntos           → Assuntos de uma disciplina (cascata)
  GET /api/questoes                            → Questões com filtros compostos
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from loguru import logger

from src.config import settings
from src.routers import concursos, disciplinas, assuntos, questoes

# Sincroniza configurações com os.environ se presentes no .env
if settings.gemini_api_key and not os.getenv("GEMINI_API_KEY"):
    os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
if settings.gemini_model and not os.getenv("GEMINI_MODEL"):
    os.environ["GEMINI_MODEL"] = settings.gemini_model


app = FastAPI(
    title="Plataforma de Questões de Concurso",
    description="API REST para consulta de questões de concursos públicos com filtros cascata.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.on_event("startup")
async def validate_security_and_environment():
    """Valida requisitos de segurança e variáveis obrigatórias no startup do servidor."""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    placeholders = {"", "placeholder", "sua_chave_do_gemini_aqui", "SUA_CHAVE_AQUI"}

    if not api_key or api_key in placeholders:
        logger.critical(
            "🚨 [SECOPS - ALERTA CRÍTICO]: GEMINI_API_KEY não configurada ou com placeholder inválido! "
            "Funcionalidades de IA (Busca Semântica e Gerador de Inéditas) estarão inoperantes. "
            "Defina a variável no container, no painel da Render ou no arquivo .env local."
        )
    else:
        masked = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "***"
        logger.info(f"🔒 [SECOPS]: GEMINI_API_KEY ativa e blindada no ambiente de execução ({masked}).")

    # Seed Automático: Popula concursos, disciplinas e questões se o banco estiver vazio
    from src.database import AsyncSessionLocal
    from src.services.seeder import seed_database_if_empty
    try:
        async with AsyncSessionLocal() as session:
            await seed_database_if_empty(session)
    except Exception as e:
        logger.warning(f"Aviso de banco no startup: {e}. Verifique se o Docker/Supabase está acessível.")

# CORS — permite requests do frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra routers
app.include_router(concursos.router)
app.include_router(disciplinas.router)
app.include_router(assuntos.router)
app.include_router(questoes.router)


@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": "Plataforma de Questões de Concurso API",
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )
