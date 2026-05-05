# Plano de Implementação: Reestruturação e Boas Práticas - NexDojo

Este plano visa melhorar a arquitetura do projeto, corrigir problemas de navegação (URLs) e organizar o código seguindo as melhores práticas de desenvolvimento React.

## 1. Reorganização da Estrutura de Pastas
Atualmente, o projeto possui muitos componentes e lógicas concentrados no `App.tsx`. Vamos distribuir isso em uma estrutura mais escalável.

- [x] Criar diretório `src/components/layout` para componentes de interface global (Sidebar, Navbar, BottomNav).
- [x] Criar diretório `src/context` para gerenciar estados globais (Autenticação, Tema, Academia, Idioma).
- [x] Criar diretório `src/hooks` para lógicas reutilizáveis.
- [ ] Organizar `src/views` para que cada página seja um componente focado apenas em sua funcionalidade.

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
- [ ] Mover a lógica de temas (cores dinâmicas) para um hook ou context.

## 4. Refatoração do `LoginView.tsx`
O arquivo de login tem mais de 1000 linhas e lida com múltiplos formulários de cadastro.

- [ ] Dividir em sub-componentes: `LoginForm`, `StudentSignup`, `AcademySignup`, etc.
- [ ] Utilizar navegação real entre essas telas para que o usuário possa usar os botões "voltar" do navegador.

## 5. Boas Práticas e Padronização
- [ ] **Links e Navegação**: Garantir que todos os botões de ação que mudam de página usem `Link` ou `useNavigate`.
- [ ] **Componentes**: Padronizar a criação de componentes usando `React.FC` e garantindo que cada arquivo tenha uma única responsabilidade.
- [ ] **Estado Global**: Utilizar Context API para evitar "prop drilling" excessivo de `user`, `academy`, `theme`, etc.

---

## Próximos Passos Imediatos:
1. Iniciar a reorganização de pastas.
2. Migrar para `BrowserRouter` e ajustar o `App.tsx`.
3. Separar o Layout do conteúdo das páginas.
