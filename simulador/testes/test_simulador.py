"""Testes de ponta a ponta: sobem o simulador numa porta livre e falam HTTP com ele.

    cd simulador
    py -m unittest discover -s testes -v
"""
import base64
import json
import os
import shutil
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from catraca.app import Catraca  # noqa: E402
from catraca.servidor import criar_servidor  # noqa: E402

JPEG = b'\xff\xd8\xff\xe0' + b'\x00' * 64 + b'\xff\xd9'
JPEG_2 = b'\xff\xd8\xff\xe0' + b'\x01' * 64 + b'\xff\xd9'


class _Receptor(BaseHTTPRequestHandler):
    """Servidor falso do monitor: guarda o que a catraca enviar."""
    recebidos = []

    def do_POST(self):
        corpo = self.rfile.read(int(self.headers['Content-Length']))
        _Receptor.recebidos.append((self.path, json.loads(corpo)))
        self.send_response(200)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def log_message(self, *a):
        pass


class TestSimulador(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pasta = tempfile.mkdtemp(prefix='sim_catraca_')
        cls.catraca = Catraca(cls.pasta, 'Teste', 4408801109306065, 'S', 'M', '6.23.0', '2.1.2', 0)
        cls.catraca.log.handlers = [h for h in cls.catraca.log.handlers if hasattr(h, 'baseFilename')]  # sem eco no console
        cls.servidor = criar_servidor('127.0.0.1', 0, cls.catraca)
        cls.base = f'http://127.0.0.1:{cls.servidor.server_address[1]}'
        threading.Thread(target=cls.servidor.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.servidor.shutdown()
        cls.servidor.server_close()
        cls.catraca.conn.close()
        for h in cls.catraca.log.handlers:
            h.close()
        shutil.rmtree(cls.pasta, ignore_errors=True)

    def setUp(self):
        self.catraca.reset_fabrica()
        self.catraca.ajustes.update(offline=False, latencia_ms=0, rejeitar_fotos=False)
        self.sessao = self.post('login.fcgi', {'login': 'admin', 'password': 'admin'}, sessao=False)[1]['session']

    # ── helpers ──
    def req(self, rota, corpo=b'', tipo='application/json', metodo='POST', query='', sessao=True):
        q = []
        if sessao:
            q.append(f'session={self.sessao}')
        if query:
            q.append(query)
        url = f'{self.base}/{rota}' + ('?' + '&'.join(q) if q else '')
        r = urllib.request.Request(url, data=corpo if metodo == 'POST' else None, method=metodo,
                                   headers={'Content-Type': tipo})
        try:
            with urllib.request.urlopen(r, timeout=5) as resp:
                return resp.status, resp.read(), resp.headers.get('Content-Type')
        except urllib.error.HTTPError as e:
            with e:
                return e.code, e.read(), e.headers.get('Content-Type')

    def post(self, rota, dados=None, **kw):
        status, corpo, _ = self.req(rota, json.dumps(dados or {}).encode(), **kw)
        return status, (json.loads(corpo) if corpo else None)

    def set_image(self, uid, ts, img, match=0):
        st, corpo, _ = self.req('user_set_image.fcgi', img, 'application/octet-stream',
                                query=f'user_id={uid}&timestamp={ts}&match={match}')
        self.assertEqual(st, 200)
        return json.loads(corpo)

    def criar_aluno(self, uid, nome='Aluno', grupo=1):
        self.assertEqual(self.post('create_objects.fcgi', {'object': 'users', 'values': [
            {'id': uid, 'registration': str(uid), 'name': nome}]}), (200, {'ids': [uid]}))
        if grupo:
            self.post('create_objects.fcgi', {'object': 'user_groups', 'values': [{'user_id': uid, 'group_id': grupo}]})
        st, _, _ = self.req('user_set_image.fcgi', JPEG if uid % 2 else JPEG_2, 'application/octet-stream',
                            query=f'user_id={uid}&timestamp=1700000000&match=0')
        self.assertEqual(st, 200)

    # ── sessão ──
    def test_sessao(self):
        self.assertEqual(self.post('login.fcgi', {'login': 'admin', 'password': 'x'}, sessao=False)[0], 401)
        self.assertEqual(self.post('load_objects.fcgi', {'object': 'users'}, sessao=False)[0], 401)
        self.assertEqual(self.post('session_is_valid.fcgi')[1], {'session_is_valid': True})
        status, corpo, _ = self.req('logout.fcgi')
        self.assertEqual((status, corpo), (200, b''))
        self.assertEqual(self.post('session_is_valid.fcgi')[1], {'session_is_valid': False})
        self.assertEqual(self.post('load_objects.fcgi', {'object': 'users'})[0], 401)

    def test_troca_de_credencial(self):
        self.req('change_login.fcgi', json.dumps({'login': 'nexdojo', 'password': 's3nha'}).encode())
        self.assertEqual(self.post('login.fcgi', {'login': 'admin', 'password': 'admin'}, sessao=False)[0], 401)
        self.assertEqual(self.post('login.fcgi', {'login': 'nexdojo', 'password': 's3nha'}, sessao=False)[0], 200)

    # ── objetos ──
    def test_crud_e_where(self):
        self.criar_aluno(10, 'Ana')
        self.criar_aluno(11, 'Bruno')
        self.criar_aluno(12, 'Carla')
        _, r = self.post('load_objects.fcgi', {'object': 'users', 'fields': ['id', 'name'],
                                               'where': {'users': {'id': {'>=': 11}}}, 'order': ['id', 'descending']})
        self.assertEqual(r, {'users': [{'id': 12, 'name': 'Carla'}, {'id': 11, 'name': 'Bruno'}]})
        _, r = self.post('load_objects.fcgi', {'object': 'users', 'fields': ['id'], 'where': [
            {'object': 'users', 'field': 'id', 'operator': '>', 'value': 10, 'connector': ') AND ('},
            {'object': 'users', 'field': 'name', 'operator': '=', 'value': 'Carla'}]})
        self.assertEqual(r, {'users': [{'id': 12}]})
        _, r = self.post('load_objects.fcgi', {'object': 'users', 'fields': ['id'], 'limit': 1, 'offset': 1,
                                               'order': ['id']})
        self.assertEqual(r, {'users': [{'id': 11}]})
        _, r = self.post('load_objects.fcgi', {'object': 'users', 'fields': ['id'],
                                               'where': {'users': {'id': {'IN': [10, 12]}}}})
        self.assertEqual(r, {'users': [{'id': 10}, {'id': 12}]})

        self.assertEqual(self.post('modify_objects.fcgi', {'object': 'users', 'values': {'end_time': 5},
                                                           'where': {'users': {'id': 10}}}), (200, {'changes': 1}))
        self.assertEqual(self.post('create_or_modify_objects.fcgi', {'object': 'users', 'values': [
            {'id': 11, 'name': 'Bruno 2'}, {'id': 13, 'registration': '13', 'name': 'Davi'}]}), (200, {'changes': 2}))
        _, r = self.post('load_objects.fcgi', {'object': 'users', 'fields': ['name'], 'order': ['id']})
        self.assertEqual([u['name'] for u in r['users']], ['Ana', 'Bruno 2', 'Carla', 'Davi'])
        # create_or_modify em usuário existente não pode derrubar o vínculo com o grupo (sem REPLACE/CASCADE)
        _, r = self.post('load_objects.fcgi', {'object': 'user_groups', 'where': {'user_groups': {'user_id': 11}}})
        self.assertEqual(len(r['user_groups']), 1)

        self.assertEqual(self.post('destroy_objects.fcgi', {'object': 'users', 'where': {'users': {'id': 12}}}),
                         (200, {'changes': 1}))
        _, r = self.post('load_objects.fcgi', {'object': 'user_groups', 'where': {'user_groups': {'user_id': 12}}})
        self.assertEqual(r['user_groups'], [], 'destruir usuário deve apagar os vínculos em cascata')

    def test_validacao_estrita(self):
        st, r = self.post('create_objects.fcgi', {'object': 'users', 'values': [
            {'id': '1', 'registration': '1', 'name': 'X'}]})
        self.assertEqual(st, 400)
        self.assertIn("int expected, got string", r['error'])
        st, r = self.post('create_objects.fcgi', {'object': 'users', 'values': [{'id': 1, 'name': 'X'}]})
        self.assertEqual(st, 400)
        self.assertIn('registration', r['error'])
        st, r = self.post('load_objects.fcgi', {'object': 'users', 'where': {'users': {'nome; DROP': 1}}})
        self.assertEqual(st, 400)
        st, r = self.post('create_objects.fcgi', {'object': 'user_groups', 'values': [{'user_id': 999, 'group_id': 1}]})
        self.assertEqual(st, 400, 'vínculo com usuário inexistente deve falhar (FOREIGN KEY)')
        self.criar_aluno(1)
        st, r = self.post('create_objects.fcgi', {'object': 'users', 'values': [
            {'id': 1, 'registration': '1', 'name': 'Dup'}]})
        self.assertEqual(st, 400, 'id duplicado deve falhar')

    # ── fotos ──
    def test_fotos(self):
        self.criar_aluno(1)
        self.criar_aluno(3)
        _, r = self.post('user_list_images.fcgi', query='get_timestamp=1')
        self.assertEqual(r, {'image_info': [{'user_id': 1, 'timestamp': 1700000000}, {'user_id': 3, 'timestamp': 1700000000}]})
        st, img, tipo = self.req('user_get_image.fcgi', metodo='GET', query='user_id=1')
        self.assertEqual((st, img, tipo), (200, JPEG, 'image/jpeg'))

        # mesmo arquivo em outro usuário com match=1 -> "Face exists"
        r = self.set_image(3, 1, JPEG, 1)
        self.assertEqual(r['errors'][0]['code'], 3)
        self.assertEqual(r['errors'][0]['info'], {'match_user_id': 1})

        r = self.set_image(1, 1, b'nao e imagem', 0)
        self.assertEqual(r['errors'][0]['code'], 1)

        _, r = self.post('user_set_image_list.fcgi', {'match': False, 'user_images': [
            {'user_id': 1, 'timestamp': 1800000000, 'image': base64.b64encode(JPEG_2).decode()},
            {'user_id': 2, 'timestamp': 1, 'image': base64.b64encode(JPEG).decode()},
            {'user_id': 3, 'timestamp': '1', 'image': base64.b64encode(JPEG).decode()}]})
        self.assertTrue(r['results'][0]['success'])
        self.assertEqual(r['results'][1]['errors'][0]['message'], 'User does not exist')
        self.assertIn('int expected, got string', r['results'][2]['errors'][0]['message'])
        _, r = self.post('load_objects.fcgi', {'object': 'users', 'fields': ['image_timestamp'],
                                               'where': {'users': {'id': 1}}})
        self.assertEqual(r['users'][0]['image_timestamp'], 1800000000)

        _, r = self.post('user_get_image_list.fcgi', {'user_ids': [1, 2]})
        self.assertEqual(base64.b64decode(r['user_images'][0]['image']), JPEG_2)
        self.assertIn('error', r['user_images'][1])

        self.catraca.ajustes['rejeitar_fotos'] = True
        r = self.set_image(1, 2, JPEG, 0)
        self.assertEqual(r['errors'][0], {'code': 2, 'message': 'Face not detected'})
        self.catraca.ajustes['rejeitar_fotos'] = False

        self.assertEqual(self.req('user_destroy_image.fcgi', json.dumps({'user_id': '1'}).encode())[:2], (200, b''))
        _, r = self.post('user_list_images.fcgi')
        self.assertEqual(r, {'user_ids': [3]})

        grande = {'user_images': [{'user_id': 1, 'timestamp': 1, 'image': 'A' * (2 * 1024 * 1024)}]}
        self.assertEqual(self.post('user_set_image_list.fcgi', grande)[0], 400)

    # ── decisão de acesso ──
    def test_acesso(self):
        self.criar_aluno(1, 'Liberado')
        self.criar_aluno(3, 'Sem grupo', grupo=None)
        self.post('create_objects.fcgi', {'object': 'users', 'values': [{'id': 5, 'registration': '5', 'name': 'Sem foto'}]})
        self.post('create_objects.fcgi', {'object': 'user_groups', 'values': [{'user_id': 5, 'group_id': 1}]})

        self.assertEqual(self.catraca.simular_rosto(1)['event'], 7)
        self.assertEqual(self.catraca.simular_rosto(3)['event'], 6)
        self.assertEqual(self.catraca.simular_rosto(5)['event'], 3)
        self.assertEqual(self.catraca.simular_rosto(None)['event'], 3)

        # inadimplente: regra de bloqueio vinculada ao usuário vence a permissão do grupo
        self.post('create_objects.fcgi', {'object': 'access_rules', 'values': [{'id': 50, 'name': 'Inadimplente', 'type': 0, 'priority': 0}]})
        self.post('create_objects.fcgi', {'object': 'portal_access_rules', 'values': [{'portal_id': 1, 'access_rule_id': 50}]})
        self.post('create_objects.fcgi', {'object': 'user_access_rules', 'values': [{'user_id': 1, 'access_rule_id': 50}]})
        r = self.catraca.simular_rosto(1)
        self.assertEqual((r['event'], r['motivo']), (6, 'Regra de bloqueio "Inadimplente"'))
        self.post('destroy_objects.fcgi', {'object': 'user_access_rules', 'where': {'user_access_rules': {'user_id': 1}}})
        self.assertEqual(self.catraca.simular_rosto(1)['event'], 7)

        # validade expirada
        self.post('modify_objects.fcgi', {'object': 'users', 'values': {'end_time': int(time.time()) - 60},
                                          'where': {'users': {'id': 1}}})
        self.assertEqual(self.catraca.simular_rosto(1)['event'], 6)

        _, r = self.post('load_objects.fcgi', {'object': 'access_logs', 'fields': ['user_id', 'event'], 'order': ['id']})
        self.assertEqual([l['event'] for l in r['access_logs']], [7, 6, 3, 3, 6, 7, 6])

    def test_horario(self):
        self.criar_aluno(1)
        self.post('create_objects.fcgi', {'object': 'time_zones', 'values': [{'id': 1, 'name': 'Nunca'}]})
        dias = {d: 0 for d in ('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'hol1', 'hol2', 'hol3')}
        self.post('create_objects.fcgi', {'object': 'time_spans', 'values': [
            {'id': 1, 'time_zone_id': 1, 'start': 0, 'end': 86399, **dias}]})
        self.post('create_objects.fcgi', {'object': 'access_rule_time_zones', 'values': [{'access_rule_id': 1, 'time_zone_id': 1}]})
        self.assertEqual(self.catraca.simular_rosto(1)['motivo'], 'Fora do horário das regras de acesso')
        self.post('modify_objects.fcgi', {'object': 'time_spans', 'values': {**{d: 1 for d in dias}},
                                          'where': {'time_spans': {'id': 1}}})
        self.assertEqual(self.catraca.simular_rosto(1)['event'], 7)

    # ── monitor, ações, configuração, sistema ──
    def test_monitor_e_acoes(self):
        _Receptor.recebidos.clear()
        receptor = ThreadingHTTPServer(('127.0.0.1', 0), _Receptor)
        threading.Thread(target=receptor.serve_forever, daemon=True).start()
        try:
            self.req('set_configuration.fcgi', json.dumps({'monitor': {
                'hostname': '127.0.0.1', 'port': str(receptor.server_address[1]), 'path': 'api/notifications'},
                'general': {'relay1_timeout': '200'}}).encode())
            _, r = self.post('get_configuration.fcgi', {'monitor': ['hostname', 'path'], 'login': ['password']})
            self.assertEqual(r, {'monitor': {'hostname': '127.0.0.1', 'path': 'api/notifications'}})

            self.criar_aluno(1)
            self.catraca.simular_rosto(1)
            st, corpo, _ = self.req('execute_actions.fcgi', json.dumps(
                {'actions': [{'action': 'sec_box', 'parameters': 'id=65793, reason=3'}]}).encode())
            self.assertEqual((st, corpo), (200, b''))
            prazo = time.time() + 3
            while time.time() < prazo and not any(p.endswith('/secbox') and not c['secbox']['open']
                                                  for p, c in _Receptor.recebidos):
                time.sleep(0.05)
            caminhos = [p for p, _ in _Receptor.recebidos]
            self.assertIn('/api/notifications/dao', caminhos)
            dao = next(c for p, c in _Receptor.recebidos if p.endswith('/dao'))
            self.assertEqual(dao['object_changes'][0]['values']['event'], '7')
            self.assertEqual(dao['object_changes'][0]['values']['user_id'], '1')
            self.assertFalse(self.post('doors_state.fcgi')[1]['sec_boxes'][0]['open'])
            self.assertIn('/api/notifications/secbox', caminhos)
        finally:
            receptor.shutdown()
            receptor.server_close()

    def test_sistema(self):
        _, r = self.post('system_information.fcgi')
        self.assertEqual((r['version'], r['device_id'], r['secbox_version']), ('6.23.0', '4408801109306065', '2.1.2'))
        self.assertEqual(self.post('execute_actions.fcgi', {'actions': [{'action': 'explodir'}]})[0], 400)
        self.assertEqual(self.post('nao_existe.fcgi')[0], 404)
        _, r = self.post('user_hash_password.fcgi', {'password': 'abc123'})
        self.assertEqual(len(r['password']), 64)

    def test_relogio(self):
        from datetime import datetime, timedelta
        alvo = datetime.now() + timedelta(hours=2)
        st, corpo, _ = self.req('set_system_time.fcgi', json.dumps({
            'day': alvo.day, 'month': alvo.month, 'year': alvo.year, 'hour': alvo.hour,
            'minute': alvo.minute, 'second': alvo.second}).encode())
        self.assertEqual((st, corpo), (200, b''))
        _, r = self.post('system_information.fcgi')
        self.assertAlmostEqual(r['time'], int(alvo.timestamp()), delta=3)
        self.assertEqual(self.post('set_system_time.fcgi', {'day': '1'})[0], 400)
        self.catraca.desvio_relogio = 0

    def test_offline(self):
        self.catraca.ajustes['offline'] = True
        with self.assertRaises((urllib.error.URLError, ConnectionError, OSError)):
            urllib.request.urlopen(urllib.request.Request(f'{self.base}/login.fcgi', data=b'{}', method='POST'), timeout=3)
        self.catraca.ajustes['offline'] = False


if __name__ == '__main__':
    unittest.main()
