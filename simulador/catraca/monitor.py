"""Monitor: o equipamento avisa um servidor externo (POST) quando algo acontece.

Configurado via set_configuration, seção "monitor" (hostname, port, path, request_timeout,
alive_interval). Com hostname vazio, nada é enviado — que é o padrão de fábrica.

Endpoints chamados, relativos a http://hostname:port/path/:
  dao              — inserção em access_logs (valores como string, igual ao exemplo oficial)
  device_is_alive  — a cada alive_interval ms
  secbox           — mudança de estado do relé da SecBox (abertura remota)
"""
import json
import queue
import threading
import time
import urllib.error
import urllib.request


class Monitor:
    def __init__(self, catraca):
        self.catraca = catraca
        self.fila = queue.Queue()
        self.ultimo = None  # resultado do último envio, exibido no painel
        threading.Thread(target=self._enviar_fila, name='monitor', daemon=True).start()
        threading.Thread(target=self._alive, name='monitor-alive', daemon=True).start()

    def _url(self, endpoint):
        cfg = self.catraca.config_secao('monitor')
        host = (cfg.get('hostname') or '').strip()
        if not host:
            return None, 0
        porta = (cfg.get('port') or '80').strip()
        caminho = (cfg.get('path') or '').strip('/')
        try:
            timeout = max(int(cfg.get('request_timeout') or 5000), 100) / 1000
        except ValueError:
            timeout = 5
        return f'http://{host}:{porta}/' + (f'{caminho}/' if caminho else '') + endpoint, timeout

    def enviar(self, endpoint, corpo):
        self.fila.put((endpoint, corpo))

    def _enviar_fila(self):
        while True:
            endpoint, corpo = self.fila.get()
            url, timeout = self._url(endpoint)
            if not url:
                continue
            inicio = time.time()
            status, erro = None, None
            try:
                req = urllib.request.Request(url, data=json.dumps(corpo).encode(), method='POST',
                                             headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    status = resp.status
            except urllib.error.HTTPError as e:
                status, erro = e.code, str(e)
            except Exception as e:  # servidor fora do ar, timeout, DNS — o equipamento só segue
                erro = str(e)
            ms = int((time.time() - inicio) * 1000)
            self.ultimo = {'quando': int(time.time()), 'url': url, 'status': status, 'erro': erro, 'ms': ms}
            self.catraca.registrar_saida(url, status, ms, erro)

    def _alive(self):
        while True:
            cfg = self.catraca.config_secao('monitor')
            try:
                intervalo = max(int(cfg.get('alive_interval') or 30000), 1000) / 1000
            except ValueError:
                intervalo = 30
            time.sleep(intervalo)
            if (cfg.get('hostname') or '').strip():
                self.enviar('device_is_alive', {
                    'access_logs': self.catraca.contar('access_logs'),
                    'device_id': self.catraca.device_id,
                    'time': int(time.time()),
                })
