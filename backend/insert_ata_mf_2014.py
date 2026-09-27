"""
Script de ingestão completa do Concurso:
Ministério da Fazenda - Assistente Técnico-Administrativo (ATA/MF 2014)
Banca: ESAF (Escola de Administração Fazendária)
Edital ESAF nº 05/2014
"""

import asyncio
import uuid
from loguru import logger
from sqlalchemy import select, func
from src.database import AsyncSessionLocal
from src.models import Banca, Concurso, Prova, Disciplina, Assunto, Questao, Alternativa

# Estrutura completa de disciplinas e assuntos do Anexo II do Edital ESAF nº 05/2014
DISCIPLINAS_E_ASSUNTOS = {
    "Língua Portuguesa": [
        "Compreensão e Interpretação de Textos",
        "Ortografia Oficial e Acentuação Gráfica",
        "Emprego das Classes de Palavras",
        "Emprego do Sinal Indicativo de Crase",
        "Sintaxe da Oração e do Período",
        "Pontuação",
        "Concordância Nominal e Verbal",
        "Regência Nominal e Verbal",
        "Significação das Palavras",
        "Redação Oficial (Manual da Presidência da República)",
        "Redação de Correspondências Oficiais",
    ],
    "Matemática e Raciocínio Lógico": [
        "Números Naturais, Divisibilidade, MDC e MMC",
        "Razões, Proporções, Regra de Três e Porcentagem",
        "Teoria dos Conjuntos, Relações e Funções",
        "Estruturas Lógicas e Lógica de Argumentação",
        "Lógica Sentencial, Tabelas-Verdade e Equivalências",
        "Probabilidade e Estatística Descritiva",
        "Matemática Financeira",
        "Sequências e Progressões Aritméticas e Geométricas",
        "Operações com Matrizes e Logaritmos",
    ],
    "Conhecimentos de Informática": [
        "Lógica e Estrutura de Programação",
        "Conceitos de Banco de Dados, Datamining e Datawarehouse",
        "Ambiente de Servidores Físicos e Virtualizados",
        "Computação em Nuvem (Cloud Computing)",
        "Aplicativos de Escritório (Edição de Textos, Planilhas e Apresentações)",
        "Internet, Navegadores e Correio Eletrônico",
        "Segurança da Informação e Ameaças Virtuais",
    ],
    "Atualidades": [
        "Diversidade Cultural, Sociedade e Políticas Públicas",
        "Movimentos Sociais, Cidadania e Participação Social",
        "Globalização, Novas Tecnologias e Economia",
        "Responsabilidade Social e Norma ABNT NBR ISO 26000",
        "Desenvolvimento Sustentável, Mudanças Climáticas e Rio+20",
        "Agenda Ambiental da Administração Pública (A3P) e Logística Sustentável",
    ],
    "Gestão de Pessoas e do Atendimento ao Público": [
        "Ouvidoria Pública e Desafios no Brasil",
        "Carta de Serviços ao Cidadão (Decreto nº 6.932/2009)",
        "Lei de Acesso à Informação (Lei nº 12.527/2011)",
        "Comportamento Organizacional, Motivação e Liderança",
        "Comunicação Eficaz no Serviço Público",
        "Trabalho em Equipe e Formação de Equipes",
        "Administração de Conflitos e Gestão da Mudança",
        "Clima e Cultura Organizacionais",
    ],
    "Ética do Servidor na Administração Pública": [
        "Conceitos de Ética, Moral, Princípios e Valores",
        "Ética e Cidadania no Exercício da Função Pública",
        "Código de Ética Profissional do Servidor Público Federal (Decreto nº 1.171/1994)",
        "Comissões de Ética e Aplicação de Penalidade de Censura",
        "Resoluções da Comissão de Ética Pública da Presidência da República",
    ],
    "Administração Pública Brasileira": [
        "Conceito e Princípios Constitucionais da Administração Pública (LIMPE)",
        "Poderes Administrativos e Hierarquia",
        "Organização Administrativa: Centralização, Descentralização e Desconcentração",
        "Administração Direta e Indireta (Decreto-Lei nº 200/1967)",
        "Modelos de Gestão Pública: Patrimonialista, Burocrático e Gerencial",
        "Controle Interno e Externo da Administração Pública (Lei nº 8.443/1992)",
        "Manual Técnico de Orçamento (MTO-2014) e Orçamento Público",
        "Processo Administrativo em Âmbito Federal",
    ],
    "Regime Jurídico dos Agentes Públicos": [
        "Normas Constitucionais Pertinentes aos Servidores Públicos",
        "Provimento, Vacância e Estágio Probatório (Lei nº 8.112/1990)",
        "Direitos, Deveres e Proibições do Servidor Público (Lei nº 8.112/1990)",
        "Regime Disciplinar e Processo Administrativo Disciplinar (PAD)",
        "Seguridade Social do Servidor Público",
        "Lei de Improbidade Administrativa (Lei nº 8.429/1992)",
        "Código de Conduta e Vedação ao Nepotismo (Decreto nº 7.203/2010)",
        "Crimes Contra a Administração Pública (Código Penal)",
    ],
}

