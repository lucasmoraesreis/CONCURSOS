# 🚀 Guia de Deploy Rápido na Render (100% Gratuito e Automático)

Este guia explica exatamente o que fazer para colocar sua plataforma no ar na nuvem da **Render (render.com)** sem gastar nada e sem digitar comandos complexos.

---

## 📦 Passo 1: Enviar o Projeto para o GitHub (Automático)

Na sua máquina, abra o terminal na pasta `d:\QUESTÕES\` e execute:

```bash
python push_to_github.py
```

O script cuidará de tudo:
- Criará o arquivo `.gitignore` para proteger suas credenciais e arquivos pesados.
- Fará o `git add` e `git commit`.
- Perguntará a URL do seu repositório no GitHub (ex: `https://github.com/seu-usuario/questoes-concursos.git`).
- Enviará todos os arquivos para a branch `main`.

---

## ☁️ Passo 2: As Únicas 2 Coisas a Fazer na Render

Assim que o script terminar, acerte os seguintes passos no painel da Render:

### 1. Criar o Projeto a partir do Blueprint
1. Acesse **[dashboard.render.com](https://dashboard.render.com/)** e faça login com sua conta do GitHub.
2. No canto superior direito, clique no botão azul **"New +"** e selecione **"Blueprint"**.
3. Localize e selecione o repositório que você acabou de subir (`questoes-concursos`).
4. Clique em **"Connect"**.

### 2. Preencher a Chave da IA e Aplicar
1. A Render lerá o arquivo `render.yaml` automaticamente e exibirá os 3 recursos gratuitos que serão criados:
   - 🗄️ **`qconcursos-db`**: Banco de Dados PostgreSQL 16 (Plano Free).
   - 🐍 **`qconcursos-backend`**: API FastAPI via Docker (Plano Free).
   - ⚛️ **`qconcursos-frontend`**: Interface React via Docker Nginx (Plano Free).
2. No campo **`GEMINI_API_KEY`**, cole a sua chave do Google Gemini:
   ```text
   sua_chave_do_gemini_aqui
   ```
3. Clique no botão **"Apply"** no final da página.

---

## 🎯 O que Acontece nos Bastidores (100% Automático)

- A Render provisiona o banco PostgreSQL 16 com a extensão `pgvector`.
- O container do backend inicializa, executa automaticamente o comando `alembic upgrade head` (criando todas as tabelas, índices HNSW e modelos de usuários/desempenho).
- O container do frontend compila o React com Tailwind v4 e sobe o Nginx Alpine com proxy reverso configurado.
- Você receberá um link público seguro com HTTPS (ex: `https://qconcursos-frontend.onrender.com`) pronto para usar e compartilhar!
