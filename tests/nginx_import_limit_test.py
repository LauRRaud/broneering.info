"""Explicit Docker integration check: python tests/nginx_import_limit_test.py.

Loads the shipped Nginx config, a disposable TLS certificate and a local upstream
stub. Requires Docker and openssl; never contacts or reloads a production host.
"""
import http.client
import json
from pathlib import Path
import shutil
import ssl
import subprocess
import tempfile
import time
import uuid

IMAGE = 'nginx@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236'


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT).strip()


def main():
    repo = Path(__file__).resolve().parents[1]
    openssl = shutil.which('openssl') or 'C:/Program Files/Git/usr/bin/openssl.exe'
    name = 'broneering-nginx-test-' + uuid.uuid4().hex
    label = 'broneering.test=' + name
    with tempfile.TemporaryDirectory(prefix='broneering-nginx-') as directory:
        folder = Path(directory)
        run(openssl, 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
            '-subj', '/CN=haldus.broneering.info', '-keyout', str(folder / 'privkey.pem'),
            '-out', str(folder / 'fullchain.pem'))
        config = (repo / 'infra/nginx.conf').read_text(encoding='utf-8')
        # Same container, loopback only. Returning 204 identifies a proxied request.
        (folder / 'nginx.conf').write_text('events {}\nhttp {\n' + config +
            '\nserver { listen 127.0.0.1:3107; client_max_body_size 0; location / { return 204; } }\n}\n', encoding='utf-8')
        started = False
        try:
            run('docker', 'run', '-d', '--name', name, '--label', label,
                '-p', '127.0.0.1::443', '--mount',
                f'type=bind,src={folder / "nginx.conf"},dst=/etc/nginx/nginx.conf,readonly',
                '--mount', f'type=bind,src={folder},dst=/etc/letsencrypt/live/broneering.info,readonly', IMAGE)
            started = True
            run('docker', 'exec', name, 'nginx', '-t')
            port = int(run('docker', 'port', name, '443').rsplit(':', 1)[1])
            results = []
            for path, size, expected in [('/api/admin/imports?kind=customers', 32768, 204),
                    ('/api/admin/imports', 5 * 1024 * 1024, 204),
                    ('/api/admin/imports', 5 * 1024 * 1024 + 1, 413),
                    ('/api/bookings', 32768, 413), ('/api/admin/imports/other', 32768, 413)]:
                for retry in range(20):
                    try:
                        connection = http.client.HTTPSConnection('127.0.0.1', port, context=ssl._create_unverified_context(), timeout=15)
                        connection.request('POST', path, b'x' * size, {'Host':'haldus.broneering.info', 'Content-Type':'text/csv'})
                        response = connection.getresponse()
                        actual = response.status
                        response.read()
                        connection.close()
                        break
                    except ConnectionRefusedError:
                        if retry == 19:
                            raise
                        time.sleep(0.1)
                results.append({'path':path, 'bytes':size, 'status':actual, 'expected':expected})
                assert actual == expected, results[-1]
            print(json.dumps({'nginxConfig':'passed', 'requests':results}, indent=2))
        finally:
            if started:
                metadata = json.loads(run('docker', 'inspect', name))[0]
                assert metadata['Config']['Labels'].get('broneering.test') == name
                run('docker', 'rm', '-f', '-v', name)


if __name__ == '__main__':
    main()
