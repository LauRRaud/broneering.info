#!/usr/bin/env bash
set -euo pipefail
umask 077
test_id=${1:?12 hex existing test id}
[[ "$test_id" =~ ^[a-f0-9]{12}$ ]]
root=/srv/broneering.info/output/chapter26-$test_id
test "$(realpath "$root")" = "$root"
cd "$root"
source chapter26.env
test "$DB_NAME" = "chapter26_$test_id"
test "$COMPOSE_PROJECT_NAME" = "chapter26-$test_id"
nonce=$(openssl rand -hex 16)
recovery_name=recovery_$nonce
relative=output/chapter26/recovery-$nonce
directory=$root/$relative
test ! -e "$directory"
test "$(df --output=avail -k /srv | tail -1)" -gt 3145728
if ss -H -ltn | awk '{print $4}' | grep -Eq ':3111$'; then exit 1; fi
mkdir "$directory"
openssl rand -hex 32 > "$directory/key"
sudo chown 1001:1000 "$directory" "$directory/key"
sudo chmod 2770 "$directory"
sudo chmod 600 "$directory/key"
dc=(sudo docker compose -p "$COMPOSE_PROJECT_NAME" --env-file chapter26.env -f infra/acceptance/chapter26.compose.yaml)
inside=/app/$relative
recovery_url=postgresql://booking_owner:$DB_OWNER_PASSWORD@127.0.0.1:55436/$recovery_name
env_id=$(cat /proc/sys/kernel/random/uuid)
rt=("${dc[@]}" run --rm --interactive=false -e "P26_RECOVERY_DIR=$inside" -e "RECOVERY_DATABASE_URL=$recovery_url" tools node --import tsx scripts/chapter26-recovery.ts)
cli=("${dc[@]}" run --rm --interactive=false -e "RECOVERY_DATABASE_URL=$recovery_url" -e "RECOVERY_KEY_FILE=$inside/key" -e "RECOVERY_ENVIRONMENT_ID=$env_id" -e "RECOVERY_ARTIFACT_DIR=$inside/files" -e "RECOVERY_LATEST_LEDGER_DIR=$inside/ledger" -e "RECOVERY_PRIVATE_DIR=$inside/private" -e RECOVERY_ISOLATED=1 -e BACKUP_WRITES_STOPPED=1)
printf '%s\n' "$relative" > output/chapter26/recovery-location.txt
"${rt[@]}" prepare
# Only the dedicated acceptance web writes to this synthetic DB; no workers run.
"${dc[@]}" stop web
"${rt[@]}" fingerprint
backup_at=$(date -u +%FT%T.%3NZ)
sudo docker exec "${COMPOSE_PROJECT_NAME}-db-1" pg_dump -U booking_owner -d "$DB_NAME" -Fc > "$directory/database.dump"
sudo docker exec -i "${COMPOSE_PROJECT_NAME}-db-1" pg_restore --list < "$directory/database.dump" > "$directory/database-contents.txt"
"${cli[@]}" tools node --import tsx scripts/operations/recovery.ts backup
"${rt[@]}" remove
ledger_min=$(date -u +%FT%T.%3NZ)
"${cli[@]}" -e "RECOVERY_ARTIFACT_DIR=$inside/ledger" tools node --import tsx scripts/operations/recovery.ts ledger
restore_at=$(date -u +%FT%T.%3NZ)
sudo docker exec "${COMPOSE_PROJECT_NAME}-db-1" createdb -U booking_owner "$recovery_name"
sudo docker exec -i "${COMPOSE_PROJECT_NAME}-db-1" pg_restore -U booking_owner -d "$recovery_name" --exit-on-error --no-owner < "$directory/database.dump"
"${rt[@]}" compare
"${cli[@]}" -e "RECOVERY_LEDGER_NOT_BEFORE=$ledger_min" tools node --import tsx scripts/operations/recovery.ts recover
"${rt[@]}" verify
"${rt[@]}" session
sudo docker run -d --name "chapter26-recovery-$nonce" --label "booking.acceptance=$COMPOSE_PROJECT_NAME" --network "${COMPOSE_PROJECT_NAME}_default" --cpus 1 --memory 768m -p 127.0.0.1:3111:3000 \
 -e "DATABASE_URL=postgresql://booking_app:$DB_APP_PASSWORD@db:5432/$recovery_name" -e AUTH_BASE_URL=https://haldus.localhost:3443 -e "AUTH_SECRET=$AUTH_SECRET" \
 -e AUTH_MAIL_MODE=disabled -e BOOKING_MAIL_MODE=disabled -e BILLING_MAIL_MODE=disabled -e MAKECOMMERCE_MODE=disabled -e PRIVATE_STORAGE_DIR=/data/private \
 -v "$directory/private:/data/private" "$WEB_IMAGE" > "$directory/web-container.txt"
for attempt in $(seq 1 30); do
 if curl -fsS -H 'Host: haldus.localhost:3443' http://127.0.0.1:3111/api/ready > "$directory/ready.json"; then break; fi
 sleep 1
done
"${dc[@]}" run --rm --interactive=false -e "P26_RECOVERY_DIR=$inside" tools node scripts/chapter26-recovery-http.mjs
finish_at=$(date -u +%FT%T.%3NZ)
python3 - "$directory" "$backup_at" "$restore_at" "$finish_at" "$recovery_name" <<'PY'
import json,sys,datetime,pathlib
directory=pathlib.Path(sys.argv[1]);parse=lambda x:datetime.datetime.fromisoformat(x.replace('Z','+00:00'))
report={'pass':True,'backupAt':sys.argv[2],'recoveryStartedAt':sys.argv[3],'recoveryReadyAt':sys.argv[4],'recoveryDatabase':sys.argv[5],
 'measuredRestoreSeconds':(parse(sys.argv[4])-parse(sys.argv[3])).total_seconds(),
 'snapshotAgeAtRecoverySeconds':(parse(sys.argv[3])-parse(sys.argv[2])).total_seconds(),
 'scope':'Full synthetic database and encrypted private files, newer removal ledger, separate database and app on the same VPS; no offsite/server-loss guarantee'}
(directory/'summary.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
PY
curl -fsS https://haldus.broneering.info/api/ready > "$directory/live-ready-after.json"
echo "Recovery proof saved in $relative"
