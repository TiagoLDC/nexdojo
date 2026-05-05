# Plano de Implementação: Reestruturação e Boas Práticas - NexDojo

Este plano visa melhorar a arquitetura do projeto, corrigir problemas de navegação (URLs) e organizar o código seguindo as melhores práticas de desenvolvimento React.

## 1. Reorganização da Estrutura de Pastas
Atualmente, o projeto possui muitos componentes e lógicas concentrados no `App.tsx`. Vamos distribuir isso em uma estrutura mais escalável.

- [x] Criar diretório `src/components/layout` para componentes de interface global (Sidebar, Navbar, BottomNav).
- [x] Criar diretório `src/context` para gerenciar estados globais (Autenticação, Tema, Academia, Idioma).
- [x] Criar diretório `src/hooks` para lógicas reutilizáveis.
- [x] Organizar `src/views` para que cada página seja um componente focado apenas em sua funcionalidade.

## 2. Refatoração do Roteamento (URLs Amigáveis)
O sistema utiliza `HashRouter` e estados internos para telas de login/cadastro, o que impede URLs únicas para cada tela.

- [x] **Mudar para `BrowserRouter`**: Remover o `#` das URLs.
- [x] **Roteamento de Autenticação**:
    - [x] Criar rotas específicas: `/login`, `/cadastro/aluno`, `/cadastro/academia`, `/esqueci-senha`.
    - [x] Integrar o `LoginView` ao sistema de rotas do React Router em vez de usar `useState` para alternar telas.
- [x] **Proteção de Rotas**: Refinar o componente `ProtectedRoute` para lidar com redirecionamentos de forma mais limpa.

## 3. Modularização do `App.tsx`
O arquivo `App.tsx` está muito grande (700+ linhas).

- [x] Extrair o componente `Sidebar` para `src/components/layout/Sidebar.tsx`.
- [x] Extrair o componente `BottomNavLink` para `src/components/layout/BottomNav.tsx`.
- [x] Mover a lógica de temas (cores dinâmicas) para um hook ou context.

## 4. Refatoração do `LoginView.tsx`
O arquivo de login tem mais de 1000 linhas e lida com múltiplos formulários de cadastro.

- [x] Dividir em sub-componentes: `LoginForm`, `StudentSignup`, `AcademySignup`, etc.
- [x] Utilizar navegação real entre essas telas para que o usuário possa usar os botões "voltar" do navegador.

## 5. Boas Práticas e Padronização
- [x] **Links e Navegação**: Garantir que todos os botões de ação que mudam de página usem `Link` ou `useNavigate`.
- [x] **Componentes**: Padronizar a criação de componentes usando `React.FC` e garantindo que cada arquivo tenha uma única responsabilidade.
- [x] **Estado Global**: Utilizar Context API para evitar "prop drilling" excessivo de `user`, `academy`, `theme`, etc.

## 6. Criação do Banco de Dados e API Backend (Migração Fullstack)
Para garantir persistência real e modelagem de dados sólida, vamos substituir os dados mockados (`StorageService` local) por uma API conectada a um banco MySQL.

- [x] **Configuração do Backend**: Pasta `api/` criada com Node.js + Express + TypeScript.
- [x] **Configuração do Prisma ORM**: Schema criado com modelos `Academy`, `User`, `Student`.
- [x] **Conexão com Banco de Dados**: Prisma conectado ao MySQL `162.240.167.149` / `qasnexdojo_qas`. Tabelas sincronizadas.
- [x] **Criação dos Endpoints (Rotas)**: Rotas de Auth (login, register-academy, register-student), Alunos (CRUD) e Academias criadas.
- [x] **Refatoração do Frontend**: Atualizar o `StorageService` para consumir a nova API via chamadas HTTP assíncronas em vez de `localStorage`.
- [x] **Atualização do Deploy**: `api/Dockerfile` criado; `docker-compose.yml` atualizado para subir o serviço `nexdojo-api` na porta 3005.

## 7. Implementação de Módulos (Baseado no Escopo)
- [ ] **Dashboard Inteligente**: Refinar métricas e gráficos para visão geral da academia.
- [ ] **Gestão de Alunos**: Melhorar CRUD, histórico de graduações e controle de status.
- [ ] **Controle de Presença**: Desenvolver interface simplificada para instrutores realizarem chamadas.
- [ ] **Gestão Financeira**: Estruturar controle de mensalidades e status de inadimplência.
- [ ] **Perfis de Acesso (Roles)**: Implementar controle de permissões baseado nos perfis (Superuser, Admin, Instructor, Staff, Student).

## 8. Internacionalização (i18n)
- [ ] **Configuração Base**: Integrar biblioteca de internacionalização (ex: `i18next`).
- [ ] **Traduções**: Criar arquivos de idioma para Português, Inglês e Espanhol.
- [ ] **Seletor de Idioma**: Adicionar componente acessível para troca de idioma em tempo real.

---

## Próximos Passos Imediatos:
1. Iniciar a reorganização de pastas.
2. Migrar para `BrowserRouter` e ajustar o `App.tsx`.
3. Separar o Layout do conteúdo das páginas.
4. Estruturar os módulos de negócio e controle de acesso.
