#!/usr/bin/env python3
"""Exercise the production Nginx template with disposable Docker containers.
Requires local nginx:stable-alpine and python:3.11-slim images. No cloud calls.
Set FRONTEND_IMAGE to test a built image and its real entrypoint instead.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'alfdockia-search-test-' + uuid.uuid4().hex[:8]


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


backend_source = '''from http.server import BaseHTTPRequestHandler, HTTPServer
import json
class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        result = json.dumps({'path': self.path, 'body': json.loads(body),
            'authorization': self.headers.get('Authorization')}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(result)
    def log_message(self, *args): pass
HTTPServer(('0.0.0.0', 8084), Handler).serve_forever()
'''
containers = []
network_created = False
try:
    docker('network', 'create', PREFIX)
    network_created = True
    with tempfile.TemporaryDirectory(prefix=PREFIX) as directory:
        temp = Path(directory)
        (temp / 'backend.py').write_text(backend_source)
        containers.append(PREFIX + '-backend')
        docker('run', '-d', '--name', containers[-1], '--network', PREFIX,
               '--network-alias', 'alfresco-qdrant-search',
               '-v', f'{temp}/backend.py:/backend.py:ro',
               'python:3.11-slim', 'python', '/backend.py')
        docker('exec', containers[-1], 'python', '-c',
               'import socket,time\n'
               'for attempt in range(100):\n'
               ' try:\n'
               '  socket.create_connection(("127.0.0.1",8084),timeout=1).close(); break\n'
               ' except OSError: time.sleep(0.1)\n'
               'else: raise RuntimeError("Backend not ready")')
        opener = urllib.request.build_opener(NoRedirect)
        for index, (base_path, endpoint) in enumerate([('/', '/search'), ('/', '/custom/query'), ('/content-app/', '/search')]):
            name = PREFIX + '-front-' + str(index)
            containers.append(name)
            image = os.environ.get('FRONTEND_IMAGE')
            runtime = [image] if image else [
                '-v', f'{ROOT}/docker/default.conf.template:/etc/nginx/templates/default.conf.template:ro',
                '-v', f'{ROOT}/app/src/app.config.json:/etc/nginx/templates/app.config.json.template:ro',
                '-v', f'{ROOT}/docker/docker-entrypoint.d/30-sed-on-appconfig.sh:/configure.sh:ro',
                'nginx:stable-alpine', 'sh', '-c',
                'sh /docker-entrypoint.d/20-envsubst-on-templates.sh && sh /configure.sh && exec nginx -g "daemon off;"'
            ]
            docker('run', '-d', '--name', name, '--network', PREFIX,
                   '-p', '127.0.0.1::8080',
                   '-e', 'BASE_PATH=' + base_path,
                   '-e', 'NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d',
                   '-e', f'SEARCH_URL=http://alfresco-qdrant-search:8084{endpoint}', *runtime)
            address = docker('port', name, '8080/tcp')
            base = 'http://' + address
            for attempt in range(50):
                try:
                    with urllib.request.urlopen(base + '/app.config.json', timeout=1) as response:
                        config = json.load(response)
                    break
                except (OSError, urllib.error.URLError):
                    time.sleep(0.1)
            else:
                raise AssertionError('Frontend did not start: ' + docker('logs', name))
            # POST must reach the specified host, port and path without a 301/302.
            payload = {'query': {'query': 'proxy-test'}, 'maxItems': 5}
            request = urllib.request.Request(base + base_path + 'search?probe=1',
                data=json.dumps(payload).encode(), method='POST',
                headers={'Content-Type': 'application/json', 'Authorization': 'Bearer test-only'})
            with opener.open(request, timeout=10) as response:
                assert response.status == 200
                result = json.load(response)
            assert result == {'path': endpoint + '?probe=1', 'body': payload,
                              'authorization': 'Bearer test-only'}, result
            assert config['alfdockiaAiSearch']['baseUrl'] == '.', config['alfdockiaAiSearch']
            assert config['alfdockiaAiSearch']['searchPath'] == '/search'
            assert config['ecmHost'] == '{protocol}//{hostname}{:port}'
            docker('exec', name, 'nginx', '-t')
            print('PASS: runtime SEARCH_URL, POST/body/auth/query, relative frontend URL:', base_path, '->', endpoint)
except Exception:
    for name in containers:
        subprocess.run(['docker', 'logs', '--tail=12', name])
    raise
finally:
    for name in reversed(containers):
        subprocess.run(['docker', 'rm', '-f', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if network_created:
        subprocess.run(['docker', 'network', 'rm', PREFIX], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
