# Infraestrutura de Deploy — Padrão TiagoServer

> **Para IAs e assistentes:** Este documento descreve a infraestrutura do servidor compartilhado usado nos projetos de Tiago Castro. Ele pode ser colocado na raiz de qualquer projeto para que a IA saiba exatamente como subir, manter e fazer deploy de sistemas nesse servidor, replicando os mesmos padrões já funcionando no projeto NexDojo.
>
> Leia este arquivo integralmente antes de qualquer ação de deploy.

---

## 1. Visão Geral do Servidor

| Campo | Valor |
|---|---|
| **IP do servidor** | `162.240.167.149` |
| **Tipo de hospedagem** | cPanel compartilhado (Hostgator/similar) |
| **Sistema operacional** | Linux |
| **Porta SSH** | `22022` (não é a padrão 22) |
| **Autenticação SSH** | Senha (sem chave pública) |
| **Senha SSH padrão dos projetos** | `@Tmd4738@` |
| **Servidor web** | Apache (cPanel) na porta 80/443 |
| **Banco de dados** | MySQL na porta 3306 |
| **Docker** | Instalado e disponível |

### Estrutura de usuários cPanel

Cada domínio/projeto tem um **usuário cPanel separado**. Cada usuário tem:
- Home em `/home/<usuario>/`
- `public_html` em `/home/<usuario>/public_html/`
- Banco MySQL próprio (ex: `usuario_nomebanco`)
- Usuário MySQL próprio (ex: `usuario_nomeuser`)

---

## 2. Como Conectar via SSH

O cliente SSH do Windows **não suporta senha interativa via linha de comando**. Todo acesso SSH deve ser feito via **Python + paramiko**.

### Pré-requisito (instalar uma vez na máquina local)

```powershell
pip install paramiko --user
```

### Template de conexão paramiko

```python
import paramiko, sys, re, io

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    '162.240.167.149',
    port=22022,
    username='<usuario_cpanel>',
    password='@Tmd4738@',
    timeout=30
)
```

### Como executar o script (na máquina Windows local)

```powershell
# SEMPRE usar py (não python nem python3 — não estão no PATH desta máquina)
py nome_do_script.py
```

### Como remover o script após execução

```powershell
# SEMPRE usar PowerShell tool com caminho absoluto e -Force
Remove-Item D:\DEV_WEB\<projeto>\nome_do_script.py -Force
# NUNCA usar a ferramenta Bash para Remove-Item (é cmdlet PowerShell, não bash)
```

---

## 3. Verificar Portas Disponíveis no Servidor

Antes de subir qualquer novo serviço, verifique as portas em uso:

```bash
# Via SSH no servidor:
ss -tlnp 2>/dev/null | grep -E ':30[0-9]{2}'
```

### Portas reservadas conhecidas (atualizar conforme novos serviços forem criados)

| Porta | Serviço |
|---|---|
| **80** | Apache/cPanel (proxy reverso — NUNCA usar) |
| **443** | HTTPS Apache/cPanel |
| **3001** | tna-frontend-qas |
| **3002** | louvorhub-prod |
| **3003** | nexdojo-frontend QAS |
| **3004** | wordtetris-prod |
| **3005** | nexdojo-frontend PRD |
| **3006** | tnaocr-app |
| **3007** | nexdojo-api PRD (network_mode: host) |
| **21, 22022** | FTP, SSH |
| **25, 26, 587** | SMTP |
| **53** | DNS |
| **143, 993** | IMAP |
| **995** | POP3 |
| **2077–2096** | cPanel/WHM |
| **3306** | MySQL |

**Regra:** Para novos projetos, usar portas a partir de **3008** em diante. Sempre verificar com `ss -tlnp` antes de escolher.

---

## 4. Padrão de Deploy com Docker + Proxy Reverso Apache

### Conceito