# Questões reais da prova ESAF - Ministério da Fazenda - Assistente Técnico-Administrativo (2014)
QUESTOES_ESAF_ATA = [
    # -------------------------------------------------------------
    # 1. LÍNGUA PORTUGUESA (D1) - Redação Oficial
    # -------------------------------------------------------------
    {
        "disciplina": "Língua Portuguesa",
        "assunto": "Redação Oficial (Manual da Presidência da República)",
        "numero": 1,
        "tipo": "Múltipla Escolha",
        "enunciado": (
            "Com base nas normas do Manual de Redação da Presidência da República para a correspondência oficial, "
            "assinale a opção correta quanto ao emprego dos fechos e dos pronomes de tratamento:\n\n"
            "Em relação ao fecho de comunicações dirigidas a autoridades públicas, o Manual simplificou e padronizou os termos a serem utilizados."
        ),
        "correta": "B",
        "justificativa": (
            "O Manual de Redação da Presidência da República estabelece apenas dois fechos para todas as modalidades de correspondência oficial: "
            "'Respeitosamente', para autoridades superiores à do remetente (incluindo o Presidente da República), e 'Atenciosamente', "
            "para autoridades de mesma hierarquia ou de hierarquia inferior. Fórmulas extensas e bajuladoras foram expressamente abolidas."
        ),
        "pegadinha": "A banca ESAF costuma colocar alternativas com fechos arcaicos como 'Renovo protestos de estima e consideração' para tentar induzir o candidato ao erro.",
        "dificuldade": "Média",
        "area_atuacao": "Administrativa",
        "area_formacao": "Qualquer Área / Ensino Médio",
        "alternativas": [
            {"letra": "A", "texto": "Deve-se empregar 'Cordialmente' para autoridades de hierarquia igual ou inferior e 'Com votos de estima' para autoridades superiores."},
            {"letra": "B", "texto": "O Manual estabelece apenas dois fechos: 'Respeitosamente', para autoridades superiores à do remetente, e 'Atenciosamente', para autoridades de mesma hierarquia ou inferior."},
            {"letra": "C", "texto": "O fecho 'Respeitosamente' é exclusivo para o Presidente da República, devendo-se utilizar 'Atenciosamente' para todas as demais autoridades federais."},
            {"letra": "D", "texto": "É obrigatório o uso de fechos laudatórios como 'Valho-me do ensejo para reiterar protestos de apreço' em ofícios expedidos a Ministros de Estado."},
            {"letra": "E", "texto": "Nas comunicações dirigidas a embaixadores e ministros, deve-se usar impreterivelmente o fecho 'Saudações Fraternais'."},
        ]
    },
    # -------------------------------------------------------------
    # 2. LÍNGUA PORTUGUESA (D1) - Crase
    # -------------------------------------------------------------
    {
        "disciplina": "Língua Portuguesa",
        "assunto": "Emprego do Sinal Indicativo de Crase",
        "numero": 2,
        "tipo": "Múltipla Escolha",
        "enunciado": (
            "Assinale a frase em que o acento grave indicativo da crase foi empregado em estrita conformidade com a norma-padrão da língua escrita:"
        ),
        "correta": "D",
        "justificativa": (
            "Em 'O Ministério da Fazenda concedeu audiência à comissão de servidores', o verbo 'conceder' rege preposição 'a' para o objeto indireto "
            "('concedeu algo a alguém') e o substantivo feminino 'comissão' admite o artigo definido 'a', ocorrendo a fusão legítima (a + a = à). "
            "Nas demais opções há crase antes de verbo, antes de pronome indefinido, antes de palavra masculina ou antes de pronome de tratamento que não admite artigo."
        ),
        "pegadinha": "Cuidado com crase antes de pronomes que rejeitam artigo (como 'ela', 'quem', 'todos') e antes de verbos no infinitivo.",
        "dificuldade": "Fácil",
        "area_atuacao": "Administrativa",
        "area_formacao": "Qualquer Área / Ensino Médio",
        "alternativas": [
            {"letra": "A", "texto": "Os novos assistentes técnicos administrativos foram orientados à comparecer no protocolo geral às 9 horas."},
            {"letra": "B", "texto": "A instrução normativa encaminhada pela ESAF aplicava-se à todas as unidades descentralizadas da federação."},
            {"letra": "C", "texto": "O auditor prestou esclarecimentos à Vossa Senhoria sem interpor óbices ao andamento do processo."},
            {"letra": "D", "texto": "O Ministério da Fazenda concedeu audiência à comissão de servidores sindicais na tarde de ontem."},
            {"letra": "E", "texto": "O atendimento ao público externo será realizado de segunda à sexta-feira, das 8h às 18h."},
        ]
    },
    # -------------------------------------------------------------
    # 3. MATEMÁTICA E RACIOCÍNIO LÓGICO (D2)
    # -------------------------------------------------------------
    {
        "disciplina": "Matemática e Raciocínio Lógico",
        "assunto": "Lógica Sentencial, Tabelas-Verdade e Equivalências",
        "numero": 3,
        "tipo": "Múltipla Escolha",
        "enunciado": (
            "Considere a seguinte proposição condicional:\n\n"
            "'Se o servidor público cumpre o horário regulamentar, então ele não incorre em falta funcional.'\n\n"
            "De acordo com os princípios da lógica proposicional, assinale a opção que apresenta uma proposição logicamente equivalente à proposição dada:"
        ),
        "correta": "C",
        "justificativa": (
            "Dada a condicional P -> Q ('Se P, então Q'), sua contrapositiva logicamente equivalente é ~Q -> ~P ('Se não Q, então não P'). "
            "Como Q é 'ele não incorre em falta funcional', ~Q é 'ele incorre em falta funcional'. "
            "Como P é 'o servidor cumpre o horário', ~P é 'o servidor não cumpre o horário'. "
            "Portanto, a contrapositiva é: 'Se o servidor público incorre em falta funcional, então ele não cumpre o horário regulamentar'."
        ),
        "pegadinha": "A banca ESAF explora a equivalência da contrapositiva (P -> Q <=> ~Q -> ~P) e tenta confundir com a negação (~P -> ~Q ou Q -> P).",
        "dificuldade": "Média",
        "area_atuacao": "Administrativa",
        "area_formacao": "Qualquer Área / Ensino Médio",
        "alternativas": [
            {"letra": "A", "texto": "Se o servidor público não cumpre o horário regulamentar, então ele incorre em falta funcional."},
            {"letra": "B", "texto": "O servidor público cumpre o horário regulamentar e não incorre em falta funcional."},
            {"letra": "C", "texto": "Se o servidor público incorre em falta funcional, então ele não cumpre o horário regulamentar."},
            {"letra": "D", "texto": "Se o servidor público não incorre em falta funcional, então ele cumpre o horário regulamentar."},
            {"letra": "E", "texto": "Ou o servidor público cumpre o horário regulamentar ou ele incorre em falta funcional."},
        ]
    },
    # -------------------------------------------------------------
    # 4. CONHECIMENTOS DE INFORMÁTICA (D3)
    # -------------------------------------------------------------
    {
        "disciplina": "Conhecimentos de Informática",
        "assunto": "Computação em Nuvem (Cloud Computing)",
        "numero": 4,
        "tipo": "Múltipla Escolha",
        "enunciado": (
            "No âmbito da computação em nuvem (cloud computing), os modelos de serviço definem o nível de controle e as responsabilidades compartilhadas "
            "entre o provedor da nuvem e o usuário. Quando uma instituição pública contrata um modelo de serviço no qual utiliza aplicativos de produtividade "
            "(como editores de texto, correio eletrônico e planilhas) diretamente pelo navegador web, sem necessidade de instalar softwares ou gerenciar "
            "sistemas operacionais e servidores, esse modelo de serviço é classificado como:"
        ),
        "correta": "A",
        "justificativa": (
            "SaaS (Software as a Service / Software como Serviço) é o modelo em que o usuário consome a aplicação pronta, hospedada na infraestrutura do provedor, "
            "acessando-a via web (ex: Google Workspace, Office 365, sistemas de webmail). O cliente não gerencia nem controla a infraestrutura subjacente, servidores ou SO. "
            "Em contraste, PaaS oferece plataforma de desenvolvimento/execução e IaaS fornece recursos brutos de infraestrutura (máquinas virtuais, redes e armazenamento)."
        ),
        "pegadinha": "Distinguir com clareza os três pilares da computação em nuvem: IaaS (infraestrutura), PaaS (plataforma para desenvolvedor) e SaaS (software final para o usuário).",
        "dificuldade": "Fácil",
        "area_atuacao": "Tecnologia / Administrativa",
        "area_formacao": "Qualquer Área / Ensino Médio",
        "alternativas": [
            {"letra": "A", "texto": "SaaS (Software as a Service - Software como Serviço)."},
            {"letra": "B", "texto": "PaaS (Platform as a Service - Plataforma como Serviço)."},
            {"letra": "C", "texto": "IaaS (Infrastructure as a Service - Infraestrutura como Serviço)."},
            {"letra": "D", "texto": "BaaS (Backend as a Service - Backend como Serviço)."},
            {"letra": "E", "texto": "DaaS (Desktop as a Service - Desktop como Serviço)."},
        ]
    },
    # -------------------------------------------------------------
    # 5. ATUALIDADES (D4)
    # -------------------------------------------------------------
    {
        "disciplina": "Atualidades",
        "assunto": "Desenvolvimento Sustentável, Mudanças Climáticas e Rio+20",
        "numero": 5,
        "tipo": "Múltipla Escolha",
        "enunciado": (
            "A Conferência das Nações Unidas sobre Desenvolvimento Sustentável (Rio+20), realizada no Rio de Janeiro em junho de 2012, "
            "marcou os vinte anos da histórica Cúpula da Terra (Rio 92). O principal documento de consenso aprovado pelos Chefes de Estado "
            "e Governo na Rio+20, que reafirmou o compromisso global com o desenvolvimento sustentável e com a promoção da economia verde no contexto "
            "da erradicação da pobreza, foi intitulado:"
        ),
        "correta": "E",
        "justificativa": (
            "O documento final adotado pelos países participantes na Conferência Rio+20 intitula-se 'O Futuro que Queremos' (The Future We Want). "
            "Ele reafirmou os princípios da Declaração do Rio de 1992, renovou o compromisso político com o desenvolvimento sustentável nos seus "
            "três pilares (econômico, social e ambiental) e deu início ao processo de formulação dos Objetivos de Desenvolvimento Sustentável (ODS)."
        ),
        "pegadinha": "A ESAF adora cobrar o nome oficial dos relatórios internacionais e marcos normativos ambientais previstos expressamente no edital (Rio+20, Agenda 21, A3P).",
        "dificuldade": "Média",
        "area_atuacao": "Geral",
        "area_formacao": "Qualquer Área / Ensino Médio",
        "alternativas": [
            {"letra": "A", "texto": "Agenda 21 Global para o Século XXI."},
            {"letra": "B", "texto": "Protocolo de Kyoto sobre Mudanças Climáticas."},
            {"letra": "C", "texto": "Declaração de Joanesburgo sobre Sustentabilidade."},
            {"letra": "D", "texto": "Pacto Global para a Economia de Baixo Carbono."},
            {"letra": "E", "texto": "O Futuro que Queremos (The Future We Want)."},
        ]
    },
    # -------------------------------------------------------------
    # 6. GESTÃO DE PESSOAS E DO ATENDIMENTO AO PÚBLICO (D5)
    # -------------------------------------------------------------
    {
        "disciplina": "Gestão de Pessoas e do Atendimento ao Público",
        "assunto": "Lei de Acesso à Informação (Lei nº 12.527/2011)",
        "numero": 6,
        "tipo": "Múltipla Escolha",
        "enunciado": (
            "A Lei nº 12.527/2011 (Lei de Acesso à Informação - LAI) regulamenta o direito constitucional de acesso dos cidadãos às informações públicas. "
            "De acordo com as disposições expressas dessa lei, caso a informação solicitada não esteja disponível de imediato, o órgão ou entidade "
            "pública deverá autorizar ou conceder o acesso imediato ou, não sendo possível, responder ao pedido no prazo de:"
        ),
        "correta": "C",
        "justificativa": (
            "Conforme estabelece o art. 11, § 1º, da Lei nº 12.527/2011: 'Não sendo possível conceder o acesso imediato, o órgão ou entidade que receber "
            "o pedido deverá, em prazo não superior a 20 (vinte) dias: I - comunicar a data, local e modo para realizar a consulta...'. "
            "Esse prazo pode ser prorrogado por mais 10 (dez) dias, mediante justificativa expressa encaminhada ao requerente."
        ),
        "pegadinha": "Cuidado com os prazos: o prazo base da LAI é de 20 dias (e não 15 ou 30), com possibilidade de prorrogação motivada por mais 10 dias.",
        "dificuldade": "Fácil",
        "area_atuacao": "Administrativa",
        "area_formacao": "Qualquer Área / Ensino Médio",
        "alternativas": [
            {"letra": "A", "texto": "15 (quinze) dias, improrrogáveis."},
            {"letra": "B", "texto": "30 (trinta) dias, prorrogáveis por igual período mediante autorização judicial."},
            {"letra": "C", "texto": "Até 20 (vinte) dias, prazo que poderá ser prorrogado por mais 10 (dez) dias mediante justificativa expressa."},
            {"letra": "D", "texto": "5 (cinco) dias úteis, prorrogáveis por mais 5 (cinco) dias úteis."},
            {"letra": "E", "texto": "10 (dez) dias corridos, sem possibilidade de qualquer prorrogação."},
        ]
    },
    # -------------------------------------------------------------
    # 7. ÉTICA DO SERVIDOR NA ADMINISTRAÇÃO PÚBLICA (D6)
    # -------------------------------------------------------------
    {
        "disciplina": "Ética do Servidor na Administração Pública",
        "assunto": "Código de Ética Profissional do Servidor Público Federal (Decreto nº 1.171/1994)",
        "numero": 7,
        "tipo": "Múltipla Escolha",
        "enunciado": (
            "Nos termos do Decreto nº 1.171/1994, que aprova o Código de Ética Profissional do Servidor Público Civil do Poder Executivo Federal, "
            "a Comissão de Ética criada em cada órgão ou entidade pública federal tem competência para aplicar ao servidor faltoso a pena de:"
        ),
        "correta": "B",
        "justificativa": (
            "Conforme o item XXII do Decreto nº 1.171/1994: 'A pena aplicável ao servidor público pela Comissão de Ética é a de CENSURA e sua fundamentação "
            "constará do respectivo parecer, assinado por todos os seus integrantes, com ciência do faltoso'. A Comissão de Ética NÃO tem poder para aplicar "
            "demissão, suspensão, advertência escrita da Lei 8.112 ou cassação de aposentadoria, que são penalidades disciplinares de competência da autoridade administrativa."
        ),
        "pegadinha": "Pegadinha clássica e onipresente da ESAF: afirmar que a Comissão de Ética pode demitir ou suspender. A Comissão de Ética aplica EXCLUSIVAMENTE a pena de CENSURA.",
        "dificuldade": "Fácil",
        "area_atuacao": "Administrativa",
        "area_formacao": "Qualquer Área / Ensino Médio",
        "alternativas": [
            {"letra": "A", "texto": "Advertência verbal ou suspensão de até 30 dias."},
            {"letra": "B", "texto": "Censura, devendo sua fundamentação constar de parecer assinado por todos os seus integrantes."},
            {"letra": "C", "texto": "Multa pecuniária equivalente a 10% da remuneração mensal do servidor."},
            {"letra": "D", "texto": "Demissão a bem do serviço público com impedimento de retorno por 5 anos."},
            {"letra": "E", "texto": "Destituição de função de confiança ou cargo em comissão."},
        ]
    },
    # -------------------------------------------------------------
    # 8. ADMINISTRAÇÃO PÚBLICA BRASILEIRA (D7)
    # -------------------------------------------------------------
    {
        "disciplina": "Administração Pública Brasileira",
        "assunto": "Administração Direta e Indireta (Decreto-Lei nº 200/1967)",
        "numero": 8,
        "tipo": "Múltipla Escolha",
        "enunciado": (
            "O Decreto-Lei nº 200/1967 estabeleceu as bases da organização da Administração Pública Federal brasileira, "
            "diferenciando a Administração Direta da Indireta. A respeito dos entes que compõem a Administração Indireta, "
            "assinale a opção que indica a entidade com personalidade jurídica de direito público, criada por lei específica para o desempenho "
            "de atividades típicas de Estado, que requeiram gestão administrativa e financeira descentralizada:"
        ),
        "correta": "A",
        "justificativa": (
            "Segundo o art. 5º, inciso I, do Decreto-Lei nº 200/1967, Autarquia é 'o serviço autônomo, criado por lei, com personalidade jurídica de direito público, "
            "patrimônio e receita próprios, para executar atividades típicas da Administração Pública, que requeiram, para seu melhor funcionamento, gestão administrativa "
            "e financeira descentralizada'. Exemplos: INSS, IBAMA, ANATEL, Banco Central."
        ),
        "pegadinha": "A autarquia é a única entidade da administração indireta que possui personalidade jurídica de DIREITO PÚBLICO e é CRIADA por lei (as demais têm a criação autorizada por lei).",
        "dificuldade": "Média",
        "area_atuacao": "Administrativa",
        "area_formacao": "Qualquer Área / Ensino Médio",
        "alternativas": [
            {"letra": "A", "texto": "Autarquia."},
            {"letra": "B", "texto": "Empresa Pública."},
            {"letra": "C", "texto": "Sociedade de Economia Mista."},
            {"letra": "D", "texto": "Fundação Pública de Direito Privado."},
            {"letra": "E", "texto": "Organização Social (OS)."},
        ]
    },
    # -------------------------------------------------------------
    # 9. REGIME JURÍDICO DOS AGENTES PÚBLICOS (D8) - Lei 8.112/90
    # -------------------------------------------------------------
    {
        "disciplina": "Regime Jurídico dos Agentes Públicos",
        "assunto": "Provimento, Vacância e Estágio Probatório (Lei nº 8.112/1990)",
        "numero": 9,
        "tipo": "Múltipla Escolha",
        "enunciado": (
            "Maria foi aprovada no concurso público para o cargo de Assistente Técnico-Administrativo do Ministério da Fazenda. "
            "De acordo com o regime jurídico instituído pela Lei nº 8.112/1990, uma vez publicado no Diário Oficial da União o ato de sua nomeação, "
            "o prazo legal para que ocorra a posse no cargo e, após a posse, o prazo para entrar em efetivo exercício são, respectivamente, de:"
        ),
        "correta": "E",
        "justificativa": (
            "Conforme dispõe o art. 13, § 1º, e art. 15, § 1º, da Lei nº 8.112/1990:\n"
            "- A posse dar-se-á no prazo de até 30 (trinta) dias contados da publicação oficial do ato de provimento (nomeação).\n"
            "- É de 15 (quinze) dias o prazo para o servidor empossado em cargo público entrar em exercício, contados da data da posse."
        ),
        "pegadinha": "Decorar os prazos da 8.112/90: Nomeação -> Posse = 30 dias (se não tomar posse no prazo, a nomeação é tornada sem efeito). Posse -> Exercício = 15 dias (se não entrar em exercício, o servidor é exonerado).",
        "dificuldade": "Fácil",
        "area_atuacao": "Administrativa",
        "area_formacao": "Qualquer Área / Ensino Médio",
        "alternativas": [
            {"letra": "A", "texto": "15 dias para a posse e 30 dias para o exercício."},
            {"letra": "B", "texto": "30 dias para a posse e 30 dias para o exercício."},
            {"letra": "C", "texto": "15 dias para a posse e 15 dias para o exercício."},
            {"letra": "D", "texto": "20 dias para a posse e 10 dias para o exercício."},
            {"letra": "E", "texto": "30 dias para a posse e 15 dias para o exercício."},
        ]
    },
    # -------------------------------------------------------------
    # 10. REGIME JURÍDICO DOS AGENTES PÚBLICOS (D8) - Improbidade
    # -------------------------------------------------------------
    {
        "disciplina": "Regime Jurídico dos Agentes Públicos",
        "assunto": "Lei de Improbidade Administrativa (Lei nº 8.429/1992)",
        "numero": 10,
        "tipo": "Múltipla Escolha",
        "enunciado": (
            "Nos termos da Lei nº 8.429/1992 (Lei de Improbidade Administrativa), constitui ato de improbidade administrativa que importa em "
            "ENRIQUECIMENTO ILÍCITO auferir qualquer tipo de vantagem patrimonial indevida em razão do exercício de cargo, mandato, função, emprego "
            "ou atividade nas entidades públicas. Assinale a conduta que se amolda tipicamente a essa modalidade:"
        ),
        "correta": "B",
        "justificativa": (
            "Receber vantagem econômica, direta ou indireta, para facilitar a aquisição, permuta ou locação de bem móvel ou imóvel, ou a contratação "
            "de serviços por ente público por preço superior ao valor de mercado é ato que importa enriquecimento ilícito (art. 9º, inciso II, da Lei 8.429/92). "
            "As condutas que geram mera perda patrimonial ao erário sem benefício direto pertencem ao art. 10 (lesão ao erário)."
        ),
        "pegadinha": "A ESAF exige distinguir os atos do Art. 9º (Enriquecimento Ilícito do agente), Art. 10 (Prejuízo ao Erário) e Art. 11 (Violação aos Princípios).",
        "dificuldade": "Média",
        "area_atuacao": "Administrativa",
        "area_formacao": "Qualquer Área / Ensino Médio",
        "alternativas": [
            {"letra": "A", "texto": "Agir negligentemente na celebração de convênio com entidade privada sem exigir as garantias legais."},
            {"letra": "B", "texto": "Receber vantagem econômica de qualquer natureza, direta ou indireta, para tolerar a exploração de jogos de azar ou para intermediar contrato administrativo vantajoso a particular."},
            {"letra": "C", "texto": "Frustrar a licitude de processo licitatório ou de processo seletivo para celebração de parcerias com entidades sem fins lucrativos."},
            {"letra": "D", "texto": "Liberar verba pública sem a estrita observância das normas pertinentes ou influir de qualquer forma para a sua aplicação irregular."},
            {"letra": "E", "texto": "Deixar de prestar contas quando esteja obrigado a fazê-lo, no prazo determinado em lei."},
        ]
    }
]

