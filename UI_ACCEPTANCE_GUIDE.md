# 📋 Guia de Critérios de Aceite na Interface (UI Acceptance Guide)

Este roteiro passo a passo permite validar visualmente e tecnicamente todas as funcionalidades do ecossistema: **Busca Semântica com pgvector (HNSW)**, **Hacker de Bancas (Gerador de Inéditas IA)** e **Filtros em Cascata de Alta Performance**.

---

## 🛠️ 1. Pré-Requisitos e Inicialização

Antes de abrir o navegador, execute o health check e inicie os servidores:

```bash
# 1. Validar saúde do banco e chave da IA
python pipeline/src/utils/health_check.py

# 2. Iniciar ecossistema completo (Postgres + Backend + Frontend)
# No Windows:
.\run_all.bat
# ou no PowerShell:
.\run_all.ps1
```

O navegador abrirá automaticamente em `http://localhost:5173`.

---

## 🧠 2. Teste da Busca Semântica IA (pgvector + HNSW)

O objetivo desta funcionalidade é encontrar questões por **significado e contexto jurídico**, e não por palavras exatas.

### Passo a Passo no Navegador:
1. No topo da tela principal, clique no botão alternador **"Busca Semântica IA"** (ícone de cérebro com gradiente esmeralda).
2. Na barra de pesquisa em linguagem natural, digite um dos termos conceituais abaixo e clique em **"Buscar"** (ou pressione Enter):

| Consulta Conceitual | O que o pgvector deve localizar | O que observar na UI |
| :--- | :--- | :--- |
| `princípio da moralidade administrativa` | Questões sobre improbidade administrativa, desvio de finalidade ou conduta ética do servidor. | Badge `🎯 Relevância: XX%` verde no card da questão, indicando a similaridade de cosseno. |
| `vitaliciedade do magistrado` | Questões de Direito Constitucional sobre garantias do Poder Judiciário (adquirida após 2 anos de exercício). | O enunciado não precisa conter a palavra exata "vitaliciedade", mas o tema das prerrogativas. |
| `estabilidade do servidor público no DF` | Questões da Lei Complementar nº 840/2011 ou LODF sobre avaliação especial de desempenho de 3 anos. | Retorno de questões do IADES ou Cebraspe focadas em normas do Distrito Federal. |
| `crimes contra a administração pública` | Questões de Direito Penal tratando de peculato, concussão ou corrupção passiva. | Ordenação decrescente pela similaridade semântica calculada pelo modelo `text-embedding-004`. |

### Validação Técnica no DevTools (F12):
- Abra o **DevTools** (`F12` no Chrome/Edge) e vá até a aba **Rede (Network)**.
- Filtre por `Fetch/XHR`.
- Veja a requisição `GET /api/questoes/busca-semantica?q=...&limit=30`.
- Clique na requisição e inspecione a aba **Resposta (Response)**:
  ```json
  {
    "items": [
      {
        "id": "...",
        "enunciado": "...",
        "similarity": 0.8412,
        "disciplina_nome": "Direito Administrativo",
        "banca_nome": "Cebraspe"
      }
    ],
    "total": 1,
    "query": "princípio da moralidade administrativa"
  }
  ```
  *(Confirme que o campo `similarity` é retornado como número float formatado no card).*

---

## ⚡ 3. Teste do "Hacker de Bancas" (Gerador de Questões Inéditas)

O gerador utiliza **Structured Outputs (Pydantic)** do Gemini para fazer engenharia reversa do padrão cognitivo de distratores de cada banca organizadora.

### Cenário A: Simulação Estilo Cebraspe (Certo/Errado)
1. No cabeçalho superior, clique no botão roxo destacado **"⚡ Hacker de Bancas (Gerar Inédita)"**.
2. No modal que se abre, preencha:
   - **Banca Organizadora**: `Cebraspe`
   - **Formato da Questão**: `Certo/Errado (Estilo Cebraspe)`
   - **Nível de Dificuldade**: `Difícil` ou `Nível Perito`
   - **Disciplina**: `Direito Constitucional`
   - **Assunto**: `Artigo 5º - Direitos Individuais e Coletivos`
3. Clique em **"Gerar Questão Inédita com Pegadinha"**.
4. **Observe o feedback visual**:
   - Etapa 1: *"Mapeando matriz de pegadinhas da banca..."*
   - Etapa 2: *"Engenhando distratores cognitivos com IA..."*
   - Etapa 3: *"Calculando vetor de embedding e persistindo no banco..."*
