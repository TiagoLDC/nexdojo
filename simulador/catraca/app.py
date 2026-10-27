"""Estado de uma catraca simulada e a implementação dos endpoints .fcgi da API Control iD.

Toda resposta é uma tupla (status, content_type, corpo_em_bytes). O servidor HTTP (servidor.py)
só faz o transporte; nada de regra de negócio mora lá.

Onde a documentação não diz o formato de um erro, o simulador responde
{"error": "<mensagem>", "code": 1}, o mesmo formato que a própria documentação mostra em
doors_state. Sessão inválida responde 401. O middleware deve tratar QUALQUER status diferente
de 200 como falha e refazer o login quando receber 401.
"""
import base64
import hashlib
import json
import logging
import os
import secrets
import socket
import string
import threading
import time
from collections import deque
from datetime import datetime
from logging.handlers import RotatingFileHandler
from urllib.parse import parse_qs

from . import acesso, objetos
from .esquema import abrir_banco, zerar_banco
from .monitor import Monitor
from .objetos import ErroApi, nome_json

LIMITE_FOTO = 2 * 1024 * 1024         # user_set_image: "arquivo menor que 2MB"
LIMITE_LISTA_FOTOS = 2 * 1024 * 1024  # user_set_image_list: "limite de tamanho de requisição de 2MB"
LIMITE_GET_IMAGE_LIST = 100           # user_get_image_list: "no máximo 100 fotos por requisição"
SECBOX_ID = 65793                     # id da SecBox usado no exemplo oficial de execute_actions

# Notas de qualidade de uma foto "boa", dentro dos limites que a documentação dá para cada erro.
SCORES_OK = {'bounds_width': 320, 'horizontal_center_offset': 12, 'vertical_center_offset': -30,
             'center_pose_quality': 180, 'sharpness_quality': 900}

SEM_SESSAO = {'login.fcgi', 'session_is_valid.fcgi'}
# Comandos que ficam esperando alguém agir no equipamento: rodam FORA da trava global, senão o
# resto da API (e o painel, que é quem "responde" pela câmera) ficaria parado junto.
SEM_TRAVA = {'remote_enroll.fcgi', 'cancel_remote_enroll.fcgi'}
ESPERA_CADASTRO_REMOTO_S = 60


def _json(status, obj):
    return status, 'application/json', json.dumps(obj, ensure_ascii=False).encode('utf-8')


def ok(obj):
    return _json(200, obj)


# "Esta chamada não possui retorno": 200 com corpo vazio. O middleware não pode assumir JSON.
VAZIO = (200, 'text/plain', b'')


def _corpo_json(corpo):
    if not corpo:
        return {}
    try:
        dados = json.loads(corpo.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ErroApi('Failed: Invalid JSON')
    if not isinstance(dados, dict):
        raise ErroApi('Failed: Invalid JSON (object expected)')
    return dados


def _tipo_imagem(img):
    if img[:3] == b'\xff\xd8\xff':
        return 'image/jpeg'
    if img[:8] == b'\x89PNG\r\n\x1a\n':
        return 'image/png'
    return None


# "Recomendações - fotos e instalação": mínimo de 160x160 e no máximo 1920 x 1080 = 2.073.600 pixels.
LADO_MINIMO = 160
PIXELS_MAXIMOS = 1920 * 1080
_SOF = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}


def dimensoes_imagem(img):
    """(largura, altura) lidas do cabeçalho do PNG ou do JPEG, sem decodificar a imagem."""
    if img[:8] == b'\x89PNG\r\n\x1a\n' and img[12:16] == b'IHDR':
        return int.from_bytes(img[16:20], 'big'), int.from_bytes(img[20:24], 'big')
    if img[:2] != b'\xff\xd8':
        return None
    i = 2
    while i + 4 <= len(img):
        if img[i] != 0xFF:
            return None
        marcador = img[i + 1]
        if marcador == 0xFF:  # preenchimento
            i += 1
            continue
        if marcador in (0xD8, 0x01) or 0xD0 <= marcador <= 0xD7:
            i += 2
            continue
        tamanho = int.from_bytes(img[i + 2:i + 4], 'big')
        if marcador in _SOF and i + 9 <= len(img):
            altura = int.from_bytes(img[i + 5:i + 7], 'big')
            largura = int.from_bytes(img[i + 7:i + 9], 'big')
            return largura, altura
        if marcador == 0xD9 or tamanho < 2:
            return None
        i += 2 + tamanho
    return None


