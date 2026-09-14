"""
Extrator de texto de PDFs usando PyMuPDF (fitz) com fallback para pdfplumber.

Estratégia em camadas:
1. PyMuPDF: Rápido, ideal para PDFs digitais.
2. pdfplumber: Layout-aware, melhor para PDFs com tabelas/colunas.
3. OCR (pytesseract): Fallback para PDFs escaneados.
"""

from pathlib import Path
from dataclasses import dataclass
from loguru import logger

import fitz  # PyMuPDF
import pdfplumber


@dataclass
class PageContent:
    """Conteúdo extraído de uma página do PDF."""
    page_number: int
    text: str
    method: str  # 'pymupdf', 'pdfplumber', 'ocr'


@dataclass
class PDFContent:
    """Conteúdo completo de um PDF."""
    file_path: str
    total_pages: int
    pages: list[PageContent]
    extraction_method: str

    @property
    def full_text(self) -> str:
        """Retorna o texto de todas as páginas concatenado."""
        return "\n\n".join(p.text for p in self.pages if p.text.strip())


# Threshold mínimo de caracteres para considerar extração bem-sucedida
MIN_TEXT_THRESHOLD = 100


def extract_with_pymupdf(pdf_path: Path) -> PDFContent | None:
    """
    Extração rápida usando PyMuPDF.
    Ideal para PDFs com texto digital embutido.
    """
    try:
        doc = fitz.open(str(pdf_path))
        pages = []

        for page_num in range(len(doc)):
            page = doc[page_num]

            # Extrai texto preservando layout por blocos
            blocks = page.get_text("blocks", sort=True)
            # Filtra blocos de imagem (type=1) e mantém apenas texto (type=0)
            text_blocks = [b[4] for b in blocks if b[6] == 0]
            page_text = "\n".join(text_blocks).strip()

            pages.append(PageContent(
                page_number=page_num + 1,
                text=page_text,
                method="pymupdf"
            ))

        doc.close()

        # Verifica se a extração foi suficiente
        total_chars = sum(len(p.text) for p in pages)
        if total_chars < MIN_TEXT_THRESHOLD:
            logger.warning(
                f"PyMuPDF extraiu apenas {total_chars} caracteres de '{pdf_path.name}'. "
                "Tentando pdfplumber..."
            )
            return None

        logger.info(
            f"PyMuPDF: {len(pages)} páginas, {total_chars} caracteres extraídos de '{pdf_path.name}'"
        )
        return PDFContent(
            file_path=str(pdf_path),
            total_pages=len(pages),
            pages=pages,
            extraction_method="pymupdf"
        )

    except Exception as e:
        logger.error(f"Erro no PyMuPDF para '{pdf_path.name}': {e}")
        return None


def extract_with_pdfplumber(pdf_path: Path) -> PDFContent | None:
    """
    Extração layout-aware usando pdfplumber.
    Melhor para PDFs com tabelas, colunas, e formatação complexa.
    """
    try:
        pages = []
        with pdfplumber.open(str(pdf_path)) as pdf:
            for i, page in enumerate(pdf.pages):
                # Crop para remover headers/footers (margens de 50px top/bottom)
                height = page.height
                width = page.width
                crop_box = (0, 50, width, height - 40)
                cropped = page.within_bbox(crop_box)

                page_text = cropped.extract_text(
                    x_tolerance=3,
                    y_tolerance=3,
                    layout=True
                ) or ""

                pages.append(PageContent(
                    page_number=i + 1,
                    text=page_text.strip(),
                    method="pdfplumber"
                ))

        total_chars = sum(len(p.text) for p in pages)
        if total_chars < MIN_TEXT_THRESHOLD:
            logger.warning(
                f"pdfplumber extraiu apenas {total_chars} caracteres de '{pdf_path.name}'. "
                "PDF pode ser escaneado — necessário OCR."
            )
            return None

        logger.info(
            f"pdfplumber: {len(pages)} páginas, {total_chars} caracteres extraídos de '{pdf_path.name}'"
        )
        return PDFContent(
            file_path=str(pdf_path),
            total_pages=len(pages),
            pages=pages,
            extraction_method="pdfplumber"
        )

    except Exception as e:
        logger.error(f"Erro no pdfplumber para '{pdf_path.name}': {e}")
        return None


def extract_with_ocr(pdf_path: Path) -> PDFContent | None:
    """
    Fallback OCR usando PyMuPDF para renderizar + pytesseract para reconhecimento.
    Para PDFs escaneados (imagem).
    """
    try:
        import pytesseract
        from PIL import Image
        import io

        doc = fitz.open(str(pdf_path))
        pages = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            # Renderiza a página como imagem (300 DPI para boa qualidade de OCR)
            mat = fitz.Matrix(300 / 72, 300 / 72)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_bytes))

            # OCR com pytesseract (português)
            page_text = pytesseract.image_to_string(img, lang="por")

            pages.append(PageContent(
                page_number=page_num + 1,
                text=page_text.strip(),
                method="ocr"
            ))

        doc.close()

        total_chars = sum(len(p.text) for p in pages)
        logger.info(
            f"OCR: {len(pages)} páginas, {total_chars} caracteres extraídos de '{pdf_path.name}'"
        )

        return PDFContent(
            file_path=str(pdf_path),
            total_pages=len(pages),
            pages=pages,
            extraction_method="ocr"
        )

    except ImportError:
        logger.error("pytesseract não instalado. Instale com: pip install pytesseract")
        return None
    except Exception as e:
        logger.error(f"Erro no OCR para '{pdf_path.name}': {e}")
        return None


def extract_pdf(pdf_path: Path) -> PDFContent:
    """
    Extrai texto de um PDF usando estratégia em camadas:
    1. PyMuPDF (rápido)
    2. pdfplumber (layout-aware)
    3. OCR (fallback para escaneados)

    Args:
        pdf_path: Caminho para o arquivo PDF.

    Returns:
        PDFContent com o texto extraído.

    Raises:
        RuntimeError: Se nenhum método conseguir extrair texto.
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF não encontrado: {pdf_path}")

    logger.info(f"Iniciando extração de '{pdf_path.name}'...")

    # Camada 1: PyMuPDF
    result = extract_with_pymupdf(pdf_path)
    if result:
        return result

    # Camada 2: pdfplumber
    result = extract_with_pdfplumber(pdf_path)
    if result:
        return result

    # Camada 3: OCR
    result = extract_with_ocr(pdf_path)
    if result:
        return result

    raise RuntimeError(
        f"Falha ao extrair texto de '{pdf_path.name}' com todos os métodos."
    )
