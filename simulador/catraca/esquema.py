"""Esquema dos objetos da API Control iD, conforme a página "Lista de Objetos" da documentação.

Cada objeto vira uma tabela SQLite com o mesmo nome. Os tipos declarados aqui também validam o
payload, porque o equipamento real é estrito: recusa string onde espera int, com a mensagem
"Failed: Invalid member 'timestamp' (int expected, got string)". Um simulador tolerante deixaria
passar bug do middleware que só apareceria na catraca de verdade.

Tabelas internas do simulador começam com "_" e não são alcançáveis por load_objects.
"""
import sqlite3

INT, STR = 'int', 'str'


def _obj(campos, pk=('id',), obrig=(), fks=(), unicos=(), nulos=()):
    return {'campos': campos, 'pk': pk, 'obrig': obrig, 'fks': fks, 'unicos': unicos, 'nulos': nulos}


_DIAS = {d: INT for d in ('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'hol1', 'hol2', 'hol3')}

OBJETOS = {
    'users': _obj(
        {'id': INT, 'registration': STR, 'name': STR, 'password': STR, 'salt': STR, 'expires': INT,
         'user_type_id': INT, 'begin_time': INT, 'end_time': INT, 'image_timestamp': INT, 'last_access': INT},
        obrig=('registration', 'name'),
        nulos=('user_type_id',),  # nulo = usuário comum; 1 = visitante
    ),
    'groups': _obj({'id': INT, 'name': STR}, obrig=('name',)),
    'user_groups': _obj(
        {'user_id': INT, 'group_id': INT}, pk=('user_id', 'group_id'), obrig=('user_id', 'group_id'),
        fks=(('user_id', 'users'), ('group_id', 'groups')),
    ),
    'access_rules': _obj({'id': INT, 'name': STR, 'type': INT, 'priority': INT}, obrig=('name', 'type')),
    'user_access_rules': _obj(
        {'user_id': INT, 'access_rule_id': INT}, pk=('user_id', 'access_rule_id'),
        obrig=('user_id', 'access_rule_id'), fks=(('user_id', 'users'), ('access_rule_id', 'access_rules')),
    ),
    'group_access_rules': _obj(
        {'group_id': INT, 'access_rule_id': INT}, pk=('group_id', 'access_rule_id'),
        obrig=('group_id', 'access_rule_id'), fks=(('group_id', 'groups'), ('access_rule_id', 'access_rules')),
    ),
    'areas': _obj({'id': INT, 'name': STR}, obrig=('name',)),
    'portals': _obj({'id': INT, 'name': STR, 'area_from_id': INT, 'area_to_id': INT}, obrig=('name',)),
    'portal_access_rules': _obj(
        {'portal_id': INT, 'access_rule_id': INT}, pk=('portal_id', 'access_rule_id'),
        obrig=('portal_id', 'access_rule_id'), fks=(('portal_id', 'portals'), ('access_rule_id', 'access_rules')),
    ),
    'time_zones': _obj({'id': INT, 'name': STR}, obrig=('name',)),
    'time_spans': _obj(
        {'id': INT, 'time_zone_id': INT, 'start': INT, 'end': INT, **_DIAS},
        obrig=('time_zone_id', 'start', 'end'), fks=(('time_zone_id', 'time_zones'),),
    ),
    'access_rule_time_zones': _obj(
        {'access_rule_id': INT, 'time_zone_id': INT}, pk=('access_rule_id', 'time_zone_id'),
        obrig=('access_rule_id', 'time_zone_id'),
        fks=(('access_rule_id', 'access_rules'), ('time_zone_id', 'time_zones')),
    ),
    'cards': _obj(
        {'id': INT, 'value': INT, 'user_id': INT}, obrig=('value', 'user_id'),
        fks=(('user_id', 'users'),), unicos=('value',),
    ),
    'templates': _obj(
        {'id': INT, 'finger_position': INT, 'finger_type': INT, 'template': STR, 'user_id': INT},
        obrig=('user_id',), fks=(('user_id', 'users'),),
    ),
    'devices': _obj({'id': INT, 'name': STR, 'ip': STR}, obrig=('name', 'ip')),
    'access_logs': _obj(
        {'id': INT, 'time': INT, 'event': INT, 'device_id': INT, 'identifier_id': INT, 'user_id': INT,
         'portal_id': INT, 'identification_rule_id': INT, 'qrcode_value': STR, 'uhf_tag': STR, 'pin_value': STR,
         'card_value': INT, 'confidence': INT, 'mask': INT, 'log_type_id': INT},
    ),
}


def _ddl(nome, d):
    cols = []
    for campo, tipo in d['campos'].items():
        if d['pk'] == ('id',) and campo == 'id':
            cols.append('"id" INTEGER PRIMARY KEY')
            continue
        sql_tipo = 'INTEGER' if tipo == INT else 'TEXT'
        if campo in d['nulos']:
            cols.append(f'"{campo}" {sql_tipo} DEFAULT NULL')
        else:
            cols.append(f'"{campo}" {sql_tipo} NOT NULL DEFAULT ' + ('0' if tipo == INT else "''"))
    if d['pk'] != ('id',):
        cols.append('PRIMARY KEY (' + ', '.join(f'"{c}"' for c in d['pk']) + ')')
    for campo in d['unicos']:
        cols.append(f'UNIQUE ("{campo}")')
    for campo, ref in d['fks']:
        cols.append(f'FOREIGN KEY ("{campo}") REFERENCES "{ref}" ("id") ON DELETE CASCADE')
    return f'CREATE TABLE IF NOT EXISTS "{nome}" (\n  ' + ',\n  '.join(cols) + '\n)'


_INTERNAS = [
    # Foto fica fora de users de propósito: no equipamento ela pode sobreviver ao usuário
    # (user_destroy_image tem a flag "dangling" justamente para limpar essas sobras).
    'CREATE TABLE IF NOT EXISTS "_user_images" (user_id INTEGER PRIMARY KEY, timestamp INTEGER NOT NULL,'
    ' sha256 TEXT NOT NULL, image BLOB NOT NULL)',
    'CREATE TABLE IF NOT EXISTS "_config" (secao TEXT NOT NULL, chave TEXT NOT NULL, valor TEXT NOT NULL,'
    ' PRIMARY KEY (secao, chave))',
    # Motivo legível da decisão de acesso, só para o painel. Não existe no equipamento.
    'CREATE TABLE IF NOT EXISTS "_log_motivos" (log_id INTEGER PRIMARY KEY, motivo TEXT NOT NULL)',
]

CONFIG_PADRAO = {
    'login': {'login': 'admin', 'password': 'admin'},
    'general': {'beep_enabled': '1', 'relay1_timeout': '3000', 'keep_user_image': '1', 'language': 'pt_BR'},
    'monitor': {'request_timeout': '5000', 'hostname': '', 'port': '', 'path': 'api/notifications',
                'alive_interval': '30000', 'inform_access_event_id': '0', 'enable_photo_upload': '0'},
    'face_id': {'mask_detection_enabled': '0', 'vehicle_mode': '0'},
}


def _semear(conn):
    """Estado de fábrica aproximado: um grupo padrão com uma regra "Sempre liberado" ligada à porta 1.

    É o que permite cadastrar alguém pela tela do equipamento e já passar. Quem cria usuário pela API
    precisa vinculá-lo a um grupo (user_groups) ou regra, senão o acesso é negado por falta de regra.
    """
    conn.executemany('INSERT INTO "areas" (id, name) VALUES (?, ?)', [(1, 'Externo'), (2, 'Interno')])
    conn.execute('INSERT INTO "portals" (id, name, area_from_id, area_to_id) VALUES (1, \'Porta 1\', 1, 2)')
    conn.execute('INSERT INTO "groups" (id, name) VALUES (1, \'Padrão\')')
    conn.execute('INSERT INTO "access_rules" (id, name, type, priority) VALUES (1, \'Sempre liberado\', 1, 0)')
    conn.execute('INSERT INTO "group_access_rules" (group_id, access_rule_id) VALUES (1, 1)')
    conn.execute('INSERT INTO "portal_access_rules" (portal_id, access_rule_id) VALUES (1, 1)')
    for secao, valores in CONFIG_PADRAO.items():
        conn.executemany('INSERT INTO "_config" (secao, chave, valor) VALUES (?, ?, ?)',
                         [(secao, k, v) for k, v in valores.items()])


def abrir_banco(caminho):
    conn = sqlite3.connect(caminho, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    conn.execute('PRAGMA journal_mode = WAL')
    novo = conn.execute("SELECT 1 FROM sqlite_master WHERE name = 'users'").fetchone() is None
    conn.execute('BEGIN')
    for nome, d in OBJETOS.items():
        conn.execute(_ddl(nome, d))
    for sql in _INTERNAS:
        conn.execute(sql)
    if novo:
        _semear(conn)
    conn.execute('COMMIT')
    return conn


def zerar_banco(conn):
    """Equivalente ao reset de fábrica: apaga tudo e volta ao estado semeado."""
    conn.execute('PRAGMA foreign_keys = OFF')
    conn.execute('BEGIN')
    for nome in list(OBJETOS) + ['_user_images', '_config', '_log_motivos']:
        conn.execute(f'DELETE FROM "{nome}"')
    _semear(conn)
    conn.execute('COMMIT')
    conn.execute('PRAGMA foreign_keys = ON')