def erro_dimensoes(img):
    """Mensagem de erro (code 1) quando a imagem não serve para cadastro facial, ou None."""
    if not _tipo_imagem(img):
        return 'Image file not recognized. Image should be either JPG or PNG.'
    dim = dimensoes_imagem(img)
    if not dim:
        return 'Image file not recognized. Image should be either JPG or PNG.'
    largura, altura = dim
    if largura < LADO_MINIMO or altura < LADO_MINIMO:
        return f'Image too small ({largura}x{altura}): minimum is {LADO_MINIMO}x{LADO_MINIMO}'
    if largura * altura > PIXELS_MAXIMOS:
        return f'Image too large ({largura}x{altura}): maximum is {PIXELS_MAXIMOS} pixels'
    return None


def png_rosto_simulado(nome, lado=320):
    """PNG de verdade (biblioteca padrão), usado como "foto da câmera" no cadastro remoto simulado."""
    import zlib
    semente = int(hashlib.sha256(nome.encode('utf-8')).hexdigest()[:6], 16)
    cor = bytes(((semente >> 16) & 0xFF, (semente >> 8) & 0xFF, semente & 0xFF))
    claro = bytes(min(255, c + 90) for c in cor)
    linhas = bytearray()
    centro, raio2 = lado // 2, (lado // 3) ** 2
    for y in range(lado):
        linhas.append(0)
        for x in range(lado):
            linhas += claro if (x - centro) ** 2 + (y - centro) ** 2 <= raio2 else cor

    def bloco(tipo, dados):
        return (len(dados).to_bytes(4, 'big') + tipo + dados
                + (zlib.crc32(tipo + dados) & 0xFFFFFFFF).to_bytes(4, 'big'))

    ihdr = lado.to_bytes(4, 'big') * 2 + bytes((8, 2, 0, 0, 0))
    return (b'\x89PNG\r\n\x1a\n' + bloco(b'IHDR', ihdr) + bloco(b'IDAT', zlib.compress(bytes(linhas), 6))
            + bloco(b'IEND', b''))


def _ip_local():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(('10.255.255.255', 1))
            return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'


