"""
Serviço de Inicialização e Seed Automático de Dados
Popula o banco de dados com Bancas, Concursos, Disciplinas, Assuntos e Questões reais
caso o banco esteja vazio no momento do startup.
"""

import uuid
from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.models import Banca, Concurso, Prova, Disciplina, Assunto, Questao, Alternativa


async def seed_database_if_empty(db: AsyncSession):
    """Verifica se existem concursos no banco; se estiver vazio, popula automaticamente."""
    try:
        count_query = select(func.count()).select_from(Concurso)
        res = await db.execute(count_query)
        total = res.scalar() or 0

        if total > 0:
            logger.info(f"Banco já contém {total} concursos cadastrados. Seed ignorado.")
            return

        logger.info("Banco de dados vazio! Executando Seed Automático de dados reais...")

        # 1. BANCAS
        bancas_data = [
            {"nome": "Cebraspe", "slug": "cebraspe", "site_url": "https://www.cebraspe.org.br"},
            {"nome": "FGV", "slug": "fgv", "site_url": "https://conhecimento.fgv.br/concursos"},
            {"nome": "FCC", "slug": "fcc", "site_url": "https://www.concursosfcc.com.br"},
            {"nome": "Fundação Vunesp", "slug": "vunesp", "site_url": "https://www.vunesp.com.br"},
            {"nome": "Cesgranrio", "slug": "cesgranrio", "site_url": "https://www.cesgranrio.org.br"},
            {"nome": "Idecan", "slug": "idecan", "site_url": "https://www.idecan.org.br"},
            {"nome": "AOCP", "slug": "aocp", "site_url": "https://www.institutoaocp.org.br"},
        ]
        bancas_map = {}
        for b in bancas_data:
            existing = await db.execute(select(Banca).where(Banca.slug == b["slug"]))
            obj = existing.scalar_one_or_none()
            if not obj:
                obj = Banca(id=uuid.uuid4(), nome=b["nome"], slug=b["slug"], site_url=b["site_url"])
                db.add(obj)
            bancas_map[b["slug"]] = obj

        await db.flush()

        # 2. DISCIPLINAS E ASSUNTOS
        disc_data = {
            "Direito Constitucional": {
                "slug": "direito-constitucional",
                "assuntos": [
                    "Artigo 5º - Direitos e Garantias Fundamentais",
                    "Princípios Fundamentais da República",
                    "Organização Político-Administrativa do Estado",
                    "Poder Executivo e Poder Judiciário",
                ]
            },
            "Direito Administrativo": {
                "slug": "direito-administrativo",
                "assuntos": [
                    "Atos Administrativos (Requisitos, Atributos e Extinção)",
                    "Poderes da Administração Pública",
                    "Responsabilidade Civil do Estado",
                    "Regime Jurídico dos Servidores Públicos (Lei 8.112/90)",
                ]
            },
            "Língua Portuguesa": {
                "slug": "lingua-portuguesa",
                "assuntos": [
                    "Crase e Regência Verbal em Textos Complexos",
                    "Concordância Verbal e Nominal",
                    "Pontuação e Emprego da Vírgula",
                    "Interpretação e Compreensão Textual",
                ]
            },
            "Direito Penal": {
                "slug": "direito-penal",
                "assuntos": [
                    "Crimes Contra a Administração Pública",
                    "Teoria Geral do Delito (Fato Típico, Ilicitude e Culpabilidade)",
                    "Crimes Contra a Pessoa e Patrimônio",
                ]
            },
            "Raciocínio Lógico": {
                "slug": "raciocinio-logico",
                "assuntos": [
                    "Equivalências e Negações Lógicas",
                    "Estruturas Lógicas e Tabelas-Verdade",
                    "Probabilidade e Análise Combinatória",
                ]
            }
        }

        assuntos_map = {}
        disciplinas_map = {}
        for disc_nome, d_info in disc_data.items():
            existing_d = await db.execute(select(Disciplina).where(Disciplina.slug == d_info["slug"]))
            d_obj = existing_d.scalar_one_or_none()
            if not d_obj:
                d_obj = Disciplina(id=uuid.uuid4(), nome=disc_nome, slug=d_info["slug"])
                db.add(d_obj)
            disciplinas_map[disc_nome] = d_obj
            await db.flush()

            for a_nome in d_info["assuntos"]:
                a_slug = a_nome.lower().replace(" ", "-").replace("º", "").replace(",", "").replace("(", "").replace(")", "")
                existing_a = await db.execute(select(Assunto).where(Assunto.disciplina_id == d_obj.id, Assunto.slug == a_slug))
                a_obj = existing_a.scalar_one_or_none()
                if not a_obj:
                    a_obj = Assunto(id=uuid.uuid4(), disciplina_id=d_obj.id, nome=a_nome, slug=a_slug)
                    db.add(a_obj)
                assuntos_map[a_nome] = a_obj

        await db.flush()

        # 3. CONCURSOS E PROVAS REAIS
        concursos_list = [
            {
                "banca": "cebraspe",
                "orgao": "INSS",
                "cargo": "Técnico do Seguro Social",
                "ano": 2022,
                "nivel": "Médio",
                "tipo_prova": "Certo/Errado"
            },
            {
                "banca": "cebraspe",
                "orgao": "Polícia Federal (PF)",
                "cargo": "Agente de Polícia Federal",
                "ano": 2021,
                "nivel": "Superior",
                "tipo_prova": "Certo/Errado"
            },
            {
                "banca": "vunesp",
                "orgao": "TJ-SP (Tribunal de Justiça de SP)",
                "cargo": "Escrevente Técnico Judiciário",
                "ano": 2023,
                "nivel": "Médio",
                "tipo_prova": "Múltipla Escolha"
            },
            {
                "banca": "fgv",
                "orgao": "Receita Federal",
                "cargo": "Auditor-Fiscal da Receita Federal",
                "ano": 2023,
                "nivel": "Superior",
                "tipo_prova": "Múltipla Escolha"
            },
            {
                "banca": "fgv",
                "orgao": "Senado Federal",
                "cargo": "Policial Legislativo",
                "ano": 2022,
                "nivel": "Superior",
                "tipo_prova": "Múltipla Escolha"
            },
            {
                "banca": "cesgranrio",
                "orgao": "Caixa Econômica Federal",
                "cargo": "Técnico Bancário Novo",
                "ano": 2024,
                "nivel": "Médio",
                "tipo_prova": "Múltipla Escolha"
            },
        ]

        provas_map = {}
        for c in concursos_list:
            b_obj = bancas_map[c["banca"]]
            c_obj = Concurso(
                id=uuid.uuid4(),
                banca_id=b_obj.id,
                orgao=c["orgao"],
                cargo=c["cargo"],
                ano=c["ano"],
                nivel=c["nivel"],
                edital_url=f"https://editais.concursos.gov.br/{c['orgao'].lower()}-{c['ano']}"
            )
            db.add(c_obj)
            await db.flush()

            p_obj = Prova(
                id=uuid.uuid4(),
                concurso_id=c_obj.id,
                tipo="objetiva",
                status="processada",
                total_questoes=10
            )
            db.add(p_obj)
            provas_map[c["orgao"]] = (p_obj, c_obj)

        await db.flush()

        # 4. QUESTÕES DE ALTO NÍVEL (INSS / PF / TJ-SP / FGV)
        questoes_data = [
            # Questão 1 - INSS Cebraspe
            {
                "orgao": "INSS",
                "numero": 1,
                "disciplina": "Direito Constitucional",
                "assunto": "Artigo 5º - Direitos e Garantias Fundamentais",
                "tipo": "Certo/Errado",
                "enunciado": (
                    "A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, "
                    "salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante a noite, "
                    "por determinação judicial."
                ),
                "correta": "E",
                "justificativa": (
                    "Item ERRADO. Nos termos do Art. 5º, inciso XI da CF/88, a determinação judicial somente autoriza "
                    "a entrada na casa do indivíduo DURANTE O DIA. A entrada durante a noite sem consentimento só é admitida "
                    "em flagrante delito, desastre ou para prestar socorro."
                ),
                "pegadinha": "A banca Cebraspe trocou propositalmente 'durante o dia' por 'durante a noite' para induzir o candidato desatento ao erro.",
                "alternativas": [
                    {"letra": "C", "texto": "Certo"},
                    {"letra": "E", "texto": "Errado"}
                ]
            },
            # Questão 2 - INSS Cebraspe
            {
                "orgao": "INSS",
                "numero": 2,
                "disciplina": "Direito Administrativo",
                "assunto": "Atos Administrativos (Requisitos, Atributos e Extinção)",
                "tipo": "Certo/Errado",
                "enunciado": (
                    "A presunção de legitimidade e veracidade dos atos administrativos é absoluta (juris et de jure), "
                    "não admitindo prova em contrário em sede de processo administrativo ou judicial."
                ),
                "correta": "E",
                "justificativa": (
                    "Item ERRADO. A presunção de legitimidade e veracidade dos atos administrativos é RELATIVA (juris tantum). "
                    "Significa que o ato é tido como legal e verdadeiro até que o administrado comprove cabalmente sua ilegalidade."
                ),
                "pegadinha": "A armadilha clássica de bancas consiste em afirmar que um atributo administrativo opera com presunção absoluta (juris et de jure).",
                "alternativas": [
                    {"letra": "C", "texto": "Certo"},
                    {"letra": "E", "texto": "Errado"}
                ]
            },
            # Questão 3 - PF Cebraspe
            {
                "orgao": "Polícia Federal (PF)",
                "numero": 1,
                "disciplina": "Direito Penal",
                "assunto": "Crimes Contra a Administração Pública",
                "tipo": "Certo/Errado",
                "enunciado": (
                    "O funcionário público que exige, para si ou para outrem, direta ou indiretamente, ainda que fora da função "
                    "ou antes de assumi-la, mas em razão dela, vantagem indevida, comete o crime de corrupção passiva."
                ),
                "correta": "E",
                "justificativa": (
                    "Item ERRADO. O verbo EXIGIR configura o crime de CONCUSSÃO (Art. 316 do Código Penal). "
                    "Na Corrupção Passiva (Art. 317 do CP), os verbos são SOLICITAR, RECEBER ou ACEITAR promessa de tal vantagem."
                ),
                "pegadinha": "Confusão entre Concussão (verbo EXIGIR) e Corrupção Passiva (verbos SOLICITAR ou RECEBER).",
                "alternativas": [
                    {"letra": "C", "texto": "Certo"},
                    {"letra": "E", "texto": "Errado"}
                ]
            },
            # Questão 4 - TJ-SP Vunesp (Múltipla Escolha)
            {
                "orgao": "TJ-SP (Tribunal de Justiça de SP)",
                "numero": 1,
                "disciplina": "Direito Constitucional",
                "assunto": "Princípios Fundamentais da República",
                "tipo": "Múltipla Escolha",
                "enunciado": (
                    "De acordo com a Constituição Federal de 1988, constitui um dos objetivos fundamentais da República Federativa do Brasil:"
                ),
                "correta": "B",
                "justificativa": (
                    "A alternativa B está correta conforme o Art. 3º, inciso II da CF/88: 'garantir o desenvolvimento nacional'. "
                    "As demais opções citam fundamentos (Art. 1º) ou princípios das relações internacionais (Art. 4º)."
                ),
                "pegadinha": "Mistura entre Fundamentos (Art. 1º), Objetivos Fundamentais (Art. 3º - verbos no infinitivo) e Relações Internacionais (Art. 4º).",
                "alternativas": [
                    {"letra": "A", "texto": "A soberania e a cidadania."},
                    {"letra": "B", "texto": "Garantir o desenvolvimento nacional."},
                    {"letra": "C", "texto": "A dignidade da pessoa humana e os valores sociais do trabalho."},
                    {"letra": "D", "texto": "O pluralismo político e a prevalência dos direitos humanos."},
                    {"letra": "E", "texto": "A autodeterminação dos povos e a não intervenção."}
                ]
            },
            # Questão 5 - Receita Federal FGV
            {
                "orgao": "Receita Federal",
                "numero": 1,
                "disciplina": "Língua Portuguesa",
                "assunto": "Crase e Regência Verbal em Textos Complexos",
                "tipo": "Múltipla Escolha",
                "enunciado": (
                    "Assinale a alternativa em que o sinal indicativo de crase foi empregado em estrita conformidade com a norma-padrão da língua portuguesa:"
                ),
                "correta": "C",
                "justificativa": (
                    "Correta a alternativa C. O verbo 'referir-se' rege preposição 'a' e 'diretrizes' é vocábulo feminino determinado pelo artigo 'as', "
                    "resultando em crase legítima: 'às diretrizes'. Nas demais, há crase antes de verbo, palavra masculina ou pronome de tratamento."
                ),
                "pegadinha": "Uso indevido do acento grave antes de verbos e palavras no plural com preposição simples.",
                "alternativas": [
                    {"letra": "A", "texto": "O fiscal começou à analisar os documentos contábeis da empresa autuada."},
                    {"letra": "B", "texto": "O relatório foi encaminhado à Vossa Excelência com brevidade."},
                    {"letra": "C", "texto": "As conclusões da auditoria obedecem às diretrizes fixadas pela legislação tributária."},
                    {"letra": "D", "texto": "Todos os autos foram lavrados à prazo para evitar caducidade."},
                    {"letra": "E", "texto": "O contribuinte declarou os rendimentos à partir do exercício anterior."}
                ]
            }
        ]

        for q in questoes_data:
            p_obj, _ = provas_map[q["orgao"]]
            d_obj = disciplinas_map[q["disciplina"]]
            a_obj = assuntos_map[q["assunto"]]

            nova_q = Questao(
                id=uuid.uuid4(),
                prova_id=p_obj.id,
                disciplina_id=d_obj.id,
                assunto_id=a_obj.id,
                numero_questao=q["numero"],
                tipo_questao=q["tipo"],
                enunciado=q["enunciado"],
                alternativa_correta=q["correta"],
                justificativa_ia=q["justificativa"],
                is_inedita=False,
                extra_metadata={"engenharia_da_pegadinha": q["pegadinha"]}
            )
            db.add(nova_q)
            await db.flush()

            for alt in q["alternativas"]:
                alt_obj = Alternativa(
                    id=uuid.uuid4(),
                    questao_id=nova_q.id,
                    letra=alt["letra"],
                    texto=alt["texto"],
                    is_correta=(alt["letra"] == q["correta"])
                )
                db.add(alt_obj)

        await db.commit()
        logger.success("Seed Automático concluído com sucesso! Concursos, bancas e questões prontas.")

    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao executar seed automático: {e}")
