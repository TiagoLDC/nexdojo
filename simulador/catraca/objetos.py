"""load/create/modify/destroy/create_or_modify_objects sobre o SQLite.

Nome de objeto e de campo nunca vão para o SQL sem antes passar pelo esquema; valores sempre vão
como parâmetro. Assim o "where" livre da API não abre injeção de SQL no simulador.
"""
import sqlite3
from contextlib import contextmanager

from .esquema import INT, OBJETOS


class ErroApi(Exception):
    def __init__(self, mensagem, status=400, code=1):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status = status
        self.code = code


@contextmanager
def transacao(conn):
    conn.execute('BEGIN')
    try:
        yield
    except sqlite3.Error as e:
        conn.execute('ROLLBACK')
        raise ErroApi(f'Failed: {e}')
    except BaseException:
        conn.execute('ROLLBACK')
        raise
    else:
        conn.execute('COMMIT')


def nome_json(valor):
    if valor is None:
        return 'null'
    if isinstance(valor, bool):
        return 'bool'
    if isinstance(valor, int):
        return 'int'
    if isinstance(valor, float):
        return 'double'
    if isinstance(valor, str):
        return 'string'
    if isinstance(valor, list):
        return 'array'
    return 'object'


def _esquema(objeto):
    if not isinstance(objeto, str) or objeto not in OBJETOS:
        raise ErroApi(f"Failed: Invalid object '{objeto}'")
    return OBJETOS[objeto]


def _campo(esq, objeto, campo):
    if not isinstance(campo, str) or campo not in esq['campos']:
        raise ErroApi(f"Failed: Invalid field '{campo}' for object '{objeto}'")
    return campo


def validar_valor(esq, campo, valor):
    tipo = esq['campos'][campo]
    if valor is None:
        if campo in esq['nulos']:
            return
        raise ErroApi(f"Failed: Invalid member '{campo}' ({tipo} expected, got null)")
    if tipo == INT:
        ok = isinstance(valor, int) and not isinstance(valor, bool)
    else:
        ok = isinstance(valor, str)
    if not ok:
        esperado = 'int' if tipo == INT else 'string'
        raise ErroApi(f"Failed: Invalid member '{campo}' ({esperado} expected, got {nome_json(valor)})")


def _validar_registro(esq, objeto, registro, exigir_obrigatorios):
    if not isinstance(registro, dict) or not registro:
        raise ErroApi("Failed: Invalid member 'values' (object expected)")
    for campo, valor in registro.items():
        _campo(esq, objeto, campo)
        validar_valor(esq, campo, valor)
    if exigir_obrigatorios:
        faltando = [c for c in esq['obrig'] if c not in registro]
        if faltando:
            raise ErroApi(f"Failed: Missing member '{faltando[0]}' for object '{objeto}'")


# ── where ─────────────────────────────────────────────────────────────────────────────────────

_OPS = {'=': '=', '==': '=', 'LIKE': 'LIKE', '!=': '!=', '<>': '!=', 'NOT LIKE': 'NOT LIKE',
        '>': '>', '<': '<', '>=': '>=', '<=': '<=', 'IN': 'IN', 'NOT IN': 'NOT IN'}

# Conectores do formato em lista. ") AND (" fecha o grupo anterior e abre outro, por isso a
# expressão inteira é embrulhada num par de parênteses — e só aceitamos conectores que mantêm
# os parênteses balanceados.
_CONECTORES = {') AND (', ') OR (', 'AND', 'OR'}


