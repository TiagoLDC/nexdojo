"""Transporte HTTP. Rotas:

  /                 painel do simulador (HTML)
  /sim/api/...      ações do painel — sem sessão, não existem no equipamento real
  /<comando>.fcgi   API Control iD, implementada em app.py
"""
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from .app import Catraca, query_simples

_PAINEL = os.path.join(os.path.dirname(__file__), 'painel.html')


def _resumo(rota, query, corpo, status, resposta):
    """Uma linha legível para o log de requisições. Nunca inclui senha nem bytes de imagem."""
    partes = []
    if 'user_id' in query:
        partes.append(f"user_id={query['user_id']}")
    if corpo and not rota.startswith('user_set_image.') and not rota.startswith('user_test_image.'):
        try:
            dados = json.loads(corpo)
        except (ValueError, UnicodeDecodeError):
            dados = None
        if isinstance(dados, dict):
            if 'object' in dados:
                partes.append(str(dados['object']))
            for chave in ('values', 'user_images', 'user_ids', 'actions'):
                if isinstance(dados.get(chave), list):
                    partes.append(f'{len(dados[chave])} {chave}')
            if rota == 'login.fcgi':
                partes.append(f"login={dados.get('login')!r}")
    elif corpo:
        partes.append(f'{len(corpo)} bytes')
    if status >= 400 and resposta:
        partes.append('ERRO: ' + resposta[:200].decode('utf-8', 'replace'))
    return ' | '.join(partes)


class _Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'SimuladorControliD/1.0'

    def log_message(self, *args):
        pass  # o log fica a cargo da Catraca

    def do_GET(self):
        self._tratar('GET')

    def do_POST(self):
        self._tratar('POST')

    def _ler_corpo(self):
        if 'chunked' in (self.headers.get('Transfer-Encoding') or '').lower():
            partes = []
            while True:
                tamanho = int(self.rfile.readline().split(b';')[0].strip() or b'0', 16)
                if tamanho == 0:
                    self.rfile.readline()
                    break
                partes.append(self.rfile.read(tamanho))
                self.rfile.readline()
            return b''.join(partes)
        tamanho = int(self.headers.get('Content-Length') or 0)
        return self.rfile.read(tamanho) if tamanho else b''

    def _responder(self, status, tipo, corpo):
        self.send_response(status)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(corpo)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(corpo)

    def _json(self, obj, status=200):
        self._responder(status, 'application/json', json.dumps(obj, ensure_ascii=False).encode('utf-8'))

    def _tratar(self, metodo):
        catraca: Catraca = self.server.catraca
        url = urlsplit(self.path)
        rota = url.path.strip('/')
        query = query_simples(url.query)
        corpo = self._ler_corpo()

        if rota in ('', 'painel'):
            with open(_PAINEL, 'rb') as f:
                return self._responder(200, 'text/html; charset=utf-8', f.read())
        if rota.startswith('sim/api/'):
            return self._painel(catraca, metodo, rota[len('sim/api/'):], corpo)

        if catraca.ajustes['offline']:
            # Equipamento "desligado": fecha a conexão sem responder nada, como um host fora do ar.
            self.close_connection = True
            return
        if catraca.ajustes['latencia_ms']:
            time.sleep(catraca.ajustes['latencia_ms'] / 1000)

        inicio = time.time()
        status, tipo, resposta = catraca.api(metodo, rota, query, corpo)
        self._responder(status, tipo, resposta)
        catraca.registrar_requisicao(metodo, rota, status, int((time.time() - inicio) * 1000),
                                     _resumo(rota, query, corpo, status, resposta if tipo == 'application/json' else b''))

    def _painel(self, catraca, metodo, acao, corpo):
        try:
            dados = json.loads(corpo) if corpo else {}
        except ValueError:
            return self._json({'erro': 'JSON inválido'}, 400)
        if metodo == 'GET' and acao == 'estado':
            return self._json(catraca.estado())
        if metodo == 'GET' and acao.startswith('foto/'):
            try:
                img = catraca.foto(int(acao[len('foto/'):]))
            except ValueError:
                img = None
            if img is None:
                return self._json({'erro': 'sem foto'}, 404)
            tipo = 'image/png' if img[:4] == b'\x89PNG' else 'image/jpeg'
            return self._responder(200, tipo, img)
        if metodo == 'POST' and acao == 'rosto':
            uid = dados.get('user_id')
            return self._json(catraca.simular_rosto(uid if isinstance(uid, int) else None,
                                                    int(dados.get('portal_id') or 1)))
        if metodo == 'POST' and acao == 'ajustes':
            catraca.ajustar(dados)
            return self._json(catraca.ajustes)
        if metodo == 'POST' and acao == 'sessoes/limpar':
            catraca.limpar_sessoes()
            return self._json({'ok': True})
        if metodo == 'POST' and acao == 'fabrica':
            catraca.reset_fabrica()
            return self._json({'ok': True})
        return self._json({'erro': f'rota desconhecida: {acao}'}, 404)


def criar_servidor(host, porta, catraca):
    servidor = ThreadingHTTPServer((host, porta), _Handler)
    servidor.daemon_threads = True
    servidor.catraca = catraca
    return servidor
