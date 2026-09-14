-- =============================================
-- Migração 002: pgvector + Busca Semântica + Questões Inéditas + Índices Otimizados
-- =============================================

-- 1. Ativar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Adicionar coluna de embedding e is_inedita na tabela questoes
--    text-embedding-004 do Gemini gera vetores de 768 dimensões
ALTER TABLE questoes
ADD COLUMN IF NOT EXISTS embedding vector(768);

ALTER TABLE questoes
ADD COLUMN IF NOT EXISTS is_inedita BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Índice HNSW para busca por similaridade de cosseno
CREATE INDEX IF NOT EXISTS idx_questoes_embedding_hnsw
ON questoes USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Índice composto otimizado para filtros em cascata (Concurso -> Prova -> Disciplina -> Assunto)
CREATE INDEX IF NOT EXISTS idx_questoes_filtro_cascata
ON questoes(prova_id, disciplina_id, assunto_id);

CREATE INDEX IF NOT EXISTS idx_questoes_is_inedita
ON questoes(is_inedita);

-- 5. Novas bancas do DF
INSERT INTO bancas (nome, slug, site_url) VALUES
    ('IADES', 'iades', 'https://www.iades.com.br'),
    ('Quadrix', 'quadrix', 'https://www.quadrix.org.br'),
    ('FUniversa', 'funiversa', 'https://www.funiversa.org.br')
ON CONFLICT (slug) DO NOTHING;

-- 6. Ajuste: ano até 2035 para longevidade
ALTER TABLE concursos DROP CONSTRAINT IF EXISTS ck_concurso_ano;
ALTER TABLE concursos ADD CONSTRAINT ck_concurso_ano CHECK (ano >= 2000 AND ano <= 2035);