def _condicao(esq, objeto, campo, operador, valor, params):
    _campo(esq, objeto, campo)
    op = _OPS.get(str(operador).strip().upper())
    if op is None:
        raise ErroApi(f"Failed: Invalid operator '{operador}'")
    if op in ('IN', 'NOT IN'):
        if not isinstance(valor, list):
            raise ErroApi(f"Failed: operator '{op}' expects an array")
        if len(valor) > 999:
            # Limite documentado: mais de 999 elementos explícitos fazem a requisição falhar.
            raise ErroApi('Failed: too many SQL variables')
        if not valor:
            return '0' if op == 'IN' else '1'
        params.extend(valor)
        return f'"{campo}" {op} (' + ', '.join('?' * len(valor)) + ')'
    if isinstance(valor, (list, dict)):
        raise ErroApi(f"Failed: Invalid value for field '{campo}'")
    params.append(valor)
    return f'"{campo}" {op} ?'


def compilar_where(objeto, where):
    esq = _esquema(objeto)
    if not where:
        return '', []
    params = []
    if isinstance(where, dict):
        partes = []
        for obj, filtros in where.items():
            if obj != objeto:
                raise ErroApi(f"Failed: filtro por outro objeto ('{obj}') não é suportado pelo simulador")
            if not isinstance(filtros, dict):
                raise ErroApi("Failed: Invalid member 'where'")
            for campo, filtro in filtros.items():
                if isinstance(filtro, dict):
                    for op, valor in filtro.items():
                        partes.append(_condicao(esq, objeto, campo, op, valor, params))
                else:
                    partes.append(_condicao(esq, objeto, campo, '=', filtro, params))
        return (' WHERE ' + ' AND '.join(partes)) if partes else '', params
    if isinstance(where, list):
        expr = ''
        for i, item in enumerate(where):
            if not isinstance(item, dict):
                raise ErroApi("Failed: Invalid member 'where'")
            if item.get('object', objeto) != objeto:
                raise ErroApi(f"Failed: filtro por outro objeto ('{item.get('object')}') não é suportado pelo simulador")
            expr += _condicao(esq, objeto, item.get('field'), item.get('operator', '='), item.get('value'), params)
            if i < len(where) - 1:
                conector = ' '.join(str(item.get('connector', ') AND (')).split()).upper()
                if conector not in _CONECTORES:
                    raise ErroApi(f"Failed: Invalid connector '{item.get('connector')}'")
                expr += f' {conector} '
        return (f' WHERE ({expr})' if expr else ''), params
    raise ErroApi("Failed: Invalid member 'where'")


# ── operações ─────────────────────────────────────────────────────────────────────────────────

def carregar(conn, req):
    objeto = req.get('object')
    esq = _esquema(objeto)
    campos = req.get('fields') or list(esq['campos'])
    if not isinstance(campos, list):
        raise ErroApi("Failed: Invalid member 'fields' (array expected)")
    for c in campos:
        _campo(esq, objeto, c)
    sql = 'SELECT ' + ', '.join(f'"{c}"' for c in campos) + f' FROM "{objeto}"'
    where_sql, params = compilar_where(objeto, req.get('where'))
    sql += where_sql

    order = req.get('order') or []
    if not isinstance(order, list):
        raise ErroApi("Failed: Invalid member 'order' (array expected)")
    direcao, cols = 'ASC', []
    for o in order:
        if o == 'ascending':
            direcao = 'ASC'
        elif o == 'descending':
            direcao = 'DESC'
        elif isinstance(o, dict):
            if o.get('object', objeto) != objeto:
                raise ErroApi('Failed: ordenação por outro objeto não é suportada pelo simulador')
            cols.append(_campo(esq, objeto, o.get('field')))
        else:
            cols.append(_campo(esq, objeto, o))
    if cols:
        sql += ' ORDER BY ' + ', '.join(f'"{c}" {direcao}' for c in cols)

    limit, offset = req.get('limit'), req.get('offset')
    if limit is not None:
        if not isinstance(limit, int) or isinstance(limit, bool):
            raise ErroApi("Failed: Invalid member 'limit' (int expected)")
        sql += ' LIMIT ?'
        params.append(limit)
        # Como no equipamento: offset sem limit é ignorado.
        if offset is not None:
            if not isinstance(offset, int) or isinstance(offset, bool):
                raise ErroApi("Failed: Invalid member 'offset' (int expected)")
            sql += ' OFFSET ?'
            params.append(offset)
    try:
        linhas = conn.execute(sql, params).fetchall()
    except sqlite3.Error as e:
        raise ErroApi(f'Failed: {e}')
    return {objeto: [dict(l) for l in linhas]}