5. Quando a questão surgir na tela:
   - Clique na opção **C** ou **E**.
   - Veja o feedback imediato (`🎉 Parabéns!` ou `Você caiu na armadilha da banca!`).
   - Clique no botão roxo **"🎯 Análise da Banca & Engenharia da Pegadinha"**:
     * Verifique se o accordion se expande revelando a explicação exata da armadilha (ex: inversão de "pode" por "deve", omissão de exceção constitucional expressa).
   - Clique no botão âmbar **"Ver Justificativa Jurídica / Teórica"** para ver a análise completa.

### Cenário B: Simulação Estilo FGV (Múltipla Escolha)
1. No mesmo modal, preencha:
   - **Banca Organizadora**: `FGV`
   - **Formato da Questão**: `Múltipla Escolha (A-E)`
   - **Nível de Dificuldade**: `Nível Perito`
   - **Disciplina**: `Direito Administrativo`
   - **Assunto**: `Atos Administrativos e Poder de Polícia`
2. Clique em **"Gerar Questão Inédita com Pegadinha"**.
3. Observe que o enunciado gerado trará uma **situação fática / estudo de caso fictício** (típico da FGV), com 5 alternativas bem elaboradas.
4. Feche o modal: a questão recém-criada foi adicionada ao topo da sua lista com a tag especial **`⚡ Questão Inédita (IA)`**.

### Validação Técnica no DevTools (Network Payload):
- Na aba **Rede (Network)**, procure a chamada `POST /api/questoes/gerar-inedita`.
- Verifique o **Payload da Requisição**:
  ```json
  {
    "banca": "Cebraspe",
    "disciplina": "Direito Constitucional",
    "assunto": "Artigo 5º - Direitos Individuais e Coletivos",
    "tipo_questao": "Certo/Errado",
    "dificuldade": "Difícil"
  }
  ```
- Verifique a **Resposta JSON recebida**:
  ```json
  {
    "id": "c88f1234-abcd-...",
    "tipo_questao": "Certo/Errado",
    "enunciado": "...",
    "alternativas": [
      { "letra": "C", "texto": "Certo" },
      { "letra": "E", "texto": "Errado" }
    ],
    "alternativa_correta": "E",
    "engenharia_da_pegadinha": "A assertiva trocou sutilmente a palavra 'inviolável' por 'relativo' no domicílio...",
    "justificativa_ia": "Fundamentação no Art. 5º, XI da CF/88...",
    "banca_emulada": "Cebraspe",
    "is_inedita": true
  }
  ```
  *(Garante que o campo `engenharia_da_pegadinha` é recebido sem perda estrutural).*

---

## 📂 4. Teste dos Filtros Cascata Clássicos

1. Clique na aba **"Filtros por Prova"**.
2. No menu lateral esquerdo:
   - **Nível 1 (Concurso)**: Clique no seletor de concursos e escolha qualquer concurso catalogado (ex: órgãos do DF ou Cebraspe/FGV).
   - **Nível 2 (Disciplinas)**: Veja as disciplinas desse concurso carregadas dinamicamente com as badges de quantidade de questões. Clique em uma disciplina.
   - **Nível 3 (Assuntos)**: Os assuntos específicos daquela disciplina são abertos em cascata.
3. Teste a paginação na parte inferior dos cards e confirme a fluidez das transições animadas.

---

## 🏁 Matriz de Critérios de Aceite (Checklist de Homologação)

| # | Funcionalidade | Critério de Sucesso | Status |
| :---: | :--- | :--- | :---: |
| 1 | **Conexão & Health Check** | `python pipeline/src/utils/health_check.py` retorna exit code 0 | [ ] |
| 2 | **Busca Semântica (HNSW)** | Busca termos como *"moralidade"* e exibe questões relevantes com badge de similaridade % | [ ] |
| 3 | **Geração Cebraspe (Inédita)** | Gera questão Certo/Errado com pegadinha documentada | [ ] |
| 4 | **Geração FGV (Inédita)** | Gera estudo de caso A-E com distratores doutrinários | [ ] |
| 5 | **DevTools Network** | Endpoint `/api/questoes/gerar-inedita` retorna JSON 200 com `engenharia_da_pegadinha` | [ ] |
| 6 | **Persistência pgvector** | Questão inédita ganha UUID no banco e embedding para ser encontrada na busca | [ ] |
| 7 | **Filtros em Cascata** | Reset automático e carregamento Concurso → Disciplina → Assunto sem travar a UI | [ ] |