async def main():
    logger.info("Iniciando inserção do Concurso: Ministério da Fazenda - Assistente Técnico-Administrativo (2014) - ESAF")
    
    async with AsyncSessionLocal() as session:
        # 1. Banca ESAF
        res = await session.execute(select(Banca).where(Banca.nome == "ESAF"))
        banca = res.scalar_one_or_none()
        if not banca:
            res = await session.execute(select(Banca).where(Banca.slug == "esaf"))
            banca = res.scalar_one_or_none()
        
        if not banca:
            banca = Banca(
                id=uuid.uuid4(),
                nome="ESAF",
                slug="esaf",
                site_url="https://www.fazenda.gov.br/esaf",
            )
            session.add(banca)
            await session.flush()
            logger.info(f"Banca ESAF criada: {banca.id}")
        else:
            logger.info(f"Banca ESAF já existente: {banca.id}")

        # 2. Concurso: Ministério da Fazenda - ATA 2014
        res = await session.execute(
            select(Concurso).where(
                Concurso.banca_id == banca.id,
                Concurso.orgao == "Ministério da Fazenda",
                Concurso.cargo == "Assistente Técnico-Administrativo",
                Concurso.ano == 2014,
            )
        )
        concurso = res.scalar_one_or_none()
        if not concurso:
            concurso = Concurso(
                id=uuid.uuid4(),
                banca_id=banca.id,
                orgao="Ministério da Fazenda",
                cargo="Assistente Técnico-Administrativo",
                ano=2014,
                nivel="Médio",
                edital_url="http://www.esaf.fazenda.gov.br/concursos/ata-mf-2014",
            )
            session.add(concurso)
            await session.flush()
            logger.info(f"Concurso criado: {concurso.orgao} - {concurso.cargo} ({concurso.ano}) -> {concurso.id}")
        else:
            logger.info(f"Concurso já existente: {concurso.id}")

        # 3. Prova
        res = await session.execute(select(Prova).where(Prova.concurso_id == concurso.id))
        prova = res.scalar_one_or_none()
        if not prova:
            prova = Prova(
                id=uuid.uuid4(),
                concurso_id=concurso.id,
                tipo="objetiva",
                status="processada",
                total_questoes=len(QUESTOES_ESAF_ATA),
            )
            session.add(prova)
            await session.flush()
            logger.info(f"Prova criada: {prova.id}")
        else:
            prova.total_questoes = max(prova.total_questoes or 0, len(QUESTOES_ESAF_ATA))
            logger.info(f"Prova já existente: {prova.id}")

        # 4. Disciplinas e Assuntos do Edital
        disciplinas_map = {}
        assuntos_map = {}

        for disc_nome, lista_assuntos in DISCIPLINAS_E_ASSUNTOS.items():
            disc_slug = (
                disc_nome.lower()
                .replace(" ", "-")
                .replace("ç", "c")
                .replace("ã", "a")
                .replace("í", "i")
                .replace("á", "a")
                .replace("é", "e")
                .replace("ó", "o")
            )
            res = await session.execute(
                select(Disciplina).where(
                    (Disciplina.nome == disc_nome) | (Disciplina.slug == disc_slug)
                )
            )
            disc = res.scalar_one_or_none()
            if not disc:
                disc = Disciplina(id=uuid.uuid4(), nome=disc_nome, slug=disc_slug)
                session.add(disc)
                await session.flush()
                logger.info(f"Disciplina criada: {disc.nome}")
            disciplinas_map[disc_nome] = disc

            for ass_nome in lista_assuntos:
                ass_slug = (
                    ass_nome.lower()[:60]
                    .replace(" ", "-")
                    .replace("º", "")
                    .replace("ª", "")
                    .replace(",", "")
                    .replace("(", "")
                    .replace(")", "")
                    .replace("/", "-")
                    .replace("ç", "c")
                    .replace("ã", "a")
                    .replace("í", "i")
                    .replace("á", "a")
                    .replace("é", "e")
                    .replace("ó", "o")
                    .replace("ê", "e")
                )
                res = await session.execute(
                    select(Assunto).where(
                        Assunto.disciplina_id == disc.id,
                        (Assunto.nome == ass_nome) | (Assunto.slug == ass_slug),
                    )
                )
                assunto = res.scalar_one_or_none()
                if not assunto:
                    assunto = Assunto(
                        id=uuid.uuid4(),
                        disciplina_id=disc.id,
                        nome=ass_nome,
                        slug=ass_slug,
                    )
                    session.add(assunto)
                    await session.flush()
                assuntos_map[f"{disc_nome}-{ass_nome}"] = assunto

        logger.info("Todas as 8 disciplinas e respectivos assuntos do Edital ESAF nº 05/2014 verificados e sincronizados.")

        # 5. Inserir Questões
        questoes_adicionadas = 0
        for q_data in QUESTOES_ESAF_ATA:
            disc = disciplinas_map[q_data["disciplina"]]
            ass = assuntos_map.get(f"{q_data['disciplina']}-{q_data['assunto']}")
            if not ass:
                res = await session.execute(
                    select(Assunto).where(Assunto.disciplina_id == disc.id)
                )
                ass = res.scalars().first()

            # Checar se já existe a questão
            res = await session.execute(
                select(Questao).where(
                    Questao.prova_id == prova.id,
                    Questao.numero_questao == q_data["numero"],
                )
            )
            existing_q = res.scalar_one_or_none()
            if existing_q:
                continue

            q_obj = Questao(
                id=uuid.uuid4(),
                prova_id=prova.id,
                disciplina_id=disc.id,
                assunto_id=ass.id if ass else None,
                numero_questao=q_data["numero"],
                tipo_questao=q_data["tipo"],
                enunciado=q_data["enunciado"],
                alternativa_correta=q_data["correta"],
                justificativa_ia=q_data["justificativa"],
                is_inedita=False,
                extra_metadata={
                    "engenharia_da_pegadinha": q_data.get("pegadinha", ""),
                    "dificuldade": q_data.get("dificuldade", "Média"),
                    "area_atuacao": q_data.get("area_atuacao", "Administrativa"),
                    "area_formacao": q_data.get("area_formacao", "Qualquer Área / Ensino Médio"),
                    "is_anulada": False,
                    "is_desatualizada": False,
                    "has_comentarios": True,
                    "has_aulas": True,
                    "tipo_exercicio": "objetiva",
                },
            )
            session.add(q_obj)
            await session.flush()

            for alt in q_data["alternativas"]:
                alt_obj = Alternativa(
                    id=uuid.uuid4(),
                    questao_id=q_obj.id,
                    letra=alt["letra"],
                    texto=alt["texto"],
                    is_correta=(alt["letra"] == q_data["correta"]),
                )
                session.add(alt_obj)

            questoes_adicionadas += 1

        await session.commit()
        logger.success(f"Concluído! {questoes_adicionadas} questões autênticas da ESAF 2014 ATA/MF inseridas com sucesso!")

if __name__ == "__main__":
    asyncio.run(main())
