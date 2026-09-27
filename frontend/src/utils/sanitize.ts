import DOMPurify from 'dompurify';

/**
 * @module sanitize
 * Funções utilitárias com DOMPurify para sanitizar conteúdo HTML e texto no frontend.
 * Elimina vetores de ataque XSS (Cross-Site Scripting), atributos perigosos e tags maliciosas.
 */

/**
 * Sanitiza o conteúdo HTML bruto, mantendo apenas tags de formatação seguras.
 * @param html O string contendo o HTML potencialmente inseguro.
 * @returns Um string HTML estritamente sanitizado.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'code', 'pre', 'span', 'blockquote', 'hr', 'h1', 'h2', 'h3', 'h4'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

/**
 * Sanitiza texto simples garantindo a remoção de qualquer tag HTML.
 * @param text O string de texto a ser sanitizado.
 * @returns Texto puro sem elementos HTML.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}