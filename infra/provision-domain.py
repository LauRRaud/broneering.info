#!/usr/bin/env python3
"""Provision one owned platform subdomain using the existing VPS, Nginx and Certbot.

No DNS API, Docker socket in the app, or new server is needed. Run on the VPS.
The public company signup workflow is intentionally a separate chapter.
"""
import argparse
import json
import os
import re
import socket
import subprocess
import urllib.request
import uuid
from pathlib import Path

PROJECT = Path('/srv/broneering.info')
WEBROOT = Path('/var/www/broneering-acme')
RESERVED = {'haldus', 'app', 'api', 'admin', 'cdn', 'www', 'mail', 'demo', 'demo2'}

def domain_for(slug):
    if not re.fullmatch(r'[a-z][a-z0-9-]{1,48}[a-z0-9]', slug) or slug in RESERVED:
        raise ValueError('Use a non-reserved lowercase slug of 3–50 letters, numbers or hyphens.')
    return slug + '.broneering.info'

def literal(value):
    return "'" + str(value).replace("'", "''") + "'"

def run(args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)

def sql(query):
    result = run(['docker', 'compose', '--project-directory', str(PROJECT), '--env-file', str(PROJECT / '.env.server'),
                  '-f', str(PROJECT / 'compose.server.yaml'), 'exec', '-T', 'db', 'psql', '-X', '-A', '-t',
                  '-U', 'booking_owner', '-d', 'booking', '-v', 'ON_ERROR_STOP=1', '-c', query], capture_output=True)
    return result.stdout.strip()

def nginx_config(host, certificate):
    return f'''# Managed by broneering.info infra/provision-domain.py
server {{
    listen 80;
    listen [::]:80;
    server_name {host};
    location ^~ /.well-known/acme-challenge/ {{
        root /var/www/broneering-acme;
        default_type text/plain;
        try_files $uri =404;
    }}
    location / {{ return 301 https://$host$request_uri; }}
}}
server {{
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name {host};
    ssl_certificate /etc/letsencrypt/live/{certificate}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{certificate}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 16k;
    access_log /var/log/nginx/broneering.access.log;
    error_log /var/log/nginx/broneering.error.log warn;
    location /api/ {{
        limit_req zone=broneering_api burst=30 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:3107;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 30s;
    }}
    location / {{
        proxy_pass http://127.0.0.1:3107;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 30s;
    }}
}}
'''

def provision(args):
    host = domain_for(args.slug)
    cert = 'broneering-tenant-' + args.slug
    if not args.apply:
        print(json.dumps({'host': host, 'certificate': cert, 'mode': 'retire' if args.retire else 'provision',
                          'apply': False, 'note': 'Add --apply to execute on the VPS.'}))
        return
    if os.name != 'posix' or os.geteuid() != 0 or PROJECT.resolve() != PROJECT or not (PROJECT / '.env.server').is_file():
        raise ValueError('Run as root on the configured VPS with its private .env.server.')
    import fcntl
    with open('/run/lock/broneering-domain.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if args.retire:
            sql(f'UPDATE tenant_domains SET ready=false WHERE hostname={literal(host)};')
            print('Domain disabled; its reservation and certificate remain with the original tenant.')
            return
        addresses = {r[4][0] for r in socket.getaddrinfo(host, 80, type=socket.SOCK_STREAM)}
        if not addresses or addresses != {args.server_ip}:
            raise ValueError('DNS must point only to the configured VPS address before provisioning.')
        row = sql(f'SELECT id FROM tenants WHERE slug={literal(args.slug)};')
        if not row and (not args.name or not args.address):
            raise ValueError('A new tenant requires --name and --address.')
        if len(args.name or '') > 200 or len(args.address or '') > 500:
            raise ValueError('Company name or address is too long.')
        new_id = row or str(uuid.uuid4())
        # Both records are created atomically. Reservation trigger rejects a former owner's address.
        sql(f'''BEGIN;
          INSERT INTO tenants(id,slug,name,address,demo) VALUES({literal(new_id)},{literal(args.slug)},
            {literal(args.name or '')},{literal(args.address or '')},{'true' if args.demo else 'false'}) ON CONFLICT(slug) DO NOTHING;
          INSERT INTO tenant_domains(hostname,tenant_id,ready)
            SELECT {literal(host)},id,false FROM tenants WHERE slug={literal(args.slug)} ON CONFLICT(hostname) DO NOTHING;
          COMMIT;''')
        mapping = sql(f'SELECT tenant_id FROM tenant_domains WHERE hostname={literal(host)};')
        if mapping != new_id:
            raise ValueError('The domain belongs to a different company. No configuration was changed.')
        challenge = WEBROOT / '.well-known' / 'acme-challenge' / ('probe-' + uuid.uuid4().hex)
        challenge.parent.mkdir(parents=True, exist_ok=True)
        token = uuid.uuid4().hex
        try:
            challenge.write_text(token)
            challenge.chmod(0o644)
            with urllib.request.urlopen(f'http://{host}/.well-known/acme-challenge/{challenge.name}', timeout=10) as response:
                if response.read(200).decode() != token:
                    raise ValueError('The HTTP challenge was not served by this project.')
        finally:
            challenge.unlink(missing_ok=True)
        run(['certbot', 'certonly', '--webroot', '--webroot-path', str(WEBROOT), '--non-interactive',
             '--keep-until-expiring', '--cert-name', cert, '-d', host])
        available = Path('/etc/nginx/sites-available') / ('broneering.info--' + args.slug)
        enabled = Path('/etc/nginx/sites-enabled') / available.name
        if available.is_symlink() or (available.exists() and not available.read_text().startswith('# Managed by broneering.info')):
            raise ValueError('Refusing to overwrite a configuration not managed by this project.')
        if (enabled.exists() or enabled.is_symlink()) and (not enabled.is_symlink() or enabled.resolve() != available):
            raise ValueError('The enabled configuration points outside this project.')
        previous = available.read_text() if available.exists() else None
        had_link = enabled.is_symlink()
        try:
            available.write_text(nginx_config(host, cert))
            if not had_link:
                enabled.symlink_to(available)
            run(['nginx', '-t'])
            run(['systemctl', 'reload', 'nginx'])
        except Exception:
            if not had_link:
                enabled.unlink(missing_ok=True)
            if previous is None:
                available.unlink(missing_ok=True)
            else:
                available.write_text(previous)
            raise
        # Default TLS verification checks the actual certificate before enabling application routing.
        with urllib.request.urlopen(f'https://{host}/api/health', timeout=15) as response:
            if response.status != 200:
                raise ValueError('The HTTPS application health check failed.')
        sql(f'UPDATE tenant_domains SET ready=true WHERE hostname={literal(host)} AND tenant_id={literal(new_id)};')
        print(json.dumps({'host': host, 'tenantId': new_id, 'ready': True, 'certificate': cert}))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('slug')
    parser.add_argument('--name')
    parser.add_argument('--address')
    parser.add_argument('--demo', action='store_true')
    parser.add_argument('--retire', action='store_true')
    parser.add_argument('--server-ip', default='217.146.72.147')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    try:
        provision(args)
    except subprocess.CalledProcessError as error:
        # Never echo database SQL, environment contents or subprocess parameter values.
        print(f'Provisioning command failed with status {error.returncode}. Domain is not newly activated.')
        raise SystemExit(1)
    except (ValueError, OSError) as error:
        print(str(error))
        raise SystemExit(1)

if __name__ == '__main__':
    main()
