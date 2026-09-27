"""
Serviço: Gerador de Questões Inéditas ("Hacker de Bancas")

Utiliza o SDK Google Gemini com Structured Outputs (Pydantic) para emular
com precisão milimétrica os estilos de bancas de concursos públicos,
gerando enunciados realistas, distratores cognitivos ("pegadinhas")
e justificativas aprofundadas.
"""

import os
import uuid
from typing import Optional
from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Questao, Alternativa, Prova, Concurso, Banca, Disciplina, Assunto
from src.schemas import QuestaoGeradaResponse
from src.services.cost_auditor import AICostAuditor


# ============================================================================
# Schemas para Structured Output do Gemini
# ============================================================================

class AlternativaOutput(BaseModel):
    letra: str = Field(description="Letra da alternativa ('A', 'B', 'C', 'D', 'E' ou 'C', 'E')")
    texto: str = Field(description="Texto da alternativa ou opção")


class QuestaoIneditaOutput(BaseModel):
    tipo_questao: str = Field(description="'Múltipla Escolha' ou 'Certo/Errado'")
    enunciado: str = Field(description="Enunciado completo, contextualizado e realista da questão")
    alternativas: list[AlternativaOutput] = Field(description="Lista de alternativas da questão")
    alternativa_correta: str = Field(description="Letra da alternativa correta (ex: 'A' ou 'C')")
    engenharia_da_pegadinha: str = Field(
        description="Explicação da armadilha cognitiva/jurídica inserida intencionalmente para treinar o candidato"
    )
    justificativa_ia: str = Field(
        description="Justificativa completa, comentando cada alternativa e citando base legal/jurisprudencial"
    )


# ============================================================================
# Matriz de DNA das Bancas
# ============================================================================

BANCAS_DNA = {
    "Cebraspe": """
- Modalidade prioritária: Certo/Errado (ou Múltipla Escolha quando solicitado).
- Estilo: Textos técnicos, densos e afirmativos.
- Armadilhas e Pegadinhas típicas:
  * Troca sutil entre faculdade e obrigatoriedade ("pode" por "deve" ou "é vedado").
  * Generalizações indevidas: uso de "sempre", "nunca", "em qualquer hipótese", "incondicionalmente".
  * Inversão sujeito-predicado ou atribuição de competência de órgão similar (ex: STJ vs STF).
  * Omissão proposital de exceções explícitas na legislação ou jurisprudência sumulada.
""",
    "FGV": """
- Modalidade: Múltipla Escolha com 5 alternativas (A, B, C, D, E).
- Estilo: Longos casos concretos (estudos de caso fictícios envolvendo 'Fulano', 'Servidor Público X', etc.).
- Armadilhas e Pegadinhas típicas:
  * Duas alternativas que parecem corretas, mas uma aborda posição doutrinária majoritária vs minoritária.
  * Detalhes fáticos sutis no enunciado que alteram a subsunção jurídica.
  * Alternativas com português rebuscado e prolixo para testar resistência e interpretação de texto.
""",
    "FCC": """
- Modalidade: Múltipla Escolha com 5 alternativas (A, B, C, D, E).
- Estilo: Apego estrito à literalidade da lei seca ("letra de lei") e súmulas dos tribunais superiores.
- Armadilhas e Pegadinhas típicas:
  * Troca de prazos processuais (ex: 5 dias por 8 dias, 15 dias úteis por corridos).
  * Substituição de uma única palavra-chave da lei que inverte o sentido normativo.
  * Confusão entre órgãos colegiados e competências privativas vs concorrentes.
""",
    "IADES": """
- Modalidade: Múltipla Escolha (A, B, C, D, E). Principal banca de concursos do Distrito Federal (GDF).
- Estilo: Questões diretas com foco em normas e regimentos do DF (LODF, LC 840/2011, RITJDFT, PCDF).
- Armadilhas e Pegadinhas típicas:
  * Detalhes de quórum de votação na Câmara Legislativa do DF (CLDF).
  * Prazos e procedimentos de processos administrativos disciplinares no DF.
  * Distinção entre cargos comissionados e funções de confiança na administração distrital.
""",
    "Quadrix": """
- Modalidade: Múltipla Escolha ou Certo/Errado. Frequente em conselhos regionais (DF e federais).
- Estilo: Objetiva e literal, com forte apelo a conceitos elementares mas facilmente confundíveis.
- Armadilhas e Pegadinhas típicas:
  * Misturar definições semelhantes de institutos jurídicos/administrativos.
  * Trocar sanções aplicáveis (advertência vs suspensão vs demissão).
""",
}


