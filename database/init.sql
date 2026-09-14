-- =============================================
-- Plataforma de Questões de Concurso
-- Schema PostgreSQL — Migração Inicial
-- =============================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para busca textual

-- =============================================
-- TABELAS PRINCIPAIS
-- =============================================

-- Bancas organizadoras
CREATE TABLE bancas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    site_url    VARCHAR(500),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Concursos (combinação órgão + cargo + ano + banca)
CREATE TABLE concursos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    banca_id    UUID NOT NULL REFERENCES bancas(id) ON DELETE CASCADE,
    orgao       VARCHAR(200) NOT NULL,
    cargo       VARCHAR(300) NOT NULL,
    ano         INTEGER NOT NULL CHECK (ano >= 2000 AND ano <= 2030),
    nivel       VARCHAR(20) NOT NULL CHECK (nivel IN ('Superior', 'Médio', 'Fundamental')),
    edital_url  VARCHAR(500),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(banca_id, orgao, cargo, ano)
);

-- Provas (PDFs associados a um concurso)
CREATE TABLE provas (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    concurso_id          UUID NOT NULL REFERENCES concursos(id) ON DELETE CASCADE,
    tipo                 VARCHAR(50) DEFAULT 'objetiva',
    pdf_url              VARCHAR(500),
    pdf_path_local       VARCHAR(500),
    gabarito_url         VARCHAR(500),
    gabarito_path_local  VARCHAR(500),
    status               VARCHAR(30) DEFAULT 'pendente' CHECK (status IN ('pendente', 'baixado', 'extraido', 'processado', 'erro')),
    total_questoes       INTEGER DEFAULT 0,
    processed_at         TIMESTAMP WITH TIME ZONE,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disciplinas (matérias gerais)
CREATE TABLE disciplinas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome        VARCHAR(200) NOT NULL UNIQUE,
    slug        VARCHAR(200) NOT NULL UNIQUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assuntos (tópicos específicos dentro de uma disciplina)
CREATE TABLE assuntos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disciplina_id   UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    nome            VARCHAR(300) NOT NULL,
    slug            VARCHAR(300) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(disciplina_id, slug)
);

-- Questões (entidade central)
CREATE TABLE questoes (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prova_id             UUID NOT NULL REFERENCES provas(id) ON DELETE CASCADE,
    disciplina_id        UUID REFERENCES disciplinas(id) ON DELETE SET NULL,
    assunto_id           UUID REFERENCES assuntos(id) ON DELETE SET NULL,
    numero_questao       INTEGER NOT NULL,
    tipo_questao         VARCHAR(30) NOT NULL CHECK (tipo_questao IN ('Múltipla Escolha', 'Certo/Errado')),
    enunciado            TEXT NOT NULL,
    alternativa_correta  VARCHAR(5),
    justificativa_ia     TEXT,
    metadata             JSONB DEFAULT '{}',
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(prova_id, numero_questao)
);

-- Alternativas das questões
CREATE TABLE alternativas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    questao_id  UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
    letra       CHAR(1) NOT NULL CHECK (letra IN ('A', 'B', 'C', 'D', 'E')),
    texto       TEXT NOT NULL,
    is_correta  BOOLEAN DEFAULT FALSE,
    UNIQUE(questao_id, letra)
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Filtro cascata: Concurso → Disciplinas
CREATE INDEX idx_questoes_prova_disciplina ON questoes(prova_id, disciplina_id);
CREATE INDEX idx_questoes_disciplina ON questoes(disciplina_id);
CREATE INDEX idx_questoes_assunto ON questoes(assunto_id);

-- Busca por concurso
CREATE INDEX idx_concursos_banca_ano ON concursos(banca_id, ano DESC);
CREATE INDEX idx_concursos_orgao ON concursos(orgao);
CREATE INDEX idx_provas_concurso ON provas(concurso_id);
CREATE INDEX idx_provas_status ON provas(status);

-- Busca textual no enunciado (trigram para LIKE %...%)
CREATE INDEX idx_questoes_enunciado_trgm ON questoes USING gin(enunciado gin_trgm_ops);

-- Alternativas por questão
CREATE INDEX idx_alternativas_questao ON alternativas(questao_id);

-- Assuntos por disciplina
CREATE INDEX idx_assuntos_disciplina ON assuntos(disciplina_id);

-- =============================================
-- DADOS INICIAIS (SEED)
-- =============================================

INSERT INTO bancas (nome, slug, site_url) VALUES
    ('Cebraspe', 'cebraspe', 'https://www.cebraspe.org.br'),
    ('FGV', 'fgv', 'https://conhecimento.fgv.br/concursos'),
    ('FCC', 'fcc', 'https://www.concursosfcc.com.br'),
    ('Fundação Vunesp', 'vunesp', 'https://www.vunesp.com.br'),
    ('Idecan', 'idecan', 'https://www.idecan.org.br'),
    ('AOCP', 'aocp', 'https://www.institutoaocp.org.br')
ON CONFLICT (slug) DO NOTHING;
