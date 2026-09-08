#!/usr/bin/env python3
"""Read-only host checks. JSON contains aggregate state only; exit 1 on any failure."""
import concurrent.futures
import json
import shutil
import socket
import ssl
import subprocess
import sys
import time
import urllib.request
from pathlib import Path


def run(*args):
    return subprocess.run(args, capture_output=True, text=True, check=True, timeout=20).stdout.strip()


def backup_healthy(info, now, max_age):
    stanza = info[0]
    backups = stanza.get('backup', [])
    return stanza['status']['code'] == 0 and bool(backups) and 0 <= now - max(b['timestamp']['stop'] for b in backups) <= max_age


def main():
    config = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
    compose = ['docker', 'compose', '--project-name', config['project'], '-f', config['composeFile']]
    def dbsql(query):
        return run(*compose, 'exec', '-T', 'db', 'psql', '-U', 'booking_owner', '-d', 'booking', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query)
    def readiness():
        with urllib.request.urlopen(config['readyUrl'], timeout=8) as response:
            return response.status == 200 and json.load(response).get('status') == 'ready'
    def workers():
        for name in ['notification-worker', 'export-worker', 'payment-worker', 'billing-worker']:
            identifier = run(*compose, 'ps', '-q', name)
            if not identifier or run('docker', 'inspect', '--format', '{{.State.Health.Status}}', identifier) != 'healthy':
                return False
        return True
    def backups():
        info = json.loads(run(*compose, 'exec', '-T', '--user', 'postgres', 'db', 'pgbackrest', '--stanza=booking', '--output=json', 'info'))
        return backup_healthy(info, time.time(), config.get('backupMaxAgeSeconds', 90000))
    def archive():
        # pgBackRest check forces a WAL round trip separately in the scheduled backup job.
        return dbsql("SELECT current_setting('archive_mode')='on' AND last_archived_time>clock_timestamp()-interval '15 minutes' AND (last_failed_time IS NULL OR last_archived_time>last_failed_time) FROM pg_stat_archiver") == 't'
    def queues():
        return dbsql("SELECT NOT EXISTS(SELECT 1 FROM outbox WHERE status IN ('pending','failed','sending') AND next_attempt_at<clock_timestamp()-interval '15 minutes') AND NOT EXISTS(SELECT 1 FROM export_jobs WHERE status IN ('pending','running','failed') AND next_attempt_at<clock_timestamp()-interval '15 minutes') AND NOT EXISTS(SELECT 1 FROM invoice_mail_outbox WHERE status IN ('pending','failed') AND next_attempt_at<clock_timestamp()-interval '15 minutes')") == 't'
    def disk():
        return all(shutil.disk_usage(p).free >= config.get('minimumFreeBytes', 5*1024**3) and shutil.disk_usage(p).free / shutil.disk_usage(p).total >= .1 for p in config['diskPaths'])
    def certificate():
        host = config['tlsHost']
        with socket.create_connection((host, 443), timeout=8) as connection:
            with ssl.create_default_context().wrap_socket(connection, server_hostname=host) as tls:
                return ssl.cert_time_to_seconds(tls.getpeercert()['notAfter'])-time.time() > 14*86400
    def removal_ledger():
        manifest=Path(config['latestLedgerDirectory'])/'manifest.enc'
        return 0 <= time.time()-manifest.stat().st_mtime <= 900
    checks={'readiness':readiness,'workers':workers,'backup':backups,'walArchive':archive,'queues':queues,'disk':disk,'certificate':certificate,'removalLedger':removal_ledger}
    def check(item):
        name, operation = item
        try: return name, bool(operation())
        except Exception: return name, False
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        results=dict(executor.map(check, checks.items()))
    healthy=all(results.values())
    print(json.dumps({'ok':healthy,'checkedAt':int(time.time()),'checks':results}))
    return 0 if healthy else 1


if __name__=='__main__':
    try: sys.exit(main())
    except Exception:
        print(json.dumps({'ok':False,'error':'MONITOR_CONFIGURATION_FAILED'}))
        sys.exit(1)