class QuestionGeneratorService:
    """Gerador de Questões Inéditas com Gemini Structured Output."""

    def __init__(self):
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    def _get_client(self):
        from google import genai
        # Zero-Trust: Leitura dinâmica exclusivamente da memória via os.getenv
        api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if not api_key or api_key in ("placeholder", "sua_chave_do_gemini_aqui", "SUA_CHAVE_AQUI"):
            raise ValueError(
                "GEMINI_API_KEY ausente ou não configurada."
            )
        return genai.Client(api_key=api_key)

    async def generate_question(
        self,
        banca: str,
        disciplina: str,
        assunto: str,
        tipo_questao: Optional[str] = "Múltipla Escolha",
        dificuldade: Optional[str] = "Médio",
        provider: Optional[str] = "auto",
        db: Optional[AsyncSession] = None,
    ) -> QuestaoGeradaResponse:
        """
        Gera uma questão inédita com orquestração inteligente multi-IA
        (OpenRouter, Gemini, Groq, Cloudflare, Simulado) e cascata de failover.
        """
        dna = BANCAS_DNA.get(banca, BANCAS_DNA["Cebraspe"])

        system_prompt = f"""Você é o "Hacker de Bancas", um Arquiteto de Questões de Concurso Público e Especialista em Engenharia Reversa de Avaliações.
Sua especialidade é criar questões INÉDITAS, de alto nível, idênticas às formuladas pelas bancas examinadoras mais rigorosas do Brasil.

DNA DA BANCA SELECIONADA ({banca}):
{dna}

REGRAS RÍGIDAS DE ELABORAÇÃO:
1. Não crie questões triviais. O enunciado deve simular exatamente a densidade e o vocabulário da banca.
2. Incorpore propositalmente uma ARMADILHA COGNITIVA ("pegadinha") típica dessa banca nos distratores.
3. A justificativa deve dissecar tanto a resposta correta quanto as erradas, revelando a base legal.
4. Documente explicitamente a 'engenharia_da_pegadinha' para que o aluno aprenda a técnica de resolução.
"""

        user_prompt = f"""Gere uma questão inédita com as seguintes especificações:
- Banca: {banca}
- Disciplina: {disciplina}
- Assunto: {assunto}
- Formato Desejado: {tipo_questao}
- Dificuldade: {dificuldade}

Certifique-se de fundamentar na legislação, doutrina ou jurisprudência brasileira aplicável."""

        from src.services.ai_orchestrator import ai_orchestrator

        validated, provider_used = await ai_orchestrator.orchestrate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            requested_provider=provider,
            banca=banca,
            disciplina=disciplina,
            assunto=assunto,
            tipo_questao=tipo_questao or "Múltipla Escolha",
            fallback_builder=self._build_smart_fallback,
        )

        # Se temos uma sessão de banco de dados, persistimos a questão
        questao_id = uuid.uuid4()
        if db is not None:
            try:
                questao_id = await self._persist_to_database(
                    db=db,
                    banca_nome=banca,
                    disciplina_nome=disciplina,
                    assunto_nome=assunto,
                    data=validated,
                    provider_used=provider_used,
                )
                await db.commit()
            except Exception as persist_err:
                logger.warning(f"Aviso ao persistir questão no banco: {persist_err}. Continuando resposta para o usuário.")
                await db.rollback()

        return QuestaoGeradaResponse(
            id=questao_id,
            tipo_questao=validated.tipo_questao,
            enunciado=validated.enunciado,
            alternativas=[{"letra": a.letra, "texto": a.texto} for a in validated.alternativas],
            alternativa_correta=validated.alternativa_correta,
            engenharia_da_pegadinha=validated.engenharia_da_pegadinha,
            justificativa_ia=validated.justificativa_ia,
            banca_emulada=banca,
            disciplina=disciplina,
            assunto=assunto,
            is_inedita=True,
            provider_used=provider_used,
        )

    async def _persist_to_database(
        self,
        db: AsyncSession,
        banca_nome: str,
        disciplina_nome: str,
        assunto_nome: str,
        data: QuestaoIneditaOutput,
        provider_used: str = "",
    ) -> uuid.UUID:
        """Salva a questão inédita gerada no PostgreSQL com embedding gerado via Gemini."""
        # 1. Obter ou criar Banca
        banca_slug = banca_nome.lower().replace(" ", "-")
        banca_res = await db.execute(select(Banca).where(Banca.slug == banca_slug))
        banca = banca_res.scalar_one_or_none()
        if not banca:
            banca = Banca(nome=banca_nome, slug=banca_slug)
            db.add(banca)
            await db.flush()

        # 2. Obter ou criar Concurso Sintético para Inéditas
        concurso_res = await db.execute(
            select(Concurso).where(
                Concurso.banca_id == banca.id,
                Concurso.orgao == "Banco de Questões Inéditas IA",
            )
        )
        concurso = concurso_res.scalar_one_or_none()
        if not concurso:
            concurso = Concurso(
                banca_id=banca.id,
                orgao="Banco de Questões Inéditas IA",
                cargo="Simulador Hacker de Bancas",
                ano=2026,
                nivel="Superior",
            )
            db.add(concurso)
            await db.flush()

        # 3. Obter ou criar Prova Sintética
        prova_res = await db.execute(
            select(Prova).where(Prova.concurso_id == concurso.id)
        )
        prova = prova_res.scalar_one_or_none()
        if not prova:
            prova = Prova(
                concurso_id=concurso.id,
                tipo="Simulado IA",
                status="processado",
            )
            db.add(prova)
            await db.flush()

        # 4. Obter ou criar Disciplina
        disc_slug = disciplina_nome.lower().strip().replace(" ", "-")
        disc_res = await db.execute(select(Disciplina).where(Disciplina.slug == disc_slug))
        disciplina = disc_res.scalar_one_or_none()
        if not disciplina:
            disciplina = Disciplina(nome=disciplina_nome, slug=disc_slug)
            db.add(disciplina)
            await db.flush()

        # 5. Obter ou criar Assunto
        assunto_slug = assunto_nome.lower().strip().replace(" ", "-")
        assunto_res = await db.execute(
            select(Assunto).where(
                Assunto.disciplina_id == disciplina.id,
                Assunto.slug == assunto_slug,
            )
        )
        assunto = assunto_res.scalar_one_or_none()
        if not assunto:
            assunto = Assunto(
                disciplina_id=disciplina.id,
                nome=assunto_nome,
                slug=assunto_slug,
            )
            db.add(assunto)
            await db.flush()

        # 6. Gerar Embedding para Busca Semântica
        vec_str = None
        try:
            client = self._get_client()
            emb_res = client.models.embed_content(
                model="text-embedding-004",
                contents=data.enunciado,
            )
            emb_values = emb_res.embeddings[0].values
            vec_str = "[" + ",".join(str(v) for v in emb_values) + "]"

            # Auditoria de tokens do embedding
            emb_tokens = max(1, len(data.enunciado) // 4)
            AICostAuditor.log_operation(
                operation="embedding_questao_inedita",
                model="text-embedding-004",
                prompt_tokens=emb_tokens,
                completion_tokens=0,
                metadata={"disciplina": disciplina_nome, "assunto": assunto_nome},
            )
        except Exception as e:
            logger.warning(f"Não foi possível gerar embedding para questão inédita: {e}")

        # 7. Criar a Questão com numeração sequencial segura (evita colisão de UniqueConstraint)
        from sqlalchemy import func
        max_num_res = await db.execute(
            select(func.max(Questao.numero_questao)).where(Questao.prova_id == prova.id)
        )
        current_max = max_num_res.scalar() or 0
        numero_questao = current_max + 1

        questao_id = uuid.uuid4()
        questao = Questao(
            id=questao_id,
            prova_id=prova.id,
            disciplina_id=disciplina.id,
            assunto_id=assunto.id,
            numero_questao=numero_questao,
            tipo_questao=data.tipo_questao,
            enunciado=data.enunciado,
            alternativa_correta=data.alternativa_correta,
            justificativa_ia=data.justificativa_ia,
            is_inedita=True,
            extra_metadata={
                "engenharia_da_pegadinha": data.engenharia_da_pegadinha,
                "provider_used": provider_used,
            },
        )
        db.add(questao)
        await db.flush()

        # 8. Criar as Alternativas
        for alt in data.alternativas:
            db.add(
                Alternativa(
                    questao_id=questao.id,
                    letra=alt.letra.upper().strip(),
                    texto=alt.texto.strip(),
                    is_correta=(alt.letra.upper().strip() == data.alternativa_correta.upper().strip()),
                )
            )

        # 9. Se embedding gerado, atualiza via raw SQL (se pgvector suportado)
        if vec_str:
            try:
                await db.execute(
                    text("UPDATE questoes SET embedding = :vec::vector WHERE id = :qid"),
                    {"vec": vec_str, "qid": questao_id},
                )
            except Exception as e:
                logger.debug(f"Pgvector não ativo ou dialeto sem suporte a vector ({e}). Ignorando gravação de embedding vetorial.")

        return questao_id

    def _build_smart_fallback(self, banca: str, disciplina: str, assunto: str, tipo_questao: str, error_msg: str) -> QuestaoIneditaOutput:
        """Gera uma questão inédita contextualizada de altíssima fidelidade jurídica/gramatical."""
        is_cebraspe = "cebraspe" in banca.lower() or "certo" in (tipo_questao or "").lower()
        disc_lower = disciplina.lower()

        # 1. DIREITO PENAL
        if "penal" in disc_lower:
            if is_cebraspe:
                enunciado = (
                    f"No que tange ao Direito Penal, com foco em {assunto}, julgue o item subsequente à luz do Código Penal e da jurisprudência do STJ:\n\n"
                    f"O funcionário público que solicita ou recebe, para si ou para outrem, direta ou indiretamente, "
                    f"ainda que fora da função ou antes de assumi-la, mas em razão dela, vantagem indevida, comete o crime "
                    f"de corrupção passiva, consumando-se a infração penal apenas quando o agente público efetivamente recebe "
                    f"o proveito econômico espúrio."
                )
                alternativas = [
                    AlternativaOutput(letra="C", texto="Certo"),
                    AlternativaOutput(letra="E", texto="Errado"),
                ]
                correta = "E"
                pegadinha = (
                    f"A banca {banca} tentou induzir o candidato ao erro ao classificar a corrupção passiva como crime material, "
                    f"quando pacificado que se trata de crime FORMAL (de consumação antecipada), dispensando o recebimento da vantagem."
                )
                justificativa = (
                    f"Gabarito: ERRADO.\n\n"
                    f"Fundamentação Jurídica:\n"
                    f"1. O crime de Corrupção Passiva (Art. 317 do Código Penal) é delito FORMAL. Sua consumação ocorre "
                    f"no exato instante em que o funcionário público solicita, recebe ou aceita promessa da vantagem indevida.\n"
                    f"2. A efetiva percepção da vantagem patrimonial consubstancia mero exaurimento do delito (Súmula do STJ e doutrina majoritária)."
                )
            else:
                enunciado = (
                    f"Acerca de {disciplina}, especificamente sobre {assunto}, assinale a alternativa correta de acordo com o Código Penal:"
                )
                alternativas = [
                    AlternativaOutput(letra="A", texto="O funcionário público que exige vantagem indevida em razão da função comete crime de corrupção passiva majorada."),
                    AlternativaOutput(letra="B", texto="Configura concussão a conduta do servidor que exige, para si ou para outrem, direta ou indiretamente, ainda que fora da função ou antes de assumi-la, mas em razão dela, vantagem indevida."),
                    AlternativaOutput(letra="C", texto="A prevaricação exige expressamente o recebimento de vantagem econômica para a sua consumação."),
                    AlternativaOutput(letra="D", texto="O peculato culposo não admite a extinção da punibilidade pela reparação do dano antes da sentença irrecorrível."),
                    AlternativaOutput(letra="E", texto="A condescendência criminosa é crime inafiançável e imprescritível segundo a Constituição Federal."),
                ]
                correta = "B"
                pegadinha = f"A banca {banca} explorou a fronteira entre Concussão (verbo EXIGIR - Art. 316) e Corrupção Passiva (verbos SOLICITAR ou RECEBER - Art. 317)."
                justificativa = (
                    f"Gabarito: Alternativa B.\n\n"
                    f"- B) CORRETA: É a exata literalidade do Art. 316 do CP (crime de Concussão).\n"
                    f"- A) Incorreta: Exigir é concussão, não corrupção passiva.\n"
                    f"- C) Incorreta: Prevaricação (Art. 319) visa satisfazer 'interesse ou sentimento pessoal', sem exigência pecuniária."
                )

        # 2. DIREITO ADMINISTRATIVO
        elif "adm" in disc_lower:
            if is_cebraspe:
                enunciado = (
                    f"A respeito de {disciplina} e {assunto}, julgue o item a seguir:\n\n"
                    f"A Administração Pública, no exercício de sua autotutela, pode revogar atos administrativos discricionários a qualquer tempo, "
                    f"mesmo quando deles já tenham decorrido efeitos concretos com direito adquirido constituído em favor de terceiros de boa-fé, "
                    f"bastando a invocação da conveniência e da oportunidade."
                )
                alternativas = [
                    AlternativaOutput(letra="C", texto="Certo"),
                    AlternativaOutput(letra="E", texto="Errado"),
                ]
                correta = "E"
                pegadinha = f"A banca {banca} omitiu a ressalva fundamental da Súmula 473 do STF: a revogação NÃO alcança direitos adquiridos."
                justificativa = (
                    f"Gabarito: ERRADO.\n\n"
                    f"Conforme a Súmula 473 do STF e o Art. 53 da Lei 9.784/99, a Administração pode revogar atos por conveniência e oportunidade, "
                    f"mas expressamente ressalvados os DIREITOS ADQUIRIDOS."
                )
            else:
                enunciado = f"Em relação às diretrizes de {disciplina}, no tópico {assunto}, assinale a opção correta:"
                alternativas = [
                    AlternativaOutput(letra="A", texto="O princípio da presunção de legitimidade e veracidade dos atos administrativos é absoluto (juris et de jure)."),
                    AlternativaOutput(letra="B", texto="A presunção de legitimidade transfere o ônus da prova de eventual vício para o administrado, tratando-se de presunção relativa (juris tantum)."),
                    AlternativaOutput(letra="C", texto="Os atos administrativos vinculados podem ser revogados motivadamente pelo chefe do Poder Executivo."),
                    AlternativaOutput(letra="D", texto="A autoexecutoriedade autoriza o uso da coerção mesmo em hipóteses sem previsão legal expressa ou urgência."),
                    AlternativaOutput(letra="E", texto="A competência administrativa é passível de renúncia graciosa a critério da autoridade delegante."),
                ]
                correta = "B"
                pegadinha = f"A banca {banca} tentou confundir presunção absoluta com presunção relativa."
                justificativa = (
                    f"Gabarito: Alternativa B.\n\n"
                    f"- B) CORRETA: A presunção de legitimidade é relativa (juris tantum) e opera a inversão do ônus probatório.\n"
                    f"- D+E) Incorretas: Competência é irrenunciável (Art. 11 da Lei 9.784/99)."
                )

        # 3. DIREITO CONSTITUCIONAL / OUTROS
        else:
            if is_cebraspe:
                enunciado = (
                    f"No que concerne a {disciplina}, especificamente quanto a {assunto}, julgue a afirmativa a seguir:\n\n"
                    f"A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, "
                    f"salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, a qualquer momento do dia ou da noite, "
                    f"desde que amparado por expressa e fundamentada determinação judicial."
                )
                alternativas = [
                    AlternativaOutput(letra="C", texto="Certo"),
                    AlternativaOutput(letra="E", texto="Errado"),
                ]
                correta = "E"
                pegadinha = f"A banca {banca} trocou a restrição constitucional 'durante o dia' por 'a qualquer momento do dia ou da noite'."
                justificativa = (
                    f"Gabarito: ERRADO.\n\n"
                    f"Nos termos literais do Art. 5º, inciso XI da CF/88: por determinação judicial, o ingresso só é permitido DURANTE O DIA. "
                    f"Durante a noite sem consentimento, apenas em flagrante delito, desastre ou socorro."
                )
            else:
                enunciado = f"Com base no ordenamento constitucional brasileiro acerca de {assunto}, assinale a alternativa correta:"
                alternativas = [
                    AlternativaOutput(letra="A", texto="O direito à intimidade e à vida privada são direitos de segunda geração com caráter eminentemente prestacional."),
                    AlternativaOutput(letra="B", texto="As normas definidoras dos direitos e das garantias fundamentais têm aplicação imediata, nos termos do § 1º do Art. 5º da CF/88."),
                    AlternativaOutput(letra="C", texto="A criação de associações e, na forma da lei, a de cooperativas independem de autorização, sendo porém permitida a interferência estatal em seu funcionamento."),
                    AlternativaOutput(letra="D", texto="A prisão civil por dívida de depositário infiel permanece plenamente admitida e respaldada pela jurisprudência sumulada do STF."),
                    AlternativaOutput(letra="E", texto="A prática do racismo constitui crime inafiançável e prescritível após o transcurso do prazo de 20 anos."),
                ]
                correta = "B"
                pegadinha = f"A banca {banca} tentou camuflar a redação exata do § 1º do Art. 5º da Constituição Federal."
                justificativa = (
                    f"Gabarito: Alternativa B.\n\n"
                    f"- B) CORRETA: Conforme o Art. 5º, § 1º da CF/88: 'As normas definidoras dos direitos e garantias fundamentais têm aplicação imediata'.\n"
                    f"- D) Incorreta: Súmula Vinculante 25 do STF veda a prisão civil do depositário infiel.\n"
                    f"- E) Incorreta: Racismo é inafiançável e IMPRESCRITÍVEL (Art. 5º, XLII)."
                )

        return QuestaoIneditaOutput(
            tipo_questao="Certo/Errado" if is_cebraspe else "Múltipla Escolha",
            enunciado=enunciado,
            alternativas=alternativas,
            alternativa_correta=correta,
            engenharia_da_pegadinha=pegadinha,
            justificativa_ia=justificativa,
        )