Cada projeto/ambiente roda em um **container Docker** exposto em uma porta do host. O Apache do cPanel (porta 80/443) faz **proxy reverso** para essa porta via `.htaccess`.

```
Usuário → sistema.nexdojo.com.br (porta 443/80)
  → Apache/cPanel
    → .htaccess (RewriteRule)
      → localhost:<porta_docker> (container Docker)
```

### Estrutura Docker padrão

Um projeto típico tem dois containers:

```yaml
# docker-compose.yml padrão (ambiente QAS)
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - ./api/.env
    extra_hosts:
      - "host.docker.internal:host-gateway"

  frontend:
    build: .
    restart: unless-stopped
    ports:
      - "<PORTA_DO_HOST>:80"   # ex: 3003:80
    depends_on:
      - api
```

O container `frontend` roda nginx internamente na porta 80, exposto na `<PORTA_DO_HOST>` do servidor.

O container `api` não expõe porta ao host — apenas o frontend o acessa via rede Docker interna pelo hostname `api`.

### nginx.conf padrão (QAS — api via rede Docker)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /api {
        proxy_pass http://api:3005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
}
```

---

## 5. Configuração do .htaccess (Proxy Reverso)

O `.htaccess` deve estar em `/home/<usuario>/public_html/.htaccess`.

### Formato padrão

```apache
Options -MultiViews
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:<PORTA_DO_CONTAINER>/$1 [P,L]
```

**Exemplo real** (nexdojo PRD, porta 3005):
```apache
Options -MultiViews
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3005/$1 [P,L]
```

### Observações críticas

- O `.htaccess` **não precisa ser reescrito a cada deploy** — só quando a porta muda.
- O Apache do cPanel precisa ter `mod_proxy` e `mod_rewrite` habilitados (já está habilitado por padrão no servidor).
- Não incluir redirect HTTPS no `.htaccess` — o cPanel já faz isso via certificado Let's Encrypt.

---

## 6. Problema MySQL: Docker vs. localhost

### O problema

O MySQL do cPanel, por padrão, só aceita conexões de `localhost`/`127.0.0.1`. Quando a API roda dentro de um container Docker, a conexão chega de um IP da rede Docker (ex: `172.24.0.2`), e o MySQL **rejeita**.

### Solução QAS (se o usuário MySQL já foi configurado com acesso `%`)

Se o usuário MySQL foi configurado no cPanel com acesso remoto (`%`), a API pode usar `host.docker.internal` como `DB_HOST`:

```env
DB_HOST=host.docker.internal
```

E no `docker-compose.yml` o serviço api precisa de:
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### Solução PRD / Alternativa universal (network_mode: host)

Se o usuário MySQL **não** tem acesso `%`, ou em ambientes PRD onde a segurança é mais restrita, use `network_mode: "host"` para o container da API:

```yaml
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - ./api/.env
    network_mode: "host"   # API usa rede do host → MySQL vê 127.0.0.1

  frontend:
    build: .
    restart: unless-stopped
    ports:
      - "<PORTA_FRONTEND>:80"
    depends_on:
      - api
    extra_hosts:
      - "host.docker.internal:host-gateway"   # frontend resolve host.docker.internal