def _lista_values(req):
    values = req.get('values')
    if not isinstance(values, list) or not values:
        raise ErroApi("Failed: Invalid member 'values' (array expected)")
    return values


def criar(conn, req):
    objeto = req.get('object')
    esq = _esquema(objeto)
    values = _lista_values(req)
    chaves = set(values[0]) if isinstance(values[0], dict) else set()
    for v in values:
        _validar_registro(esq, objeto, v, exigir_obrigatorios=True)
        if set(v) != chaves:
            raise ErroApi('Failed: all elements of values must have the same fields')
    ids = []
    with transacao(conn):
        for v in values:
            cols = list(v)
            cur = conn.execute(
                f'INSERT INTO "{objeto}" (' + ', '.join(f'"{c}"' for c in cols) + ') VALUES ('
                + ', '.join('?' * len(cols)) + ')',
                [v[c] for c in cols],
            )
            ids.append(v.get('id', cur.lastrowid))
    return {'ids': ids}


def modificar(conn, req):
    objeto = req.get('object')
    esq = _esquema(objeto)
    values = req.get('values')
    # A descrição diz "array", mas o exemplo oficial manda um objeto só. Aceitamos os dois.
    if isinstance(values, list):
        if len(values) != 1:
            raise ErroApi("Failed: Invalid member 'values'")
        values = values[0]
    _validar_registro(esq, objeto, values, exigir_obrigatorios=False)
    where_sql, params = compilar_where(objeto, req.get('where'))
    cols = list(values)
    with transacao(conn):
        cur = conn.execute(
            f'UPDATE "{objeto}" SET ' + ', '.join(f'"{c}" = ?' for c in cols) + where_sql,
            [values[c] for c in cols] + params,
        )
    return {'changes': cur.rowcount}


def destruir(conn, req):
    objeto = req.get('object')
    _esquema(objeto)
    where_sql, params = compilar_where(objeto, req.get('where'))
    with transacao(conn):
        cur = conn.execute(f'DELETE FROM "{objeto}"' + where_sql, params)
    return {'changes': cur.rowcount}


def criar_ou_modificar(conn, req):
    objeto = req.get('object')
    esq = _esquema(objeto)
    values = _lista_values(req)
    for v in values:
        _validar_registro(esq, objeto, v, exigir_obrigatorios=False)
    mudancas = 0
    with transacao(conn):
        for v in values:
            cols = list(v)
            if esq['pk'] == ('id',) and 'id' in v and conn.execute(
                    f'SELECT 1 FROM "{objeto}" WHERE id = ?', (v['id'],)).fetchone():
                # UPDATE e não REPLACE: REPLACE apaga a linha antes e dispararia o CASCADE,
                # levando junto grupos, cartões e regras do usuário.
                outros = [c for c in cols if c != 'id']
                if outros:
                    conn.execute(f'UPDATE "{objeto}" SET ' + ', '.join(f'"{c}" = ?' for c in outros)
                                 + ' WHERE id = ?', [v[c] for c in outros] + [v['id']])
            else:
                faltando = [c for c in esq['obrig'] if c not in v]
                if faltando:
                    raise ErroApi(f"Failed: Missing member '{faltando[0]}' for object '{objeto}'")
                verbo = 'INSERT OR REPLACE' if esq['pk'] != ('id',) else 'INSERT'
                conn.execute(f'{verbo} INTO "{objeto}" (' + ', '.join(f'"{c}"' for c in cols) + ') VALUES ('
                             + ', '.join('?' * len(cols)) + ')', [v[c] for c in cols])
            mudancas += 1
    return {'changes': mudancas}
