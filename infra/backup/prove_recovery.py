"""Disposable local backup/WAL recovery proof. Never uses an existing database."""
import json
import pathlib
import secrets
import subprocess
import time
import uuid

IMAGE = "broneering-backup:chapter22"
PREFIX = "chapter22-proof-" + uuid.uuid4().hex[:12]
DIRECTORY = pathlib.Path(__file__).resolve().parents[2] / "output" / "operations" / PREFIX
VOLUMES = [PREFIX + "-source", PREFIX + "-restored", PREFIX + "-repo"]
CONTAINERS = [PREFIX + "-source", PREFIX + "-restored"]


def run(*args, check=True):
    result = subprocess.run(args, capture_output=True, text=True)
    if check and result.returncode:
        raise RuntimeError(f"Command failed ({args[0]} {args[1]}): {result.stderr[-2000:]}")
    return result


def sql(container, statement):
    return run("docker", "exec", container, "psql", "-U", "booking_owner", "-d", "booking", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement).stdout.strip()


def wait_database(container):
    for _ in range(60):
        result = run("docker", "exec", container, "pg_isready", "-U", "booking_owner", "-d", "booking", check=False)
        if result.returncode == 0:
            return
        time.sleep(1)
    raise RuntimeError("Disposable database did not become ready")


def main():
    DIRECTORY.mkdir(parents=True)
    config = DIRECTORY / "pgbackrest.conf"
    config.write_text("[global]\nrepo1-path=/backup/repository\nrepo1-cipher-type=aes-256-cbc\nrepo1-cipher-pass=" + secrets.token_hex(32) + "\nrepo1-retention-full=2\narchive-timeout=30\nlog-level-console=warn\nlog-level-file=off\n[booking]\npg1-path=/var/lib/postgresql/18/docker\npg1-user=booking_owner\npg1-database=booking\n", encoding="utf8")
    config_mount = str(config.resolve()).replace("\\", "/") + ":/etc/pgbackrest/pgbackrest.conf:ro"
    report = {"scope": "synthetic local Docker recovery, not offsite or production RPO/RTO"}
    try:
        for volume in VOLUMES:
            run("docker", "volume", "create", "--label", "booking.recovery-proof=" + PREFIX, volume)
        run("docker", "run", "--rm", "-v", VOLUMES[2] + ":/backup/repository", "--entrypoint", "sh", IMAGE, "-c", "chown postgres:postgres /backup/repository; chmod 700 /backup/repository")
        run("docker", "run", "-d", "--name", CONTAINERS[0], "--network", "none", "-e", "POSTGRES_USER=booking_owner", "-e", "POSTGRES_DB=booking", "-e", "POSTGRES_PASSWORD=" + secrets.token_hex(24), "-v", VOLUMES[0] + ":/var/lib/postgresql", "-v", VOLUMES[2] + ":/backup/repository", "-v", config_mount, IMAGE, "postgres", "-c", "archive_mode=on", "-c", "archive_timeout=60", "-c", "archive_command=pgbackrest --stanza=booking archive-push %p")
        wait_database(CONTAINERS[0])
        sql(CONTAINERS[0], "CREATE TABLE recovery_sentinel(id integer primary key, value text); INSERT INTO recovery_sentinel VALUES(1,'before backup')")
        run("docker", "exec", "-u", "postgres", CONTAINERS[0], "pgbackrest", "--stanza=booking", "stanza-create")
        start = time.monotonic()
        run("docker", "exec", "-u", "postgres", CONTAINERS[0], "pgbackrest", "--stanza=booking", "--type=full", "--start-fast", "backup")
        report["backupSeconds"] = round(time.monotonic() - start, 2)
        sql(CONTAINERS[0], "INSERT INTO recovery_sentinel VALUES(2,'after backup via WAL'); SELECT pg_switch_wal()")
        run("docker", "exec", "-u", "postgres", CONTAINERS[0], "pgbackrest", "--stanza=booking", "check")
        missing = run("docker", "exec", "-u", "postgres", CONTAINERS[0], "pgbackrest", "--stanza=booking", "archive-get", "00000001000000FF000000FF", "/tmp/missing-proof-wal", check=False)
        if missing.returncode == 0:
            raise RuntimeError("Missing archive unexpectedly succeeded")
        report["missingArchiveRejected"] = True
        report["postgresVersion"] = sql(CONTAINERS[0], "SHOW server_version")
        report["pgbackrestVersion"] = run("docker", "exec", CONTAINERS[0], "pgbackrest", "version").stdout.strip()
        run("docker", "stop", CONTAINERS[0])
        start = time.monotonic()
        run("docker", "run", "--rm", "--network", "none", "-v", VOLUMES[1] + ":/var/lib/postgresql", "-v", VOLUMES[2] + ":/backup/repository", "-v", config_mount, "-e", "RECOVERY_ISOLATED=1", "--entrypoint", "sh", IMAGE, "-c", "mkdir -p /var/lib/postgresql/18/docker; chown -R postgres:postgres /var/lib/postgresql; exec gosu postgres restore-empty --type=default")
        run("docker", "run", "-d", "--network", "none", "--name", CONTAINERS[1], "-v", VOLUMES[1] + ":/var/lib/postgresql", "-v", VOLUMES[2] + ":/backup/repository", "-v", config_mount, IMAGE, "postgres", "-c", "archive_mode=off")
        wait_database(CONTAINERS[1])
        rows = sql(CONTAINERS[1], "SELECT id||':'||value FROM recovery_sentinel ORDER BY id")
        if rows != "1:before backup\n2:after backup via WAL":
            raise RuntimeError("Restored records differ from independent expectation")
        report.update(recoverySeconds=round(time.monotonic()-start, 2), restoredRows=2, postBackupWalRecovered=True)
        result = run("docker", "exec", "-e", "RECOVERY_ISOLATED=1", "-u", "postgres", CONTAINERS[1], "restore-empty", check=False)
        if result.returncode != 73:
            raise RuntimeError("Nonempty target was not rejected")
        report["nonemptyTargetRejected"] = True
        (DIRECTORY / "result.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf8")
        print(json.dumps(report), flush=True)
    finally:
        for container in CONTAINERS:
            run("docker", "rm", "-f", container, check=False)
        for volume in VOLUMES:
            label = run("docker", "volume", "inspect", "--format", '{{index .Labels "booking.recovery-proof"}}', volume, check=False)
            if label.returncode == 0 and label.stdout.strip() == PREFIX:
                run("docker", "volume", "rm", volume)
        config.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
