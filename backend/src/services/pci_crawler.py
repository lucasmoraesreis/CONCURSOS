"""
Serviço de Crawling e Ingestão em Massa do PCI Concursos (pciconcursos.com.br).

Varre sistematicamente o acervo oficial de simulados (255.000+ questões)
e testes anteriores por disciplina, extraindo:
- Enunciado completo (com texto base/apoio)
- Alternativas (A, B, C, D, E ou Certo/Errado)
- Gabarito oficial autêntico
- Comentários/Justificativas explicativas
- Metadados do certame: Órgão, Banca Examinadora, Ano, Cargo e Link da prova original.
"""

import json
import re
import sqlite3
import time
import unicodedata
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from loguru import logger


def slugify(text: str) -> str:
    """Gera um slug limpo a partir de texto com acentos."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


# Mapeamento canônico das disciplinas do sistema para as subcategorias do PCI Concursos
DISCIPLINAS_PCI_MAP: Dict[str, List[str]] = {
    "Contabilidade Geral e Pública": [
        "/simulados/contabilidade/contabilidade-publica",
        "/simulados/contabilidade/contabilidade-geral",
        "/simulados/testes-anteriores/contabilidade-geral",
        "/simulados/testes-anteriores/contabilidade-publica",
        "/simulados/testes-anteriores/nocoes-de-contabilidade",
    ],
    "Auditoria": [
        "/simulados/contabilidade/auditoria",
        "/simulados/contabilidade/auditoria-contabil",
        "/simulados/testes-anteriores/auditoria",
        "/simulados/testes-anteriores/auditor-de-controle-interno",
    ],
    "Economia e Finanças Públicas": [
        "/simulados/atualidades/economia",
        "/simulados/economia/macroeconomia",
        "/simulados/testes-anteriores/economia",
        "/simulados/testes-anteriores/nocoes-de-economia",
    ],
    "Direito do Trabalho": [
        "/simulados/direito-trabalhista/seguranca-saude-trabalho",
        "/simulados/testes-anteriores/direito-do-trabalho",
    ],
    "Direito Financeiro e Orçamentário": [
        "/simulados/contabilidade/orcamento-publico",
        "/simulados/direito-administrativo/lei-de-responsabilidade-fiscal",
        "/simulados/direito-constitucional/orcamento-publico",
        "/simulados/direito-financeiro/lei-de-responsabilidade-fiscal",
        "/simulados/direito-financeiro/orcamento-publico",
        "/simulados/testes-anteriores/direito-financeiro",
        "/simulados/testes-anteriores/administracao-financeira-e-orcamentaria",
    ],
    "Direito Tributário": [
        "/simulados/direito-tributario/competencia-tributaria",
        "/simulados/direito-tributario/credito-tributario",
        "/simulados/direito-tributario/iptu",
        "/simulados/direito-tributario/issqn",
        "/simulados/testes-anteriores/direito-tributario",
        "/simulados/testes-anteriores/codigo-tributario-nacional",
        "/simulados/testes-anteriores/legislacao-tributaria",
    ],
    "Direito Processual Penal": [
        "/simulados/testes-anteriores/direito-processual-penal",
    ],
    "Direito Processual Civil": [
        "/simulados/direito-processual-civil/recursos",
        "/simulados/testes-anteriores/direito-processual-civil",
        "/simulados/testes-anteriores/direito-processual-civil-novo-codigo-de-processo-civil",
    ],
    "Direito Civil": [
        "/simulados/testes-anteriores/direito-civil",
    ],
    "Direito Penal": [
        "/simulados/direito-penal/crimes-contra-a-administracao-publica",
        "/simulados/direito-penal/lei-maria-da-penha",
        "/simulados/direito-penal/violencia-domestica",
        "/simulados/testes-anteriores/direito-penal",
    ],
    "Conhecimentos Bancários": [
        "/simulados/testes-anteriores/conhecimentos-bancarios",
    ],
    "Estatística": [
        "/simulados/matematica/estatistica",
        "/simulados/matematica/estatistica-basica",
        "/simulados/matematica/probabilidade-e-estatistica",
        "/simulados/testes-anteriores/estatistica",
    ],
    "Direito Previdenciário": [
        "/simulados/direito-constitucional/seguridade-social",
    ],
    "Medicina Legal e Criminologia": [
        "/simulados/testes-anteriores/medicina-legal",
    ],
    "Direito Ambiental": [
        "/simulados/direito-ambiental/legislacao-ambiental",
        "/simulados/direito-ambiental/licenciamento-ambiental",
        "/simulados/testes-anteriores/direito-ambiental",
    ],

    "Ética no Serviço Público": [
        "/simulados/administracao-publica/etica-no-servico-publico",
        "/simulados/direito-administrativo/etica-no-servico-publico",
        "/simulados/filosofia/etica",
        "/simulados/testes-anteriores/etica-na-administracao-publica-e-legislacao-municipal",
    ],
    "Administração Pública e Gestão": [
        "/simulados/administracao-publica/atendimento-ao-cidadao",
        "/simulados/administracao-publica/atendimento-ao-publico",
        "/simulados/testes-anteriores/administracao-publica",
        "/simulados/testes-anteriores/administracao-geral",
        "/simulados/testes-anteriores/nocoes-de-administracao-publica",
    ],
    "Conhecimentos de Informática": [
        "/simulados/informatica/seguranca-da-informacao",
        "/simulados/informatica/redes-de-computadores",
        "/simulados/informatica/banco-de-dados",
        "/simulados/informatica/atalhos-teclado",
        "/simulados/testes-anteriores/informatica",
        "/simulados/testes-anteriores/nocoes-de-informatica",
    ],
    "Raciocínio Lógico": [
        "/simulados/rlm/logica-proposicional",
        "/simulados/matematica/logica-proposicional",
        "/simulados/testes-anteriores/raciocinio-logico-matematico",
    ],
    "Matemática Básica": [
        "/simulados/matematica/algebra-basica",
        "/simulados/matematica/algebra-equacoes",
        "/simulados/testes-anteriores/matematica",
    ],
    "Direito Constitucional": [
        "/simulados/direito-constitucional/controle-de-constitucionalidade",
        "/simulados/direito-constitucional/direitos-e-garantias-fundamentais",
        "/simulados/direito-constitucional/direitos-fundamentais",
        "/simulados/direito-constitucional/direitos-humanos",
        "/simulados/testes-anteriores/direito-constitucional",
    ],
    "Direito Administrativo": [
        "/simulados/direito-administrativo/atos-administrativos",
        "/simulados/direito-administrativo/agentes-publicos",
        "/simulados/direito-administrativo/administracao-indireta",
        "/simulados/direito-administrativo/responsabilidade-civil-do-estado",
        "/simulados/testes-anteriores/direito-administrativo",
    ],
    "Língua Portuguesa": [
        "/simulados/portugues/acentuacao-grafica",
        "/simulados/portugues/classes-de-palavras",
        "/simulados/portugues/concordancia-nominal",
        "/simulados/portugues/concordancia-verbal",
        "/simulados/portugues/crase",
        "/simulados/portugues/pontuacao",
        "/simulados/portugues/regencia-verbal",
        "/simulados/testes-anteriores/lingua-portuguesa",
    ],
}


class PCICrawler:
    """Rastreador e importador de questões do PCI Concursos."""

    BASE_URL = "https://www.pciconcursos.com.br"
    DEFAULT_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            current = Path(__file__).resolve()
            proj_root = current.parents[3]
            self.db_path = str(proj_root / "questoes.db")
        else:
            self.db_path = db_path

    def _fetch_html(self, url: str, timeout: int = 15) -> Optional[str]:
        """Realiza requisição HTTP com headers de navegador e tratamento de exceções."""
        try:
            req = urllib.request.Request(url, headers=self.DEFAULT_HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                logger.debug(f"Página 404 (fim da paginação ou URL inválida): {url}")
            else:
                logger.warning(f"Erro HTTP {e.code} ao acessar {url}")
            return None
        except Exception as e:
            logger.warning(f"Falha na requisição para {url}: {e}")
            return None

    def parse_simulado_page(self, html: str, fallback_assunto: str = "") -> List[Dict[str, Any]]:
        """Extrai todas as questões estruturadas de uma página HTML de simulado do PCI Concursos."""
        gabaritos = {}
        gab_match = re.search(r"var\s+simGabaritos\s*=\s*(\{.*?\});", html, re.DOTALL)
        if gab_match:
            try:
                gabaritos = json.loads(gab_match.group(1))
            except Exception:
                pass

        comentarios = {}
        com_match = re.search(r"var\s+simComentariosIA\s*=\s*(\{.*?\});", html, re.DOTALL)
        if com_match:
            try:
                comentarios = json.loads(com_match.group(1))
            except Exception:
                pass

        pattern = r'<div class="sim-questao card[^"]*"\s+data-sid="(\d+)">(.*?)<div class="sim-report mt-3">'
        questao_blocks = re.findall(pattern, html, re.DOTALL)

        if not questao_blocks:
            pattern_fallback = r'data-sid="(\d+)">(.*?)<div class="sim-report'
            questao_blocks = re.findall(pattern_fallback, html, re.DOTALL)

        parsed_questoes = []

        for sid, block in questao_blocks:
            prova_match = re.search(
                r'<a\s+href="(/provas/download/[^"]+)"[^>]*class="sim-prova-link"[^>]*>(.*?)</a>',
                block,
            )
            prova_url = ""
            orgao = "Órgão Público"
            banca = "Banca Examinadora"
            ano = 2024
            cargo = "Geral"

            if prova_match:
                rel_url = prova_match.group(1)
                prova_url = self.BASE_URL + rel_url
                raw_meta = prova_match.group(2)
                clean_meta = re.sub(r"<[^>]+>", "", raw_meta)
                clean_meta = (
                    clean_meta.replace("&bull;", "•")
                    .replace("&amp;", "&")
                    .replace("&#39;", "'")
                    .replace("&quot;", '"')
                )
                parts = [p.strip() for p in clean_meta.split("•") if p.strip()]
                if len(parts) >= 3:
                    orgao = parts[0]
                    banca = parts[1]
                    ano_match = re.search(r"\d{4}", parts[2])
                    if ano_match:
                        ano = int(ano_match.group(0))
                elif len(parts) == 2:
                    orgao = parts[0]
                    ano_match = re.search(r"\d{4}", parts[1])
                    if ano_match:
                        ano = int(ano_match.group(0))
                    else:
                        banca = parts[1]

                slug = rel_url.split("/")[-1]
                slug_clean = re.sub(r"-(20\d{2}|19\d{2})$", "", slug)
                slug_parts = slug_clean.split("-")
                if slug_parts and slug_parts[-1].lower() in banca.lower():
                    slug_parts = slug_parts[:-1]
                cargo = " ".join([p.capitalize() for p in slug_parts[:4]]) if slug_parts else "Geral"

            base_match = re.search(r'<div class="sim-base[^"]*">(.*?)</div>', block, re.DOTALL)
            texto_base = ""
            if base_match:
                texto_base = re.sub(r"<[^>]+>", "", base_match.group(1)).strip()

            enun_match = re.search(r'<p class="sim-enunciado[^"]*">(.*?)</p>', block, re.DOTALL)
            enunciado = ""
            if enun_match:
                enunciado = re.sub(r"<[^>]+>", "", enun_match.group(1)).strip()
            if texto_base:
                enunciado = f"[Texto de Apoio:\n{texto_base}]\n\n{enunciado}"

            if not enunciado:
                continue

            alts = []
            alt_matches = re.findall(
                r'<div class="sim-alt-row[^"]*"\s+data-letra="([A-Z])">(.*?)</div>\s*(?=<div class="sim-alt-row|<div class="sim-feedback)',
                block,
                re.DOTALL,
            )
            for letra, alt_content in alt_matches:
                btn_match = re.search(
                    r'<button[^>]*class="[^"]*btn-sim-alt[^"]*"[^>]*>(.*?)</button>',
                    alt_content,
                    re.DOTALL,
                )
                if btn_match:
                    btn_text = btn_match.group(1)
                    alt_text = re.sub(r'<span class="sim-letra[^"]*">[A-Z]</span>', "", btn_text)
                    alt_text = re.sub(r"<[^>]+>", "", alt_text).strip()
                    alt_text = (
                        alt_text.replace("&amp;", "&")
                        .replace("&quot;", '"')
                        .replace("&#39;", "'")
                        .replace("&lt;", "<")
                        .replace("&gt;", ">")
                    )
                    alts.append((letra, alt_text))

            if not alts:
                continue

            correta = gabaritos.get(sid, alts[0][0] if alts else "A")
            justificativa = comentarios.get(sid, "")

            tipo_questao = "Certo/Errado" if len(alts) == 2 and set([a[0] for a in alts]) == {"C", "E"} else "Múltipla Escolha"

            cargo_lower = cargo.lower()
            if any(k in cargo_lower for k in ["analista", "auditor", "defensor", "juiz", "procurador", "delegado", "engenheiro", "medico", "superior"]):
                nivel = "Superior"
            elif any(k in cargo_lower for k in ["tecnico", "agente", "assistente", "auxiliar", "medio", "guarda", "policial"]):
                nivel = "Médio"
            else:
                nivel = "Superior"

            parsed_questoes.append({
                "sid": sid,
                "orgao": orgao,
                "banca": banca,
                "ano": ano,
                "cargo": cargo,
                "nivel": nivel,
                "enunciado": enunciado,
                "tipo_questao": tipo_questao,
                "alternativas": alts,
                "correta": correta,
                "justificativa": justificativa,
                "prova_url": prova_url,
                "assunto": fallback_assunto or "Geral",
            })

        return parsed_questoes

    def crawl_subcategory(
        self,
        subcat_path: str,
        disciplina_nome: str,
        assunto_nome: str,
        max_pages: int = 3,
    ) -> List[Dict[str, Any]]:
        """Varre as páginas de uma subcategoria específica."""
        all_questoes = []
        base_path = subcat_path.rstrip("/")

        for page in range(1, max_pages + 1):
            if page == 1:
                page_url = f"{self.BASE_URL}{base_path}"
            else:
                page_url = f"{self.BASE_URL}{base_path}/{page}"

            logger.info(f"Rastreando [{disciplina_nome}] {assunto_nome} - Pág {page}: {page_url}")
            html = self._fetch_html(page_url)
            if not html:
                break

            questoes = self.parse_simulado_page(html, fallback_assunto=assunto_nome)
            if not questoes:
                logger.debug(f"Nenhuma questão encontrada na página {page}, encerrando subcategoria.")
                break

            all_questoes.extend(questoes)
            time.sleep(0.3)

        return all_questoes

    def save_questoes_to_db(
        self,
        questoes: List[Dict[str, Any]],
        disciplina_nome: str,
        assunto_nome: str,
    ) -> Tuple[int, int]:
        """Salva em lote as questões no banco SQLite."""
        if not questoes:
            return 0, 0

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()

        # 1. Obter ou criar Disciplina
        c.execute("SELECT id FROM disciplinas WHERE nome = ?", (disciplina_nome,))
        row = c.fetchone()
        if row:
            disc_id = row[0]
        else:
            disc_id = uuid.uuid4().hex
            c.execute(
                "INSERT INTO disciplinas (id, nome, slug, created_at) VALUES (?, ?, ?, ?)",
                (disc_id, disciplina_nome, slugify(disciplina_nome), now_str),
            )

        # 2. Obter ou criar Assunto
        ass_slug = slugify(assunto_nome)
        c.execute(
            "SELECT id FROM assuntos WHERE disciplina_id = ? AND slug = ?",
            (disc_id, ass_slug),
        )
        row = c.fetchone()
        if row:
            ass_id = row[0]
        else:
            ass_id = uuid.uuid4().hex
            c.execute(
                "INSERT INTO assuntos (id, disciplina_id, nome, slug, created_at) VALUES (?, ?, ?, ?, ?)",
                (ass_id, disc_id, assunto_nome, ass_slug, now_str),
            )

        bancas_cache = {}
        concursos_cache = {}
        provas_cache = {}

        questoes_inseridas = 0
        questoes_duplicadas = 0

        for q in questoes:
            sid = q["sid"]

            c.execute(
                "SELECT id FROM questoes WHERE json_extract(metadata, '$.pci_sid') = ? OR enunciado = ?",
                (sid, q["enunciado"]),
            )
            if c.fetchone():
                questoes_duplicadas += 1
                continue

            raw_banca = q["banca"].strip() or "Banca Examinadora"
            banca_nome = raw_banca
            b_lower = raw_banca.lower()
            if "cebraspe" in b_lower or "cespe" in b_lower:
                banca_nome = "Cebraspe"
            elif "fgv" in b_lower or "getulio" in b_lower:
                banca_nome = "FGV"
            elif "fcc" in b_lower or "carlos chagas" in b_lower:
                banca_nome = "FCC"
            elif "vunesp" in b_lower:
                banca_nome = "Fundação Vunesp"
            elif "cesgranrio" in b_lower:
                banca_nome = "Cesgranrio"
            elif "idecan" in b_lower:
                banca_nome = "Idecan"
            elif "aocp" in b_lower:
                banca_nome = "AOCP"
            elif "iades" in b_lower:
                banca_nome = "IADES"
            elif "quadrix" in b_lower:
                banca_nome = "Quadrix"
            elif "esaf" in b_lower:
                banca_nome = "ESAF"

            b_slug = slugify(banca_nome)
            if b_slug in bancas_cache:
                banca_id = bancas_cache[b_slug]
            else:
                c.execute("SELECT id FROM bancas WHERE slug = ? OR nome = ?", (b_slug, banca_nome))
                brow = c.fetchone()
                if brow:
                    banca_id = brow[0]
                else:
                    banca_id = uuid.uuid4().hex
                    c.execute(
                        "INSERT INTO bancas (id, nome, slug, site_url, created_at) VALUES (?, ?, ?, ?, ?)",
                        (banca_id, banca_nome, b_slug, "https://www.pciconcursos.com.br", now_str),
                    )
                bancas_cache[b_slug] = banca_id

            orgao = q["orgao"][:200]
            cargo = q["cargo"][:300]
            ano = q["ano"]
            nivel = q["nivel"]
            conc_key = (banca_id, orgao, cargo, ano)

            if conc_key in concursos_cache:
                concurso_id = concursos_cache[conc_key]
            else:
                c.execute(
                    "SELECT id FROM concursos WHERE banca_id = ? AND orgao = ? AND cargo = ? AND ano = ?",
                    conc_key,
                )
                crow = c.fetchone()
                if crow:
                    concurso_id = crow[0]
                else:
                    concurso_id = uuid.uuid4().hex
                    c.execute(
                        "INSERT INTO concursos (id, banca_id, orgao, cargo, ano, nivel, edital_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        (concurso_id, banca_id, orgao, cargo, ano, nivel, q["prova_url"], now_str),
                    )
                concursos_cache[conc_key] = concurso_id

            if concurso_id in provas_cache:
                prova_id = provas_cache[concurso_id]
            else:
                c.execute("SELECT id FROM provas WHERE concurso_id = ?", (concurso_id,))
                prow = c.fetchone()
                if prow:
                    prova_id = prow[0]
                else:
                    prova_id = uuid.uuid4().hex
                    c.execute(
                        "INSERT INTO provas (id, concurso_id, tipo, pdf_url, status, total_questoes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (prova_id, concurso_id, "objetiva", q["prova_url"], "concluida", 0, now_str),
                    )
                provas_cache[concurso_id] = prova_id

            c.execute("SELECT COALESCE(MAX(numero_questao), 0) + 1 FROM questoes WHERE prova_id = ?", (prova_id,))
            num_q = c.fetchone()[0]

            q_id = uuid.uuid4().hex
            meta_json = json.dumps({
                "pci_sid": sid,
                "fonte": "PCI Concursos",
                "url_original": q["prova_url"],
                "dificuldade": "Média",
                "is_anulada": False,
                "is_desatualizada": False,
                "has_comentarios": bool(q["justificativa"]),
                "has_aulas": True,
                "area_atuacao": "Geral",
                "area_formacao": nivel,
            })

            c.execute(
                """
                INSERT INTO questoes (
                    id, prova_id, disciplina_id, assunto_id, numero_questao,
                    tipo_questao, enunciado, alternativa_correta, justificativa_ia,
                    is_inedita, metadata, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    q_id,
                    prova_id,
                    disc_id,
                    ass_id,
                    num_q,
                    q["tipo_questao"],
                    q["enunciado"],
                    q["correta"],
                    q["justificativa"],
                    0,
                    meta_json,
                    now_str,
                ),
            )

            for letra, texto in q["alternativas"]:
                alt_id = uuid.uuid4().hex
                is_correta = 1 if letra == q["correta"] else 0
                c.execute(
                    "INSERT INTO alternativas (id, questao_id, letra, texto, is_correta) VALUES (?, ?, ?, ?, ?)",
                    (alt_id, q_id, letra, texto, is_correta),
                )

            questoes_inseridas += 1

        for p_id in set(provas_cache.values()):
            c.execute(
                "UPDATE provas SET total_questoes = (SELECT COUNT(*) FROM questoes WHERE prova_id = ?) WHERE id = ?",
                (p_id, p_id),
            )

        conn.commit()
        conn.close()

        return questoes_inseridas, questoes_duplicadas

    def sweep_all(
        self,
        target_disciplines: Optional[List[str]] = None,
        max_pages_per_subcat: int = 3,
        max_subcats_per_disc: int = 4,
    ) -> Dict[str, Any]:
        """Varredura abrangente no PCI Concursos por disciplinas prioritárias."""
        selected_map = DISCIPLINAS_PCI_MAP
        if target_disciplines:
            selected_map = {d: urls for d, urls in DISCIPLINAS_PCI_MAP.items() if d in target_disciplines}

        total_adicionadas = 0
        total_duplicadas = 0
        stats_por_disciplina = {}

        logger.info(f"Iniciando varredura geral em {len(selected_map)} disciplinas do PCI Concursos...")

        for disc_nome, subcat_list in selected_map.items():
            disc_adicionadas = 0
            subcats_to_run = subcat_list[:max_subcats_per_disc]

            for sub_path in subcats_to_run:
                raw_slug = sub_path.split("/")[-1]
                assunto_nome = " ".join([w.capitalize() for w in raw_slug.split("-")])

                questoes = self.crawl_subcategory(
                    subcat_path=sub_path,
                    disciplina_nome=disc_nome,
                    assunto_nome=assunto_nome,
                    max_pages=max_pages_per_subcat,
                )

                inseridas, duplicadas = self.save_questoes_to_db(
                    questoes=questoes,
                    disciplina_nome=disc_nome,
                    assunto_nome=assunto_nome,
                )

                disc_adicionadas += inseridas
                total_duplicadas += duplicadas

            total_adicionadas += disc_adicionadas
            stats_por_disciplina[disc_nome] = disc_adicionadas
            logger.success(f"Disciplina [{disc_nome}]: {disc_adicionadas} novas questões inseridas!")

        logger.success(
            f"Varredura concluída com êxito! Total inseridas: {total_adicionadas} | Duplicadas ignoradas: {total_duplicadas}"
        )

        return {
            "total_adicionadas": total_adicionadas,
            "total_duplicadas": total_duplicadas,
            "disciplinas": stats_por_disciplina,
        }


pci_crawler = PCICrawler()
