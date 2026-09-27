"""
Scraper de Concursos Abertos do PCI Concursos (pciconcursos.com.br/concursos).

Varre sistematicamente a listagem de concursos públicos abertos em todo o Brasil,
extraindo:
- Órgão/Entidade promotora do concurso
- Cargos ofertados e número de vagas
- Faixa salarial (salário máximo)
- Nível de escolaridade exigido (Fundamental / Médio / Superior)
- UF (estado) de lotação
- Data limite de inscrição
- URL da notícia/edital original

Os dados são persistidos na base SQLite (questoes.db) nas tabelas bancas, concursos e provas,
integrados ao pipeline existente de questões e simulados.
"""

import json
import re
import sqlite3
import time
import unicodedata
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


# Mapeamento de palavras-chave no nome do órgão para banca organizadora conhecida
BANCA_KEYWORDS = {
    "cebraspe": "Cebraspe",
    "cespe": "Cebraspe",
    "fgv": "FGV",
    "fcc": "FCC",
    "vunesp": "Fundação Vunesp",
    "cesgranrio": "Cesgranrio",
    "idecan": "Idecan",
    "aocp": "AOCP",
    "iades": "IADES",
    "quadrix": "Quadrix",
    "ibfc": "IBFC",
    "fundatec": "Fundatec",
    "funcab": "FUNCAB",
    "instituto consulplan": "Instituto Consulplan",
    "consulplan": "Instituto Consulplan",
    "objetiva": "Objetiva Concursos",
    "fundep": "FUNDEP",
    "copese": "COPESE",
    "selecon": "Selecon",
    "acesso público": "Acesso Público",
}

# URLs das seções regionais do PCI Concursos
REGIONAL_SECTIONS = {
    "todos": "/concursos/",
    "nacional": "/concursos/nacional/",
    "centrooeste": "/concursos/centrooeste/",
    "nordeste": "/concursos/nordeste/",
    "norte": "/concursos/norte/",
    "sudeste": "/concursos/sudeste/",
    "sul": "/concursos/sul/",
}
REGIONAL_URLS = list(REGIONAL_SECTIONS.values())


