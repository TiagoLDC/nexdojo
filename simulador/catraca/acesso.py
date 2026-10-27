"""Decisão de acesso em modo standalone: identificação e autorização acontecem no equipamento.

O que é avaliado, nesta ordem:
  1. o rosto precisa estar cadastrado (usuário existe E tem foto) — senão "Não identificado" (3);
  2. begin_time / end_time do usuário, quando diferentes de 0;
  3. regras ligadas ao usuário direto (user_access_rules) ou via grupo (group_access_rules),
     filtradas pelo portal (portal_access_rules) e pelos horários (access_rule_time_zones);
  4. qualquer regra de bloqueio (type 0) vigente nega; senão, uma de permissão (type 1) libera.

Pontos que a documentação não fecha e que aqui foram decididos assim (ver README):
  - regra sem horário vinculado vale o tempo todo;
  - regra sem portal vinculado não libera nada;
  - feriados (hol1..hol3) não são considerados.
"""
import random
import time
from datetime import datetime

EVENTOS = {
    1: 'Equipamento inválido', 2: 'Parâmetros de identificação inválidos', 3: 'Não identificado',
    4: 'Identificação pendente', 5: 'Tempo de identificação esgotado', 6: 'Acesso negado',
    7: 'Acesso concedido', 8: 'Acesso pendente', 9: 'Usuário não é administrador',
    10: 'Acesso não identificado', 11: 'Acesso por botoeira', 12: 'Acesso pela interface web',
    13: 'Desistência de entrada', 14: 'Sem resposta', 15: 'Acesso pela interfonia',
}

_DIAS = ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')  # datetime.weekday(): segunda = 0


def _regra_no_horario(conn, regra_id, agora):
    spans = conn.execute(
        'SELECT ts.* FROM time_spans ts JOIN access_rule_time_zones artz ON artz.time_zone_id = ts.time_zone_id'
        ' WHERE artz.access_rule_id = ?', (regra_id,)).fetchall()
    tem_horario = conn.execute('SELECT 1 FROM access_rule_time_zones WHERE access_rule_id = ?',
                               (regra_id,)).fetchone()
    if not tem_horario:
        return True
    dia = _DIAS[agora.weekday()]
    segundos = agora.hour * 3600 + agora.minute * 60 + agora.second
    return any(s[dia] and s['start'] <= segundos <= s['end'] for s in spans)


def avaliar(conn, user_id, portal_id=1, agora_ts=None):
    """Decide sem gravar nada. Devolve dict com event, evento, motivo, user_id, regra_id."""
    agora_ts = int(agora_ts if agora_ts is not None else time.time())

    def r(event, motivo, uid=0, regra=0):
        return {'event': event, 'evento': EVENTOS[event], 'motivo': motivo, 'user_id': uid, 'regra_id': regra}

    if user_id is None:
        return r(3, 'Rosto não cadastrado no equipamento')
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    if user is None:
        return r(3, 'Rosto não cadastrado no equipamento')
    if not conn.execute('SELECT 1 FROM _user_images WHERE user_id = ?', (user_id,)).fetchone():
        return r(3, 'Usuário sem foto: o rosto não tem como ser reconhecido')

    if user['begin_time'] and agora_ts < user['begin_time']:
        return r(6, 'Antes do início da validade (begin_time)', user_id)
    if user['end_time'] and agora_ts > user['end_time']:
        return r(6, 'Validade expirada (end_time)', user_id)

    regras = conn.execute(
        'SELECT ar.id, ar.name, ar.type FROM access_rules ar'
        ' WHERE ar.id IN (SELECT access_rule_id FROM user_access_rules WHERE user_id = ?'
        '                 UNION SELECT gar.access_rule_id FROM group_access_rules gar'
        '                       JOIN user_groups ug ON ug.group_id = gar.group_id WHERE ug.user_id = ?)'
        '   AND ar.id IN (SELECT access_rule_id FROM portal_access_rules WHERE portal_id = ?)'
        ' ORDER BY ar.id', (user_id, user_id, portal_id)).fetchall()
    agora = datetime.fromtimestamp(agora_ts)
    vigentes = [g for g in regras if _regra_no_horario(conn, g['id'], agora)]

    bloqueio = next((g for g in vigentes if g['type'] == 0), None)
    if bloqueio:
        return r(6, f'Regra de bloqueio "{bloqueio["name"]}"', user_id, bloqueio['id'])
    permissao = next((g for g in vigentes if g['type'] == 1), None)
    if permissao:
        return r(7, f'Regra "{permissao["name"]}"', user_id, permissao['id'])
    if regras:
        return r(6, 'Fora do horário das regras de acesso', user_id)
    return r(6, 'Nenhuma regra de acesso para este usuário nesta porta', user_id)


def registrar(conn, device_id, resultado, portal_id=1, agora=None):
    """Grava o access_log da decisão (e o motivo, só para o painel). Devolve o log como dict."""
    agora = int(agora if agora is not None else time.time())
    identificado = resultado['user_id'] != 0
    valores = {
        'time': agora, 'event': resultado['event'], 'device_id': device_id, 'identifier_id': 0,
        'user_id': resultado['user_id'], 'portal_id': portal_id,
        'identification_rule_id': 0, 'qrcode_value': '', 'uhf_tag': '', 'pin_value': '',
        'card_value': 0, 'confidence': random.randint(1300, 1800) if identificado else 0, 'mask': 0,
        'log_type_id': -1,
    }
    conn.execute('BEGIN')
    try:
        cols = list(valores)
        cur = conn.execute('INSERT INTO access_logs (' + ', '.join(f'"{c}"' for c in cols) + ') VALUES ('
                           + ', '.join('?' * len(cols)) + ')', [valores[c] for c in cols])
        log_id = cur.lastrowid
        conn.execute('INSERT INTO _log_motivos (log_id, motivo) VALUES (?, ?)', (log_id, resultado['motivo']))
        if resultado['event'] == 7:
            conn.execute('UPDATE users SET last_access = ? WHERE id = ?', (agora, resultado['user_id']))
        conn.execute('COMMIT')
    except BaseException:
        conn.execute('ROLLBACK')
        raise
    return {'id': log_id, **valores}
