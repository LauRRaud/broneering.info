#!/bin/sh
# Run as the designated backup operator with a private environment file loaded.
set -eu
: "${BOOKING_PROJECT:?}" "${BOOKING_ROOT:?}"
case "${1:-}" in
  check) operation=check ;;
  full) operation=backup ;;
  diff) operation=backup ;;
  *) echo 'Use check, full or diff' >&2; exit 64 ;;
esac
cd "$BOOKING_ROOT"
if [ "$operation" = check ]; then
  exec docker compose --project-name "$BOOKING_PROJECT" -f compose.server.yaml -f compose.backup.yaml exec -T --user postgres db pgbackrest --stanza=booking check
fi
exec docker compose --project-name "$BOOKING_PROJECT" -f compose.server.yaml -f compose.backup.yaml exec -T --user postgres db pgbackrest --stanza=booking --type="$1" backup
