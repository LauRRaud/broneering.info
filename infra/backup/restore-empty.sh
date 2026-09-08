#!/bin/sh
set -eu
if [ "${RECOVERY_ISOLATED:-}" != 1 ]; then
  echo 'RECOVERY_ISOLATED=1 is required' >&2; exit 73
fi
case "${PGDATA:-}" in /*) ;; *) echo 'Absolute PGDATA required' >&2; exit 73;; esac
if [ -L "$PGDATA" ] || [ "$PGDATA" = / ]; then echo 'Unsafe recovery destination' >&2; exit 73; fi
if [ -d "$PGDATA" ] && [ -n "$(find "$PGDATA" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  echo 'Recovery destination is not empty' >&2; exit 73
fi
mkdir -p "$PGDATA"
exec pgbackrest --stanza=booking --pg1-path="$PGDATA" restore "$@"
