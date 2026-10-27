"""Simulador de catraca Control iD iDFace.

Uso:
    py simulador.py                       # catraca padrão na porta 8090
    py simulador.py --porta 8091 --nome "Catraca 2" --device-id 4408801109306066

Cada catraca simulada é um processo com sua própria porta e sua própria pasta de dados
(simulador/dados/<nome>/), então dá para subir várias ao mesmo tempo.
Os valores padrão de identificação são os da iDFace real que será integrada.
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from catraca.app import Catraca  # noqa: E402
from catraca.servidor import criar_servidor  # noqa: E402


def main():
    # Sem isto, com a saída redirecionada para arquivo (serviço do Windows), os acentos saem em cp1252.
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    p = argparse.ArgumentParser(description='Simulador de catraca Control iD iDFace')
    p.add_argument('--host', default='127.0.0.1',
                   help='Interface de escuta. Use 0.0.0.0 para aceitar conexões de outras máquinas da rede.')
    p.add_argument('--porta', type=int, default=8090)
    p.add_argument('--nome', default='Catraca 1')
    p.add_argument('--dados', default=None, help='Pasta de dados (padrão: simulador/dados/<nome>)')
    p.add_argument('--device-id', type=int, default=4408801109306065)
    p.add_argument('--serial', default='0M0200/016AD1')
    p.add_argument('--mac', default='FC:52:CE:8B:C4:9A')
    p.add_argument('--firmware', default='6.23.0')
    p.add_argument('--secbox-firmware', default='2.1.2')
    a = p.parse_args()

    pasta = a.dados or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dados',
                                    re.sub(r'[^\w-]+', '_', a.nome).strip('_') or 'catraca')
    catraca = Catraca(pasta, a.nome, a.device_id, a.serial, a.mac, a.firmware, a.secbox_firmware, a.porta)
    servidor = criar_servidor(a.host, a.porta, catraca)
    endereco = 'localhost' if a.host in ('127.0.0.1', '0.0.0.0') else a.host
    catraca.log.info('API Control iD em http://%s:%d  |  painel em http://%s:%d/', endereco, a.porta, endereco, a.porta)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        catraca.log.info('Encerrado')


if __name__ == '__main__':
    main()
