# Simulador de catraca Control iD (iDFace)

Imita a API HTTP "Linha de Acesso" de uma **iDFace** (firmware 6.23.0), para desenvolver e testar o
middleware da catraca sem depender do equipamento físico.

Referência: <https://www.controlid.com.br/docs/access-api-pt/>

Usa só a biblioteca padrão do Python (3.9+). Não há `pip install`.

## Como rodar

```powershell
cd D:\DEV_WEB\nexdojo\simulador
py simulador.py
```

Ou dê dois cliques em `iniciar.bat`.

- **API da catraca:** `http://localhost:8090/<comando>.fcgi`
- **Painel do simulador:** `http://localhost:8090/`
- **Login padrão:** `admin` / `admin` (o mesmo padrão de fábrica do equipamento)

### Opções

| Opção | Padrão | Para quê |
|---|---|---|
| `--porta` | `8090` | Porta HTTP. A catraca real usa a 80. |
| `--host` | `127.0.0.1` | Use `0.0.0.0` para o middleware acessar de outra máquina da rede. |
| `--nome` | `Catraca 1` | Nome exibido no painel. Também define a pasta de dados. |
| `--dados` | `dados/<nome>/` | Pasta com o banco SQLite e os logs. |
| `--device-id`, `--serial`, `--mac`, `--firmware`, `--secbox-firmware` | os da iDFace real | Identificação retornada por `system_information.fcgi`. |

### Mais de uma catraca

Cada catraca é um processo, com porta e pasta de dados próprias:

```powershell
py simulador.py --porta 8090 --nome "Catraca 1"
py simulador.py --porta 8091 --nome "Catraca 2" --device-id 4408801109306066
```

## O que o painel faz

- **Apresentar rosto:** simula o reconhecimento facial de um usuário. O simulador decide como o
  equipamento decidiria, grava o `access_logs` e, se o monitor estiver configurado, notifica o
  servidor.
- **Rosto desconhecido:** gera um evento "Não identificado".
- **Ajustes de teste**, para exercitar o tratamento de erro do middleware:
  - *Equipamento fora do ar:* a API fecha a conexão sem responder.
  - *Recusar fotos:* todo cadastro de foto volta com `Face not detected`.
  - *Latência:* atraso antes de cada resposta.
  - *Invalidar sessões:* força o middleware a refazer o login, como depois de um reinício do
    equipamento.
  - *Reset de fábrica:* apaga tudo.
- **Logs:** últimos acessos, requisições recebidas e notificações enviadas pelo monitor.

Os ajustes de teste valem até o simulador ser reiniciado. Os dados (usuários, fotos, regras,
logs) ficam no SQLite e sobrevivem ao reinício. As sessões não sobrevivem, assim como no
equipamento.

Log em arquivo: `dados/<nome>/logs/simulador.log`, rotacionado a cada 2 MB, com 5 arquivos.

## Endpoints implementados

| Grupo | Comandos |
|---|---|
| Sessão | `login`, `logout`, `session_is_valid`, `change_login` |
| Objetos | `load_objects`, `create_objects`, `modify_objects`, `destroy_objects`, `create_or_modify_objects` |
| Fotos | `user_set_image`, `user_set_image_list`, `user_get_image`, `user_get_image_list`, `user_list_images`, `user_destroy_image`, `user_test_image` |
| Sistema | `system_information`, `get_configuration`, `set_configuration`, `set_system_time`, `user_hash_password`, `reboot`, `template_sync_init`, `template_sync_end` |
| Ações | `execute_actions` (`door`, `sec_box`, `catra`, `open_collector`), `doors_state` / `door_state` |
| Monitor (enviado pela catraca) | `dao` (novo `access_logs`), `device_is_alive`, `secbox` |

Objetos suportados: `users`, `groups`, `user_groups`, `access_rules`, `user_access_rules`,
`group_access_rules`, `areas`, `portals`, `portal_access_rules`, `time_zones`, `time_spans`,
`access_rule_time_zones`, `cards`, `templates`, `devices`, `access_logs`.

## Comportamentos que o middleware precisa respeitar

Estes pontos estão na documentação, e o simulador os cobra:

- **Sessão na query string:** `?session=...` em todo comando, exceto `login` e `session_is_valid`.
- **Tipos estritos:** string onde se espera int é recusada com
  `Failed: Invalid member 'x' (int expected, got string)`.
- **`registration` e `name` são obrigatórios** em `users`.
- **"Sem retorno" significa corpo vazio.** `logout`, `set_configuration`, `execute_actions` e
  `user_destroy_image` respondem 200 sem corpo, então não se pode fazer `JSON.parse` cego.
- **Foto:** `user_set_image` recebe os bytes crus (`application/octet-stream`), com `user_id` e
  `timestamp` na query, e o arquivo precisa ser menor que 2 MB. Em `user_set_image_list`, o
  **request inteiro** precisa ter menos de 2 MB, então o envio em massa tem de ser feito em lotes.
- **Erro de foto vem com HTTP 200**, em `success: false` e `errors[]`. Não basta checar o status.
- **`user_get_image_list`** aceita no máximo 100 ids por chamada.
- **`where` com `IN`** aceita no máximo 999 elementos.
- **Apagar um usuário** remove em cascata grupos, regras, cartões e templates dele. A foto fica
  órfã até um `user_destroy_image` com `dangling: true`.

## Decisões onde a documentação é omissa

Quando a catraca real estiver disponível, conferir cada item e ajustar o simulador se divergir.

| Ponto | O que o simulador faz |
|---|---|
| Formato de erro | HTTP 400 com `{"error": "...", "code": 1}`, o formato que a doc mostra em `doors_state` |
| Sessão inválida | HTTP 401 com `{"error": "Session is not valid", "code": 1}` |
| Login errado | HTTP 401 |
| Comando inexistente | HTTP 404 |
| Estado de fábrica | Grupo 1 "Padrão" e regra 1 "Sempre liberado" (permissão), ligados à porta 1 |
| Regra sem horário (`access_rule_time_zones`) | Vale o tempo todo |
| Regra sem portal (`portal_access_rules`) | Não libera nada |
| Feriados (`hol1..hol3`) | Ignorados |
| Detecção de rosto | Aceita qualquer JPG ou PNG. "Mesmo rosto" (`match=1`) significa o mesmo arquivo. |
| `user_hash_password` | `sha256(senha + salt)`. O algoritmo real não está documentado. |
| Abertura remota | Não grava `access_logs`. Só muda o estado da SecBox e notifica `secbox`. |

## Como a decisão de acesso é tomada

1. O rosto precisa estar cadastrado: o usuário existe **e** tem foto. Senão, o evento é
   "Não identificado" (3).
2. `begin_time` e `end_time` do usuário, quando diferentes de 0.
3. Regras do usuário, diretas (`user_access_rules`) ou via grupo (`group_access_rules`), filtradas
   pela porta (`portal_access_rules`) e pelo horário.
4. Qualquer regra de **bloqueio** (`type 0`) vigente nega o acesso (6). Senão, uma de
   **permissão** (`type 1`) libera (7).

O painel mostra, para cada usuário, o que aconteceria se ele aparecesse agora e o motivo.

## Testes

```powershell
cd D:\DEV_WEB\nexdojo\simulador
py -m unittest discover -s testes -v
```