```

E no `api/.env`:
```env
DB_HOST=127.0.0.1        # não host.docker.internal
PORT=<PORTA_API_HOST>    # porta DIFERENTE da que o frontend usa no host
```

E no `nginx.conf` do frontend:
```nginx
location /api {
    proxy_pass http://host.docker.internal:<PORTA_API_HOST>;
    ...
}
```

> **Atenção:** Com `network_mode: "host"`, a API ocupa uma porta diretamente no host. Essa porta deve ser **diferente** da porta que o frontend usa (`<PORTA_FRONTEND>`).

---

## 7. Padrão de Ambientes: QAS e PRD

Cada projeto deve ter **dois ambientes separados** no mesmo servidor:

| Aspecto | QAS | PRD |
|---|---|---|
| Propósito | Testes e validação | Produção (usuários reais) |
| Usuário cPanel | `<projeto>qas` ou `qas<projeto>` | `sis<projeto>` ou `<projeto>prd` |
| Banco MySQL | `<cpanel_user>_qas` | `<cpanel_user>_prd` |
| Domínio | `qas.<dominio>.com.br` | `<dominio>.com.br` ou `sistema.<dominio>.com.br` |
| Docker project name | (padrão — nome do diretório) | `<projeto>-prd` (sempre especificar `--project-name`) |
| Branch git | `main` | `main` (mesmo branch — o .env distingue o ambiente) |

**Exemplo NexDojo:**

| | QAS | PRD |
|---|---|---|
| Usuário SSH | `qasnexdojo` | `sisnexdojo` |
| Diretório | `/home/qasnexdojo/nexdojo` | `/home/sisnexdojo/nexdojo` |
| Porta container | `3003` | `3005` |
| Porta API host | interna (sem expor) | `3007` (network_mode: host) |
| DB | `qasnexdojo_qas` | `sisnexdojo_prd` |
| Domínio | `qas.nexdojo.com.br` | `sistema.nexdojo.com.br` |
| Docker compose cmd | `docker compose up` | `docker compose --project-name nexdojo-prd up` |

---

## 8. Script de Deploy QAS — Template Completo

```python
import paramiko, sys, re

sys.stdout.reconfigure(encoding='utf-8')

# ── CONFIGURAR PARA O PROJETO ──────────────────────────────────
HOST = '162.240.167.149'
PORT_SSH = 22022
SSH_USER = '<usuario_qas>'          # ex: qasnexdojo
SSH_PASS = '@Tmd4738@'
PROJECT_DIR = '/home/<usuario_qas>/<projeto>'  # ex: /home/qasnexdojo/nexdojo
FRONTEND_URL = 'https://qas.<dominio>.com.br'
# ──────────────────────────────────────────────────────────────

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT_SSH, username=SSH_USER, password=SSH_PASS, timeout=30)

stdin, stdout, stderr = client.exec_command(
    f'cd {PROJECT_DIR} && '
    'git fetch origin && git reset --hard origin/main && '
    'sed -i "s/DB_HOST=.*/DB_HOST=host.docker.internal/" api/.env && '
    f'(grep -q "^FRONTEND_URL=" api/.env '
    f'&& sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL={FRONTEND_URL}|" api/.env '
    f'|| echo "FRONTEND_URL={FRONTEND_URL}" >> api/.env) && '
    'docker compose down && docker compose up -d --build 2>&1',
    timeout=300
)

output = stdout.read().decode('utf-8', errors='replace')
ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
clean = ansi_escape.sub('', output)

for line in clean.splitlines():
    line = line.strip()
    if line:
        print(line)

exit_code = stdout.channel.recv_exit_status()
client.close()
print(f'\nExit code: {exit_code}')
sys.exit(exit_code)
```

---

## 9. Script de Deploy PRD — Template Completo

O PRD usa `network_mode: "host"` para a API (MySQL via 127.0.0.1) e requer envio dos arquivos de configuração via SFTP após o `git reset --hard`.

```python
import paramiko, sys, re, io

sys.stdout.reconfigure(encoding='utf-8')

# ── CONFIGURAR PARA O PROJETO ──────────────────────────────────
HOST = '162.240.167.149'
PORT_SSH = 22022
SSH_USER = '<usuario_prd>'           # ex: sisnexdojo
SSH_PASS = '@Tmd4738@'
PROJECT_DIR = '/home/<usuario_prd>/<projeto>'
PUBLIC_HTML = f'/home/<usuario_prd>/public_html'
DOCKER_PROJECT = '<projeto>-prd'     # ex: nexdojo-prd
PORTA_FRONTEND = '<PORTA_FRONTEND>'  # ex: 3005
PORTA_API = '<PORTA_API>'            # ex: 3007 (diferente da frontend, network_mode host)
FRONTEND_URL = 'https://<dominio>.com.br'
DB_NAME = '<cpanel_user>_prd'
DB_USER = '<cpanel_user>_prd'
DB_PASS = '<senha_do_banco>'
# ──────────────────────────────────────────────────────────────

