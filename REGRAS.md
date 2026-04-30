# Regras do Projeto NexDojo

> **CRÍTICO:** Este documento deve ser lido e seguido integralmente em TODOS os chats que envolvam o projeto NexDojo, localizado em `d:\DEV_WEB\nexdojo`.

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
- Comando para iniciar: `npm run dev` dentro de `d:\DEV_WEB\nexdojo`
- URL local: `http://localhost:3002/`
- Configuração em: `d:\DEV_WEB\nexdojo\vite.config.ts`

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
| **Tipo** | `<!-- PREENCHER (ex: PostgreSQL / MySQL / SQLite) -->` |
| **Host** | `<!-- PREENCHER -->` |
| **Porta** | `<!-- PREENCHER (ex: 5432) -->` |
| **Nome do Banco** | `<!-- PREENCHER -->` |
| **Usuário** | `<!-- PREENCHER -->` |
| **Senha** | `<!-- PREENCHER -->` |

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

1. **Porta**: NUNCA usar as portas `3000` ou `3001` neste projeto. Sempre `3002`.
2. **Diretório**: Todo código do projeto fica em `d:\DEV_WEB\nexdojo`.
3. **Stack**: Não sugerir nem instalar outras bibliotecas de UI sem aprovação explícita do usuário.
4. **Deploy**: `<!-- PREENCHER com regras de deploy automático, se houver -->`.
5. **Commits**: Seguir o padrão definido na seção 3.
6. **Frequência de Commit**: SÓ realizar commits quando o usuário solicitar explicitamente.

---

## 9. Observações Adicionais

```
<!-- Espaço livre para anotações, gotchas, bugs conhecidos, etc. -->
```

---

*Última atualização: 30/04/2026*
