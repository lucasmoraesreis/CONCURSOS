-- =============================================
-- Migração 003: Usuários, Histórico e Desempenho (Fase 2)
-- =============================================

-- 1. Tabela USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome              VARCHAR(150) NOT NULL,
    email             VARCHAR(255) NOT NULL UNIQUE,
    senha_hash        VARCHAR(255) NOT NULL,
    plano_assinatura  VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (plano_assinatura IN ('FREE', 'PREMIUM')),
    criado_em         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- 2. Tabela HISTORICO_RESPOSTAS
CREATE TABLE IF NOT EXISTS historico_respostas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id          UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    questao_id          UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
    alternativa_marcada CHAR(1) NOT NULL,
    foi_correta         BOOLEAN NOT NULL,
    tempo_segundos      INTEGER NOT NULL DEFAULT 0,
    respondido_em       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historico_usuario ON historico_respostas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historico_questao ON historico_respostas(questao_id);
CREATE INDEX IF NOT EXISTS idx_historico_usuario_data ON historico_respostas(usuario_id, respondido_em DESC);

-- 3. Tabela Agregada DESEMPENHO_MATERIA
CREATE TABLE IF NOT EXISTS desempenho_materia (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id                  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    disciplina_id               UUID NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    assunto_id                  UUID REFERENCES assuntos(id) ON DELETE SET NULL,
    total_questoes_respondidas  INTEGER NOT NULL DEFAULT 0,
    total_acertos               INTEGER NOT NULL DEFAULT 0,
    total_erros                 INTEGER NOT NULL DEFAULT 0,
    taxa_acerto_pct             NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tempo_medio_segundos        NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    atualizado_em               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, disciplina_id, assunto_id)
);

CREATE INDEX IF NOT EXISTS idx_desempenho_usuario_disc ON desempenho_materia(usuario_id, disciplina_id);

-- 4. View em tempo real de Agregação de Desempenho
CREATE OR REPLACE VIEW view_desempenho_materia AS
SELECT
    hr.usuario_id,
    q.disciplina_id,
    d.nome AS disciplina_nome,
    q.assunto_id,
    a.nome AS assunto_nome,
    COUNT(hr.id) AS total_respostas,
    COUNT(hr.id) FILTER (WHERE hr.foi_correta = TRUE) AS total_acertos,
    COUNT(hr.id) FILTER (WHERE hr.foi_correta = FALSE) AS total_erros,
    ROUND((COUNT(hr.id) FILTER (WHERE hr.foi_correta = TRUE)::numeric / NULLIF(COUNT(hr.id), 0)) * 100, 2) AS taxa_acerto_pct,
    ROUND(AVG(hr.tempo_segundos), 1) AS tempo_medio_segundos,
    MAX(hr.respondido_em) AS ultima_resposta_em
FROM historico_respostas hr
JOIN questoes q ON hr.questao_id = q.id
LEFT JOIN disciplinas d ON q.disciplina_id = d.id
LEFT JOIN assuntos a ON q.assunto_id = a.id
GROUP BY hr.usuario_id, q.disciplina_id, d.nome, q.assunto_id, a.nome;