ansi = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

def run(client, cmd, timeout=300):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    for line in ansi.sub('', out + err).splitlines():
        if line.strip():
            print(f'  {line.strip()}')
    return code

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT_SSH, username=SSH_USER, password=SSH_PASS, timeout=30)

# 1. Pull do código
print('=== Git pull ===')
run(client, f'cd {PROJECT_DIR} && git fetch origin && git reset --hard origin/main', timeout=120)

# 2. api/.env PRD (via SFTP — sobrescreve o do git)
api_env = f"""PORT={PORTA_API}
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME={DB_NAME}
DB_USER={DB_USER}
DB_PASSWORD={DB_PASS}
JWT_SECRET=<jwt_secret_prd>
FRONTEND_URL={FRONTEND_URL}
"""
sftp = client.open_sftp()
sftp.putfo(io.BytesIO(api_env.encode('utf-8')), f'{PROJECT_DIR}/api/.env')

# 3. nginx.conf PRD (proxeia para host.docker.internal:<PORTA_API>)
nginx_conf = f"""server {{
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /api {{
        proxy_pass http://host.docker.internal:{PORTA_API};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    location /assets/ {{
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }}

    location / {{
        try_files $uri $uri/ /index.html;
    }}

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
}}
"""
sftp.putfo(io.BytesIO(nginx_conf.encode('utf-8')), f'{PROJECT_DIR}/nginx.conf')

# 4. docker-compose.yml PRD (api: network_mode host, frontend: extra_hosts)
docker_compose = f"""services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - ./api/.env
    network_mode: "host"

  frontend:
    build: .
    restart: unless-stopped
    ports:
      - "{PORTA_FRONTEND}:80"
    depends_on:
      - api
    extra_hosts:
      - "host.docker.internal:host-gateway"
"""
sftp.putfo(io.BytesIO(docker_compose.encode('utf-8')), f'{PROJECT_DIR}/docker-compose.yml')
sftp.close()
print('Arquivos de configuração PRD enviados via SFTP.')

# 5. Build e start
print('\n=== Docker build & up ===')
run(client,
    f'cd {PROJECT_DIR} && '
    f'docker compose --project-name {DOCKER_PROJECT} down && '
    f'docker compose --project-name {DOCKER_PROJECT} up -d --build 2>&1',
    timeout=600
)

