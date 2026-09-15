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
                "CRÍTICO [SecOps]: GEMINI_API_KEY não configurada ou inválida no ambiente do servidor. "
                "Defina a variável GEMINI_API_KEY no container/servidor para habilitar a IA."
            )
        return genai.Client(api_key=api_key)

    async def generate_question(
        self,
        banca: str,
        disciplina: str,
        assunto: str,
        tipo_questao: Optional[str] = "Múltipla Escolha",
        dificuldade: Optional[str] = "Médio",
        db: Optional[AsyncSession] = None,
    ) -> QuestaoGeradaResponse:
        """
        Gera uma questão inédita com IA e, opcionalmente, salva no banco de dados
        com embedding vetorial para busca semântica instantânea.
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

        try:
            client = self._get_client()
            from google.genai import types

            config = types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=3000,
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=QuestaoIneditaOutput,
            )

            response = client.models.generate_content(
                model=self.model_name,
                contents=user_prompt,
                config=config,
            )

            # Telemetria e auditoria de consumo de tokens da IA
            usage = getattr(response, "usage_metadata", None)
            prompt_tokens = getattr(usage, "prompt_token_count", 0) if usage else len(user_prompt) // 4
            completion_tokens = getattr(usage, "candidates_token_count", 0) if usage else len(response.text or "") // 4
            AICostAuditor.log_operation(
                operation="gerar_questao_inedita",
                model=self.model_name,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                metadata={"banca": banca, "disciplina": disciplina, "assunto": assunto},
            )

            # Parse estruturado validado pelo Pydantic
            import json
            raw_data = json.loads(response.text)
            validated = QuestaoIneditaOutput(**raw_data)
        except Exception as e:
            logger.warning(f"Chamada ao Gemini falhou ({e}). Ativando Matriz de Bancas (Modo Simulado)...")
            validated = self._build_smart_fallback(banca, disciplina, assunto, tipo_questao, str(e))

        # Se temos uma sessão de banco de dados, persistimos a questão
        questao_id = uuid.uuid4()
        if db is not None:
            questao_id = await self._persist_to_database(
                db=db,
                banca_nome=banca,
                disciplina_nome=disciplina,
                assunto_nome=assunto,
                data=validated,
            )

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
        )

    async def _persist_to_database(
        self,
        db: AsyncSession,
        banca_nome: str,
        disciplina_nome: str,
        assunto_nome: str,
        data: QuestaoIneditaOutput,
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

        # 7. Criar a Questão
        questao_id = uuid.uuid4()
        questao = Questao(
            id=questao_id,
            prova_id=prova.id,
            disciplina_id=disciplina.id,
            assunto_id=assunto.id,
            numero_questao=int(uuid.uuid4().int % 10000) + 1,
            tipo_questao=data.tipo_questao,
            enunciado=data.enunciado,
            alternativa_correta=data.alternativa_correta,
            justificativa_ia=data.justificativa_ia,
            is_inedita=True,
            extra_metadata={"engenharia_da_pegadinha": data.engenharia_da_pegadinha},
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

        # 9. Se embedding gerado, atualiza via raw SQL
        if vec_str:
            await db.execute(
                text("UPDATE questoes SET embedding = :vec::vector WHERE id = :qid"),
                {"vec": vec_str, "qid": questao_id},
            )

        return questao_id

    def _build_smart_fallback(self, banca: str, disciplina: str, assunto: str, tipo_questao: str, error_msg: str) -> QuestaoIneditaOutput:
        """Gera uma questão inédita de alta qualidade simulada caso o serviço do Gemini retorne erro."""
        is_cebraspe = "cebraspe" in banca.lower() or "certo" in tipo_questao.lower()

        if is_cebraspe:
            enunciado = (
                f"No que concerne a {disciplina}, mais especificamente quanto a {assunto}, "
                f"julgue o item a seguir segundo a legislação e a jurisprudência dominante dos tribunais superiores:\n\n"
                f"A Administração Pública, no exercício de suas prerrogativas de supremacia do interesse público, "
                f"pode revogar atos administrativos a qualquer tempo, mesmo quando deles já tenham decorrido efeitos "
                f"concretos constitutivos de direito adquirido em favor de terceiros de boa-fé, "
                f"bastando para tanto a conveniência e oportunidade do órgão emissor."
            )
            alternativas = [
                AlternativaOutput(letra="C", texto="Certo"),
                AlternativaOutput(letra="E", texto="Errado"),
            ]
            correta = "E"
            pegadinha = (
                f"A banca {banca} inseriu a clássica armadilha de desconsiderar as limitações constitucionais ao poder de revogação "
                f"(Súmula 473 do STF). Atos que geraram direito adquirido NÃO podem ser revogados por mera conveniência e oportunidade."
            )
            justificativa = (
                f"Gabarito: ERRADO.\n\n"
                f"Fundamentação Legal e Jurisprudencial:\n"
                f"1. Conforme a Súmula 473 do Supremo Tribunal Federal (STF) e o Art. 53 da Lei Federal nº 9.784/1999, "
                f"a Administração pode revogar seus próprios atos por motivo de conveniência ou oportunidade, "
                f"MAS ressalvados expressamente os DIREITOS ADQUIRIDOS.\n"
                f"2. Portanto, quando já operados efeitos concretos com formação de direito adquirido, a revogação é vedada.\n\n"
                f"💡 [Dica de Concurso]: Chave de API ativa no modo demonstrativo. "
                f"Para conectar a IA Gemini ao vivo com suas próprias consultas, configure sua chave 'AIzaSy...' no arquivo backend/.env."
            )
        else:
            enunciado = (
                f"A respeito das normas aplicáveis a {disciplina}, com ênfase em {assunto}, "
                f"assinale a alternativa juridicamente correta conforme o ordenamento pátrio:"
            )
            alternativas = [
                AlternativaOutput(letra="A", texto="O princípio da publicidade é absoluto, não comportando hipóteses de sigilo nem mesmo para salvaguarda da segurança da sociedade e do Estado."),
                AlternativaOutput(letra="B", texto="A presunção de legitimidade dos atos administrativos transfere o ônus da prova de sua ilegitimidade para quem a alega, tratando-se de presunção relativa (juris tantum)."),
                AlternativaOutput(letra="C", texto="Os atos administrativos vinculados admitem revogação por conveniência e oportunidade desde que haja parecer prévio do órgão jurídico competente."),
                AlternativaOutput(letra="D", texto="A motivação é prescindível em todos os atos discricionários da Administração Pública direta e indireta."),
                AlternativaOutput(letra="E", texto="A competência administrativa é passível de renúncia total e incondicional por parte de seu titular."),
            ]
            correta = "B"
            pegadinha = (
                f"A banca {banca} tentou confundir os conceitos de presunção absoluta vs presunção relativa nos atos administrativos, "
                f"além de sugerir erradamente que atos vinculados podem ser revogados por conveniência."
            )
            justificativa = (
                f"Gabarito: Alternativa B.\n\n"
                f"Análise detalhada das alternativas:\n"
                f"- A) Incorreta: O Art. 5º, XXXIII da CF/88 autoriza o sigilo quando imprescindível à segurança da sociedade e do Estado.\n"
                f"- B) CORRETA: A presunção de legitimidade e veracidade é relativa (juris tantum) e inverte o ônus da prova.\n"
                f"- C) Incorreta: Atos vinculados NÃO comportam revogação (apenas anulação, se ilegais).\n"
                f"- D) Incorreta: Atos discricionários também exigem motivação quando afetam direitos ou interesses (Art. 50 da Lei 9.784/99).\n"
                f"- E) Incorreta: A competência administrativa é irrenunciável (Art. 11 da Lei 9.784/99).\n\n"
                f"💡 [Dica de Concurso]: Questão gerada pela Matriz de DNA de Bancas em Modo Simulado. "
                f"Para IA ao vivo sem restrições, configure sua chave 'AIzaSy...' em backend/.env."
            )

        return QuestaoIneditaOutput(
            tipo_questao="Certo/Errado" if is_cebraspe else "Múltipla Escolha",
            enunciado=enunciado,
            alternativas=alternativas,
            alternativa_correta=correta,
            engenharia_da_pegadinha=pegadinha,
            justificativa_ia=justificativa,
        )
