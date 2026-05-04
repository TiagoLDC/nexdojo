# Escopo e Casos de Uso - Projeto NexDojo

## 1. Visão Geral do Projeto
O **NexDojo** é uma plataforma robusta de gestão digital para academias de artes marciais (Dojos). O sistema foi projetado para centralizar todas as operações administrativas, financeiras e pedagógicas, oferecendo uma experiência moderna e responsiva para gestores, instrutores e alunos.

---

## 2. Escopo do Projeto

### 2.1. Arquitetura e Tecnologia
- **Frontend**: React 19 com TypeScript.
- **Build Tool**: Vite.
- **Estilização**: TailwindCSS v4 com suporte nativo a Temas (Dark/Light Mode).
- **Internacionalização**: Suporte multi-idioma (Português, Inglês e Espanhol).
- **Responsividade**: Interface otimizada para Desktop, Tablets e Dispositivos Móveis.
- **Componentes**: Biblioteca Lucide-React para ícones e Framer Motion para animações fluidas.

### 2.2. Módulos Principais
1.  **Dashboard Inteligente**: Visualização em tempo real de métricas críticas como total de alunos, faturamento mensal, taxa de presença e novos cadastros.
2.  **Gestão de Alunos**: Cadastro completo, histórico de graduações (faixas/graus), controle de status (Ativo/Inativo/Pendente) e perfis individuais.
3.  **Controle de Presença (Chamada)**: Registro simplificado de frequência por turma e horário, integrado ao histórico do aluno.
4.  **Gestão Financeira**: Controle de pagamentos, planos de assinatura, fluxo de caixa e integração de cobranças.
5.  **Gestão de Instrutores e Staff**: Cadastro de mestres e colaboradores com níveis de permissão específicos.
6.  **Grade de Horários e Turmas**: Organização de horários de treino, definição de turmas por nível ou modalidade.
7.  **Mural de Comunicação (Chat)**: Canal centralizado para avisos, interações e comunicados da academia.
8.  **Controle de Materiais (Quimonos)**: Gestão de estoque ou atribuição de vestimentas técnicas.
9.  **Relatórios e BI**: Geração de relatórios detalhados em PDF e gráficos de desempenho.
10. **Lixeira (Recycle Bin)**: Recuperação de dados excluídos acidentalmente para garantir a integridade da informação.

---

## 3. Níveis de Acesso (Roles)

- **Superuser**: Gestão global de múltiplas unidades/academias, acesso total ao banco de dados e configurações de plataforma.
- **Admin**: Proprietário da academia com acesso total às funções administrativas e financeiras da sua unidade.
- **Instructor**: Foco em gestão de turmas, chamada de alunos e visualização de perfis técnicos.
- **Staff**: Acesso operacional (recepção, vendas, estoque de quimonos).
- **Student**: Acesso ao próprio perfil, consulta de graduação, histórico de presença e pagamentos.

---

## 4. Casos de Uso Principais

### 4.1. Gestão Administrativa
- **UC01: Cadastro de Novo Aluno**
    - **Ator**: Admin / Staff.
    - **Descrição**: Registrar um novo praticante, definindo sua faixa inicial, plano financeiro e dados de contato.
- **UC02: Troca de Faixa (Graduação)**
    - **Ator**: Admin / Instructor.
    - **Descrição**: Atualizar a graduação do aluno após exame, registrando a nova cor de faixa e data da conquista.

### 4.2. Operação Diária
- **UC03: Realização de Chamada**
    - **Ator**: Instructor / Admin.
    - **Descrição**: O instrutor seleciona a turma do horário e marca a presença dos alunos presentes de forma rápida pelo tablet ou celular.
- **UC04: Postagem no Mural**
    - **Ator**: Admin / Instructor.
    - **Descrição**: Publicar um aviso sobre feriado ou evento especial para que todos os alunos visualizem ao acessar o app.

### 4.3. Gestão Financeira
- **UC05: Baixa de Pagamento Mensal**
    - **Ator**: Admin / Staff.
    - **Descrição**: Registrar o recebimento de uma mensalidade, atualizando o status financeiro do aluno para "Em dia".
- **UC06: Análise de Inadimplência**
    - **Ator**: Admin.
    - **Descrição**: Filtrar alunos com pagamentos pendentes para ações de cobrança ou restrição de acesso.

### 4.4. Experiência do Aluno
- **UC07: Consulta de Ficha Técnica**
    - **Ator**: Student.
    - **Descrição**: O aluno visualiza quanto tempo falta para sua próxima graduação e seu histórico de aulas assistidas.
- **UC08: Pagamento de Mensalidade**
    - **Ator**: Student.
    - **Descrição**: Acessar a área de pagamentos para visualizar chaves PIX ou boletos da academia.

### 4.5. Gestão Multi-Unidade
- **UC09: Alternância entre Academias**
    - **Ator**: Superuser.
    - **Descrição**: Gestor do grupo alterna rapidamente entre as visões da "Unidade Matriz" e "Unidade Filial" para comparar desempenhos.

---

## 5. Diferenciais Estratégicos
- **Foco em UX**: Interface limpa que reduz o tempo gasto em tarefas burocráticas.
- **Segurança**: Dados protegidos por níveis de acesso rigorosos.
- **Mobilidade**: Pensado para uso "no tatame" via dispositivos móveis.
- **Escalabilidade**: Preparado para crescer de uma única academia para uma rede de franquias.