# 6. Status
print('\n=== Status ===')
run(client, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

# 7. Logs API (confirmar conexão MySQL)
import time; time.sleep(5)
print('\n=== Logs API PRD ===')
run(client, f'docker logs {DOCKER_PROJECT}-api-1 --tail 10 2>&1')

client.close()
print('\nDeploy PRD concluído.')
```

---

## 10. Setup Inicial de um Novo Projeto

Checklist completo para colocar um novo projeto no ar do zero:

### 10.1 Preparar o servidor (fazer uma vez)

- [ ] Criar domínio/subdomínio no cPanel do usuário correto
- [ ] Instalar certificado SSL (Let's Encrypt) pelo cPanel
- [ ] Verificar porta disponível com `ss -tlnp` e escolher porta livre (≥ 3008)
- [ ] Criar banco de dados e usuário MySQL no cPanel
  - Para QAS: `<user>_qas` / `<user>_qas`
  - Para PRD: `<user>_prd` / `<user>_prd`
- [ ] **Se necessário conexão Docker→MySQL no QAS:** No cPanel → Remote MySQL, adicionar `%` como host permitido para o usuário QAS. (PRD usa network_mode: host, dispensa isso.)

### 10.2 Preparar o repositório

- [ ] Repositório criado no GitHub (`https://github.com/TiagoLDC/<projeto>`)
- [ ] `Dockerfile` e `api/Dockerfile` criados
- [ ] `docker-compose.yml` com porta QAS configurada
- [ ] `nginx.conf` com `proxy_pass http://api:<PORT_API>`
- [ ] `.dockerignore` criado
- [ ] `api/.env` **NÃO comitar no git** (adicionar ao `.gitignore`)

### 10.3 Primeiro deploy QAS

```python
# 1. SSH no servidor QAS
# 2. Clonar o repositório
git clone https://github.com/TiagoLDC/<projeto> /home/<usuario_qas>/<projeto>

# 3. Criar api/.env manualmente ou via SFTP
# 4. Configurar .htaccess
# 5. Subir docker
docker compose up -d --build
```

### 10.4 Primeiro deploy PRD

- [ ] Verificar nova porta disponível (diferente da QAS)
- [ ] Escolher porta para API (network_mode: host) — também diferente
- [ ] Executar script de deploy PRD (seção 9) que envia os 3 arquivos via SFTP
- [ ] Copiar banco QAS → PRD: `mysqldump -h 127.0.0.1 -u <user_qas> -p'<pass_qas>' <db_qas> | mysql -h 127.0.0.1 -u <user_prd> -p'<pass_prd>' <db_prd>`
- [ ] Verificar logs: `docker logs <container>-api-1 --tail 20`

---

## 11. Padrão de Commits

### Formato obrigatório

```
#<sequencial>-<YYYY-MM-DD> <HH:MM>-<descrição em português>
```

### Exemplos

```
#153-2026-06-26 15:30-deploy PRD configurado e no ar
#154-2026-06-27 09:00-correção de bug no formulário de login
```

### Regras

- O número sequencial segue o último commit do repositório
- Data e hora devem ser as reais no momento do commit
- Descrição em **português**, clara e objetiva
- Usar `git fetch + reset --hard` no servidor — nunca `git pull` (evita conflitos)

---

## 12. Variáveis de Ambiente — Diferenças QAS vs PRD

| Variável | QAS | PRD |
|---|---|---|
| `DB_HOST` | `host.docker.internal` | `127.0.0.1` |
| `DB_NAME` | `<user>_qas` | `<user>_prd` |
| `DB_USER` | `<user>_qas` | `<user>_prd` |
| `DB_PASSWORD` | senha QAS | senha PRD |
| `FRONTEND_URL` | `https://qas.<dominio>.com.br` | `https://<dominio>.com.br` |
| `PORT` (API) | `3005` (interno, não exposto) | `3007`+ (host, exposto) |
| `JWT_SECRET` | qualquer string segura | string diferente e segura |

---

## 13. Gotchas e Erros Comuns

| Sintoma | Causa | Solução |
|---|---|---|
| `Access denied for user '...'@'172.x.x.x'` | MySQL só aceita localhost | Usar `network_mode: "host"` na API + `DB_HOST=127.0.0.1` |
| Container sobe mas site não responde | `.htaccess` apontando para porta errada | Verificar porta no `.htaccess` vs porta exposta no docker |
| `docker compose up` conflita com containers existentes | Dois projetos com mesmo nome de rede | Usar `--project-name` diferente para cada ambiente |
| `py` não encontrado | Máquina sem `py` no PATH | Verificar instalação do Python — nesta máquina usar `py` (não `python`/`python3`) |
| Falha ao copiar banco via mysqldump (PROCESS privilege) | Aviso inofensivo do mysqldump | Exit code 0 = dados copiados; só tablespaces ignorados |
| Container API sobe mas não conecta no MySQL | `DB_HOST=host.docker.internal` sem acesso `%` | Trocar para `network_mode: "host"` + `DB_HOST=127.0.0.1` |

---

*Documento criado em 2026-06-26. Atualizar a tabela de portas reservadas sempre que um novo serviço for adicionado ao servidor.*