class PCIConcursosScraper:
    """Scraper de concursos públicos abertos do PCI Concursos."""

    BASE_URL = "https://www.pciconcursos.com.br"
    DEFAULT_HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Accept-Encoding": "identity",
    }

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            current = Path(__file__).resolve()
            proj_root = current.parents[3]
            self.db_path = str(proj_root / "questoes.db")
        else:
            self.db_path = db_path

    # =========================================================================
    # HTTP
    # =========================================================================

    def _fetch_html(self, url: str, timeout: int = 20) -> Optional[str]:
        """Realiza requisição HTTP com headers de navegador."""
        try:
            req = urllib.request.Request(url, headers=self.DEFAULT_HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            logger.warning(f"Falha ao acessar {url}: {e}")
            return None

    # =========================================================================
    # PARSER DE CONCURSOS
    # =========================================================================

    def parse_concursos_page(self, html: str) -> List[Dict[str, Any]]:
        """
        Parseia o HTML da página de concursos abertos do PCI Concursos.
        Extrai todos os cards de concursos (classes: na, da, ea).
        """
        concursos = []

        # Cada concurso é um <div class="na|da|ea" ...>
        # Capturamos o bloco inteiro até o próximo card ou fim
        pattern = r'<div class="([nde]a)"\s+onclick="myClick\(event\)"\s+data-url="([^"]+)"[^>]*>(.*?)(?=<div class="[nde]a"\s+onclick|<h2>|<div id="[A-Z]{2}"|<div class="ads|</div>\s*</div>\s*<div id="rodape")'
        blocks = re.findall(pattern, html, re.DOTALL)

        if not blocks:
            # Fallback: captura mais permissiva
            pattern_fb = r'<div class="([nde]a)"[^>]*data-url="([^"]+)"[^>]*>(.*?)</div>\s*(?:&nbsp;|<span class="l_ap2">)'
            blocks = re.findall(pattern_fb, html, re.DOTALL)

        current_uf = "BR"
        # Rastrear UFs com base nos headers h2 e divs de estado
        uf_positions = []
        for m in re.finditer(r'<div id="([A-Z]{2})" class="ua">', html):
            uf_positions.append((m.start(), m.group(1)))
        # Adicionar NACIONAL
        for m in re.finditer(r'<div id="NACIONAL" class="ua">', html):
            uf_positions.append((m.start(), "BR"))
        uf_positions.sort(key=lambda x: x[0])

        for css_class, data_url, block in blocks:
            concurso = self._parse_single_concurso(block, data_url)
            if concurso:
                # Determinar a UF com base na posição no HTML
                block_pos = html.find(f'data-url="{data_url}"')
                resolved_uf = "BR"
                for pos, uf in uf_positions:
                    if pos < block_pos:
                        resolved_uf = uf
                    else:
                        break

                # A UF também pode estar dentro do card (div class="cc")
                uf_from_card = concurso.get("uf", "")
                if uf_from_card and len(uf_from_card) == 2:
                    concurso["uf"] = uf_from_card
                elif resolved_uf != "BR":
                    concurso["uf"] = resolved_uf
                else:
                    concurso["uf"] = "BR"

                concursos.append(concurso)

        return concursos

    def _parse_single_concurso(self, block: str, data_url: str) -> Optional[Dict[str, Any]]:
        """Parseia um único card de concurso."""
        result: Dict[str, Any] = {
            "url_noticia": data_url,
            "url_completa": data_url if data_url.startswith("http") else f"{self.BASE_URL}{data_url}",
        }

        # 1. Órgão (texto do link dentro de .ca)
        orgao_match = re.search(
            r'<div class="ca">\s*<a[^>]*>([^<]+)</a>',
            block,
        )
        if orgao_match:
            orgao = orgao_match.group(1).strip()
            orgao = (
                orgao.replace("&amp;", "&")
                .replace("&#39;", "'")
                .replace("&quot;", '"')
            )
            result["orgao"] = orgao
        else:
            return None

        # 2. Título completo da notícia (atributo title do link)
        title_match = re.search(r'<a[^>]*title="([^"]+)"', block)
        if title_match:
            result["titulo"] = (
                title_match.group(1)
                .replace("&amp;", "&")
                .replace("&#39;", "'")
                .replace("&quot;", '"')
            )

        # 3. UF (div class="cc")
        uf_match = re.search(r'<div class="cc">([A-Z]{2})</div>', block)
        if uf_match:
            result["uf"] = uf_match.group(1)

        # 4. Informações de vagas, salário, cargos e nível (div class="cd")
        cd_match = re.search(r'<div class="cd">(.*?)</div>', block, re.DOTALL)
        if cd_match:
            cd_html = cd_match.group(1)
            cd_text = re.sub(r"<[^>]+>", " | ", cd_html).strip()
            cd_text = (
                cd_text.replace("&nbsp;", " ")
                .replace("&amp;", "&")
            )

            # Vagas
            vagas_match = re.search(r"(\d+)\s*vagas?", cd_text, re.IGNORECASE)
            if vagas_match:
                result["vagas"] = int(vagas_match.group(1))
            elif "cadastro de reserva" in cd_text.lower():
                result["vagas"] = 0
                result["cadastro_reserva"] = True
            else:
                vagas_cr = re.search(r"(\d+)\s*vagas?\s*e\s*CR", cd_text, re.IGNORECASE)
                if vagas_cr:
                    result["vagas"] = int(vagas_cr.group(1))
                    result["cadastro_reserva"] = True
                else:
                    result["vagas"] = 1

            # Salário máximo
            salario_match = re.search(r"R\$\s*([\d.,]+)", cd_text)
            if salario_match:
                salario_str = salario_match.group(1).replace(".", "").replace(",", ".")
                try:
                    result["salario_max"] = float(salario_str)
                except ValueError:
                    result["salario_max"] = 0.0
            else:
                result["salario_max"] = 0.0

            # Extrair cargos e nível das linhas do cd
            # O HTML segue o padrão:
            #   "19 vagas até R$ 7.341,23<br><span>Vários Cargos<br><span>Médio / Superior</span></span>"
            # ou:
            #   "1 vaga até R$ 6.603,39<br><span>Advogado<br><span>Superior</span></span>"
            #
            # Estratégia: extrair spans de fora para dentro
            # O span mais externo contém "Cargo<br><span>Nível</span>"
            outer_span_match = re.search(
                r'<span>([^<]*(?:<br\s*/?>)?)\s*<span>([^<]+)</span>',
                cd_html,
                re.DOTALL | re.IGNORECASE,
            )
            if outer_span_match:
                cargo_raw = re.sub(r"<[^>]+>", "", outer_span_match.group(1)).strip()
                nivel_raw = outer_span_match.group(2).strip()

                # Guardar cargo
                if cargo_raw:
                    result["cargos"] = cargo_raw

                # Guardar nível
                if nivel_raw:
                    result["nivel_raw"] = nivel_raw
            else:
                # Fallback: tentar pegar qualquer span
                spans = re.findall(r"<span>(.*?)</span>", cd_html, re.DOTALL)
                if spans:
                    for sp in reversed(spans):
                        sp_clean = re.sub(r"<[^>]+>", "", sp).strip()
                        if "/" in sp_clean or any(
                            k in sp_clean.lower()
                            for k in ["fundamental", "médio", "medio", "superior", "técnico", "tecnico", "ensino"]
                        ):
                            result["nivel_raw"] = sp_clean
                            break
                    cargo_span = re.sub(r"<[^>]+>", "", spans[0]).strip()
                    if cargo_span and cargo_span not in result.get("nivel_raw", ""):
                        result["cargos"] = cargo_span

            # Normalizar nível
            nivel_raw = result.get("nivel_raw", "")
            result["nivel"] = self._normalize_nivel(nivel_raw)

        # 5. Data de inscrição (div class="ce")
        ce_match = re.search(r'<div class="ce">\s*<span>(.*?)</span>', block, re.DOTALL)
        if ce_match:
            date_text = re.sub(r"<[^>]+>", " ", ce_match.group(1)).strip()
            date_text = date_text.replace("\n", " ").strip()
            result["inscricao_ate_raw"] = date_text

            # Extrair a última data (mais relevante)
            datas = re.findall(r"(\d{2}/\d{2}/\d{4})", date_text)
            if datas:
                result["inscricao_ate"] = datas[-1]

        return result

    def _normalize_nivel(self, nivel_raw: str) -> str:
        """Normaliza o nível de escolaridade para os valores aceitos pelo banco."""
        if not nivel_raw:
            return "Médio"
        nl = nivel_raw.lower()
        if "superior" in nl:
            return "Superior"
        elif "médio" in nl or "medio" in nl or "técnico" in nl or "tecnico" in nl:
            return "Médio"
        elif "fundamental" in nl:
            return "Fundamental"
        elif "ensino médio" in nl or "ensino medio" in nl:
            return "Médio"
        else:
            return "Médio"

    # =========================================================================
    # SCRAPING COMPLETO
    # =========================================================================

    def scrape_concursos_abertos(
        self,
        target_url: Optional[str] = None,
        max_retries: int = 2,
        delay_between_requests: float = 0.5,
    ) -> List[Dict[str, Any]]:
        """
        Varre a página principal ou uma URL específica de concursos abertos do PCI Concursos.
        """
        all_concursos = []
        seen_urls = set()

        if target_url:
            urls_to_scrape = [target_url]
        else:
            urls_to_scrape = [
                f"{self.BASE_URL}{p}" if p.startswith("/") else p
                for p in REGIONAL_URLS
            ]

        for section_url in urls_to_scrape:
            url = section_url if section_url.startswith("http") else f"{self.BASE_URL}{section_url}"
            logger.info(f"🔍 Rastreando concursos abertos: {url}")

            html = None
            for attempt in range(max_retries + 1):
                html = self._fetch_html(url)
                if html:
                    break
                logger.warning(f"  Tentativa {attempt + 1}/{max_retries + 1} falhou. Retentando...")
                time.sleep(1)

            if not html:
                logger.error(f"  ❌ Falha definitiva ao acessar {url}")
                continue

            concursos = self.parse_concursos_page(html)
            logger.info(f"  📋 {len(concursos)} concursos encontrados na página")

            for c in concursos:
                c_url = c.get("url_noticia", "")
                if c_url not in seen_urls:
                    seen_urls.add(c_url)
                    all_concursos.append(c)

            time.sleep(delay_between_requests)

        logger.success(f"✅ Total de concursos únicos rastreados: {len(all_concursos)}")
        return all_concursos

    # =========================================================================
    # PERSISTÊNCIA NO BANCO DE DADOS
    # =========================================================================

    def save_concursos_to_db(
        self,
        concursos_data: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Persiste os concursos scraped no banco SQLite (questoes.db).
        Cria bancas, concursos e provas com deduplicação.
        """
        if not concursos_data:
            return {"inseridos": 0, "duplicados": 0, "erros": 0}

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()

        inseridos = 0
        duplicados = 0
        erros = 0
        bancas_cache: Dict[str, str] = {}
        ano_atual = datetime.now().year

        for conc in concursos_data:
            try:
                orgao = conc.get("orgao", "").strip()[:200]
                if not orgao:
                    erros += 1
                    continue

                # Determinar cargo
                cargos = conc.get("cargos", "Geral").strip()[:300]
                if not cargos or cargos.lower() == "vários cargos":
                    cargos = "Diversos Cargos"

                nivel = conc.get("nivel", "Médio")
                ano = ano_atual

                # Tentar detectar banca organizadora pelo título da notícia ou órgão
                banca_nome = self._detect_banca(conc)
                b_slug = slugify(banca_nome)

                # Obter ou criar Banca
                if b_slug in bancas_cache:
                    banca_id = bancas_cache[b_slug]
                else:
                    c.execute(
                        "SELECT id FROM bancas WHERE slug = ? OR nome = ?",
                        (b_slug, banca_nome),
                    )
                    brow = c.fetchone()
                    if brow:
                        banca_id = brow[0]
                    else:
                        banca_id = uuid.uuid4().hex
                        c.execute(
                            "INSERT INTO bancas (id, nome, slug, site_url, created_at) VALUES (?, ?, ?, ?, ?)",
                            (banca_id, banca_nome, b_slug, self.BASE_URL, now_str),
                        )
                    bancas_cache[b_slug] = banca_id

                # Verificar duplicata de concurso
                edital_url = conc.get("url_completa", "")
                c.execute(
                    "SELECT id, edital_url FROM concursos WHERE banca_id = ? AND orgao = ? AND cargo = ? AND ano = ?",
                    (banca_id, orgao, cargos, ano),
                )
                existing = c.fetchone()
                if existing:
                    # Se o edital_url for diferente (ex: outro processo seletivo distinto para o mesmo orgao)
                    # e o cargo for genérico, diferencia pelo salário ou vagas para permitir inserção de ambos
                    if existing[1] and edital_url and existing[1] != edital_url:
                        salario = conc.get("salario_max", 0)
                        vagas = conc.get("vagas", 0)
                        if salario > 0:
                            cargos_diff = f"{cargos} (até R$ {salario:,.2f})".replace(",", "X").replace(".", ",").replace("X", ".")
                        elif vagas > 0:
                            cargos_diff = f"{cargos} ({vagas} vagas)"
                        else:
                            cargos_diff = f"{cargos} - 2"

                        c.execute(
                            "SELECT id FROM concursos WHERE banca_id = ? AND orgao = ? AND cargo = ? AND ano = ?",
                            (banca_id, orgao, cargos_diff, ano),
                        )
                        if not c.fetchone():
                            cargos = cargos_diff
                        else:
                            duplicados += 1
                            continue
                    else:
                        duplicados += 1
                        continue

                # Inserir Concurso
                concurso_id = uuid.uuid4().hex

                c.execute(
                    """INSERT INTO concursos
                       (id, banca_id, orgao, cargo, ano, nivel, edital_url, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (concurso_id, banca_id, orgao, cargos, ano, nivel, edital_url, now_str),
                )

                # Inserir Prova associada (status pendente)
                prova_id = uuid.uuid4().hex
                c.execute(
                    """INSERT INTO provas
                       (id, concurso_id, tipo, pdf_url, status, total_questoes, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (prova_id, concurso_id, "objetiva", "", "pendente", 0, now_str),
                )

                inseridos += 1

                # Log de inserção com metadados extras
                vagas = conc.get("vagas", 0)
                salario = conc.get("salario_max", 0)
                uf = conc.get("uf", "BR")
                logger.debug(
                    f"  + {orgao} | {cargos} | {nivel} | "
                    f"UF: {uf} | Vagas: {vagas} | R$ {salario:,.2f}"
                )

            except Exception as e:
                logger.warning(f"  Erro ao processar concurso '{conc.get('orgao', '?')}': {e}")
                erros += 1
                continue

        conn.commit()
        conn.close()

        logger.success(
            f"💾 Persistência concluída: {inseridos} inseridos | "
            f"{duplicados} duplicados | {erros} erros"
        )

        return {"inseridos": inseridos, "duplicados": duplicados, "erros": erros}

    def _detect_banca(self, concurso: Dict[str, Any]) -> str:
        """
        Tenta detectar a banca organizadora a partir do título da notícia ou URL.
        Se não conseguir, atribui uma banca genérica baseada no contexto.
        """
        titulo = concurso.get("titulo", "").lower()
        url = concurso.get("url_noticia", "").lower()
        orgao = concurso.get("orgao", "").lower()

        text_to_search = f"{titulo} {url} {orgao}"

        for keyword, banca_name in BANCA_KEYWORDS.items():
            if keyword in text_to_search:
                return banca_name

        # Heurísticas por tipo de órgão
        if any(k in orgao for k in ["prefeitura", "câmara", "camara"]):
            return "Banca Municipal"
        elif any(k in orgao for k in ["tribunal", "tj-", "trt", "trf", "tse", "stj", "stf"]):
            return "Banca Judicial"
        elif any(k in orgao for k in ["polícia", "policia", "pm ", "pc ", "prf", "pf "]):
            return "Banca Policial"
        elif any(k in orgao for k in ["universidade", "ufrj", "ufmg", "usp", "ufpr", "if "]):
            return "Banca Educacional"

        return "Organizadora Diversa"

    # =========================================================================
    # ENRIQUECIMENTO COM PROVAS DO ACERVO
    # =========================================================================

    def enrich_concursos_with_provas(self, limit: int = 20) -> Dict[str, int]:
        """
        Para concursos com provas em status 'pendente' e sem PDF,
        busca provas anteriores no acervo de 268.000+ provas do PCI.
        """
        from src.services.pci_service import pci_service

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()

        c.execute(
            """SELECT p.id, c.orgao, c.cargo
               FROM provas p
               JOIN concursos c ON p.concurso_id = c.id
               WHERE p.status = 'pendente' AND (p.pdf_url IS NULL OR p.pdf_url = '')
               LIMIT ?""",
            (limit,),
        )
        pendentes = c.fetchall()
        logger.info(f"🔎 Buscando provas no acervo para {len(pendentes)} concursos pendentes...")

        encontradas = 0
        for prova_id, orgao, cargo in pendentes:
            # Buscar no acervo por nome do órgão
            termo_busca = orgao.split(" - ")[0].strip()[:50]
            resultados = pci_service.buscar_provas_acervo(termo_busca, limit=5)

            if resultados:
                melhor = resultados[0]
                c.execute(
                    "UPDATE provas SET pdf_url = ?, status = 'baixado' WHERE id = ?",
                    (melhor["url_download"], prova_id),
                )
                encontradas += 1
                logger.debug(f"  📄 Prova encontrada para {orgao}: {melhor['titulo']}")

            time.sleep(0.3)  # Rate limiting

        conn.commit()
        conn.close()

        logger.success(f"✅ Enriquecimento: {encontradas}/{len(pendentes)} provas localizadas no acervo")
        return {"total_pendentes": len(pendentes), "provas_encontradas": encontradas}

    # =========================================================================
    # PIPELINE COMPLETO
    # =========================================================================

    def run_full_pipeline(
        self,
        target_url: Optional[str] = None,
        with_provas: bool = True,
        with_questoes: bool = False,
        max_questoes_pages: int = 2,
    ) -> Dict[str, Any]:
        """
        Executa o pipeline completo de alimentação:
        1. Scrape dos concursos abertos
        2. Persistência no banco
        3. (Opcional) Enriquecimento com provas do acervo
        4. (Opcional) Crawl de questões via simulados
        """
        logger.info("=" * 60)
        logger.info("🚀 PIPELINE DE ALIMENTAÇÃO — PCI CONCURSOS ABERTOS")
        if target_url:
            logger.info(f"   URL Alvo: {target_url}")
        logger.info("=" * 60)

        # 1. Scrape
        concursos = self.scrape_concursos_abertos(target_url=target_url)

        # 2. Persistência
        db_result = self.save_concursos_to_db(concursos)

        result = {
            "concursos_rastreados": len(concursos),
            **db_result,
        }

        # 3. Enriquecimento com provas
        if with_provas and db_result["inseridos"] > 0:
            provas_result = self.enrich_concursos_with_provas(limit=db_result["inseridos"])
            result["provas"] = provas_result

        # 4. Crawl de questões
        if with_questoes:
            logger.info("📝 Disparando crawler de questões dos simulados...")
            from src.services.pci_crawler import pci_crawler

            q_result = pci_crawler.sweep_all(
                max_pages_per_subcat=max_questoes_pages,
                max_subcats_per_disc=3,
            )
            result["questoes"] = q_result

        logger.info("=" * 60)
        logger.success("✅ PIPELINE FINALIZADO COM SUCESSO!")
        logger.info(f"   Concursos rastreados: {result['concursos_rastreados']}")
        logger.info(f"   Novos inseridos: {result['inseridos']}")
        logger.info(f"   Duplicados ignorados: {result['duplicados']}")
        if "provas" in result:
            logger.info(f"   Provas localizadas: {result['provas']['provas_encontradas']}")
        if "questoes" in result:
            logger.info(f"   Questões adicionadas: {result['questoes']['total_adicionadas']}")
        logger.info("=" * 60)

        return result


# Instância singleton
pci_concursos_scraper = PCIConcursosScraper()
