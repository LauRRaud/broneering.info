#!/usr/bin/env bash
set -euo pipefail
umask 077
run_id=${1:?12 hex run id required}
mode=${2:-new}
[[ "$run_id" =~ ^[a-f0-9]{12}$ ]]
root=/srv/broneering.info/output/chapter26-$run_id
archive=/tmp/chapter26-$run_id.tgz
test -f "$archive"
if [ "$mode" = new ]; then
  test ! -e "$root"
  test "$(df --output=avail -k /srv/broneering.info | tail -1)" -gt 5242880
  if ss -H -ltn | awk '{print $4}' | grep -Eq ':(3109|3443|55436)$'; then
    echo 'An isolated acceptance port is already in use' >&2; exit 1
  fi
else
  test "$mode" = resume-empty
  test -d "$root"
  grep -qx "DB_NAME=chapter26_$run_id" "$root/chapter26.env"
  grep -qx "COMPOSE_PROJECT_NAME=chapter26-$run_id" "$root/chapter26.env"
fi
mkdir -p "$root"
test "$(realpath "$root")" = "/srv/broneering.info/output/chapter26-$run_id"
tar -xzf "$archive" -C "$root"
chmod -R a+rX "$root/src" "$root/scripts" "$root/db" "$root/infra" "$root/tsconfig.json"
# Windows checkouts can contain CRLF shell files; normalize the isolated copies.
find "$root/infra" -type f -name '*.sh' -exec sed -i 's/\r$//' {} +
mkdir -p "$root/output/chapter26" "$root/nginx/client_temp" "$root/nginx/proxy_temp"
# Match the web/worker UID for private files; the operator group can collect reports.
sudo chown -R 1001:"$(id -g)" "$root/output"
sudo find "$root/output" -type d -exec chmod 2770 {} +
web_image=$(sudo -n docker inspect --format '{{.Image}}' broneeringinfo-web-1)
tools_image=$(sudo -n docker inspect --format '{{.Image}}' broneeringinfo-export-worker-1)
if [ "$mode" = new ]; then {
  printf 'COMPOSE_PROJECT_NAME=chapter26-%s\nTEST_ROOT=%s\nDB_NAME=chapter26_%s\n' "$run_id" "$root" "$run_id"
  printf 'DB_OWNER_PASSWORD=%s\nDB_APP_PASSWORD=%s\nAUTH_SECRET=%s\n' "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" "$(openssl rand -hex 32)"
  printf 'WEB_IMAGE=%s\nTOOLS_IMAGE=%s\nRUN_UID=%s\nRUN_GID=%s\n' "$web_image" "$tools_image" "$(id -u)" "$(id -g)"
} > "$root/chapter26.env"
fi
dc=(sudo -n docker compose --env-file "$root/chapter26.env" -f "$root/infra/acceptance/chapter26.compose.yaml")
"${dc[@]}" up -d --wait db
"${dc[@]}" run --rm --interactive=false tools node --import tsx scripts/migrate.ts
"${dc[@]}" run --rm --interactive=false tools node --import tsx scripts/chapter26-fixture.ts seed
"${dc[@]}" run --rm --interactive=false tools node --import tsx scripts/chapter26-fixture.ts proof
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$root/nginx/key.pem" -out "$root/nginx/cert.pem" -days 2 -subj '/CN=haldus.localhost' -addext 'subjectAltName=DNS:haldus.localhost,DNS:*.localhost' 2>/dev/null
cat > "$root/nginx/nginx.conf" <<'NGINX'
worker_processes 1;
pid nginx.pid;
error_log error.log warn;
events { worker_connections 1024; }
http {
  client_body_temp_path client_temp;
  proxy_temp_path proxy_temp;
  log_format acceptance '$remote_addr $request_method $uri $status $request_time';
  access_log access.log acceptance;
  limit_req_zone $binary_remote_addr zone=p26_api:10m rate=5r/s;
  server {
    listen 127.0.0.1:3443 ssl;
    ssl_certificate cert.pem;
    ssl_certificate_key key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 16k;
    location = /api/admin/imports {
      client_max_body_size 5m;
      limit_req zone=p26_api burst=30 nodelay;
      limit_req_status 429;
      proxy_pass http://127.0.0.1:3109;
      proxy_set_header Host $http_host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $remote_addr;
      proxy_set_header X-Forwarded-Proto https;
      proxy_read_timeout 30s;
    }
    location /api/ {
      limit_req zone=p26_api burst=30 nodelay;
      limit_req_status 429;
      proxy_pass http://127.0.0.1:3109;
      proxy_set_header Host $http_host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $remote_addr;
      proxy_set_header X-Forwarded-Proto https;
      proxy_read_timeout 30s;
    }
    location / {
      proxy_pass http://127.0.0.1:3109;
      proxy_set_header Host $http_host;
      proxy_set_header X-Forwarded-For $remote_addr;
      proxy_set_header X-Forwarded-Proto https;
    }
  }
}
NGINX
nginx -p "$root/nginx/" -c nginx.conf -t
nginx -p "$root/nginx/" -c nginx.conf
"${dc[@]}" up -d web
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3109/api/ready > "$root/output/chapter26/test-ready.json"; then break; fi
  sleep 2
done
curl -fsS http://127.0.0.1:3109/api/ready
curl --max-time 10 -fsS https://broneering.info/api/ready > "$root/output/chapter26/production-ready-before.json"
{
  date -u +%Y-%m-%dT%H:%M:%SZ
  uname -srmo
  lscpu
  free -m
  df -h "$root"
  nginx -v 2>&1
  sudo -n docker version --format '{{.Server.Version}}'
  printf 'web-image=%s\ntools-image=%s\n' "$web_image" "$tools_image"
  "${dc[@]}" ps
} > "$root/output/chapter26/resources-before.log"
printf '\nIsolated acceptance ready: %s\n' "$root"
