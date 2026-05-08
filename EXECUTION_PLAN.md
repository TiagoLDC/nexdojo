# EXECUTION_PLAN.md — Auditoria e Evolução do Sistema Dojo

> Este arquivo guia o trabalho do Claude Code neste repositório.
> Execute fase por fase. Não pule fases. Aguarde aprovação onde indicado.

---

## REGRAS GERAIS (aplicam-se a todas as fases)

- **Leia o CLAUDE.md primeiro** — ele aponta para credenciais e regras do projeto.
- **Nunca delete dados, tabelas ou arquivos sem perguntar.**
- **Nunca altere variáveis de ambiente ou credenciais sem perguntar.**
- **Preserve a estrutura de pastas existente** a menos que a refatoração exija mudança (nesse caso, justifique antes).
- **Mantenha compatibilidade** com o que já está em produção.
- **Documente** qualquer decisão técnica relevante em comentários ou no próprio relatório.
- **Use as credenciais e configurações do CLAUDE.md** — não invente conexões.
- Todos os relatórios devem ser gerados na pasta `_audit/` na raiz do projeto.

---

## FASE 1 — MAPEAMENTO (somente leitura, não altere nada)

### 1.1 Estrutura do projeto
- Leia todos os arquivos e diretórios recursivamente.
- Produza um mapa da arquitetura: pastas, módulos, componentes, rotas, serviços, hooks, utilitários.
- Identifique o stack completo: framework, linguagem, banco de dados, ORM/query builder, autenticação, deploy.

### 1.2 Modelo de dados
- Localize schemas, migrations, models ou definições de tabelas.
- Desenhe o diagrama lógico das entidades (alunos, professores, planos, aulas, pagamentos, graduações, etc.) e seus relacionamentos.
- Verifique se existem índices, constraints (FK, UNIQUE, NOT NULL, CHECK) e se estão corretos.

### 1.3 Fluxos do sistema
Mapeie cada fluxo de negócio principal:
- Cadastro e matrícula de aluno
- Gestão de planos e mensalidades
- Agendamento e controle de aulas
- Registro de graduações/faixas
- Gestão de professores e horários
- Relatórios e dashboards

Para cada fluxo, identifique: entrada de dados → validação → persistência → resposta ao usuário.

### 1.4 Integrações
- Como o Google AI Studio está sendo usado? (geração de texto, classificação, assistente, etc.)
- Existem outras APIs externas? (pagamento, notificação, etc.)
- Como as chamadas são feitas? (client-side, server-side, edge functions)

**Entrega:** Gere `_audit/01-mapeamento.md` com tudo que encontrou.

---

## FASE 2 — DIAGNÓSTICO DE PROBLEMAS

Analise o código buscando problemas nas categorias abaixo.

### 2.1 Segurança
- SQL injection, XSS, CSRF
- Secrets/chaves expostas em código (hardcoded)
- Permissões e controle de acesso (RLS, middleware, guards)
- Validação de input no backend (não confiar apenas no frontend)
- Tokens/sessões: expiração, refresh, armazenamento

### 2.2 Confiabilidade de dados
- Operações sem transação que deveriam ser atômicas
- Race conditions (ex: dois pagamentos simultâneos)
- Dados órfãos (registros sem FK que deveriam ter)
- Falta de soft delete onde necessário
- Ausência de auditoria/log de alterações em dados sensíveis

### 2.3 Boas práticas de código
- Código duplicado (DRY)
- Funções ou componentes com responsabilidades misturadas (SRP)
- Tratamento de erros: try/catch genéricos, erros silenciados, falta de feedback ao usuário
- Tipagem: uso correto de TypeScript/tipos, `any` excessivo
- Naming conventions inconsistentes
- Arquivos muito grandes (>300 linhas) que deveriam ser divididos
- Console.log/debug esquecidos em produção

### 2.4 Performance
- Queries N+1
- Falta de paginação em listagens
- Imagens/assets sem otimização
- Re-renders desnecessários (se React/Antigravity)
- Chamadas de API redundantes ou sem cache

### 2.5 UX e fluxos quebrados
- Formulários sem feedback de loading/erro/sucesso
- Estados vazios não tratados (listas sem dados)
- Navegação confusa ou rotas mortas
- Falta de confirmação em ações destrutivas (deletar, cancelar)

**Entrega:** Gere `_audit/02-diagnostico.md` usando este formato para cada problema:

[CATEGORIA] Título do problema

Arquivo(s): caminho/do/arquivo.ts:linha
Severidade: 🔴 Crítica | 🟡 Média | 🟢 Baixa
Descrição: O que está errado e por quê.
Impacto: O que pode acontecer se não for corrigido.
Correção sugerida: Como resolver.

---

## FASE 3 — PLANO DE AÇÃO

⏸️ **CHECKPOINT: Apresente o plano e AGUARDE aprovação antes de prosseguir.**

Com base no diagnóstico, crie `_audit/03-plano-de-acao.md` organizado em:

1. **Correções críticas (fazer primeiro)** — segurança e integridade de dados
2. **Melhorias estruturais** — refatorações, tipagem, separação de responsabilidades
3. **Melhorias de UX** — feedback, estados, loading
4. **Otimizações** — performance, cache, queries
5. **Dívida técnica** — testes, documentação, CI/CD

Para cada item, estime esforço:
- **P** = pequeno (<30 min)
- **M** = médio (1–3h)
- **G** = grande (>3h)

---

## FASE 4 — EXECUÇÃO (somente após aprovação explícita)

Ao receber OK do usuário:
- Trabalhe item por item, na ordem de prioridade do plano aprovado.
- Faça commits atômicos com mensagens descritivas em português.
- Padrão de commit: `fix:`, `refactor:`, `feat:`, `docs:`, `perf:`.
- Após cada grupo de alterações, informe o que foi feito e pergunte se deve continuar.
- Se encontrar algo ambíguo ou que exija decisão de negócio, **PARE e pergunte**.