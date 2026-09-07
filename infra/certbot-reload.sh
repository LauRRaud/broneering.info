#!/bin/sh
set -eu
case "${RENEWED_LINEAGE:-}" in
  /etc/letsencrypt/live/broneering.info|/etc/letsencrypt/live/broneering-tenant-*)
  /usr/sbin/nginx -t
  /usr/bin/systemctl reload nginx
    ;;
esac
