"""
Serviço de Integração Oficial com o PCI Concursos (pciconcursos.com.br).

Oferece duas frentes de integração:
1. MCP Oficial (Model Context Protocol): Conecta via JSON-RPC a https://mcp.pciconcursos.com.br/mcp
   para busca em tempo real de editais abertos, vagas, cargos, salários e links oficiais.
2. Repositório de Provas e Gabaritos (268.000+ provas): Varredura e busca de provas anteriores,
   gabaritos e cadernos de questões por órgão, cargo e banca organizadora.
"""

import json
import re
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional
from loguru import logger


class PCIConcursosService:
    """Cliente para integração completa com o ecossistema PCI Concursos."""

    MCP_ENDPOINT = "https://mcp.pciconcursos.com.br/mcp"
    PROVAS_SEARCH_URL = "https://www.pciconcursos.com.br/provas/"
    DEFAULT_HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Accept": "application/json, text/html, */*",
    }

    def __init__(self):
        self._request_id = 0

    def _next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    # =========================================================================
    # 1. MCP CLIENT (Integração Direta com o Protocolo MCP do PCI Concursos)
    # =========================================================================

    def _call_mcp_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Executa uma ferramenta no servidor MCP oficial da PCI Concursos."""
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }

        try:
            req = urllib.request.Request(
                self.MCP_ENDPOINT,
                data=json.dumps(payload).encode("utf-8"),
                headers=self.DEFAULT_HEADERS,
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                raw = response.read().decode("utf-8", errors="ignore")
                data = json.loads(raw)
                return data.get("result", {})
        except Exception as e:
            logger.error(f"Erro ao chamar MCP PCI ({tool_name}): {e}")
            return {"error": str(e), "content": []}

    def pesquisar_concursos(self, termo: str, uf: Optional[str] = None) -> Dict[str, Any]:
        """
        Pesquisa concursos abertos por termo livre (órgão, cargo, título).
        O parâmetro 'uf' é opcional (ex: 'sp', 'df', 'rj').
        """
        args = {"termo": termo}
        if uf:
            args["uf"] = uf.lower().strip()
        return self._call_mcp_tool("pesquisar_concursos", args)

    def buscar_por_cargo(self, cargo: str, uf: Optional[str] = None) -> Dict[str, Any]:
        """Filtra concursos abertos para um cargo específico."""
        args = {"cargo": cargo}
        if uf:
            args["uf"] = uf.lower().strip()
        return self._call_mcp_tool("buscar_por_cargo", args)

    def buscar_por_cidade(self, cidade: str, uf: str) -> Dict[str, Any]:
        """Busca concursos abertos em uma cidade específica do Brasil."""
        return self._call_mcp_tool("buscar_por_cidade", {"cidade": cidade, "uf": uf.lower().strip()})

    def listar_concursos(self, regiao: Optional[str] = None, professores: bool = False) -> Dict[str, Any]:
        """
        Lista concursos por macrorregião (nacional, sudeste, sul, norte, nordeste, centrooeste).
        """
        args = {"professores": professores}
        if regiao:
            args["regiao"] = regiao.lower().strip()
        return self._call_mcp_tool("listar_concursos", args)

    # =========================================================================
    # 2. ACERVO DE PROVAS ANTERIORES E GABARITOS (268.000+ Provas)
    # =========================================================================

    def buscar_provas_acervo(self, termo: str, limit: int = 25) -> List[Dict[str, Any]]:
        """
        Pesquisa o repositório de provas para download do PCI Concursos.
        Retorna informações estruturadas de provas e gabaritos localizados.
        """
        try:
            post_data = urllib.parse.urlencode({
                "prova": termo,
                "botao": "Pesquisar",
            }).encode("utf-8")

            req = urllib.request.Request(
                self.PROVAS_SEARCH_URL,
                data=post_data,
                headers={
                    "User-Agent": self.DEFAULT_HEADERS["User-Agent"],
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )

            with urllib.request.urlopen(req, timeout=15) as resp:
                html = resp.read().decode("utf-8", errors="ignore")

            # Expressão para capturar os links de provas para download
            pattern = r'<a\s+href="(https://www\.pciconcursos\.com\.br/provas/download/[^"]+)"[^>]*>(.*?)</a>'
            matches = re.findall(pattern, html)

            resultados = []
            for url, raw_title in matches[:limit]:
                # Limpa tags HTML internas do título
                titulo = re.sub(r"<[^>]+>", "", raw_title).strip()
                if not titulo:
                    continue

                # Extrai metadados do slug da URL
                # Formato típico: /provas/download/analista-do-seguro-social-inss-cespe-2016
                slug = url.split("/")[-1]
                ano_match = re.search(r"(20\d{2}|19\d{2})", slug)
                ano = int(ano_match.group(1)) if ano_match else None

                resultados.append({
                    "titulo": titulo,
                    "url_download": url,
                    "slug": slug,
                    "ano": ano,
                    "fonte": "PCI Concursos",
                })

            return resultados

        except Exception as e:
            logger.error(f"Erro ao buscar acervo de provas no PCI Concursos: {e}")
            return []


    # =========================================================================
    # 3. CRAWLER E INGESTÃO EM MASSA DE QUESTÕES (Simulados e Cadernos)
    # =========================================================================

    def varrer_e_importar_questoes(
        self,
        disciplinas: Optional[List[str]] = None,
        max_paginas: int = 2,
        max_subcategorias: int = 3,
    ) -> Dict[str, Any]:
        """
        Executa uma varredura no acervo de simulados e cadernos do PCI Concursos,
        extraindo enunciados, alternativas, gabaritos e justificativas,
        persistindo tudo diretamente no banco de dados ativo.
        """
        from src.services.pci_crawler import pci_crawler
        return pci_crawler.sweep_all(
            target_disciplines=disciplinas,
            max_pages_per_subcat=max_paginas,
            max_subcats_per_disc=max_subcategorias,
        )

    # =========================================================================
    # 4. IMPORTAÇÃO DE CONCURSOS ABERTOS (Editais e Vagas)
    # =========================================================================

    def importar_concursos_abertos(
        self,
        with_provas: bool = True,
        with_questoes: bool = False,
        max_questoes_pages: int = 2,
    ) -> Dict[str, Any]:
        """
        Importa concursos públicos abertos da página principal do PCI Concursos.
        Extrai órgãos, cargos, vagas, salários, nível e prazo de inscrição,
        persistindo tudo no banco de dados local.

        Args:
            with_provas: Se True, busca provas anteriores no acervo para os concursos importados.
            with_questoes: Se True, dispara o crawler de questões dos simulados.
            max_questoes_pages: Limite de páginas por subcategoria ao crawlear questões.

        Returns:
            Dicionário com estatísticas da importação.
        """
        from src.services.pci_concursos_scraper import pci_concursos_scraper
        return pci_concursos_scraper.run_full_pipeline(
            with_provas=with_provas,
            with_questoes=with_questoes,
            max_questoes_pages=max_questoes_pages,
        )


# Instância singleton para uso em todo o backend
pci_service = PCIConcursosService()

