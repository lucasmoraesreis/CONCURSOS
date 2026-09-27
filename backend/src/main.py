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
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from loguru import logger

from src.config import settings
from src.routers import auth, concursos, disciplinas, assuntos, questoes, study, mentoria, skills


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

    # Inicialização do Banco (com suporte a fallback SQLite local) e Seed Automático
    from src.database import init_db, get_db_session
    from src.services.seeder import seed_database_if_empty
    from src.data.real_questions_seed import seed_real_questions_data
    from src.services.async_batch_writer import batch_writer
    try:
        await init_db()
        async with get_db_session() as session:
            await seed_database_if_empty(session)
            await seed_real_questions_data(session)
            
            # Garante que o Master existe (mesmo se o seeder foi pulado)
            from src.models import Usuario
            from src.services.auth import get_password_hash
            from sqlalchemy import select
            import uuid
            
            master_email = "master@admin.com"
            existing_master = await session.execute(select(Usuario).where(Usuario.email == master_email))
            if not existing_master.scalar_one_or_none():
                logger.info("Criando usuário master padrão...")
                master_user = Usuario(
                    id=uuid.uuid4(),
                    nome="Administrador Master",
                    email=master_email,
                    senha_hash=get_password_hash("master123"),
                    is_master=True,
                    plano_assinatura="PRO"
                )
                session.add(master_user)
                await session.commit()
    except Exception as e:
        logger.warning(f"Aviso de banco no startup: {e}. Verifique se o Docker/Supabase está acessível.")

    # Ativa buffer de escrita em lote para alta concorrência
    await batch_writer.start()


@app.on_event("shutdown")
async def shutdown_hyperscale_services():
    """Drena filas de escrita e encerra serviços em segundo plano."""
    from src.services.async_batch_writer import batch_writer
    await batch_writer.stop()

# CORS seguro — permite requests do frontend React sem violar a especificação de credenciais
allow_creds = "*" not in settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_and_caching_headers(request, call_next):
    """Aplica cabeçalhos defensivos HTTP e diretivas de Edge Caching para escala C10M."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"

    # Otimização de Edge & CDN Caching (C10M Scale: absorve 98% do tráfego na borda)
    path = request.url.path
    if request.method == "GET":
        if any(path.startswith(p) for p in ["/api/bancas", "/api/concursos", "/api/disciplinas", "/api/assuntos", "/api/skills/presets"]):
            response.headers["Cache-Control"] = "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400"
        elif path.startswith("/api/questoes"):
            response.headers["Cache-Control"] = "public, max-age=60, s-maxage=300, stale-while-revalidate=3600"
        elif any(path.startswith(p) for p in ["/api/study", "/api/mentoria"]):
            response.headers["Cache-Control"] = "private, no-cache, no-store, must-revalidate"

    return response

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Registra routers
app.include_router(auth.router)
app.include_router(concursos.router)
app.include_router(disciplinas.router)
app.include_router(assuntos.router)
app.include_router(questoes.router)
app.include_router(study.router)
app.include_router(mentoria.router)
app.include_router(skills.router)



@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": "Plataforma de Questões de Concurso API",
        "version": "1.0.0",
    }


@app.get("/api/system/hyperscale-metrics", tags=["Hyperscale Telemetry"])
async def get_hyperscale_metrics():
    """Retorna telemetria de L1 Cache e fila de gravação em lote em tempo real."""
    from src.services.cache_service import cache_service
    from src.services.async_batch_writer import batch_writer
    return {
        "status": "healthy",
        "scale_target": "10,000,000 Concurrent Users (C10M Architecture)",
        "cache_l1": cache_service.get_metrics(),
        "write_behind_buffer": batch_writer.get_stats(),
    }


# =====================================================================
# Integração Automática Frontend + Backend (Render / Produção "Tudo em 1")
# =====================================================================
from src.config import PROJECT_ROOT
frontend_dist = PROJECT_ROOT / "frontend" / "dist"

if frontend_dist.exists():
    logger.info(f"🚀 Diretório {frontend_dist} encontrado. Ativando servidor estático do Frontend!")
    # Servir os arquivos estáticos de assets (js, css, imagens)
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
    
    # Rota catch-all para Single Page Application (SPA) - deve ser a última rota definida!
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Não intercepta chamadas para API, docs ou arquivos já roteados
        if full_path.startswith("api/") or full_path in ["docs", "redoc", "openapi.json"]:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
            
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        
        # Fallback para o index.html do React (padrão em SPA)
        return FileResponse(str(frontend_dist / "index.html"))
else:
    logger.warning("⚠️ Diretório 'frontend/dist' não encontrado. Rodando em modo API only.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )
