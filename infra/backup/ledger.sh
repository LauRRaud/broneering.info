#!/bin/sh
set -eu
: "${RECOVERY_LEDGER_ROOT:?}"
case "$RECOVERY_LEDGER_ROOT" in /*) ;; *) exit 64 ;; esac
# UUID avoids overwrites, including retries within the same second.
identifier=$(node -e 'console.log(require("crypto").randomUUID())')
export RECOVERY_ARTIFACT_DIR="$RECOVERY_LEDGER_ROOT/$identifier"
node --import tsx scripts/operations/recovery.ts ledger
# Publish latest only after an authenticated artifact was successfully written.
ln -s "$identifier" "$RECOVERY_LEDGER_ROOT/.latest-$identifier"
mv -Tf "$RECOVERY_LEDGER_ROOT/.latest-$identifier" "$RECOVERY_LEDGER_ROOT/latest"
