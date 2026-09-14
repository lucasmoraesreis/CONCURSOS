# 📚 Plataforma de Questões de Concurso

Sistema completo para ingestão, processamento e consulta de questões de concursos públicos brasileiros.

## 🏗️ Arquitetura

```
├── pipeline/       → Pipeline de ingestão (Python)
├── backend/        → API REST (FastAPI)
├── frontend/       → Interface Web (React + Tailwind CSS v4)
├── database/       → Schema SQL + migrations
└── docker-compose.yml → PostgreSQL + pgAdmin
```

## 🚀 Quick Start

### 1. Subir o banco de dados
```bash
docker-compose up -d
```
O PostgreSQL estará disponível em `localhost:5432` e o pgAdmin em `localhost:5050`.

### 2. Instalar dependências do pipeline
```bash
cd pipeline
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -e .
```

### 3. Processar um PDF de prova
```bash
cd pipeline
python -m src.processors.pipeline_runner provas2.pdf \
  --banca "Cebraspe" \
  --orgao "INSS" \
  --cargo "Técnico do Seguro Social" \
  --ano 2022 \
  --nivel "Médio"
```

### 4. Iniciar o backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e .
uvicorn src.main:app --reload --port 8000
```
Swagger UI disponível em: http://localhost:8000/docs

### 5. Iniciar o frontend
```bash
cd frontend
npm install
npm run dev
```
Acesse: http://localhost:5173

## 🔌 API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/bancas` | Lista bancas organizadoras |
| GET | `/api/concursos` | Lista concursos (filtros: banca, ano, search) |
| GET | `/api/concursos/{id}/disciplinas` | Disciplinas de um concurso (cascata) |
| GET | `/api/disciplinas/{id}/assuntos` | Assuntos de uma disciplina (cascata) |
| GET | `/api/questoes` | Questões com filtros compostos + paginação |

## 🔑 Variáveis de Ambiente

Copie o `.env` e configure:
- `GEMINI_API_KEY` — Chave da API Google Gemini
- `DATABASE_URL` — Connection string do PostgreSQL

## 📦 Stack Técnica

- **Pipeline**: Python 3.11+, PyMuPDF, pdfplumber, Google Gemini, SQLAlchemy
- **Backend**: FastAPI, SQLAlchemy (async), asyncpg, Pydantic v2
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Zustand, React Query, Framer Motion
- **Banco**: PostgreSQL 16
