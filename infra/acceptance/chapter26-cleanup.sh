#!/usr/bin/env bash
set -euo pipefail
test_id=${1:?12 hex test id}
[[ "$test_id" =~ ^[a-f0-9]{12}$ ]]
project=chapter26-$test_id
root=/srv/broneering.info/output/$project
test "$(realpath "$root")" = "$root"
grep -qx "COMPOSE_PROJECT_NAME=$project" "$root/chapter26.env"
# Both the main test containers and any restored app must carry this exact identity.
for container in $(sudo docker ps -aq --filter "label=booking.acceptance=$project"); do
 test "$(sudo docker inspect -f '{{index .Config.Labels "booking.acceptance"}}' "$container")" = "$project"
 sudo docker rm -f "$container"
done
if test -f "$root/nginx/nginx.pid"; then
 sudo nginx -p "$root/nginx/" -c nginx.conf -s quit
fi
for suffix in database private_files; do
 volume=${project}_$suffix
 test "$(sudo docker volume inspect -f '{{index .Labels "booking.acceptance"}}' "$volume")" = "$project"
done
sudo docker compose -p "$project" --env-file "$root/chapter26.env" -f "$root/infra/acceptance/chapter26.compose.yaml" down --volumes
test -z "$(sudo docker ps -aq --filter "label=com.docker.compose.project=$project")"
test -z "$(sudo docker volume ls -q --filter "label=booking.acceptance=$project")"
# Only after labelled resources are gone, erase this run's credentials and synthetic backup.
sudo rm -rf -- "$root"
archive=/tmp/chapter26-$test_id.tgz
test ! -L "$archive"
sudo rm -f -- "$archive"
curl -fsS https://haldus.broneering.info/api/ready
echo
echo "Removed isolated resources and private artifacts for $project"
