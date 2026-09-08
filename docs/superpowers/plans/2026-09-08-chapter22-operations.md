# Chapter 22 implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development for independent tasks and review, or superpowers:executing-plans for dependent integration. Track steps below.

**Goal:** Make backup, isolated recovery and operational failure detection executable and verifiable.

**Architecture:** PostgreSQL WAL archiving and base backups use pgBackRest. Private files and the contact-removal register are backed up separately; recovered environments remain isolated until checks pass. Application readiness and worker health expose minimal operational state without customer data.

**Tech Stack:** PostgreSQL 18, Docker Compose, pgBackRest, Node 24/TypeScript, Vitest.

**Spec:** Original development plan chapter 22 (`output/chapter12/plan.txt`, lines 689–720), with chapter 21 recovery constraints in `docs/CHAPTER-21.md`.

## Global constraints

- User authorized chapter 22; no new visual design and no continuation to chapter 23.
- No external backup destination exists (owner confirmed). Local tests cannot establish protection against loss of the production server.
- RPO target 15 minutes and RTO target 4 hours are targets, not guarantees. Measure local recovery separately.
- Preserve existing uncommitted chapter 11–21 work. Branch `codex/chapter22-operations` carries the current working tree; no stash, destructive reset, deployment or broad commit.
- Never print credentials, use real client data for tests, or send email/notifications to third parties.

## Task 1: Readiness and worker health

Files: `src/lib/operations-health.ts`, `src/app/api/ready/route.ts`, `src/lib/worker-health.ts`, four existing worker entry points, `tests/operations-health.test.ts`, `tests/worker-health.test.ts`.

- [x] Write and run a failing readiness test: disconnected database returns 503 and only a generic unavailable response; healthy database with required migrations and safe role returns 200.
- [x] Implement bounded database probe and migration/role checks. Keep `/api/health` process-only.
- [x] Write failing worker-health tests: old successful heartbeat, latest failed cycle, and missing heartbeat fail; recent successful heartbeat passes.
- [x] Implement atomic local heartbeat file and worker integration; Docker healthcheck reads the same file. No customer IDs or credentials in state.
- [x] Run focused tests and review actual failure behavior.

## Task 2: PostgreSQL backup and isolated recovery

Files: `infra/backup/` tooling/configuration, backup Compose overlay, local recovery fixture and `docs/CHAPTER-22.md` evidence.

- [x] Build pgBackRest-enabled PostgreSQL image using official PostgreSQL base and package repositories; record resolved versions.
- [x] Configure synchronous WAL archival, bounded archive timeout, encrypted repository and explicit retention. Production activation requires a separately mounted repository and secret configuration.
- [x] Run an isolated synthetic database test: full backup, later committed sentinel, archived WAL, restore to another empty volume, verify both records. Fail on missing archive or nonempty restore destination.
- [x] Record elapsed recovery time and backup scope; do not extrapolate production RPO/RTO.

## Task 3: Files and removal reconciliation

Files: `scripts/operations/` backup/recovery commands, `tests/recovery.test.ts`, removal replay migration if required.

- [x] Test that a restored old contact snapshot stays inaccessible until the external removal manifest is reconciled.
- [x] Add strictly validated contact-ID replay against an explicitly isolated recovery target. Preserve unrelated contacts and billing records; invalidate old exports and management links.
- [x] Back up private files with a manifest and verify referenced file hashes during recovery. Missing/changed files block readiness for promotion.
- [x] Verify tampered manifests and wrong environment IDs fail before data mutation.

## Task 4: Monitoring and release procedure

Files: `infra/operations/`, `compose.server.yaml`, `docs/SERVER.md`, `docs/CHAPTER-22.md`, `docs/PROGRESS.md`.

- [x] Add executable checks for database readiness, worker heartbeat, backup age/archive errors, disk space and HTTPS certificate expiry. Return machine-readable status and nonzero exit on failures; no unsolicited outbound messages.
- [x] Document scheduler installation, alert owner/channel configuration, release ordering and rollback limits. Keep absent production destination and support owner explicit.
- [x] Run full tests, build, Compose validation and isolated restore; record evidence and remaining production gates.

## Execution rulings

The existing chapter plan and the user's instruction to start authorize implementation. Routine local choices do not require repeating approval. The current working tree holds the whole current product, so a separate clean worktree would omit necessary uncommitted implementation. Work remains in place on a dedicated branch, with all subsequent implementation and verification performed by the root agent after the user prohibited sub-agents.

Production installation, external repository, alert recipient and traffic-log integration remain explicit deployment gates in CHAPTER-22.md; local checks do not establish production RPO/RTO.
