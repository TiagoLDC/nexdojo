# Regras do Projeto NexDojo

> **CRÍTICO:** Este documento deve ser lido e seguido integralmente em TODOS os chats que envolvam o projeto NexDojo, localizado em `d:\DEV_WEB\nexdojo`.
>
> [!IMPORTANT]
> **NÃO FAÇA TESTES DIRETO NO NAVEGADOR.** Se precisar fazer algum teste que envolva abrir o navegador ou interagir com a interface, **PEÇA AO USUÁRIO!!!!**

---

## 1. Informações Gerais do Projeto

| Campo | Valor |
|---|---|
| **Nome do Projeto** | NexDojo |
| **Caminho Local** | `d:\DEV_WEB\nexdojo` |
| **Stack** | React 19 + TypeScript + Vite + TailwindCSS v4 |
| **Porta Dev** | **3002** (portas 3000 e 3001 ocupadas) |
| **Gerenciador de Pacotes** | npm |

---

## 2. Servidor de Desenvolvimento

- **Sempre** usar a porta `3002` (nunca 3000 ou 3001)
- URL local Frontend: `http://localhost:3002/`
- URL local API: `http://localhost:3005/`
- Configuração Vite: `d:\DEV_WEB\nexdojo\vite.config.ts`

### Subir o projeto localmente (ambos os servidores de uma vez)

> Quando o usuário pedir **"rode o projeto localmente"**, **"sobe o servidor"**, **"inicia o dev"** ou equivalente, execute:

```powershell
cd d:\DEV_WEB\nexdojo
npm run dev:all
```

Ou via script:
```powershell
cd d:\DEV_WEB\nexdojo
.\start-dev.ps1
```

O `npm run dev:all` usa `concurrently` e exibe os logs da API (cyan) e do Frontend (magenta) no mesmo terminal.

### Verificar se já está rodando antes de subir

```powershell
# Checar portas 3002 e 3005
netstat -ano | findstr "3002 3005"
```

Se não retornar nada, os servidores não estão rodando — executar `npm run dev:all`.

---

## 3. Repositório Git

| Campo | Valor |
|---|---|
| **URL do Repositório** | `https://github.com/TiagoLDC/nexdojo` |
| **Branch principal** | `main` |
| **Branch de desenvolvimento** | `main` |

### Regras de Commit
As mensagens de commit devem seguir rigorosamente o formato:
`#<sequencial>-<YYYY-MM-DD> <HH:MM>-<descrição em português>`

**Exemplo:**
`#001-2026-04-28 10:19-atualização de estilos e correção de datas`

---

## 4. Servidor Remoto / Deploy

| Campo | Valor |
|---|---|
| **Host / IP** | `162.240.167.149` |
| **Usuário SSH** | `qasnexdojo` |
| **Caminho da Chave SSH** | `(Acesso via senha: @Tmd4738@)` |
| **Porta SSH** | `22022` |
| **Diretório do projeto no servidor** | `/home/qasnexdojo/nexdojo` |

### Comando de Conexão SSH
```bash
ssh -p 22022 qasnexdojo@162.240.167.149
```

### Comando de Deploy
```bash
cd /home/qasnexdojo/nexdojo && git pull origin main && docker compose up -d --build
```

---

## 5. Banco de Dados

| Campo | Valor |
|---|---|
| **Tipo** | `MySQL` |
| **Host** | `162.240.167.149` |
| **Porta** | `3306` |
| **Nome do Banco** | `qasnexdojo_qas` |
| **Usuário** | `qasnexdojo_qas` |
| **Senha** | `yFkL8OvxPnr3` |

---

## 6. Variáveis de Ambiente

Arquivo: `d:\DEV_WEB\nexdojo\.env`

```env
# Preencher conforme necessidade do projeto
GEMINI_API_KEY=<!-- PREENCHER -->
# Adicionar outras variáveis aqui
```

---

## 7. Credenciais de Serviços Externos

| Serviço | Usuário / API Key | Observação |
|---|---|---|
| `<!-- PREENCHER -->` | `<!-- PREENCHER -->` | `<!-- PREENCHER -->` |

---

## 8. Regras Obrigatórias para o Agente

1. **Porta**: NUNCA usar as portas `3000` ou `3001` neste projeto. Sempre `3002` (frontend) e `3005` (API).
2. **Diretório**: Todo código do projeto fica em `d:\DEV_WEB\nexdojo`.
3. **Stack**: Não sugerir nem instalar outras bibliotecas de UI sem aprovação explícita do usuário.
4. **Deploy**: Ver seção 4 (deploy via SSH + docker compose no servidor QAS).
5. **Commits**: Seguir o padrão definido na seção 3.
6. **Frequência de Commit**: SÓ realizar commits quando o usuário solicitar explicitamente.
7. **Tag de Versão QAS**: Antes de cada conclusão de tarefa ou deploy, você DEVE atualizar a tag de versão no arquivo `src/components/layout/Layout.tsx` (linha ~111) com a data e hora atual do sistema no formato: `VERSÃO QAS DD/MM/AAAA HH:MM:SS`. Certifique-se de manter apenas UMA tag de versão ativa no sistema (atualmente centralizada no topo).
8. **Testes no Navegador**: NÃO abrir o navegador para testes, a menos que solicitado explicitamente pelo usuário. O usuário realizará os testes manualmente para agilizar as entregas.
9. **Subir servidores locais**: Quando o usuário pedir para rodar/iniciar/subir o projeto localmente, verificar primeiro se as portas 3002 e 3005 já estão em uso (`netstat -ano | findstr "3002 3005"`). Se não estiverem, executar `cd d:\DEV_WEB\nexdojo && npm run dev:all`. Nunca subir o servidor para testes sem o usuário pedir explicitamente.

---

## 9. Observações Adicionais

```
<!-- Espaço livre para anotações, gotchas, bugs conhecidos, etc. -->
```

---

*Última atualização: 08/05/2026*