class Catraca:
    def __init__(self, pasta_dados, nome, device_id, serial, mac, firmware, secbox_firmware, porta):
        os.makedirs(os.path.join(pasta_dados, 'logs'), exist_ok=True)
        self.nome = nome
        self.device_id = device_id
        self.serial = serial
        self.mac = mac
        self.firmware = firmware
        self.secbox_firmware = secbox_firmware
        self.porta = porta
        self.conn = abrir_banco(os.path.join(pasta_dados, 'catraca.db'))
        self.trava = threading.RLock()
        self.sessoes = {}
        self.ajustes = {'offline': False, 'latencia_ms': 0, 'rejeitar_fotos': False}
        self.requisicoes = deque(maxlen=300)
        self.inicio = time.time()
        self.secbox_aberta = False
        self._timer_secbox = None
        self.desvio_relogio = 0
        self.cadastro_remoto = None  # cadastro de rosto pela câmera esperando ação no painel  # segundos entre o relógio "da catraca" e o do PC (set_system_time)

        self.log = logging.getLogger(f'catraca.{nome}.{porta}')
        self.log.setLevel(logging.INFO)
        self.log.propagate = False
        if not self.log.handlers:
            fmt = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
            arq = RotatingFileHandler(os.path.join(pasta_dados, 'logs', 'simulador.log'),
                                      maxBytes=2 * 1024 * 1024, backupCount=5, encoding='utf-8')
            arq.setFormatter(fmt)
            tela = logging.StreamHandler()
            tela.setFormatter(fmt)
            self.log.addHandler(arq)
            self.log.addHandler(tela)

        self.monitor = Monitor(self)
        self._rotas = {
            'login.fcgi': self._login,
            'logout.fcgi': self._logout,
            'session_is_valid.fcgi': self._session_is_valid,
            'change_login.fcgi': self._change_login,
            'load_objects.fcgi': lambda q, c: ok(objetos.carregar(self.conn, _corpo_json(c))),
            'create_objects.fcgi': lambda q, c: ok(objetos.criar(self.conn, _corpo_json(c))),
            'modify_objects.fcgi': lambda q, c: ok(objetos.modificar(self.conn, _corpo_json(c))),
            'destroy_objects.fcgi': lambda q, c: ok(objetos.destruir(self.conn, _corpo_json(c))),
            'create_or_modify_objects.fcgi': lambda q, c: ok(objetos.criar_ou_modificar(self.conn, _corpo_json(c))),
            'user_set_image.fcgi': self._user_set_image,
            'user_set_image_list.fcgi': self._user_set_image_list,
            'user_get_image.fcgi': self._user_get_image,
            'user_get_image_list.fcgi': self._user_get_image_list,
            'user_list_images.fcgi': self._user_list_images,
            'user_destroy_image.fcgi': self._user_destroy_image,
            'user_test_image.fcgi': self._user_test_image,
            'user_hash_password.fcgi': self._user_hash_password,
            'system_information.fcgi': self._system_information,
            'get_configuration.fcgi': self._get_configuration,
            'set_configuration.fcgi': self._set_configuration,
            'execute_actions.fcgi': self._execute_actions,
            'doors_state.fcgi': self._doors_state,
            'door_state.fcgi': self._doors_state,  # a documentação usa os dois nomes
            'set_system_time.fcgi': self._set_system_time,
            'remote_enroll.fcgi': self._remote_enroll,
            'cancel_remote_enroll.fcgi': self._cancel_remote_enroll,
            'template_sync_init.fcgi': lambda q, c: VAZIO,
            'template_sync_end.fcgi': lambda q, c: VAZIO,
            'reboot.fcgi': self._reboot,
        }
        self.log.info('Catraca "%s" pronta | device_id=%s | dados em %s', nome, device_id, pasta_dados)

    # ── utilidades ───────────────────────────────────────────────────────────────────────────

    def config_secao(self, secao):
        with self.trava:
            return {r['chave']: r['valor'] for r in
                    self.conn.execute('SELECT chave, valor FROM _config WHERE secao = ?', (secao,))}

    def agora(self):
        return int(time.time()) + self.desvio_relogio

    def contar(self, tabela):
        with self.trava:
            return self.conn.execute(f'SELECT COUNT(*) FROM "{tabela}"').fetchone()[0]

    def registrar_requisicao(self, metodo, rota, status, ms, resumo):
        item = {'quando': time.time(), 'direcao': 'entrada', 'metodo': metodo, 'rota': rota,
                'status': status, 'ms': ms, 'resumo': resumo}
        self.requisicoes.append(item)
        self.log.info('API %s /%s -> %s (%dms) %s', metodo, rota, status, ms, resumo)

    def registrar_saida(self, url, status, ms, erro):
        self.requisicoes.append({'quando': time.time(), 'direcao': 'saida', 'metodo': 'POST', 'rota': url,
                                 'status': status, 'ms': ms, 'resumo': erro or ''})
        if erro:
            self.log.warning('MONITOR POST %s falhou (%dms): %s', url, ms, erro)
        else:
            self.log.info('MONITOR POST %s -> %s (%dms)', url, status, ms)

    # ── entrada da API ───────────────────────────────────────────────────────────────────────

    def api(self, metodo, rota, query, corpo):
        handler = self._rotas.get(rota)
        if handler is None:
            return _json(404, {'error': f'Unknown command: {rota}', 'code': 1})
        if rota not in SEM_SESSAO and query.get('session') not in self.sessoes:
            return _json(401, {'error': 'Session is not valid', 'code': 1})
        try:
            if rota in SEM_TRAVA:
                return handler(query, corpo)
            with self.trava:
                return handler(query, corpo)
        except ErroApi as e:
            return _json(e.status, {'error': e.mensagem, 'code': e.code})

    # ── sessão ───────────────────────────────────────────────────────────────────────────────

    def _login(self, q, c):
        dados = _corpo_json(c)
        cred = self.config_secao('login')
        if dados.get('login') != cred.get('login') or dados.get('password') != cred.get('password'):
            raise ErroApi('Invalid login or password', status=401)
        sessao = secrets.token_urlsafe(18)
        self.sessoes[sessao] = time.time()
        return ok({'session': sessao})

    def _logout(self, q, c):
        self.sessoes.pop(q.get('session'), None)
        return VAZIO

    def _session_is_valid(self, q, c):
        return ok({'session_is_valid': q.get('session') in self.sessoes})

    def _change_login(self, q, c):
        dados = _corpo_json(c)
        for campo in ('login', 'password'):
            if not isinstance(dados.get(campo), str) or not dados[campo]:
                raise ErroApi(f"Failed: Invalid member '{campo}' (string expected)")
        with objetos.transacao(self.conn):
            for campo in ('login', 'password'):
                self.conn.execute('UPDATE _config SET valor = ? WHERE secao = \'login\' AND chave = ?',
                                  (dados[campo], campo))
        return VAZIO

    def _reboot(self, q, c):
        self.sessoes.clear()
        self.log.info('Reinício solicitado pela API: sessões descartadas')
        return VAZIO

    # ── fotos ────────────────────────────────────────────────────────────────────────────────

    def _cadastrar_foto(self, uid, ts, img, match):
        def falha(code, mensagem, info=None):
            erro = {'code': code, 'message': mensagem}
            if info:
                erro['info'] = info
            return {'user_id': uid, 'success': False, 'errors': [erro]}

        if not isinstance(uid, int) or isinstance(uid, bool):
            return falha(1, 'Invalid user_id')
        if not isinstance(ts, int) or isinstance(ts, bool):
            return falha(1, f"Failed: Invalid member 'timestamp' (int expected, got {nome_json(ts)})")
        if not self.conn.execute('SELECT 1 FROM users WHERE id = ?', (uid,)).fetchone():
            return falha(1, 'User does not exist')
        if len(img) > LIMITE_FOTO:
            return falha(1, 'Image file too large (max 2MB)')
        erro = erro_dimensoes(img)
        if erro:
            return falha(1, erro)
        if self.ajustes['rejeitar_fotos']:
            return falha(2, 'Face not detected')
        sha = hashlib.sha256(img).hexdigest()
        if match:
            # Sem reconhecimento facial de verdade, "mesmo rosto" aqui é "mesmo arquivo".
            outro = self.conn.execute('SELECT user_id FROM _user_images WHERE sha256 = ? AND user_id != ?',
                                      (sha, uid)).fetchone()
            if outro:
                return falha(3, 'Face exists', {'match_user_id': outro[0]})
        with objetos.transacao(self.conn):
            self.conn.execute('INSERT OR REPLACE INTO _user_images (user_id, timestamp, sha256, image)'
                              ' VALUES (?, ?, ?, ?)', (uid, ts, sha, img))
            self.conn.execute('UPDATE users SET image_timestamp = ? WHERE id = ?', (ts, uid))
        return {'user_id': uid, 'scores': SCORES_OK, 'success': True}

    @staticmethod
    def _int_query(q, nome):
        valor = q.get(nome)
        if valor is None:
            return None
        try:
            return int(valor)
        except ValueError:
            return valor

    def _user_set_image(self, q, c):
        uid = self._int_query(q, 'user_id')
        ts = self._int_query(q, 'timestamp')
        if ts is None:
            return ok({'user_id': uid, 'success': False,
                       'errors': [{'code': 1, 'message': "Failed: Missing member 'timestamp'"}]})
        return ok(self._cadastrar_foto(uid, ts, c, self._int_query(q, 'match') == 1))

    def _user_set_image_list(self, q, c):
        if len(c) > LIMITE_LISTA_FOTOS:
            raise ErroApi(f'Request too large ({len(c)} bytes, max {LIMITE_LISTA_FOTOS})')
        dados = _corpo_json(c)
        lista = dados.get('user_images')
        if not isinstance(lista, list):
            raise ErroApi("Failed: Invalid member 'user_images' (array expected)")
        match = bool(dados.get('match'))
        resultados = []
        for item in lista:
            if not isinstance(item, dict):
                resultados.append({'user_id': None, 'success': False,
                                   'errors': [{'code': 1, 'message': 'Invalid user_images element'}]})
                continue
            try:
                img = base64.b64decode(item.get('image') or '', validate=True)
            except (ValueError, TypeError):
                resultados.append({'user_id': item.get('user_id'), 'success': False,
                                   'errors': [{'code': 1, 'message': 'Invalid base64 image'}]})
                continue
            resultados.append(self._cadastrar_foto(item.get('user_id'), item.get('timestamp'), img, match))
        return ok({'results': resultados})

    def _user_get_image(self, q, c):
        uid = self._int_query(q, 'user_id')
        linha = self.conn.execute('SELECT timestamp, image FROM _user_images WHERE user_id = ?', (uid,)).fetchone()
        if not linha:
            existe = self.conn.execute('SELECT 1 FROM users WHERE id = ?', (uid,)).fetchone()
            raise ErroApi('User has no image' if existe else 'User does not exist')
        if (self._int_query(q, 'get_timestamp') or 0) > 0:
            return ok({'timestamp': linha['timestamp'], 'image': base64.b64encode(linha['image']).decode()})
        return 200, _tipo_imagem(linha['image']) or 'image/jpeg', linha['image']

    def _user_get_image_list(self, q, c):
        ids = _corpo_json(c).get('user_ids')
        if not isinstance(ids, list):
            raise ErroApi("Failed: Invalid member 'user_ids' (array expected)")
        if len(ids) > LIMITE_GET_IMAGE_LIST:
            raise ErroApi(f'Failed: at most {LIMITE_GET_IMAGE_LIST} user_ids per request')
        saida = []
        for uid in ids:
            linha = self.conn.execute('SELECT timestamp, image FROM _user_images WHERE user_id = ?', (uid,)).fetchone()
            if linha:
                saida.append({'id': uid, 'timestamp': linha['timestamp'],
                              'image': base64.b64encode(linha['image']).decode()})
            else:
                existe = self.conn.execute('SELECT 1 FROM users WHERE id = ?', (uid,)).fetchone()
                saida.append({'id': uid, 'error': {'code': 1,
                                                   'message': 'User has no image' if existe else 'User does not exist'}})
        return ok({'user_images': saida})

    def _user_list_images(self, q, c):
        get_ts = self._int_query(q, 'get_timestamp') or _corpo_json(c).get('get_timestamp') or 0
        linhas = self.conn.execute('SELECT user_id, timestamp FROM _user_images ORDER BY user_id').fetchall()
        if get_ts:
            return ok({'image_info': [{'user_id': r['user_id'], 'timestamp': r['timestamp']} for r in linhas]})
        return ok({'user_ids': [r['user_id'] for r in linhas]})

    def _user_destroy_image(self, q, c):
        dados = _corpo_json(c)

        def como_int(v):
            # O exemplo oficial manda user_id como string ("123"); o equipamento aceita.
            try:
                return int(v)
            except (TypeError, ValueError):
                raise ErroApi(f"Failed: Invalid member 'user_id' (int expected, got {nome_json(v)})")

        with objetos.transacao(self.conn):
            if dados.get('all') is True:
                self.conn.execute('DELETE FROM _user_images')
                self.conn.execute('UPDATE users SET image_timestamp = 0')
            if dados.get('dangling') is True:
                self.conn.execute('DELETE FROM _user_images WHERE user_id NOT IN (SELECT id FROM users)')
            ids = []
            if 'user_id' in dados:
                ids.append(como_int(dados['user_id']))
            if 'user_ids' in dados:
                if not isinstance(dados['user_ids'], list):
                    raise ErroApi("Failed: Invalid member 'user_ids' (array expected)")
                ids.extend(como_int(v) for v in dados['user_ids'])
            for uid in ids:
                self.conn.execute('DELETE FROM _user_images WHERE user_id = ?', (uid,))
                self.conn.execute('UPDATE users SET image_timestamp = 0 WHERE id = ?', (uid,))
        return VAZIO

    def _remote_enroll(self, q, c):
        """Cadastro de rosto pela câmera do equipamento, modo síncrono: a resposta só sai quando a
        captura termina. Sem câmera, quem "fotografa" é o painel do simulador (botões na faixa de
        cadastro remoto). Formato do erro: a documentação só diz que vem "error"; aqui é uma string."""
        dados = _corpo_json(c)
        if dados.get('type') != 'face':
            raise ErroApi(f"Failed: o simulador só implementa type 'face' (recebido {dados.get('type')!r})")
        if dados.get('sync') is not True:
            raise ErroApi('Failed: o simulador só implementa o modo síncrono (sync: true)')
        uid = dados.get('user_id')
        salvar = dados.get('save') is True
        with self.trava:
            if salvar:
                if not isinstance(uid, int) or isinstance(uid, bool):
                    raise ErroApi("Failed: Invalid member 'user_id' (int expected)")
                linha = self.conn.execute('SELECT name FROM users WHERE id = ?', (uid,)).fetchone()
                if not linha:
                    raise ErroApi('User does not exist')
                nome = linha['name']
            else:
                nome = dados.get('registration') or 'Visitante'
            if self.cadastro_remoto:
                raise ErroApi('Failed: another remote enroll is in progress')
            pedido = {'user_id': uid, 'nome': nome, 'mensagem': dados.get('msg') or dados.get('message') or '',
                      'desde': time.time(), 'evento': threading.Event(), 'acao': None}
            self.cadastro_remoto = pedido
        self.log.info('Cadastro remoto de rosto iniciado: %s (user_id=%s) — aguardando ação no painel', nome, uid)

        respondeu = pedido['evento'].wait(ESPERA_CADASTRO_REMOTO_S)
        with self.trava:
            self.cadastro_remoto = None
            acao = pedido['acao'] if respondeu else 'tempo'
            base = {'user_id': uid, 'device_id': self.device_id}
            if acao == 'capturar':
                img = png_rosto_simulado(nome)
                if salvar:
                    r = self._cadastrar_foto(uid, self.agora(), img, False)
                    if not r['success']:
                        return ok({**base, 'success': False, 'error': r['errors'][0]['message']})
                self.log.info('Cadastro remoto concluído: %s', nome)
                return ok({**base, 'success': True, 'user_image': base64.b64encode(img).decode()})
            mensagens = {'falhar': 'Face not detected', 'cancelar': 'Remote enroll canceled',
                         'tempo': 'Remote enroll timeout'}
            self.log.info('Cadastro remoto sem sucesso: %s (%s)', nome, mensagens[acao])
            return ok({**base, 'success': False, 'error': mensagens[acao]})

    def _cancel_remote_enroll(self, q, c):
        self.responder_cadastro_remoto('cancelar')
        return VAZIO

    def responder_cadastro_remoto(self, acao):
        pedido = self.cadastro_remoto
        if not pedido:
            return False
        pedido['acao'] = acao
        pedido['evento'].set()
        return True

    def _user_test_image(self, q, c):
        erro = erro_dimensoes(c)
        if erro:
            return ok({'success': False, 'errors': [{'code': 1, 'message': erro}]})
        if self.ajustes['rejeitar_fotos']:
            return ok({'success': False, 'errors': [{'code': 2, 'message': 'Face not detected'}]})
        return ok({'scores': SCORES_OK, 'success': True})

    # ── sistema e configuração ───────────────────────────────────────────────────────────────

    def _user_hash_password(self, q, c):
        senha = _corpo_json(c).get('password')
        if not isinstance(senha, str):
            raise ErroApi("Failed: Invalid member 'password' (string expected)")
        alfabeto = string.ascii_letters + string.digits + string.punctuation
        salt = ''.join(secrets.choice(alfabeto) for _ in range(32))
        return ok({'password': hashlib.sha256((senha + salt).encode()).hexdigest(), 'salt': salt})

    def _system_information(self, q, c):
        seg = int(time.time() - self.inicio)
        return ok({
            'uptime': {'days': seg // 86400, 'hours': seg % 86400 // 3600, 'minutes': seg % 3600 // 60,
                       'seconds': seg % 60},
            'time': self.agora(),
            'memory': {'disk': {'free': 3_221_225_472, 'total': 3_758_096_384},
                       'ram': {'free': 268_435_456, 'total': 1_073_741_824}},
            'license': {'users': 10000, 'device': 1, 'type': 1},
            'biometrics': {'max_num_records': 10000},
            'network': {'mac': self.mac, 'ip': _ip_local(), 'netmask': '255.255.255.0', 'gateway': '',
                        'web_server_port': self.porta, 'ssl_enabled': False, 'dhcp_enabled': True,
                        'ten_mbps': False, 'dns_primary': '', 'dns_secondary': ''},
            'serial': self.serial,
            'version': self.firmware,
            'device_id': str(self.device_id),
            'secbox_version': self.secbox_firmware,
            'iDCloud_code': '',
            'online': False,
            'online_available': True,
        })

    def _set_system_time(self, q, c):
        dados = _corpo_json(c)
        limites = {'day': (1, 31), 'month': (1, 12), 'year': (1970, 2100), 'hour': (0, 23), 'minute': (0, 59),
                   'second': (0, 59)}
        for campo, (minimo, maximo) in limites.items():
            v = dados.get(campo)
            if not isinstance(v, int) or isinstance(v, bool):
                raise ErroApi(f"Failed: Invalid member '{campo}' (int expected, got {nome_json(v)})")
            if not minimo <= v <= maximo:
                raise ErroApi(f"Failed: Invalid member '{campo}' (out of range)")
        try:
            # Horário local do equipamento, como o exemplo oficial (21:30 de 10/12/1983).
            novo = datetime(dados['year'], dados['month'], dados['day'], dados['hour'], dados['minute'],
                            dados['second']).timestamp()
        except ValueError as e:
            raise ErroApi(f'Failed: {e}')
        self.desvio_relogio = int(novo - time.time())
        self.log.info('Relógio ajustado pela API (desvio de %ds em relação ao PC)', self.desvio_relogio)
        return VAZIO

    def _get_configuration(self, q, c):
        pedido = _corpo_json(c)
        saida = {}
        for secao, chaves in pedido.items():
            if secao == 'login':
                continue  # credencial não sai por aqui
            if not isinstance(chaves, list):
                raise ErroApi(f"Failed: Invalid member '{secao}' (array expected)")
            atual = self.config_secao(secao)
            saida[secao] = {k: atual[k] for k in chaves if k in atual}
        return ok(saida)

    def _set_configuration(self, q, c):
        pedido = _corpo_json(c)
        with objetos.transacao(self.conn):
            for secao, valores in pedido.items():
                if secao == 'login':
                    raise ErroApi('Failed: use change_login.fcgi para alterar a credencial')
                if not isinstance(valores, dict):
                    raise ErroApi(f"Failed: Invalid member '{secao}' (object expected)")
                for chave, valor in valores.items():
                    if not isinstance(valor, (str, int)) or isinstance(valor, bool):
                        raise ErroApi(f"Failed: Invalid member '{chave}' (string expected, got {nome_json(valor)})")
                    self.conn.execute('INSERT OR REPLACE INTO _config (secao, chave, valor) VALUES (?, ?, ?)',
                                      (secao, chave, str(valor)))
        self.log.info('Configuração alterada: %s', json.dumps(pedido, ensure_ascii=False))
        return VAZIO

    # ── ações ────────────────────────────────────────────────────────────────────────────────

    def _execute_actions(self, q, c):
        acoes = _corpo_json(c).get('actions')
        if not isinstance(acoes, list) or not acoes:
            raise ErroApi("Failed: Invalid member 'actions' (array expected)")
        for a in acoes:
            if not isinstance(a, dict) or a.get('action') not in ('door', 'sec_box', 'catra', 'open_collector'):
                raise ErroApi(f"Failed: Invalid action '{a.get('action') if isinstance(a, dict) else a}'")
            if not isinstance(a.get('parameters', ''), str):
                raise ErroApi("Failed: Invalid member 'parameters' (string expected)")
        for a in acoes:
            self.log.info('Ação remota: %s %s', a['action'], a.get('parameters', ''))
            if a['action'] in ('door', 'sec_box', 'catra'):
                self._abrir_secbox()
        return VAZIO  # sem intertravamento via rede, a chamada não tem retorno

    def _abrir_secbox(self):
        try:
            tempo = int(self.config_secao('general').get('relay1_timeout') or 3000) / 1000
        except ValueError:
            tempo = 3
        if self._timer_secbox:
            self._timer_secbox.cancel()
        if not self.secbox_aberta:
            self.secbox_aberta = True
            self.monitor.enviar('secbox', {'secbox': {'id': SECBOX_ID, 'open': True}, 'device_id': self.device_id,
                                           'time': int(time.time())})

        def fechar():
            self.secbox_aberta = False
            self.monitor.enviar('secbox', {'secbox': {'id': SECBOX_ID, 'open': False}, 'device_id': self.device_id,
                                           'time': int(time.time())})

        self._timer_secbox = threading.Timer(tempo, fechar)
        self._timer_secbox.daemon = True
        self._timer_secbox.start()

    def _doors_state(self, q, c):
        return ok({'sec_boxes': [{'id': SECBOX_ID, 'open': self.secbox_aberta}]})

    # ── painel do simulador (sem sessão; só para quem está operando o simulador) ─────────────

    def simular_rosto(self, user_id, portal_id=1):
        with self.trava:
            resultado = acesso.avaliar(self.conn, user_id, portal_id, self.agora())
            log = acesso.registrar(self.conn, self.device_id, resultado, portal_id, self.agora())
            nome = None
            if resultado['user_id']:
                linha = self.conn.execute('SELECT name FROM users WHERE id = ?', (resultado['user_id'],)).fetchone()
                nome = linha['name'] if linha else None
        if resultado['event'] == 7:
            self._abrir_secbox()
        self.monitor.enviar('dao', {
            'object_changes': [{'object': 'access_logs', 'type': 'inserted',
                                'values': {k: str(v) for k, v in log.items()}}],
            'device_id': self.device_id,
        })
        self.log.info('Rosto apresentado: user_id=%s -> %s (%s)', user_id, resultado['evento'], resultado['motivo'])
        return {**resultado, 'nome': nome, 'log_id': log['id']}

    def estado(self):
        with self.trava:
            usuarios = []
            for u in self.conn.execute(
                    'SELECT u.id, u.name, u.registration, u.begin_time, u.end_time, u.last_access, u.image_timestamp,'
                    ' (SELECT COUNT(*) FROM _user_images i WHERE i.user_id = u.id) AS tem_foto,'
                    ' (SELECT GROUP_CONCAT(g.name, \', \') FROM user_groups ug JOIN groups g ON g.id = ug.group_id'
                    '   WHERE ug.user_id = u.id) AS grupos'
                    ' FROM users u ORDER BY u.name COLLATE NOCASE'):
                previa = acesso.avaliar(self.conn, u['id'], 1, self.agora())
                usuarios.append({**dict(u), 'tem_foto': bool(u['tem_foto']), 'previa_event': previa['event'],
                                 'previa_motivo': previa['motivo']})
            logs = [dict(r) for r in self.conn.execute(
                'SELECT l.id, l.time, l.event, l.user_id, u.name, m.motivo FROM access_logs l'
                ' LEFT JOIN users u ON u.id = l.user_id LEFT JOIN _log_motivos m ON m.log_id = l.id'
                ' ORDER BY l.id DESC LIMIT 40')]
            for l in logs:
                l['evento'] = acesso.EVENTOS.get(l['event'], str(l['event']))
            contagens = {t: self.contar(t) for t in ('users', 'groups', 'access_rules', 'access_logs')}
            contagens['fotos'] = self.contar('_user_images')
        mon = self.config_secao('monitor')
        return {
            'dispositivo': {'nome': self.nome, 'modelo': 'iDFace', 'serial': self.serial, 'firmware': self.firmware,
                            'secbox': self.secbox_firmware, 'mac': self.mac, 'device_id': str(self.device_id),
                            'porta': self.porta, 'ip': _ip_local(), 'uptime_s': int(time.time() - self.inicio),
                            'relogio': self.agora(), 'desvio_relogio': self.desvio_relogio},
            'ajustes': self.ajustes,
            'sessoes': len(self.sessoes),
            'secbox_aberta': self.secbox_aberta,
            'contagens': contagens,
            'monitor': {'hostname': mon.get('hostname', ''), 'port': mon.get('port', ''),
                        'path': mon.get('path', ''), 'ultimo': self.monitor.ultimo},
            'usuarios': usuarios,
            'logs': logs,
            'requisicoes': list(self.requisicoes)[-80:][::-1],
            'cadastro_remoto': ({'user_id': self.cadastro_remoto['user_id'], 'nome': self.cadastro_remoto['nome'],
                                 'mensagem': self.cadastro_remoto['mensagem'],
                                 'segundos': int(time.time() - self.cadastro_remoto['desde']),
                                 'limite': ESPERA_CADASTRO_REMOTO_S}
                                if self.cadastro_remoto else None),
        }

    def foto(self, user_id):
        with self.trava:
            linha = self.conn.execute('SELECT image FROM _user_images WHERE user_id = ?', (user_id,)).fetchone()
        return linha['image'] if linha else None

    def ajustar(self, dados):
        if 'offline' in dados:
            self.ajustes['offline'] = bool(dados['offline'])
        if 'rejeitar_fotos' in dados:
            self.ajustes['rejeitar_fotos'] = bool(dados['rejeitar_fotos'])
        if 'latencia_ms' in dados:
            self.ajustes['latencia_ms'] = max(0, min(int(dados['latencia_ms']), 30000))
        self.log.info('Ajustes do simulador: %s', self.ajustes)

    def limpar_sessoes(self):
        self.sessoes.clear()
        self.log.info('Sessões invalidadas pelo painel')

    def reset_fabrica(self):
        with self.trava:
            zerar_banco(self.conn)
        self.sessoes.clear()
        self.log.warning('Reset de fábrica pelo painel: todos os dados apagados')


def query_simples(query_string):
    """parse_qs devolve listas; a API só usa um valor por chave."""
    return {k: v[-1] for k, v in parse_qs(query_string, keep_blank_values=True).items()}
