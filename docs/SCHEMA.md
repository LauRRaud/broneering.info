# Andmebaasiskeem

Genereeritud käsuga `npm run db:schema`. Sisaldab ainult skeemi, mitte ettevõtete andmeid. Äriliste objektide seosed ja API piirid on [DATA-MODEL.md](DATA-MODEL.md).

Migratsioonid: 001_booking.sql, 002_auth.sql, 003_access.sql, 004_domains_embed.sql, 005_service_management.sql, 006_service_group_hierarchy.sql, 007_schedule_management.sql, 008_booking_management.sql, 009_status_occupancy.sql, 010_customers.sql, 011_calendar_reads.sql, 012_languages.sql, 013_service_translations.sql, 014_model_invariants.sql, 015_lifecycle_model.sql, 016_snapshot_guards.sql, 017_request_limits.sql, 018_notification_delivery.sql, 019_company_provisioning.sql, 020_onboarding.sql, 021_export_jobs.sql, 022_media_write_scope.sql, 023_import_upload.sql, 024_import_preview.sql, 025_import_commit.sql, 026_import_cancel.sql, 027_company_exit.sql, 028_customer_merge.sql, 029_subscription_terms.sql, 030_invoice_issuance.sql, 031_payment_records.sql, 032_invoice_credit_notes.sql, 033_credit_integrity.sql, 034_payment_attempts.sql, 035_payment_mandates.sql, 036_autopay_attempts.sql, 037_invoice_payment_links.sql, 038_provider_refunds.sql, 039_billing_period_worker.sql, 040_invoice_mail.sql, 041_invoice_reminders.sql, 042_invoice_replacement.sql, 043_retention_policy_management.sql, 044_import_source_retention.sql, 045_import_external_digest.sql, 046_customer_contact_removal.sql, 047_readiness_metadata.sql.

## access_audit_log

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | bigint | jah | — |
| tenant_id | uuid | ei | — |
| actor_user_id | text | ei | — |
| action | text | jah | — |
| target_user_id | text | ei | — |
| target_id | text | ei | — |
| metadata | jsonb | jah | '{}'::jsonb |
| created_at | timestamp with time zone | jah | now() |

Piirangud:

- access_audit_log_action_not_null: `NOT NULL action`
- access_audit_log_actor_user_id_fkey: `FOREIGN KEY (actor_user_id) REFERENCES auth_user(id) ON DELETE SET NULL`
- access_audit_log_created_at_not_null: `NOT NULL created_at`
- access_audit_log_id_not_null: `NOT NULL id`
- access_audit_log_metadata_check: `CHECK ((jsonb_typeof(metadata) = 'object'::text))`
- access_audit_log_metadata_not_null: `NOT NULL metadata`
- access_audit_log_pkey: `PRIMARY KEY (id)`
- access_audit_log_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`

Indeksid:

- `CREATE UNIQUE INDEX access_audit_log_pkey ON public.access_audit_log USING btree (id)`
- `CREATE INDEX access_audit_tenant_created ON public.access_audit_log USING btree (tenant_id, created_at DESC)`
- `CREATE INDEX customer_correction_history ON public.access_audit_log USING btree (tenant_id, target_id, created_at DESC) WHERE (action = 'customer.correct'::text)`
- `CREATE INDEX service_translation_history ON public.access_audit_log USING btree (tenant_id, target_id, created_at DESC) WHERE ((action ~~ 'translation.%'::text) OR (action = 'catalog.save-service'::text))`

RLS access_audit_tenant_or_self: USING `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (actor_user_id = NULLIF(current_setting('app.user_id'::text, true), ''::text)))`; WITH CHECK `(USING)`.

booking_app: INSERT, SELECT.

## auth_account

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | text | jah | — |
| account_id | text | jah | — |
| provider_id | text | jah | — |
| user_id | text | jah | — |
| access_token | text | ei | — |
| refresh_token | text | ei | — |
| id_token | text | ei | — |
| access_token_expires_at | timestamp with time zone | ei | — |
| refresh_token_expires_at | timestamp with time zone | ei | — |
| scope | text | ei | — |
| password | text | ei | — |
| created_at | timestamp with time zone | jah | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | jah | — |

Piirangud:

- auth_account_account_id_not_null: `NOT NULL account_id`
- auth_account_created_at_not_null: `NOT NULL created_at`
- auth_account_id_not_null: `NOT NULL id`
- auth_account_pkey: `PRIMARY KEY (id)`
- auth_account_provider_id_not_null: `NOT NULL provider_id`
- auth_account_updated_at_not_null: `NOT NULL updated_at`
- auth_account_user_id_fkey: `FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE`
- auth_account_user_id_not_null: `NOT NULL user_id`

Indeksid:

- `CREATE UNIQUE INDEX auth_account_pkey ON public.auth_account USING btree (id)`
- `CREATE INDEX auth_account_user_id_idx ON public.auth_account USING btree (user_id)`

booking_app: DELETE, INSERT, SELECT, UPDATE.

## auth_rate_limit

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | text | jah | — |
| key | text | jah | — |
| count | integer | jah | — |
| last_request | bigint | jah | — |

Piirangud:

- auth_rate_limit_count_not_null: `NOT NULL count`
- auth_rate_limit_id_not_null: `NOT NULL id`
- auth_rate_limit_key_key: `UNIQUE (key)`
- auth_rate_limit_key_not_null: `NOT NULL key`
- auth_rate_limit_last_request_not_null: `NOT NULL last_request`
- auth_rate_limit_pkey: `PRIMARY KEY (id)`

Indeksid:

- `CREATE UNIQUE INDEX auth_rate_limit_key_key ON public.auth_rate_limit USING btree (key)`
- `CREATE UNIQUE INDEX auth_rate_limit_pkey ON public.auth_rate_limit USING btree (id)`

booking_app: DELETE, INSERT, SELECT, UPDATE.

## auth_session

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | text | jah | — |
| expires_at | timestamp with time zone | jah | — |
| token | text | jah | — |
| created_at | timestamp with time zone | jah | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | jah | — |
| ip_address | text | ei | — |
| user_agent | text | ei | — |
| user_id | text | jah | — |
| mfa_verified_at | timestamp with time zone | ei | — |

Piirangud:

- auth_session_created_at_not_null: `NOT NULL created_at`
- auth_session_expires_at_not_null: `NOT NULL expires_at`
- auth_session_id_not_null: `NOT NULL id`
- auth_session_pkey: `PRIMARY KEY (id)`
- auth_session_token_key: `UNIQUE (token)`
- auth_session_token_not_null: `NOT NULL token`
- auth_session_updated_at_not_null: `NOT NULL updated_at`
- auth_session_user_id_fkey: `FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE`
- auth_session_user_id_not_null: `NOT NULL user_id`

Indeksid:

- `CREATE UNIQUE INDEX auth_session_pkey ON public.auth_session USING btree (id)`
- `CREATE UNIQUE INDEX auth_session_token_key ON public.auth_session USING btree (token)`
- `CREATE INDEX auth_session_user_id_idx ON public.auth_session USING btree (user_id)`

booking_app: DELETE, INSERT, SELECT, UPDATE.

## auth_two_factor

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | text | jah | — |
| secret | text | jah | — |
| backup_codes | text | jah | — |
| user_id | text | jah | — |
| verified | boolean | ei | — |
| failed_verification_count | integer | ei | — |
| locked_until | timestamp with time zone | ei | — |

Piirangud:

- auth_two_factor_backup_codes_not_null: `NOT NULL backup_codes`
- auth_two_factor_id_not_null: `NOT NULL id`
- auth_two_factor_pkey: `PRIMARY KEY (id)`
- auth_two_factor_secret_not_null: `NOT NULL secret`
- auth_two_factor_user_id_fkey: `FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE`
- auth_two_factor_user_id_not_null: `NOT NULL user_id`

Indeksid:

- `CREATE UNIQUE INDEX auth_two_factor_pkey ON public.auth_two_factor USING btree (id)`
- `CREATE INDEX auth_two_factor_secret_idx ON public.auth_two_factor USING btree (secret)`
- `CREATE INDEX auth_two_factor_user_id_idx ON public.auth_two_factor USING btree (user_id)`

booking_app: DELETE, INSERT, SELECT, UPDATE.

## auth_user

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | text | jah | — |
| name | text | jah | — |
| email | text | jah | — |
| email_verified | boolean | jah | — |
| image | text | ei | — |
| created_at | timestamp with time zone | jah | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | jah | CURRENT_TIMESTAMP |
| two_factor_enabled | boolean | ei | — |
| is_platform_admin | boolean | jah | false |
| disabled | boolean | jah | false |

Piirangud:

- auth_user_created_at_not_null: `NOT NULL created_at`
- auth_user_disabled_not_null: `NOT NULL disabled`
- auth_user_email_key: `UNIQUE (email)`
- auth_user_email_not_null: `NOT NULL email`
- auth_user_email_verified_not_null: `NOT NULL email_verified`
- auth_user_id_not_null: `NOT NULL id`
- auth_user_is_platform_admin_not_null: `NOT NULL is_platform_admin`
- auth_user_name_not_null: `NOT NULL name`
- auth_user_pkey: `PRIMARY KEY (id)`
- auth_user_updated_at_not_null: `NOT NULL updated_at`

Indeksid:

- `CREATE UNIQUE INDEX auth_user_email_key ON public.auth_user USING btree (email)`
- `CREATE UNIQUE INDEX auth_user_pkey ON public.auth_user USING btree (id)`

booking_app: DELETE, INSERT, SELECT, UPDATE.

## auth_verification

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | text | jah | — |
| identifier | text | jah | — |
| value | text | jah | — |
| expires_at | timestamp with time zone | jah | — |
| created_at | timestamp with time zone | jah | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | jah | CURRENT_TIMESTAMP |

Piirangud:

- auth_verification_created_at_not_null: `NOT NULL created_at`
- auth_verification_expires_at_not_null: `NOT NULL expires_at`
- auth_verification_id_not_null: `NOT NULL id`
- auth_verification_identifier_not_null: `NOT NULL identifier`
- auth_verification_pkey: `PRIMARY KEY (id)`
- auth_verification_updated_at_not_null: `NOT NULL updated_at`
- auth_verification_value_not_null: `NOT NULL value`

Indeksid:

- `CREATE INDEX auth_verification_identifier_idx ON public.auth_verification USING btree (identifier)`
- `CREATE UNIQUE INDEX auth_verification_pkey ON public.auth_verification USING btree (id)`

booking_app: DELETE, INSERT, SELECT, UPDATE.

## billing_commands

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| request_key | uuid | jah | — |
| action | text | jah | — |
| payload_hash | text | jah | — |
| reply | jsonb | jah | — |
| actor_user_id | text | jah | — |
| created_at | timestamp with time zone | jah | now() |

Piirangud:

- billing_commands_action_check: `CHECK (((length(action) >= 1) AND (length(action) <= 80)))`
- billing_commands_action_not_null: `NOT NULL action`
- billing_commands_actor_user_id_fkey: `FOREIGN KEY (actor_user_id) REFERENCES auth_user(id)`
- billing_commands_actor_user_id_not_null: `NOT NULL actor_user_id`
- billing_commands_created_at_not_null: `NOT NULL created_at`
- billing_commands_payload_hash_check: `CHECK ((payload_hash ~ '^[0-9a-f]{64}$'::text))`
- billing_commands_payload_hash_not_null: `NOT NULL payload_hash`
- billing_commands_pkey: `PRIMARY KEY (tenant_id, request_key)`
- billing_commands_reply_check: `CHECK ((jsonb_typeof(reply) = 'object'::text))`
- billing_commands_reply_not_null: `NOT NULL reply`
- billing_commands_request_key_not_null: `NOT NULL request_key`
- billing_commands_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- billing_commands_tenant_id_not_null: `NOT NULL tenant_id`

Indeksid:

- `CREATE UNIQUE INDEX billing_commands_pkey ON public.billing_commands USING btree (tenant_id, request_key)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT.

## billing_issuer_versions

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| version | integer | jah | — |
| request_key | uuid | jah | — |
| payload_hash | text | jah | — |
| settings | jsonb | jah | — |
| approved_by | text | jah | — |
| approved_at | timestamp with time zone | jah | now() |
| approval_note | text | jah | — |

Piirangud:

- billing_issuer_versions_approval_note_check: `CHECK (((length(btrim(approval_note)) >= 10) AND (length(btrim(approval_note)) <= 1000)))`
- billing_issuer_versions_approval_note_not_null: `NOT NULL approval_note`
- billing_issuer_versions_approved_at_not_null: `NOT NULL approved_at`
- billing_issuer_versions_approved_by_fkey: `FOREIGN KEY (approved_by) REFERENCES auth_user(id)`
- billing_issuer_versions_approved_by_not_null: `NOT NULL approved_by`
- billing_issuer_versions_payload_hash_check: `CHECK ((payload_hash ~ '^[0-9a-f]{64}$'::text))`
- billing_issuer_versions_payload_hash_not_null: `NOT NULL payload_hash`
- billing_issuer_versions_pkey: `PRIMARY KEY (version)`
- billing_issuer_versions_request_key_key: `UNIQUE (request_key)`
- billing_issuer_versions_request_key_not_null: `NOT NULL request_key`
- billing_issuer_versions_settings_check: `CHECK ((jsonb_typeof(settings) = 'object'::text))`
- billing_issuer_versions_settings_not_null: `NOT NULL settings`
- billing_issuer_versions_version_check: `CHECK ((version > 0))`
- billing_issuer_versions_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE UNIQUE INDEX billing_issuer_versions_pkey ON public.billing_issuer_versions USING btree (version)`
- `CREATE UNIQUE INDEX billing_issuer_versions_request_key_key ON public.billing_issuer_versions USING btree (request_key)`

booking_app: INSERT, SELECT.

## booking_allocations

Vaade; RLS: ei; FORCE RLS: ei; security_invoker=true.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | ei | — |
| tenant_id | uuid | ei | — |
| booking_id | uuid | ei | — |
| staff_id | uuid | ei | — |
| service_start | timestamp with time zone | ei | — |
| service_end | timestamp with time zone | ei | — |
| occupied | tstzrange | ei | — |
| buffer_before | integer | ei | — |
| buffer_after | integer | ei | — |
| version | integer | ei | — |
| active | boolean | ei | — |

booking_app: SELECT.

```sql
 SELECT id,
    tenant_id,
    id AS booking_id,
    staff_id,
    start_at AS service_start,
    end_at AS service_end,
    occupied,
    buffer_before,
    buffer_after,
    version,
    status <> 'cancelled'::text AS active
   FROM bookings;
```

## booking_commands

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| request_key | uuid | jah | — |
| booking_id | uuid | jah | — |
| principal | text | jah | — |
| payload_hash | text | jah | — |
| encrypted_result | text | jah | — |
| created_at | timestamp with time zone | jah | now() |

Piirangud:

- booking_commands_booking_id_not_null: `NOT NULL booking_id`
- booking_commands_created_at_not_null: `NOT NULL created_at`
- booking_commands_encrypted_result_not_null: `NOT NULL encrypted_result`
- booking_commands_payload_hash_not_null: `NOT NULL payload_hash`
- booking_commands_pkey: `PRIMARY KEY (tenant_id, request_key)`
- booking_commands_principal_not_null: `NOT NULL principal`
- booking_commands_request_key_not_null: `NOT NULL request_key`
- booking_commands_tenant_id_booking_id_fkey: `FOREIGN KEY (tenant_id, booking_id) REFERENCES bookings(tenant_id, id) ON DELETE CASCADE`
- booking_commands_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- booking_commands_tenant_id_not_null: `NOT NULL tenant_id`

Indeksid:

- `CREATE UNIQUE INDEX booking_commands_pkey ON public.booking_commands USING btree (tenant_id, request_key)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT.

## booking_events

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| booking_id | uuid | jah | — |
| actor_user_id | text | ei | — |
| action | text | jah | — |
| reason | text | jah | ''::text |
| before_data | jsonb | ei | — |
| after_data | jsonb | jah | — |
| created_at | timestamp with time zone | jah | now() |

Piirangud:

- booking_events_action_not_null: `NOT NULL action`
- booking_events_actor_user_id_fkey: `FOREIGN KEY (actor_user_id) REFERENCES auth_user(id) ON DELETE SET NULL`
- booking_events_after_data_not_null: `NOT NULL after_data`
- booking_events_booking_id_not_null: `NOT NULL booking_id`
- booking_events_created_at_not_null: `NOT NULL created_at`
- booking_events_id_not_null: `NOT NULL id`
- booking_events_pkey: `PRIMARY KEY (id)`
- booking_events_reason_not_null: `NOT NULL reason`
- booking_events_tenant_id_booking_id_fkey: `FOREIGN KEY (tenant_id, booking_id) REFERENCES bookings(tenant_id, id) ON DELETE CASCADE`
- booking_events_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- booking_events_tenant_id_not_null: `NOT NULL tenant_id`

Indeksid:

- `CREATE INDEX booking_events_history ON public.booking_events USING btree (tenant_id, booking_id, created_at, id)`
- `CREATE UNIQUE INDEX booking_events_pkey ON public.booking_events USING btree (id)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT.

## booking_management_tokens

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| booking_id | uuid | jah | — |
| token_hash | text | jah | — |
| expires_at | timestamp with time zone | jah | — |
| after_end_hours | integer | jah | — |
| revoked_at | timestamp with time zone | ei | — |
| created_at | timestamp with time zone | jah | now() |
| encrypted_token | text | ei | — |

Piirangud:

- booking_management_tokens_after_end_hours_check: `CHECK (((after_end_hours >= 0) AND (after_end_hours <= 8760)))`
- booking_management_tokens_after_end_hours_not_null: `NOT NULL after_end_hours`
- booking_management_tokens_booking_id_not_null: `NOT NULL booking_id`
- booking_management_tokens_created_at_not_null: `NOT NULL created_at`
- booking_management_tokens_expires_at_not_null: `NOT NULL expires_at`
- booking_management_tokens_id_not_null: `NOT NULL id`
- booking_management_tokens_pkey: `PRIMARY KEY (id)`
- booking_management_tokens_tenant_id_booking_id_fkey: `FOREIGN KEY (tenant_id, booking_id) REFERENCES bookings(tenant_id, id) ON DELETE CASCADE`
- booking_management_tokens_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- booking_management_tokens_tenant_id_not_null: `NOT NULL tenant_id`
- booking_management_tokens_token_hash_check: `CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text))`
- booking_management_tokens_token_hash_key: `UNIQUE (token_hash)`
- booking_management_tokens_token_hash_not_null: `NOT NULL token_hash`

Indeksid:

- `CREATE UNIQUE INDEX booking_management_tokens_pkey ON public.booking_management_tokens USING btree (id)`
- `CREATE UNIQUE INDEX booking_management_tokens_token_hash_key ON public.booking_management_tokens USING btree (token_hash)`
- `CREATE UNIQUE INDEX booking_one_active_token ON public.booking_management_tokens USING btree (tenant_id, booking_id) WHERE (revoked_at IS NULL)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## booking_requests

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| request_key | uuid | jah | — |
| payload_hash | text | jah | — |
| booking_id | uuid | jah | — |
| created_at | timestamp with time zone | jah | now() |
| response_data | jsonb | ei | — |
| encrypted_link | text | ei | — |

Piirangud:

- booking_requests_booking_id_not_null: `NOT NULL booking_id`
- booking_requests_created_at_not_null: `NOT NULL created_at`
- booking_requests_payload_hash_not_null: `NOT NULL payload_hash`
- booking_requests_pkey: `PRIMARY KEY (tenant_id, request_key)`
- booking_requests_request_key_not_null: `NOT NULL request_key`
- booking_requests_tenant_id_booking_id_fkey: `FOREIGN KEY (tenant_id, booking_id) REFERENCES bookings(tenant_id, id)`
- booking_requests_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- booking_requests_tenant_id_not_null: `NOT NULL tenant_id`

Indeksid:

- `CREATE UNIQUE INDEX booking_requests_pkey ON public.booking_requests USING btree (tenant_id, request_key)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## bookings

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| reference | text | jah | — |
| service_id | uuid | jah | — |
| staff_id | uuid | jah | — |
| service_name | text | jah | — |
| staff_name | text | jah | — |
| customer_name | text | jah | — |
| customer_email | text | ei | — |
| customer_phone | text | ei | — |
| start_at | timestamp with time zone | jah | — |
| end_at | timestamp with time zone | jah | — |
| occupied | tstzrange | jah | — |
| price | integer | jah | — |
| currency | text | jah | 'EUR'::text |
| duration | integer | jah | — |
| buffer_before | integer | jah | — |
| buffer_after | integer | jah | — |
| status | text | jah | 'confirmed'::text |
| version | integer | jah | 1 |
| created_at | timestamp with time zone | jah | now() |
| cancellation_hours | integer | ei | — |
| source | text | jah | 'online'::text |
| attention_reason | text | ei | — |
| updated_at | timestamp with time zone | jah | now() |
| customer_id | uuid | jah | — |
| customer_language | text | jah | 'et'::text |
| customer_notifications | boolean | jah | true |
| is_test | boolean | jah | false |
| contact_redacted_at | timestamp with time zone | ei | — |

Piirangud:

- booking_allocation_matches_buffers: `CHECK (((lower(occupied) = (start_at - ((buffer_before)::double precision * '00:01:00'::interval))) AND (upper(occupied) = (end_at + ((buffer_after)::double precision * '00:01:00'::interval)))))`
- booking_buffer_bounds: `CHECK ((((buffer_before >= 0) AND (buffer_before <= 240)) AND ((buffer_after >= 0) AND (buffer_after <= 240))))`
- booking_duration_bounds: `CHECK (((duration >= 5) AND (duration <= 720)))`
- booking_duration_matches_time: `CHECK ((end_at = (start_at + ((duration)::double precision * '00:01:00'::interval))))`
- booking_version_positive: `CHECK ((version > 0))`
- bookings_buffer_after_not_null: `NOT NULL buffer_after`
- bookings_buffer_before_not_null: `NOT NULL buffer_before`
- bookings_cancellation_hours_check: `CHECK ((cancellation_hours >= 0))`
- bookings_check: `CHECK ((end_at > start_at))`
- bookings_check1: `CHECK (((NOT isempty(occupied)) AND (NOT lower_inf(occupied)) AND (NOT upper_inf(occupied)) AND lower_inc(occupied) AND (NOT upper_inc(occupied)) AND (lower(occupied) <= start_at) AND (upper(occupied) >= end_at)))`
- bookings_created_at_not_null: `NOT NULL created_at`
- bookings_currency_check: `CHECK ((currency = 'EUR'::text))`
- bookings_currency_not_null: `NOT NULL currency`
- bookings_customer_id_not_null: `NOT NULL customer_id`
- bookings_customer_language_check: `CHECK ((customer_language = ANY (ARRAY['et'::text, 'en'::text, 'ru'::text])))`
- bookings_customer_language_not_null: `NOT NULL customer_language`
- bookings_customer_name_not_null: `NOT NULL customer_name`
- bookings_customer_notifications_not_null: `NOT NULL customer_notifications`
- bookings_duration_check: `CHECK ((duration > 0))`
- bookings_duration_not_null: `NOT NULL duration`
- bookings_end_at_not_null: `NOT NULL end_at`
- bookings_id_not_null: `NOT NULL id`
- bookings_is_test_not_null: `NOT NULL is_test`
- bookings_no_overlap: `EXCLUDE USING gist (tenant_id WITH =, staff_id WITH =, occupied WITH &&) WHERE ((status <> 'cancelled'::text))`
- bookings_occupied_not_null: `NOT NULL occupied`
- bookings_pkey: `PRIMARY KEY (id)`
- bookings_price_check: `CHECK ((price >= 0))`
- bookings_price_not_null: `NOT NULL price`
- bookings_reference_key: `UNIQUE (reference)`
- bookings_reference_not_null: `NOT NULL reference`
- bookings_service_id_not_null: `NOT NULL service_id`
- bookings_service_name_not_null: `NOT NULL service_name`
- bookings_source_check: `CHECK ((source = ANY (ARRAY['online'::text, 'manual'::text, 'import'::text])))`
- bookings_source_not_null: `NOT NULL source`
- bookings_staff_id_not_null: `NOT NULL staff_id`
- bookings_staff_name_not_null: `NOT NULL staff_name`
- bookings_start_at_not_null: `NOT NULL start_at`
- bookings_status_check: `CHECK ((status = ANY (ARRAY['confirmed'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])))`
- bookings_status_not_null: `NOT NULL status`
- bookings_tenant_id_customer_id_fkey: `FOREIGN KEY (tenant_id, customer_id) REFERENCES customers(tenant_id, id)`
- bookings_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- bookings_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- bookings_tenant_id_not_null: `NOT NULL tenant_id`
- bookings_tenant_id_service_id_fkey: `FOREIGN KEY (tenant_id, service_id) REFERENCES services(tenant_id, id)`
- bookings_tenant_id_staff_id_fkey: `FOREIGN KEY (tenant_id, staff_id) REFERENCES staff(tenant_id, id)`
- bookings_updated_at_not_null: `NOT NULL updated_at`
- bookings_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE INDEX bookings_attention ON public.bookings USING btree (tenant_id, start_at) WHERE ((status = 'confirmed'::text) AND (attention_reason IS NOT NULL))`
- `CREATE INDEX bookings_customer_history ON public.bookings USING btree (tenant_id, customer_id, start_at, id)`
- `CREATE INDEX bookings_no_overlap ON public.bookings USING gist (tenant_id, staff_id, occupied) WHERE (status <> 'cancelled'::text)`
- `CREATE UNIQUE INDEX bookings_pkey ON public.bookings USING btree (id)`
- `CREATE UNIQUE INDEX bookings_reference_key ON public.bookings USING btree (reference)`
- `CREATE UNIQUE INDEX bookings_tenant_id_id_key ON public.bookings USING btree (tenant_id, id)`
- `CREATE INDEX bookings_tenant_staff_start ON public.bookings USING btree (tenant_id, staff_id, start_at, id)`
- `CREATE INDEX bookings_tenant_start ON public.bookings USING btree (tenant_id, start_at)`
- `CREATE INDEX booking_test_tenant ON public.bookings USING btree (tenant_id) WHERE is_test`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER assign_booking_customer BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION assign_booking_customer()`
- `CREATE TRIGGER removed_booking_contacts BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION protect_removed_contacts()`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## company_provision_requests

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| actor_user_id | text | jah | — |
| request_key | uuid | jah | — |
| tenant_id | uuid | jah | — |
| payload_hash | text | jah | — |
| encrypted_reply | text | jah | — |
| created_at | timestamp with time zone | jah | now() |

Piirangud:

- company_provision_requests_actor_user_id_fkey: `FOREIGN KEY (actor_user_id) REFERENCES auth_user(id)`
- company_provision_requests_actor_user_id_not_null: `NOT NULL actor_user_id`
- company_provision_requests_created_at_not_null: `NOT NULL created_at`
- company_provision_requests_encrypted_reply_not_null: `NOT NULL encrypted_reply`
- company_provision_requests_payload_hash_check: `CHECK ((payload_hash ~ '^[0-9a-f]{64}$'::text))`
- company_provision_requests_payload_hash_not_null: `NOT NULL payload_hash`
- company_provision_requests_pkey: `PRIMARY KEY (actor_user_id, request_key)`
- company_provision_requests_request_key_not_null: `NOT NULL request_key`
- company_provision_requests_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- company_provision_requests_tenant_id_not_null: `NOT NULL tenant_id`

Indeksid:

- `CREATE UNIQUE INDEX company_provision_requests_pkey ON public.company_provision_requests USING btree (actor_user_id, request_key)`

RLS company_provision_actor: USING `(actor_user_id = NULLIF(current_setting('app.user_id'::text, true), ''::text))`; WITH CHECK `(USING)`.

booking_app: INSERT, SELECT.

## contact_removals

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| customer_ids | uuid[] | jah | — |
| booking_ids | uuid[] | jah | — |
| removed_at | timestamp with time zone | jah | clock_timestamp() |
| requested_by | text | ei | — |

Piirangud:

- contact_removals_booking_ids_not_null: `NOT NULL booking_ids`
- contact_removals_customer_ids_not_null: `NOT NULL customer_ids`
- contact_removals_id_not_null: `NOT NULL id`
- contact_removals_pkey: `PRIMARY KEY (id)`
- contact_removals_removed_at_not_null: `NOT NULL removed_at`
- contact_removals_requested_by_fkey: `FOREIGN KEY (requested_by) REFERENCES auth_user(id)`
- contact_removals_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- contact_removals_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- contact_removals_tenant_id_not_null: `NOT NULL tenant_id`

Indeksid:

- `CREATE UNIQUE INDEX contact_removals_pkey ON public.contact_removals USING btree (id)`
- `CREATE UNIQUE INDEX contact_removals_tenant_id_id_key ON public.contact_removals USING btree (tenant_id, id)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(USING)`.

booking_app: SELECT.

## customer_merges

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| request_key | uuid | jah | — |
| source_id | uuid | jah | — |
| target_id | uuid | jah | — |
| payload_hash | text | jah | — |
| booking_count | integer | jah | — |
| created_at | timestamp with time zone | jah | now() |

Piirangud:

- customer_merges_booking_count_check: `CHECK ((booking_count >= 0))`
- customer_merges_booking_count_not_null: `NOT NULL booking_count`
- customer_merges_check: `CHECK ((source_id <> target_id))`
- customer_merges_created_at_not_null: `NOT NULL created_at`
- customer_merges_payload_hash_not_null: `NOT NULL payload_hash`
- customer_merges_pkey: `PRIMARY KEY (tenant_id, request_key)`
- customer_merges_request_key_not_null: `NOT NULL request_key`
- customer_merges_source_id_not_null: `NOT NULL source_id`
- customer_merges_target_id_not_null: `NOT NULL target_id`
- customer_merges_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- customer_merges_tenant_id_not_null: `NOT NULL tenant_id`
- customer_merges_tenant_id_source_id_fkey: `FOREIGN KEY (tenant_id, source_id) REFERENCES customers(tenant_id, id)`
- customer_merges_tenant_id_target_id_fkey: `FOREIGN KEY (tenant_id, target_id) REFERENCES customers(tenant_id, id)`

Indeksid:

- `CREATE UNIQUE INDEX customer_merges_pkey ON public.customer_merges USING btree (tenant_id, request_key)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT.

## customers

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| source_key | text | jah | — |
| name | text | jah | — |
| email | text | ei | — |
| phone | text | ei | — |
| version | integer | jah | 1 |
| updated_at | timestamp with time zone | jah | now() |
| merged_into_id | uuid | ei | — |
| contact_redacted_at | timestamp with time zone | ei | — |

Piirangud:

- customers_check: `CHECK (((merged_into_id IS NULL) OR (merged_into_id <> id)))`
- customers_id_not_null: `NOT NULL id`
- customers_name_check: `CHECK (((length(name) >= 2) AND (length(name) <= 120)))`
- customers_name_not_null: `NOT NULL name`
- customers_pkey: `PRIMARY KEY (id)`
- customers_source_key_not_null: `NOT NULL source_key`
- customers_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`
- customers_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- customers_tenant_id_merged_into_id_fkey: `FOREIGN KEY (tenant_id, merged_into_id) REFERENCES customers(tenant_id, id)`
- customers_tenant_id_not_null: `NOT NULL tenant_id`
- customers_tenant_id_source_key_key: `UNIQUE (tenant_id, source_key)`
- customers_updated_at_not_null: `NOT NULL updated_at`
- customers_version_check: `CHECK ((version > 0))`
- customers_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE INDEX customer_merge_target ON public.customers USING btree (tenant_id, merged_into_id) WHERE (merged_into_id IS NOT NULL)`
- `CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id)`
- `CREATE UNIQUE INDEX customers_tenant_id_id_key ON public.customers USING btree (tenant_id, id)`
- `CREATE UNIQUE INDEX customers_tenant_id_source_key_key ON public.customers USING btree (tenant_id, source_key)`
- `CREATE INDEX customers_tenant_name ON public.customers USING btree (tenant_id, name, id)`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER removed_customer_contacts BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION protect_removed_contacts()`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## domain_reservations

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| hostname | text | jah | — |
| tenant_id | uuid | jah | — |
| reserved_at | timestamp with time zone | jah | now() |

Piirangud:

- domain_reservations_hostname_not_null: `NOT NULL hostname`
- domain_reservations_pkey: `PRIMARY KEY (hostname)`
- domain_reservations_reserved_at_not_null: `NOT NULL reserved_at`
- domain_reservations_tenant_id_not_null: `NOT NULL tenant_id`

Indeksid:

- `CREATE UNIQUE INDEX domain_reservations_pkey ON public.domain_reservations USING btree (hostname)`

booking_app: õigused puuduvad.

## export_jobs

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| request_key | uuid | jah | — |
| requested_by | text | jah | — |
| created_at | timestamp with time zone | jah | now() |
| scope | jsonb | jah | — |
| status | text | jah | 'pending'::text |
| result_media_id | uuid | ei | — |
| download_token_hash | text | ei | — |
| expires_at | timestamp with time zone | jah | — |
| last_error_code | text | ei | — |
| version | integer | jah | 1 |
| attempts | integer | jah | 0 |
| claim_token | uuid | ei | — |
| locked_until | timestamp with time zone | ei | — |
| record_count | bigint | jah | 0 |
| next_attempt_at | timestamp with time zone | jah | now() |

Piirangud:

- export_jobs_attempts_check: `CHECK (((attempts >= 0) AND (attempts <= 5)))`
- export_jobs_attempts_not_null: `NOT NULL attempts`
- export_jobs_check: `CHECK ((expires_at > created_at))`
- export_jobs_created_at_not_null: `NOT NULL created_at`
- export_jobs_download_token_hash_check: `CHECK ((download_token_hash ~ '^[0-9a-f]{64}$'::text))`
- export_jobs_download_token_hash_key: `UNIQUE (download_token_hash)`
- export_jobs_expires_at_not_null: `NOT NULL expires_at`
- export_jobs_id_not_null: `NOT NULL id`
- export_jobs_next_attempt_at_not_null: `NOT NULL next_attempt_at`
- export_jobs_pkey: `PRIMARY KEY (id)`
- export_jobs_record_count_check: `CHECK ((record_count >= 0))`
- export_jobs_record_count_not_null: `NOT NULL record_count`
- export_jobs_request_key_not_null: `NOT NULL request_key`
- export_jobs_requested_by_fkey: `FOREIGN KEY (requested_by) REFERENCES auth_user(id)`
- export_jobs_requested_by_not_null: `NOT NULL requested_by`
- export_jobs_scope_check: `CHECK ((jsonb_typeof(scope) = 'object'::text))`
- export_jobs_scope_not_null: `NOT NULL scope`
- export_jobs_status_check: `CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'ready'::text, 'failed'::text, 'expired'::text, 'cancelled'::text])))`
- export_jobs_status_not_null: `NOT NULL status`
- export_jobs_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- export_jobs_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- export_jobs_tenant_id_not_null: `NOT NULL tenant_id`
- export_jobs_tenant_id_request_key_key: `UNIQUE (tenant_id, request_key)`
- export_jobs_tenant_id_result_media_id_fkey: `FOREIGN KEY (tenant_id, result_media_id) REFERENCES media(tenant_id, id)`
- export_jobs_version_check: `CHECK ((version > 0))`
- export_jobs_version_not_null: `NOT NULL version`
- export_ready_media: `CHECK (((status <> 'ready'::text) OR (result_media_id IS NOT NULL)))`

Indeksid:

- `CREATE INDEX export_expiration ON public.export_jobs USING btree (expires_at) WHERE (status = 'ready'::text)`
- `CREATE UNIQUE INDEX export_jobs_download_token_hash_key ON public.export_jobs USING btree (download_token_hash)`
- `CREATE UNIQUE INDEX export_jobs_pkey ON public.export_jobs USING btree (id)`
- `CREATE UNIQUE INDEX export_jobs_tenant_id_id_key ON public.export_jobs USING btree (tenant_id, id)`
- `CREATE UNIQUE INDEX export_jobs_tenant_id_request_key_key ON public.export_jobs USING btree (tenant_id, request_key)`
- `CREATE INDEX export_work_queue ON public.export_jobs USING btree (tenant_id, next_attempt_at, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'running'::text, 'failed'::text]))`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## import_batches

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| request_key | uuid | jah | — |
| source_media_id | uuid | jah | — |
| requested_by | text | jah | — |
| created_at | timestamp with time zone | jah | now() |
| status | text | jah | 'uploaded'::text |
| mapping | jsonb | jah | '{}'::jsonb |
| error_report | jsonb | jah | '[]'::jsonb |
| total_rows | integer | jah | 0 |
| imported_rows | integer | jah | 0 |
| rejected_rows | integer | jah | 0 |
| approved_by | text | ei | — |
| approved_at | timestamp with time zone | ei | — |
| reminders_enabled | boolean | jah | false |
| reminders_approved_by | text | ei | — |
| reminders_approved_at | timestamp with time zone | ei | — |
| version | integer | jah | 1 |
| kind | text | ei | — |
| delimiter | text | ei | — |
| headers | jsonb | jah | '[]'::jsonb |
| cutover_at | timestamp with time zone | ei | — |
| timezone | text | ei | — |
| commit_options | jsonb | ei | — |
| source_purged_at | timestamp with time zone | ei | — |

Piirangud:

- import_batches_approved_by_fkey: `FOREIGN KEY (approved_by) REFERENCES auth_user(id)`
- import_batches_check: `CHECK ((((imported_rows)::bigint + (rejected_rows)::bigint) <= (total_rows)::bigint))`
- import_batches_check1: `CHECK (((status <> ALL (ARRAY['approved'::text, 'running'::text, 'completed'::text])) OR ((approved_by IS NOT NULL) AND (approved_at IS NOT NULL))))`
- import_batches_check2: `CHECK (((NOT reminders_enabled) OR ((reminders_approved_by IS NOT NULL) AND (reminders_approved_at IS NOT NULL))))`
- import_batches_commit_options_check: `CHECK (((commit_options IS NULL) OR (jsonb_typeof(commit_options) = 'object'::text)))`
- import_batches_created_at_not_null: `NOT NULL created_at`
- import_batches_delimiter_check: `CHECK ((delimiter = ANY (ARRAY[','::text, ';'::text])))`
- import_batches_error_report_check: `CHECK ((jsonb_typeof(error_report) = 'array'::text))`
- import_batches_error_report_not_null: `NOT NULL error_report`
- import_batches_headers_check: `CHECK ((jsonb_typeof(headers) = 'array'::text))`
- import_batches_headers_not_null: `NOT NULL headers`
- import_batches_id_not_null: `NOT NULL id`
- import_batches_imported_rows_check: `CHECK ((imported_rows >= 0))`
- import_batches_imported_rows_not_null: `NOT NULL imported_rows`
- import_batches_kind_check: `CHECK ((kind = ANY (ARRAY['services'::text, 'staff'::text, 'customers'::text, 'bookings'::text])))`
- import_batches_mapping_check: `CHECK ((jsonb_typeof(mapping) = 'object'::text))`
- import_batches_mapping_not_null: `NOT NULL mapping`
- import_batches_pkey: `PRIMARY KEY (id)`
- import_batches_rejected_rows_check: `CHECK ((rejected_rows >= 0))`
- import_batches_rejected_rows_not_null: `NOT NULL rejected_rows`
- import_batches_reminders_approved_by_fkey: `FOREIGN KEY (reminders_approved_by) REFERENCES auth_user(id)`
- import_batches_reminders_enabled_not_null: `NOT NULL reminders_enabled`
- import_batches_request_key_not_null: `NOT NULL request_key`
- import_batches_requested_by_fkey: `FOREIGN KEY (requested_by) REFERENCES auth_user(id)`
- import_batches_requested_by_not_null: `NOT NULL requested_by`
- import_batches_source_media_id_not_null: `NOT NULL source_media_id`
- import_batches_status_check: `CHECK ((status = ANY (ARRAY['uploaded'::text, 'preview'::text, 'approved'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))`
- import_batches_status_not_null: `NOT NULL status`
- import_batches_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- import_batches_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- import_batches_tenant_id_not_null: `NOT NULL tenant_id`
- import_batches_tenant_id_request_key_key: `UNIQUE (tenant_id, request_key)`
- import_batches_tenant_id_source_media_id_fkey: `FOREIGN KEY (tenant_id, source_media_id) REFERENCES media(tenant_id, id)`
- import_batches_total_rows_check: `CHECK ((total_rows >= 0))`
- import_batches_total_rows_not_null: `NOT NULL total_rows`
- import_batches_version_check: `CHECK ((version > 0))`
- import_batches_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE UNIQUE INDEX import_batches_pkey ON public.import_batches USING btree (id)`
- `CREATE UNIQUE INDEX import_batches_tenant_id_id_key ON public.import_batches USING btree (tenant_id, id)`
- `CREATE UNIQUE INDEX import_batches_tenant_id_request_key_key ON public.import_batches USING btree (tenant_id, request_key)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT.

## import_rows

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| batch_id | uuid | jah | — |
| row_number | integer | jah | — |
| fingerprint | text | jah | — |
| status | text | jah | — |
| error_code | text | ei | — |
| service_id | uuid | ei | — |
| staff_id | uuid | ei | — |
| customer_id | uuid | ei | — |
| booking_id | uuid | ei | — |
| source_values | jsonb | jah | '[]'::jsonb |
| normalized | jsonb | jah | '{}'::jsonb |
| warning_codes | jsonb | jah | '[]'::jsonb |
| external_id_hash | text | ei | — |

Piirangud:

- import_rows_batch_id_not_null: `NOT NULL batch_id`
- import_rows_check: `CHECK ((((status = 'imported'::text) AND (num_nonnulls(service_id, staff_id, customer_id, booking_id) = 1)) OR ((status <> 'imported'::text) AND (num_nonnulls(service_id, staff_id, customer_id, booking_id) = 0))))`
- import_rows_external_id_hash_check: `CHECK ((external_id_hash ~ '^[0-9a-f]{64}$'::text))`
- import_rows_fingerprint_check: `CHECK ((fingerprint ~ '^[0-9a-f]{64}$'::text))`
- import_rows_fingerprint_not_null: `NOT NULL fingerprint`
- import_rows_normalized_check: `CHECK ((jsonb_typeof(normalized) = 'object'::text))`
- import_rows_normalized_not_null: `NOT NULL normalized`
- import_rows_pkey: `PRIMARY KEY (tenant_id, batch_id, row_number)`
- import_rows_row_number_check: `CHECK ((row_number > 0))`
- import_rows_row_number_not_null: `NOT NULL row_number`
- import_rows_source_values_check: `CHECK ((jsonb_typeof(source_values) = 'array'::text))`
- import_rows_source_values_not_null: `NOT NULL source_values`
- import_rows_status_check: `CHECK ((status = ANY (ARRAY['preview'::text, 'imported'::text, 'rejected'::text, 'skipped'::text])))`
- import_rows_status_not_null: `NOT NULL status`
- import_rows_tenant_id_batch_id_fkey: `FOREIGN KEY (tenant_id, batch_id) REFERENCES import_batches(tenant_id, id)`
- import_rows_tenant_id_booking_id_fkey: `FOREIGN KEY (tenant_id, booking_id) REFERENCES bookings(tenant_id, id)`
- import_rows_tenant_id_customer_id_fkey: `FOREIGN KEY (tenant_id, customer_id) REFERENCES customers(tenant_id, id)`
- import_rows_tenant_id_not_null: `NOT NULL tenant_id`
- import_rows_tenant_id_service_id_fkey: `FOREIGN KEY (tenant_id, service_id) REFERENCES services(tenant_id, id)`
- import_rows_tenant_id_staff_id_fkey: `FOREIGN KEY (tenant_id, staff_id) REFERENCES staff(tenant_id, id)`
- import_rows_warning_codes_check: `CHECK ((jsonb_typeof(warning_codes) = 'array'::text))`
- import_rows_warning_codes_not_null: `NOT NULL warning_codes`

Indeksid:

- `CREATE INDEX import_row_completed_external ON public.import_rows USING btree (tenant_id, ((normalized ->> 'externalId'::text))) WHERE (status = 'imported'::text)`
- `CREATE INDEX import_row_completed_fingerprint ON public.import_rows USING btree (tenant_id, fingerprint) WHERE (status = 'imported'::text)`
- `CREATE UNIQUE INDEX import_rows_pkey ON public.import_rows USING btree (tenant_id, batch_id, row_number)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT.

## invitations

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| invited_by | text | ei | — |
| email | text | jah | — |
| role | text | jah | — |
| staff_id | uuid | ei | — |
| permissions | jsonb | jah | '[]'::jsonb |
| token_hash | text | jah | — |
| expires_at | timestamp with time zone | jah | — |
| accepted_at | timestamp with time zone | ei | — |
| cancelled_at | timestamp with time zone | ei | — |
| created_at | timestamp with time zone | jah | now() |
| bootstrap | boolean | jah | false |

Piirangud:

- invitations_bootstrap_actor_check: `CHECK (((bootstrap AND (invited_by IS NULL)) OR ((NOT bootstrap) AND (invited_by IS NOT NULL))))`
- invitations_bootstrap_not_null: `NOT NULL bootstrap`
- invitations_bootstrap_role_check: `CHECK (((role = 'owner'::text) = bootstrap))`
- invitations_check: `CHECK (((accepted_at IS NULL) OR (cancelled_at IS NULL)))`
- invitations_created_at_not_null: `NOT NULL created_at`
- invitations_email_check: `CHECK (((email = lower(btrim(email))) AND ((length(email) >= 3) AND (length(email) <= 320))))`
- invitations_email_not_null: `NOT NULL email`
- invitations_expires_at_not_null: `NOT NULL expires_at`
- invitations_id_not_null: `NOT NULL id`
- invitations_invited_by_fkey: `FOREIGN KEY (invited_by) REFERENCES auth_user(id) ON DELETE RESTRICT`
- invitations_permissions_check: `CHECK ((jsonb_typeof(permissions) = 'array'::text))`
- invitations_permissions_not_null: `NOT NULL permissions`
- invitations_pkey: `PRIMARY KEY (id)`
- invitations_role_check: `CHECK ((role = ANY (ARRAY['owner'::text, 'receptionist'::text, 'staff'::text])))`
- invitations_role_not_null: `NOT NULL role`
- invitations_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- invitations_tenant_id_not_null: `NOT NULL tenant_id`
- invitations_tenant_id_staff_id_fkey: `FOREIGN KEY (tenant_id, staff_id) REFERENCES staff(tenant_id, id)`
- invitations_token_hash_check: `CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text))`
- invitations_token_hash_key: `UNIQUE (token_hash)`
- invitations_token_hash_not_null: `NOT NULL token_hash`

Indeksid:

- `CREATE UNIQUE INDEX invitations_pending_email ON public.invitations USING btree (tenant_id, email) WHERE ((accepted_at IS NULL) AND (cancelled_at IS NULL))`
- `CREATE UNIQUE INDEX invitations_pkey ON public.invitations USING btree (id)`
- `CREATE INDEX invitations_tenant_created ON public.invitations USING btree (tenant_id, created_at DESC)`
- `CREATE UNIQUE INDEX invitations_token_hash_key ON public.invitations USING btree (token_hash)`

RLS access_invitations_tenant_or_token: USING `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (token_hash = NULLIF(current_setting('app.invitation_hash'::text, true), ''::text)))`; WITH CHECK `(USING)`.

booking_app: INSERT, SELECT, UPDATE.

## invoice_mail_outbox

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| invoice_id | uuid | jah | — |
| status | text | jah | 'pending'::text |
| attempts | integer | jah | 0 |
| next_attempt_at | timestamp with time zone | jah | now() |
| last_error_code | text | ei | — |
| sent_at | timestamp with time zone | ei | — |
| created_at | timestamp with time zone | jah | now() |
| kind | text | jah | 'issued'::text |

Piirangud:

- invoice_mail_outbox_attempts_check: `CHECK ((attempts >= 0))`
- invoice_mail_outbox_attempts_not_null: `NOT NULL attempts`
- invoice_mail_outbox_created_at_not_null: `NOT NULL created_at`
- invoice_mail_outbox_id_not_null: `NOT NULL id`
- invoice_mail_outbox_invoice_id_not_null: `NOT NULL invoice_id`
- invoice_mail_outbox_kind_check: `CHECK ((kind = ANY (ARRAY['issued'::text, 'overdue'::text])))`
- invoice_mail_outbox_kind_not_null: `NOT NULL kind`
- invoice_mail_outbox_next_attempt_at_not_null: `NOT NULL next_attempt_at`
- invoice_mail_outbox_pkey: `PRIMARY KEY (id)`
- invoice_mail_outbox_status_check: `CHECK ((status = ANY (ARRAY['pending'::text, 'failed'::text, 'sent'::text, 'capture'::text, 'skipped'::text])))`
- invoice_mail_outbox_status_not_null: `NOT NULL status`
- invoice_mail_outbox_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- invoice_mail_outbox_tenant_id_invoice_id_fkey: `FOREIGN KEY (tenant_id, invoice_id) REFERENCES invoices(tenant_id, id) ON DELETE CASCADE`
- invoice_mail_outbox_tenant_id_invoice_id_kind_key: `UNIQUE (tenant_id, invoice_id, kind)`
- invoice_mail_outbox_tenant_id_not_null: `NOT NULL tenant_id`

Indeksid:

- `CREATE UNIQUE INDEX invoice_mail_outbox_pkey ON public.invoice_mail_outbox USING btree (id)`
- `CREATE UNIQUE INDEX invoice_mail_outbox_tenant_id_invoice_id_kind_key ON public.invoice_mail_outbox USING btree (tenant_id, invoice_id, kind)`
- `CREATE INDEX invoice_mail_pending ON public.invoice_mail_outbox USING btree (tenant_id, next_attempt_at) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]))`

RLS invoice_mail_tenant: USING `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`; WITH CHECK `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## invoice_payment_links

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| invoice_id | uuid | jah | — |
| token_hash | text | jah | — |
| encrypted_token | text | jah | — |
| created_at | timestamp with time zone | jah | now() |
| revoked_at | timestamp with time zone | ei | — |

Piirangud:

- invoice_payment_links_created_at_not_null: `NOT NULL created_at`
- invoice_payment_links_encrypted_token_not_null: `NOT NULL encrypted_token`
- invoice_payment_links_invoice_id_not_null: `NOT NULL invoice_id`
- invoice_payment_links_pkey: `PRIMARY KEY (tenant_id, invoice_id)`
- invoice_payment_links_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- invoice_payment_links_tenant_id_invoice_id_fkey: `FOREIGN KEY (tenant_id, invoice_id) REFERENCES invoices(tenant_id, id)`
- invoice_payment_links_tenant_id_not_null: `NOT NULL tenant_id`
- invoice_payment_links_token_hash_check: `CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text))`
- invoice_payment_links_token_hash_key: `UNIQUE (token_hash)`
- invoice_payment_links_token_hash_not_null: `NOT NULL token_hash`

Indeksid:

- `CREATE UNIQUE INDEX invoice_payment_links_pkey ON public.invoice_payment_links USING btree (tenant_id, invoice_id)`
- `CREATE UNIQUE INDEX invoice_payment_links_token_hash_key ON public.invoice_payment_links USING btree (token_hash)`

RLS invoice_link_tenant: USING `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`; WITH CHECK `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`.

booking_app: INSERT, SELECT.

## invoices

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| subscription_id | uuid | jah | — |
| request_key | uuid | jah | — |
| number | text | ei | — |
| period_start | date | jah | — |
| period_end | date | jah | — |
| due_date | date | jah | — |
| issuer_snapshot | jsonb | jah | — |
| recipient_snapshot | jsonb | jah | — |
| lines_snapshot | jsonb | jah | — |
| subtotal | integer | jah | — |
| tax | integer | jah | — |
| total | integer | jah | — |
| currency | text | jah | 'EUR'::text |
| status | text | jah | 'draft'::text |
| issued_at | timestamp with time zone | ei | — |
| void_reason | text | ei | — |
| version | integer | jah | 1 |
| created_at | timestamp with time zone | jah | now() |
| issued_on | date | ei | — |
| snapshot_hash | text | ei | — |
| issuer_version | integer | ei | — |
| kind | text | jah | 'invoice'::text |
| original_invoice_id | uuid | ei | — |
| correction_reason | text | ei | — |
| replaced_invoice_id | uuid | ei | — |

Piirangud:

- credit_reason_required: `CHECK (((kind <> 'credit'::text) OR (correction_reason IS NOT NULL)))`
- invoice_credit_reference: `CHECK (((kind <> 'credit'::text) OR ((original_invoice_id IS NOT NULL) AND ((length(btrim(correction_reason)) >= 10) AND (length(btrim(correction_reason)) <= 500)))))`
- invoice_issuance_metadata: `CHECK ((((issued_on IS NULL) AND (snapshot_hash IS NULL) AND (issuer_version IS NULL)) OR ((issued_on IS NOT NULL) AND (snapshot_hash IS NOT NULL) AND (issuer_version IS NOT NULL))))`
- invoice_original_fk: `FOREIGN KEY (tenant_id, original_invoice_id) REFERENCES invoices(tenant_id, id)`
- invoice_replaced_fk: `FOREIGN KEY (tenant_id, replaced_invoice_id) REFERENCES invoices(tenant_id, id)`
- invoice_signed_amounts: `CHECK ((((kind = 'invoice'::text) AND (subtotal >= 0) AND (tax >= 0) AND (total >= 0)) OR ((kind = 'credit'::text) AND (subtotal <= 0) AND (tax <= 0) AND (total <= 0))))`
- invoices_check: `CHECK ((period_end > period_start))`
- invoices_check1: `CHECK (((total)::bigint = ((subtotal)::bigint + (tax)::bigint)))`
- invoices_check2: `CHECK (((status <> 'issued'::text) OR ((number IS NOT NULL) AND (issued_at IS NOT NULL))))`
- invoices_check3: `CHECK (((status <> 'draft'::text) OR (issued_at IS NULL)))`
- invoices_check4: `CHECK (((status <> 'void'::text) OR (length(btrim(void_reason)) >= 3)))`
- invoices_created_at_not_null: `NOT NULL created_at`
- invoices_currency_check: `CHECK ((currency = 'EUR'::text))`
- invoices_currency_not_null: `NOT NULL currency`
- invoices_due_date_not_null: `NOT NULL due_date`
- invoices_id_not_null: `NOT NULL id`
- invoices_issuer_snapshot_check: `CHECK ((jsonb_typeof(issuer_snapshot) = 'object'::text))`
- invoices_issuer_snapshot_not_null: `NOT NULL issuer_snapshot`
- invoices_issuer_version_fkey: `FOREIGN KEY (issuer_version) REFERENCES billing_issuer_versions(version)`
- invoices_kind_check: `CHECK ((kind = ANY (ARRAY['invoice'::text, 'credit'::text])))`
- invoices_kind_not_null: `NOT NULL kind`
- invoices_lines_snapshot_check: `CHECK (((jsonb_typeof(lines_snapshot) = 'array'::text) AND (jsonb_array_length(lines_snapshot) > 0)))`
- invoices_lines_snapshot_not_null: `NOT NULL lines_snapshot`
- invoices_number_check: `CHECK (((length(btrim(number)) >= 1) AND (length(btrim(number)) <= 100)))`
- invoices_number_key: `UNIQUE (number)`
- invoices_period_end_not_null: `NOT NULL period_end`
- invoices_period_start_not_null: `NOT NULL period_start`
- invoices_pkey: `PRIMARY KEY (id)`
- invoices_recipient_snapshot_check: `CHECK ((jsonb_typeof(recipient_snapshot) = 'object'::text))`
- invoices_recipient_snapshot_not_null: `NOT NULL recipient_snapshot`
- invoices_request_key_not_null: `NOT NULL request_key`
- invoices_snapshot_hash_check: `CHECK ((snapshot_hash ~ '^[0-9a-f]{64}$'::text))`
- invoices_status_check: `CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'void'::text])))`
- invoices_status_not_null: `NOT NULL status`
- invoices_subscription_id_not_null: `NOT NULL subscription_id`
- invoices_subtotal_not_null: `NOT NULL subtotal`
- invoices_tax_not_null: `NOT NULL tax`
- invoices_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- invoices_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- invoices_tenant_id_not_null: `NOT NULL tenant_id`
- invoices_tenant_id_request_key_key: `UNIQUE (tenant_id, request_key)`
- invoices_tenant_id_subscription_id_fkey: `FOREIGN KEY (tenant_id, subscription_id) REFERENCES subscriptions(tenant_id, id)`
- invoices_total_not_null: `NOT NULL total`
- invoices_version_check: `CHECK ((version > 0))`
- invoices_version_not_null: `NOT NULL version`
- void_reason_required: `CHECK (((status <> 'void'::text) OR ((void_reason IS NOT NULL) AND (length(btrim(void_reason)) >= 3))))`

Indeksid:

- `CREATE UNIQUE INDEX invoice_active_period ON public.invoices USING btree (tenant_id, subscription_id, period_start, period_end) WHERE ((kind = 'invoice'::text) AND (status <> 'void'::text))`
- `CREATE UNIQUE INDEX invoice_full_credit_once ON public.invoices USING btree (tenant_id, original_invoice_id) WHERE (kind = 'credit'::text)`
- `CREATE INDEX invoices_due ON public.invoices USING btree (tenant_id, due_date) WHERE (status = 'issued'::text)`
- `CREATE UNIQUE INDEX invoices_number_key ON public.invoices USING btree (number)`
- `CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id)`
- `CREATE UNIQUE INDEX invoices_tenant_id_id_key ON public.invoices USING btree (tenant_id, id)`
- `CREATE UNIQUE INDEX invoices_tenant_id_request_key_key ON public.invoices USING btree (tenant_id, request_key)`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER invoice_full_credit_valid BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION validate_full_credit()`
- `CREATE TRIGGER invoice_replacement_valid BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION validate_invoice_replacement()`
- `CREATE TRIGGER invoice_snapshot_immutable BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION protect_issued_invoice()`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT.

## locations

Vaade; RLS: ei; FORCE RLS: ei; security_invoker=true, security_barrier=true.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | ei | — |
| tenant_id | uuid | ei | — |
| address | text | ei | — |
| timezone | text | ei | — |
| version | integer | ei | — |

booking_app: SELECT.

```sql
 SELECT id,
    id AS tenant_id,
    address,
    timezone,
    rules_version AS version
   FROM tenants
  WHERE id = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)::uuid;
```

## media

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| storage_key | text | jah | — |
| purpose | text | jah | — |
| content_type | text | jah | — |
| byte_size | bigint | jah | — |
| sha256 | text | jah | — |
| status | text | jah | 'quarantined'::text |
| created_by | text | ei | — |
| created_at | timestamp with time zone | jah | now() |
| expires_at | timestamp with time zone | ei | — |
| version | integer | jah | 1 |

Piirangud:

- media_byte_size_check: `CHECK ((byte_size > 0))`
- media_byte_size_not_null: `NOT NULL byte_size`
- media_check: `CHECK (((expires_at IS NULL) OR (expires_at > created_at)))`
- media_content_type_check: `CHECK (((length(content_type) >= 3) AND (length(content_type) <= 150)))`
- media_content_type_not_null: `NOT NULL content_type`
- media_created_at_not_null: `NOT NULL created_at`
- media_created_by_fkey: `FOREIGN KEY (created_by) REFERENCES auth_user(id)`
- media_id_not_null: `NOT NULL id`
- media_pkey: `PRIMARY KEY (id)`
- media_purpose_check: `CHECK ((purpose = ANY (ARRAY['theme'::text, 'staff'::text, 'import'::text, 'export'::text, 'invoice'::text])))`
- media_purpose_not_null: `NOT NULL purpose`
- media_sha256_check: `CHECK ((sha256 ~ '^[0-9a-f]{64}$'::text))`
- media_sha256_not_null: `NOT NULL sha256`
- media_status_check: `CHECK ((status = ANY (ARRAY['quarantined'::text, 'ready'::text, 'rejected'::text, 'deleted'::text])))`
- media_status_not_null: `NOT NULL status`
- media_storage_key_check: `CHECK (((storage_key ~ '^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_.-]+)*$'::text) AND (storage_key !~ '(^|/)\.{1,2}(/|$)'::text)))`
- media_storage_key_key: `UNIQUE (storage_key)`
- media_storage_key_not_null: `NOT NULL storage_key`
- media_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- media_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- media_tenant_id_not_null: `NOT NULL tenant_id`
- media_version_check: `CHECK ((version > 0))`
- media_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE UNIQUE INDEX media_pkey ON public.media USING btree (id)`
- `CREATE UNIQUE INDEX media_storage_key_key ON public.media USING btree (storage_key)`
- `CREATE UNIQUE INDEX media_tenant_id_id_key ON public.media USING btree (tenant_id, id)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT.

## memberships

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| user_id | text | jah | — |
| role | text | jah | — |
| staff_id | uuid | ei | — |
| permissions | jsonb | jah | '[]'::jsonb |
| active | boolean | jah | true |
| created_at | timestamp with time zone | jah | now() |
| updated_at | timestamp with time zone | jah | now() |
| admin_language | text | jah | 'et'::text |

Piirangud:

- memberships_active_not_null: `NOT NULL active`
- memberships_admin_language_check: `CHECK ((admin_language = ANY (ARRAY['et'::text, 'en'::text, 'ru'::text])))`
- memberships_admin_language_not_null: `NOT NULL admin_language`
- memberships_created_at_not_null: `NOT NULL created_at`
- memberships_permissions_check: `CHECK ((jsonb_typeof(permissions) = 'array'::text))`
- memberships_permissions_not_null: `NOT NULL permissions`
- memberships_pkey: `PRIMARY KEY (tenant_id, user_id)`
- memberships_role_check: `CHECK ((role = ANY (ARRAY['owner'::text, 'receptionist'::text, 'staff'::text])))`
- memberships_role_not_null: `NOT NULL role`
- memberships_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- memberships_tenant_id_not_null: `NOT NULL tenant_id`
- memberships_tenant_id_staff_id_fkey: `FOREIGN KEY (tenant_id, staff_id) REFERENCES staff(tenant_id, id)`
- memberships_updated_at_not_null: `NOT NULL updated_at`
- memberships_user_id_fkey: `FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE RESTRICT`
- memberships_user_id_not_null: `NOT NULL user_id`

Indeksid:

- `CREATE UNIQUE INDEX memberships_pkey ON public.memberships USING btree (tenant_id, user_id)`

RLS access_memberships_tenant_or_self: USING `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (user_id = NULLIF(current_setting('app.user_id'::text, true), ''::text)))`; WITH CHECK `(USING)`.

booking_app: INSERT, SELECT, UPDATE.

## notification_attempts

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| outbox_id | uuid | jah | — |
| attempt | integer | jah | — |
| started_at | timestamp with time zone | jah | clock_timestamp() |
| finished_at | timestamp with time zone | ei | — |
| outcome | text | jah | 'sending'::text |
| error_code | text | ei | — |

Piirangud:

- notification_attempts_attempt_check: `CHECK ((attempt > 0))`
- notification_attempts_attempt_not_null: `NOT NULL attempt`
- notification_attempts_error_code_check: `CHECK ((error_code ~ '^[A-Z0-9_]{1,100}$'::text))`
- notification_attempts_id_not_null: `NOT NULL id`
- notification_attempts_outbox_id_not_null: `NOT NULL outbox_id`
- notification_attempts_outcome_check: `CHECK ((outcome = ANY (ARRAY['sending'::text, 'sent'::text, 'failed'::text, 'skipped'::text, 'superseded'::text, 'capture'::text])))`
- notification_attempts_outcome_not_null: `NOT NULL outcome`
- notification_attempts_pkey: `PRIMARY KEY (id)`
- notification_attempts_started_at_not_null: `NOT NULL started_at`
- notification_attempts_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- notification_attempts_tenant_id_not_null: `NOT NULL tenant_id`
- notification_attempts_tenant_id_outbox_id_attempt_key: `UNIQUE (tenant_id, outbox_id, attempt)`
- notification_attempts_tenant_id_outbox_id_fkey: `FOREIGN KEY (tenant_id, outbox_id) REFERENCES outbox(tenant_id, id) ON DELETE CASCADE`

Indeksid:

- `CREATE UNIQUE INDEX notification_attempts_pkey ON public.notification_attempts USING btree (id)`
- `CREATE UNIQUE INDEX notification_attempts_tenant_id_outbox_id_attempt_key ON public.notification_attempts USING btree (tenant_id, outbox_id, attempt)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## outbox

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| booking_id | uuid | jah | — |
| booking_version | integer | jah | — |
| kind | text | jah | — |
| status | text | jah | 'pending'::text |
| created_at | timestamp with time zone | jah | now() |
| language | text | jah | 'et'::text |
| attempts | integer | jah | 0 |
| next_attempt_at | timestamp with time zone | jah | now() |
| last_attempt_at | timestamp with time zone | ei | — |
| last_error_code | text | ei | — |
| sent_at | timestamp with time zone | ei | — |
| delivery_status | text | jah | 'unknown'::text |
| version | integer | jah | 1 |
| recipient_kind | text | jah | 'customer'::text |
| claim_token | uuid | ei | — |
| locked_until | timestamp with time zone | ei | — |
| retry_budget | integer | jah | 8 |
| transport_id | text | ei | — |
| captured_at | timestamp with time zone | ei | — |

Piirangud:

- outbox_attempts_check: `CHECK ((attempts >= 0))`
- outbox_attempts_not_null: `NOT NULL attempts`
- outbox_booking_id_not_null: `NOT NULL booking_id`
- outbox_booking_version_not_null: `NOT NULL booking_version`
- outbox_booking_version_positive: `CHECK ((booking_version > 0))`
- outbox_created_at_not_null: `NOT NULL created_at`
- outbox_delivery_status_check: `CHECK ((delivery_status = ANY (ARRAY['unknown'::text, 'delivered'::text, 'bounced'::text])))`
- outbox_delivery_status_not_null: `NOT NULL delivery_status`
- outbox_id_not_null: `NOT NULL id`
- outbox_kind_not_null: `NOT NULL kind`
- outbox_language_check: `CHECK ((language = ANY (ARRAY['et'::text, 'en'::text, 'ru'::text])))`
- outbox_language_not_null: `NOT NULL language`
- outbox_last_error_code_check: `CHECK ((last_error_code ~ '^[A-Z0-9_]{1,100}$'::text))`
- outbox_next_attempt_at_not_null: `NOT NULL next_attempt_at`
- outbox_pkey: `PRIMARY KEY (id)`
- outbox_recipient_kind_check: `CHECK ((recipient_kind = ANY (ARRAY['customer'::text, 'company'::text])))`
- outbox_recipient_kind_not_null: `NOT NULL recipient_kind`
- outbox_retry_budget_check: `CHECK (((retry_budget >= 1) AND (retry_budget <= 80)))`
- outbox_retry_budget_not_null: `NOT NULL retry_budget`
- outbox_status_check: `CHECK ((status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'superseded'::text, 'skipped'::text])))`
- outbox_status_not_null: `NOT NULL status`
- outbox_tenant_id_booking_id_booking_version_kind_key: `UNIQUE (tenant_id, booking_id, booking_version, kind)`
- outbox_tenant_id_booking_id_fkey: `FOREIGN KEY (tenant_id, booking_id) REFERENCES bookings(tenant_id, id)`
- outbox_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- outbox_tenant_id_not_null: `NOT NULL tenant_id`
- outbox_tenant_identity: `UNIQUE (tenant_id, id)`
- outbox_version_check: `CHECK ((version > 0))`
- outbox_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE INDEX outbox_booking_notice ON public.outbox USING btree (tenant_id, booking_id, booking_version, created_at DESC, id DESC)`
- `CREATE INDEX outbox_claim_due ON public.outbox USING btree (tenant_id, next_attempt_at, id) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text, 'sending'::text]))`
- `CREATE INDEX outbox_due ON public.outbox USING btree (next_attempt_at, tenant_id, id) WHERE (status = ANY (ARRAY['pending'::text, 'failed'::text]))`
- `CREATE INDEX outbox_pending ON public.outbox USING btree (tenant_id, status, created_at)`
- `CREATE UNIQUE INDEX outbox_pkey ON public.outbox USING btree (id)`
- `CREATE UNIQUE INDEX outbox_tenant_id_booking_id_booking_version_kind_key ON public.outbox USING btree (tenant_id, booking_id, booking_version, kind)`
- `CREATE UNIQUE INDEX outbox_tenant_identity ON public.outbox USING btree (tenant_id, id)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## payment_attempts

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| invoice_id | uuid | jah | — |
| request_key | uuid | jah | — |
| payload_hash | text | jah | — |
| method | text | jah | — |
| environment | text | jah | — |
| shop_id | uuid | jah | — |
| amount | integer | jah | — |
| currency | text | jah | 'EUR'::text |
| reference | text | jah | — |
| created_by | text | ei | — |
| created_at | timestamp with time zone | jah | now() |
| state | text | jah | 'creating'::text |
| transaction_id | uuid | ei | — |
| redirect_url | text | ei | — |
| provider_status | text | ei | — |
| checked_at | timestamp with time zone | ei | — |
| error_code | text | ei | — |
| consent | jsonb | jah | '{}'::jsonb |
| mandate_id | uuid | ei | — |
| charge_started_at | timestamp with time zone | ei | — |

Piirangud:

- attempt_mandate_fk: `FOREIGN KEY (tenant_id, mandate_id) REFERENCES payment_mandates(tenant_id, id)`
- autopay_mandate_required: `CHECK (((method <> 'autopay'::text) OR (mandate_id IS NOT NULL)))`
- payment_attempt_amount: `CHECK ((((amount >= 0) AND (amount <= 100000000)) AND ((amount > 0) OR (method = 'enroll'::text))))`
- payment_attempts_amount_not_null: `NOT NULL amount`
- payment_attempts_consent_check: `CHECK ((jsonb_typeof(consent) = 'object'::text))`
- payment_attempts_consent_not_null: `NOT NULL consent`
- payment_attempts_created_at_not_null: `NOT NULL created_at`
- payment_attempts_created_by_fkey: `FOREIGN KEY (created_by) REFERENCES auth_user(id)`
- payment_attempts_currency_check: `CHECK ((currency = 'EUR'::text))`
- payment_attempts_currency_not_null: `NOT NULL currency`
- payment_attempts_environment_check: `CHECK ((environment = ANY (ARRAY['test'::text, 'live'::text])))`
- payment_attempts_environment_not_null: `NOT NULL environment`
- payment_attempts_environment_shop_id_transaction_id_key: `UNIQUE (environment, shop_id, transaction_id)`
- payment_attempts_id_not_null: `NOT NULL id`
- payment_attempts_invoice_id_not_null: `NOT NULL invoice_id`
- payment_attempts_method_check: `CHECK ((method = ANY (ARRAY['link'::text, 'enroll'::text, 'autopay'::text])))`
- payment_attempts_method_not_null: `NOT NULL method`
- payment_attempts_payload_hash_check: `CHECK ((payload_hash ~ '^[0-9a-f]{64}$'::text))`
- payment_attempts_payload_hash_not_null: `NOT NULL payload_hash`
- payment_attempts_pkey: `PRIMARY KEY (id)`
- payment_attempts_reference_not_null: `NOT NULL reference`
- payment_attempts_request_key_not_null: `NOT NULL request_key`
- payment_attempts_shop_id_not_null: `NOT NULL shop_id`
- payment_attempts_state_check: `CHECK ((state = ANY (ARRAY['creating'::text, 'ready'::text, 'pending'::text, 'completed'::text, 'cancelled'::text, 'expired'::text, 'unknown'::text, 'failed'::text, 'review'::text])))`
- payment_attempts_state_not_null: `NOT NULL state`
- payment_attempts_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- payment_attempts_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- payment_attempts_tenant_id_invoice_id_fkey: `FOREIGN KEY (tenant_id, invoice_id) REFERENCES invoices(tenant_id, id)`
- payment_attempts_tenant_id_not_null: `NOT NULL tenant_id`
- payment_attempts_tenant_id_request_key_key: `UNIQUE (tenant_id, request_key)`

Indeksid:

- `CREATE UNIQUE INDEX invoice_one_automatic_charge ON public.payment_attempts USING btree (tenant_id, invoice_id) WHERE (method = 'autopay'::text)`
- `CREATE UNIQUE INDEX payment_attempts_environment_shop_id_transaction_id_key ON public.payment_attempts USING btree (environment, shop_id, transaction_id)`
- `CREATE UNIQUE INDEX payment_attempts_pkey ON public.payment_attempts USING btree (id)`
- `CREATE UNIQUE INDEX payment_attempts_tenant_id_id_key ON public.payment_attempts USING btree (tenant_id, id)`
- `CREATE UNIQUE INDEX payment_attempts_tenant_id_request_key_key ON public.payment_attempts USING btree (tenant_id, request_key)`
- `CREATE UNIQUE INDEX payment_one_open_attempt ON public.payment_attempts USING btree (tenant_id, invoice_id) WHERE (state = ANY (ARRAY['creating'::text, 'ready'::text, 'pending'::text, 'unknown'::text, 'review'::text]))`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER payment_attempt_immutable BEFORE UPDATE ON public.payment_attempts FOR EACH ROW EXECUTE FUNCTION protect_payment_attempt()`

RLS payment_attempt_tenant: USING `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`; WITH CHECK `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`.

booking_app: INSERT, SELECT.

## payment_mandates

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| subscription_id | uuid | jah | — |
| setup_attempt_id | uuid | jah | — |
| status | text | jah | 'pending'::text |
| consent_by | text | jah | — |
| consent_at | timestamp with time zone | jah | now() |
| terms | jsonb | jah | — |
| encrypted_token | text | ei | — |
| valid_until | date | ei | — |
| activated_at | timestamp with time zone | ei | — |
| revoked_at | timestamp with time zone | ei | — |
| revoked_by | text | ei | — |
| version | integer | jah | 1 |

Piirangud:

- payment_mandates_check: `CHECK (((status <> 'active'::text) OR ((encrypted_token IS NOT NULL) AND (valid_until IS NOT NULL) AND (activated_at IS NOT NULL))))`
- payment_mandates_check1: `CHECK (((status <> 'revoked'::text) OR ((revoked_at IS NOT NULL) AND (revoked_by IS NOT NULL) AND (encrypted_token IS NULL))))`
- payment_mandates_consent_at_not_null: `NOT NULL consent_at`
- payment_mandates_consent_by_fkey: `FOREIGN KEY (consent_by) REFERENCES auth_user(id)`
- payment_mandates_consent_by_not_null: `NOT NULL consent_by`
- payment_mandates_id_not_null: `NOT NULL id`
- payment_mandates_pkey: `PRIMARY KEY (id)`
- payment_mandates_revoked_by_fkey: `FOREIGN KEY (revoked_by) REFERENCES auth_user(id)`
- payment_mandates_setup_attempt_id_not_null: `NOT NULL setup_attempt_id`
- payment_mandates_status_check: `CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'revoked'::text, 'failed'::text, 'expired'::text, 'test_complete'::text])))`
- payment_mandates_status_not_null: `NOT NULL status`
- payment_mandates_subscription_id_not_null: `NOT NULL subscription_id`
- payment_mandates_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- payment_mandates_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- payment_mandates_tenant_id_not_null: `NOT NULL tenant_id`
- payment_mandates_tenant_id_setup_attempt_id_fkey: `FOREIGN KEY (tenant_id, setup_attempt_id) REFERENCES payment_attempts(tenant_id, id)`
- payment_mandates_tenant_id_setup_attempt_id_key: `UNIQUE (tenant_id, setup_attempt_id)`
- payment_mandates_tenant_id_subscription_id_fkey: `FOREIGN KEY (tenant_id, subscription_id) REFERENCES subscriptions(tenant_id, id)`
- payment_mandates_terms_check: `CHECK ((jsonb_typeof(terms) = 'object'::text))`
- payment_mandates_terms_not_null: `NOT NULL terms`
- payment_mandates_version_check: `CHECK ((version > 0))`
- payment_mandates_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE UNIQUE INDEX payment_mandates_pkey ON public.payment_mandates USING btree (id)`
- `CREATE UNIQUE INDEX payment_mandates_tenant_id_id_key ON public.payment_mandates USING btree (tenant_id, id)`
- `CREATE UNIQUE INDEX payment_mandates_tenant_id_setup_attempt_id_key ON public.payment_mandates USING btree (tenant_id, setup_attempt_id)`
- `CREATE UNIQUE INDEX payment_one_mandate ON public.payment_mandates USING btree (tenant_id) WHERE (status = ANY (ARRAY['pending'::text, 'active'::text]))`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER payment_mandate_immutable BEFORE UPDATE ON public.payment_mandates FOR EACH ROW EXECUTE FUNCTION protect_payment_mandate()`

RLS payment_mandate_tenant: USING `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`; WITH CHECK `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`.

booking_app: INSERT, SELECT.

## payment_provider_events

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| attempt_id | uuid | jah | — |
| digest | text | jah | — |
| message_type | text | jah | — |
| encrypted_message | text | jah | — |
| received_at | timestamp with time zone | jah | now() |
| processed_at | timestamp with time zone | ei | — |
| tries | integer | jah | 0 |
| error_code | text | ei | — |
| available_at | timestamp with time zone | jah | now() |

Piirangud:

- payment_provider_events_attempt_id_not_null: `NOT NULL attempt_id`
- payment_provider_events_available_at_not_null: `NOT NULL available_at`
- payment_provider_events_digest_check: `CHECK ((digest ~ '^[0-9a-f]{64}$'::text))`
- payment_provider_events_digest_not_null: `NOT NULL digest`
- payment_provider_events_encrypted_message_not_null: `NOT NULL encrypted_message`
- payment_provider_events_id_not_null: `NOT NULL id`
- payment_provider_events_message_type_check: `CHECK ((message_type = ANY (ARRAY['payment_return'::text, 'token_return'::text])))`
- payment_provider_events_message_type_not_null: `NOT NULL message_type`
- payment_provider_events_pkey: `PRIMARY KEY (id)`
- payment_provider_events_received_at_not_null: `NOT NULL received_at`
- payment_provider_events_tenant_id_attempt_id_fkey: `FOREIGN KEY (tenant_id, attempt_id) REFERENCES payment_attempts(tenant_id, id)`
- payment_provider_events_tenant_id_digest_key: `UNIQUE (tenant_id, digest)`
- payment_provider_events_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- payment_provider_events_tenant_id_not_null: `NOT NULL tenant_id`
- payment_provider_events_tries_check: `CHECK ((tries >= 0))`
- payment_provider_events_tries_not_null: `NOT NULL tries`

Indeksid:

- `CREATE UNIQUE INDEX payment_provider_events_pkey ON public.payment_provider_events USING btree (id)`
- `CREATE UNIQUE INDEX payment_provider_events_tenant_id_digest_key ON public.payment_provider_events USING btree (tenant_id, digest)`

RLS payment_event_tenant: USING `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`; WITH CHECK `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`.

booking_app: INSERT, SELECT.

## payment_records

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| invoice_id | uuid | jah | — |
| request_key | uuid | jah | — |
| amount | integer | jah | — |
| currency | text | jah | 'EUR'::text |
| received_on | date | jah | — |
| recorded_by | text | ei | — |
| recorded_at | timestamp with time zone | jah | now() |
| reference | text | jah | ''::text |
| reversed_at | timestamp with time zone | ei | — |
| reversed_by | text | ei | — |
| reversal_reason | text | ei | — |
| version | integer | jah | 1 |
| bank_entry_id | text | ei | — |
| source | text | jah | 'manual'::text |
| provider_attempt_id | uuid | ei | — |

Piirangud:

- payment_receipt_attempt: `FOREIGN KEY (tenant_id, provider_attempt_id) REFERENCES payment_attempts(tenant_id, id)`
- payment_receipt_source: `CHECK ((((source = 'manual'::text) AND (recorded_by IS NOT NULL) AND (provider_attempt_id IS NULL)) OR ((source = 'makecommerce'::text) AND (recorded_by IS NULL) AND (provider_attempt_id IS NOT NULL))))`
- payment_records_amount_check: `CHECK ((amount > 0))`
- payment_records_amount_not_null: `NOT NULL amount`
- payment_records_bank_entry_id_check: `CHECK (((length(btrim(bank_entry_id)) >= 1) AND (length(btrim(bank_entry_id)) <= 200)))`
- payment_records_check: `CHECK ((((reversed_at IS NULL) AND (reversed_by IS NULL) AND (reversal_reason IS NULL)) OR ((reversed_at IS NOT NULL) AND (reversed_by IS NOT NULL) AND (length(btrim(reversal_reason)) >= 3))))`
- payment_records_currency_check: `CHECK ((currency = 'EUR'::text))`
- payment_records_currency_not_null: `NOT NULL currency`
- payment_records_id_not_null: `NOT NULL id`
- payment_records_invoice_id_not_null: `NOT NULL invoice_id`
- payment_records_pkey: `PRIMARY KEY (id)`
- payment_records_received_on_not_null: `NOT NULL received_on`
- payment_records_recorded_at_not_null: `NOT NULL recorded_at`
- payment_records_recorded_by_fkey: `FOREIGN KEY (recorded_by) REFERENCES auth_user(id)`
- payment_records_reference_check: `CHECK ((length(reference) <= 200))`
- payment_records_reference_not_null: `NOT NULL reference`
- payment_records_request_key_not_null: `NOT NULL request_key`
- payment_records_reversed_by_fkey: `FOREIGN KEY (reversed_by) REFERENCES auth_user(id)`
- payment_records_source_check: `CHECK ((source = ANY (ARRAY['manual'::text, 'makecommerce'::text])))`
- payment_records_source_not_null: `NOT NULL source`
- payment_records_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- payment_records_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- payment_records_tenant_id_invoice_id_fkey: `FOREIGN KEY (tenant_id, invoice_id) REFERENCES invoices(tenant_id, id)`
- payment_records_tenant_id_not_null: `NOT NULL tenant_id`
- payment_records_tenant_id_request_key_key: `UNIQUE (tenant_id, request_key)`
- payment_records_version_check: `CHECK ((version > 0))`
- payment_records_version_not_null: `NOT NULL version`
- reversal_reason_required: `CHECK (((reversed_at IS NULL) OR ((reversal_reason IS NOT NULL) AND (length(btrim(reversal_reason)) >= 3))))`

Indeksid:

- `CREATE UNIQUE INDEX payment_bank_entry_once ON public.payment_records USING btree (tenant_id, invoice_id, bank_entry_id) WHERE ((reversed_at IS NULL) AND (bank_entry_id IS NOT NULL))`
- `CREATE INDEX payment_invoice ON public.payment_records USING btree (tenant_id, invoice_id, received_on)`
- `CREATE UNIQUE INDEX payment_provider_receipt_once ON public.payment_records USING btree (tenant_id, provider_attempt_id) WHERE (provider_attempt_id IS NOT NULL)`
- `CREATE UNIQUE INDEX payment_records_pkey ON public.payment_records USING btree (id)`
- `CREATE UNIQUE INDEX payment_records_tenant_id_id_key ON public.payment_records USING btree (tenant_id, id)`
- `CREATE UNIQUE INDEX payment_records_tenant_id_request_key_key ON public.payment_records USING btree (tenant_id, request_key)`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER payment_record_immutable BEFORE UPDATE ON public.payment_records FOR EACH ROW EXECUTE FUNCTION protect_payment_record()`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT.

## payment_refunds

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| payment_id | uuid | jah | — |
| provider_attempt_id | uuid | jah | — |
| event_id | uuid | jah | — |
| amount | integer | jah | — |
| total_refunded | integer | jah | — |
| refunded_at | timestamp with time zone | jah | — |
| recorded_at | timestamp with time zone | jah | now() |

Piirangud:

- payment_refunds_amount_check: `CHECK ((amount > 0))`
- payment_refunds_amount_not_null: `NOT NULL amount`
- payment_refunds_check: `CHECK ((total_refunded >= amount))`
- payment_refunds_event_id_fkey: `FOREIGN KEY (event_id) REFERENCES payment_provider_events(id)`
- payment_refunds_event_id_key: `UNIQUE (event_id)`
- payment_refunds_event_id_not_null: `NOT NULL event_id`
- payment_refunds_id_not_null: `NOT NULL id`
- payment_refunds_payment_id_not_null: `NOT NULL payment_id`
- payment_refunds_pkey: `PRIMARY KEY (id)`
- payment_refunds_provider_attempt_id_not_null: `NOT NULL provider_attempt_id`
- payment_refunds_recorded_at_not_null: `NOT NULL recorded_at`
- payment_refunds_refunded_at_not_null: `NOT NULL refunded_at`
- payment_refunds_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- payment_refunds_tenant_id_not_null: `NOT NULL tenant_id`
- payment_refunds_tenant_id_payment_id_fkey: `FOREIGN KEY (tenant_id, payment_id) REFERENCES payment_records(tenant_id, id)`
- payment_refunds_tenant_id_provider_attempt_id_fkey: `FOREIGN KEY (tenant_id, provider_attempt_id) REFERENCES payment_attempts(tenant_id, id)`
- payment_refunds_tenant_id_provider_attempt_id_total_refunde_key: `UNIQUE (tenant_id, provider_attempt_id, total_refunded)`
- payment_refunds_total_refunded_not_null: `NOT NULL total_refunded`

Indeksid:

- `CREATE INDEX payment_refund_receipt ON public.payment_refunds USING btree (tenant_id, payment_id)`
- `CREATE UNIQUE INDEX payment_refunds_event_id_key ON public.payment_refunds USING btree (event_id)`
- `CREATE UNIQUE INDEX payment_refunds_pkey ON public.payment_refunds USING btree (id)`
- `CREATE UNIQUE INDEX payment_refunds_tenant_id_provider_attempt_id_total_refunde_key ON public.payment_refunds USING btree (tenant_id, provider_attempt_id, total_refunded)`

RLS payment_refund_tenant: USING `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`; WITH CHECK `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`.

booking_app: INSERT, SELECT.

## plan_versions

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| version | integer | jah | — |
| code | text | jah | — |
| name | text | jah | — |
| monthly_price | integer | jah | — |
| currency | text | jah | 'EUR'::text |
| staff_limit | integer | ei | — |
| entitlements | jsonb | jah | '{}'::jsonb |
| created_at | timestamp with time zone | jah | now() |

Piirangud:

- plan_versions_code_check: `CHECK ((code ~ '^[a-z][a-z0-9_-]{1,49}$'::text))`
- plan_versions_code_not_null: `NOT NULL code`
- plan_versions_code_version_key: `UNIQUE (code, version)`
- plan_versions_created_at_not_null: `NOT NULL created_at`
- plan_versions_currency_check: `CHECK ((currency = 'EUR'::text))`
- plan_versions_currency_not_null: `NOT NULL currency`
- plan_versions_entitlements_check: `CHECK ((jsonb_typeof(entitlements) = 'object'::text))`
- plan_versions_entitlements_not_null: `NOT NULL entitlements`
- plan_versions_id_not_null: `NOT NULL id`
- plan_versions_monthly_price_check: `CHECK (((monthly_price >= 1) AND (monthly_price <= 100000000)))`
- plan_versions_monthly_price_not_null: `NOT NULL monthly_price`
- plan_versions_name_check: `CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 150)))`
- plan_versions_name_not_null: `NOT NULL name`
- plan_versions_pkey: `PRIMARY KEY (id, version)`
- plan_versions_staff_limit_check: `CHECK ((staff_limit > 0))`
- plan_versions_version_check: `CHECK ((version > 0))`
- plan_versions_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE UNIQUE INDEX plan_versions_code_version_key ON public.plan_versions USING btree (code, version)`
- `CREATE UNIQUE INDEX plan_versions_pkey ON public.plan_versions USING btree (id, version)`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER plan_version_immutable BEFORE UPDATE ON public.plan_versions FOR EACH ROW EXECUTE FUNCTION protect_plan_version()`

booking_app: SELECT.

## request_limits

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| key_hash | text | jah | — |
| window_started_at | timestamp with time zone | jah | — |
| requests | integer | jah | — |
| rejected | integer | jah | 0 |

Piirangud:

- request_limits_key_hash_check: `CHECK ((key_hash ~ '^[0-9a-f]{64}$'::text))`
- request_limits_key_hash_not_null: `NOT NULL key_hash`
- request_limits_pkey: `PRIMARY KEY (key_hash)`
- request_limits_rejected_check: `CHECK (((rejected >= 0) AND (rejected <= 1000000)))`
- request_limits_rejected_not_null: `NOT NULL rejected`
- request_limits_requests_check: `CHECK (((requests >= 1) AND (requests <= 10000)))`
- request_limits_requests_not_null: `NOT NULL requests`
- request_limits_window_started_at_not_null: `NOT NULL window_started_at`

Indeksid:

- `CREATE INDEX request_limits_expiry ON public.request_limits USING btree (window_started_at)`
- `CREATE UNIQUE INDEX request_limits_pkey ON public.request_limits USING btree (key_hash)`

booking_app: õigused puuduvad.

## retention_policies

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| data_class | text | jah | — |
| retain_days | integer | ei | — |
| action | text | ei | — |
| approved_by | text | ei | — |
| approved_at | timestamp with time zone | ei | — |
| legal_hold | boolean | jah | false |
| version | integer | jah | 1 |

Piirangud:

- retention_policies_action_check: `CHECK ((action = ANY (ARRAY['delete'::text, 'anonymize'::text, 'redact'::text])))`
- retention_policies_approved_by_fkey: `FOREIGN KEY (approved_by) REFERENCES auth_user(id)`
- retention_policies_check: `CHECK ((((retain_days IS NULL) AND (action IS NULL) AND (approved_by IS NULL) AND (approved_at IS NULL)) OR ((retain_days IS NOT NULL) AND (action IS NOT NULL) AND (approved_by IS NOT NULL) AND (approved_at IS NOT NULL))))`
- retention_policies_data_class_check: `CHECK ((data_class = ANY (ARRAY['booking_contacts'::text, 'billing'::text, 'access_tokens'::text, 'notifications'::text, 'audit'::text, 'exports'::text, 'backups'::text])))`
- retention_policies_data_class_not_null: `NOT NULL data_class`
- retention_policies_legal_hold_not_null: `NOT NULL legal_hold`
- retention_policies_pkey: `PRIMARY KEY (tenant_id, data_class)`
- retention_policies_retain_days_check: `CHECK ((retain_days > 0))`
- retention_policies_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- retention_policies_tenant_id_not_null: `NOT NULL tenant_id`
- retention_policies_version_check: `CHECK ((version > 0))`
- retention_policies_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE UNIQUE INDEX retention_policies_pkey ON public.retention_policies USING btree (tenant_id, data_class)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## schedule_exceptions

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| staff_id | uuid | ei | — |
| day | date | jah | — |
| closed | boolean | jah | true |
| intervals | jsonb | jah | '[]'::jsonb |
| kind | text | jah | 'other'::text |

Piirangud:

- closed_exception_empty: `CHECK (((NOT closed) OR (intervals = '[]'::jsonb)))`
- exception_intervals_valid: `CHECK (valid_schedule_intervals(intervals))`
- schedule_exceptions_closed_not_null: `NOT NULL closed`
- schedule_exceptions_day_not_null: `NOT NULL day`
- schedule_exceptions_id_not_null: `NOT NULL id`
- schedule_exceptions_intervals_check: `CHECK ((jsonb_typeof(intervals) = 'array'::text))`
- schedule_exceptions_intervals_not_null: `NOT NULL intervals`
- schedule_exceptions_kind_check: `CHECK ((kind = ANY (ARRAY['vacation'::text, 'illness'::text, 'extra_work'::text, 'other'::text])))`
- schedule_exceptions_kind_not_null: `NOT NULL kind`
- schedule_exceptions_pkey: `PRIMARY KEY (id)`
- schedule_exceptions_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- schedule_exceptions_tenant_id_not_null: `NOT NULL tenant_id`
- schedule_exceptions_tenant_id_staff_id_day_key: `UNIQUE NULLS NOT DISTINCT (tenant_id, staff_id, day)`
- schedule_exceptions_tenant_id_staff_id_fkey: `FOREIGN KEY (tenant_id, staff_id) REFERENCES staff(tenant_id, id)`

Indeksid:

- `CREATE UNIQUE INDEX schedule_exceptions_pkey ON public.schedule_exceptions USING btree (id)`
- `CREATE UNIQUE INDEX schedule_exceptions_tenant_id_staff_id_day_key ON public.schedule_exceptions USING btree (tenant_id, staff_id, day) NULLS NOT DISTINCT`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: DELETE, INSERT, SELECT, UPDATE.

## schedule_versions

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| staff_id | uuid | ei | — |
| version | integer | jah | 0 |

Piirangud:

- schedule_versions_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- schedule_versions_tenant_id_not_null: `NOT NULL tenant_id`
- schedule_versions_tenant_id_staff_id_fkey: `FOREIGN KEY (tenant_id, staff_id) REFERENCES staff(tenant_id, id)`
- schedule_versions_tenant_id_staff_id_key: `UNIQUE NULLS NOT DISTINCT (tenant_id, staff_id)`
- schedule_versions_version_check: `CHECK ((version >= 0))`
- schedule_versions_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE UNIQUE INDEX schedule_versions_tenant_id_staff_id_key ON public.schedule_versions USING btree (tenant_id, staff_id) NULLS NOT DISTINCT`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## schema_migrations

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| name | text | jah | — |
| applied_at | timestamp with time zone | jah | now() |

Piirangud:

- schema_migrations_applied_at_not_null: `NOT NULL applied_at`
- schema_migrations_name_not_null: `NOT NULL name`
- schema_migrations_pkey: `PRIMARY KEY (name)`

Indeksid:

- `CREATE UNIQUE INDEX schema_migrations_pkey ON public.schema_migrations USING btree (name)`

booking_app: SELECT.

## service_group_tree

Vaade; RLS: ei; FORCE RLS: ei; security_invoker=true.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | ei | — |
| tenant_id | uuid | ei | — |
| name | text | ei | — |
| active | boolean | ei | — |
| version | integer | ei | — |
| parent_id | uuid | ei | — |
| path | text | ei | — |
| effective_active | boolean | ei | — |
| ancestry | uuid[] | ei | — |

booking_app: SELECT.

```sql
 WITH RECURSIVE tree AS (
         SELECT g.id,
            g.tenant_id,
            g.name,
            g.active,
            g.version,
            g.parent_id,
            g.name AS path,
            g.active AS effective_active,
            ARRAY[g.id] AS ancestry
           FROM service_groups g
          WHERE g.parent_id IS NULL
        UNION ALL
         SELECT g.id,
            g.tenant_id,
            g.name,
            g.active,
            g.version,
            g.parent_id,
            (tree_1.path || ' / '::text) || g.name,
            g.active AND tree_1.effective_active,
            tree_1.ancestry || g.id
           FROM service_groups g
             JOIN tree tree_1 ON tree_1.tenant_id = g.tenant_id AND tree_1.id = g.parent_id
          WHERE NOT (g.id = ANY (tree_1.ancestry))
        )
 SELECT id,
    tenant_id,
    name,
    active,
    version,
    parent_id,
    path,
    effective_active,
    ancestry
   FROM tree;
```

## service_groups

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| name | text | jah | — |
| active | boolean | jah | true |
| version | integer | jah | 1 |
| parent_id | uuid | ei | — |

Piirangud:

- group_not_own_parent: `CHECK (((parent_id IS NULL) OR (parent_id <> id)))`
- group_parent_tenant_fk: `FOREIGN KEY (tenant_id, parent_id) REFERENCES service_groups(tenant_id, id)`
- group_sibling_name: `UNIQUE NULLS NOT DISTINCT (tenant_id, parent_id, name)`
- service_groups_active_not_null: `NOT NULL active`
- service_groups_id_not_null: `NOT NULL id`
- service_groups_name_check: `CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 100)))`
- service_groups_name_not_null: `NOT NULL name`
- service_groups_pkey: `PRIMARY KEY (id)`
- service_groups_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- service_groups_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- service_groups_tenant_id_not_null: `NOT NULL tenant_id`
- service_groups_version_not_null: `NOT NULL version`
- service_groups_version_positive: `CHECK ((version > 0))`

Indeksid:

- `CREATE UNIQUE INDEX group_sibling_name ON public.service_groups USING btree (tenant_id, parent_id, name) NULLS NOT DISTINCT`
- `CREATE INDEX service_groups_parent ON public.service_groups USING btree (tenant_id, parent_id)`
- `CREATE UNIQUE INDEX service_groups_pkey ON public.service_groups USING btree (id)`
- `CREATE UNIQUE INDEX service_groups_tenant_id_id_key ON public.service_groups USING btree (tenant_id, id)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## service_translations

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| service_id | uuid | jah | — |
| language | text | jah | — |
| name | text | jah | — |
| description | text | jah | — |
| source_version | integer | jah | — |
| version | integer | jah | 1 |
| status | text | jah | — |
| origin | text | jah | — |
| published_name | text | ei | — |
| published_description | text | ei | — |
| published_source_version | integer | ei | — |
| updated_at | timestamp with time zone | jah | now() |

Piirangud:

- service_translations_check: `CHECK ((((published_name IS NULL) AND (published_description IS NULL) AND (published_source_version IS NULL)) OR ((published_name IS NOT NULL) AND (published_description IS NOT NULL) AND (published_source_version > 0))))`
- service_translations_description_check: `CHECK ((length(description) <= 1000))`
- service_translations_description_not_null: `NOT NULL description`
- service_translations_language_check: `CHECK ((language = ANY (ARRAY['et'::text, 'en'::text, 'ru'::text])))`
- service_translations_language_not_null: `NOT NULL language`
- service_translations_name_check: `CHECK (((length(name) >= 1) AND (length(name) <= 150)))`
- service_translations_name_not_null: `NOT NULL name`
- service_translations_origin_check: `CHECK ((origin = ANY (ARRAY['manual'::text, 'machine'::text])))`
- service_translations_origin_not_null: `NOT NULL origin`
- service_translations_pkey: `PRIMARY KEY (tenant_id, service_id, language)`
- service_translations_service_id_not_null: `NOT NULL service_id`
- service_translations_source_version_check: `CHECK ((source_version > 0))`
- service_translations_source_version_not_null: `NOT NULL source_version`
- service_translations_status_check: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))`
- service_translations_status_not_null: `NOT NULL status`
- service_translations_tenant_id_not_null: `NOT NULL tenant_id`
- service_translations_tenant_id_service_id_fkey: `FOREIGN KEY (tenant_id, service_id) REFERENCES services(tenant_id, id) ON DELETE CASCADE`
- service_translations_updated_at_not_null: `NOT NULL updated_at`
- service_translations_version_check: `CHECK ((version > 0))`
- service_translations_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE UNIQUE INDEX service_translations_pkey ON public.service_translations USING btree (tenant_id, service_id, language)`

RLS service_translations_tenant: USING `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`; WITH CHECK `(tenant_id = (current_setting('app.tenant_id'::text, true))::uuid)`.

booking_app: DELETE, INSERT, SELECT, UPDATE.

## services

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| name | text | jah | — |
| description | text | jah | ''::text |
| category | text | jah | — |
| active | boolean | jah | true |
| online | boolean | jah | true |
| group_id | uuid | ei | — |
| default_price | integer | jah | 0 |
| default_duration | integer | jah | 30 |
| buffer_before | integer | jah | 0 |
| buffer_after | integer | jah | 0 |
| version | integer | jah | 1 |
| source_language | text | jah | 'et'::text |
| content_version | integer | jah | 1 |
| currency | text | jah | 'EUR'::text |

Piirangud:

- services_active_not_null: `NOT NULL active`
- services_buffer_after_check: `CHECK (((buffer_after >= 0) AND (buffer_after <= 240)))`
- services_buffer_after_not_null: `NOT NULL buffer_after`
- services_buffer_before_check: `CHECK (((buffer_before >= 0) AND (buffer_before <= 240)))`
- services_buffer_before_not_null: `NOT NULL buffer_before`
- services_category_not_null: `NOT NULL category`
- services_content_version_check: `CHECK ((content_version > 0))`
- services_content_version_not_null: `NOT NULL content_version`
- services_currency_check: `CHECK ((currency = 'EUR'::text))`
- services_currency_not_null: `NOT NULL currency`
- services_default_duration_check: `CHECK (((default_duration >= 5) AND (default_duration <= 720)))`
- services_default_duration_not_null: `NOT NULL default_duration`
- services_default_price_check: `CHECK (((default_price >= 0) AND (default_price <= 100000000)))`
- services_default_price_not_null: `NOT NULL default_price`
- services_description_not_null: `NOT NULL description`
- services_id_not_null: `NOT NULL id`
- services_name_not_null: `NOT NULL name`
- services_online_not_null: `NOT NULL online`
- services_pkey: `PRIMARY KEY (id)`
- services_source_language_check: `CHECK ((source_language = ANY (ARRAY['et'::text, 'en'::text, 'ru'::text])))`
- services_source_language_not_null: `NOT NULL source_language`
- services_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- services_tenant_id_group_id_fkey: `FOREIGN KEY (tenant_id, group_id) REFERENCES service_groups(tenant_id, id)`
- services_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- services_tenant_id_not_null: `NOT NULL tenant_id`
- services_version_not_null: `NOT NULL version`
- services_version_positive: `CHECK ((version > 0))`

Indeksid:

- `CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id)`
- `CREATE UNIQUE INDEX services_tenant_id_id_key ON public.services USING btree (tenant_id, id)`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER services_content_version BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION service_content_version()`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## staff

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| name | text | jah | — |
| title | text | jah | ''::text |
| active | boolean | jah | true |
| online | boolean | jah | true |
| bio | text | jah | ''::text |
| photo_url | text | jah | ''::text |
| version | integer | jah | 1 |

Piirangud:

- staff_active_not_null: `NOT NULL active`
- staff_bio_not_null: `NOT NULL bio`
- staff_id_not_null: `NOT NULL id`
- staff_name_not_null: `NOT NULL name`
- staff_online_not_null: `NOT NULL online`
- staff_photo_url_not_null: `NOT NULL photo_url`
- staff_pkey: `PRIMARY KEY (id)`
- staff_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- staff_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- staff_tenant_id_not_null: `NOT NULL tenant_id`
- staff_title_not_null: `NOT NULL title`
- staff_version_not_null: `NOT NULL version`
- staff_version_positive: `CHECK ((version > 0))`

Indeksid:

- `CREATE UNIQUE INDEX staff_pkey ON public.staff USING btree (id)`
- `CREATE UNIQUE INDEX staff_tenant_id_id_key ON public.staff USING btree (tenant_id, id)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## staff_services

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| staff_id | uuid | jah | — |
| service_id | uuid | jah | — |
| price | integer | ei | — |
| duration | integer | ei | — |
| buffer_before | integer | ei | 0 |
| buffer_after | integer | ei | 0 |
| active | boolean | jah | true |
| version | integer | jah | 1 |
| currency | text | jah | 'EUR'::text |

Piirangud:

- staff_services_active_not_null: `NOT NULL active`
- staff_services_buffer_after_check: `CHECK (((buffer_after >= 0) AND (buffer_after <= 240)))`
- staff_services_buffer_before_check: `CHECK (((buffer_before >= 0) AND (buffer_before <= 240)))`
- staff_services_currency_check: `CHECK ((currency = 'EUR'::text))`
- staff_services_currency_not_null: `NOT NULL currency`
- staff_services_duration_check: `CHECK (((duration >= 5) AND (duration <= 720)))`
- staff_services_pkey: `PRIMARY KEY (tenant_id, staff_id, service_id)`
- staff_services_price_bounds: `CHECK ((price <= 100000000))`
- staff_services_price_check: `CHECK ((price >= 0))`
- staff_services_service_id_not_null: `NOT NULL service_id`
- staff_services_staff_id_not_null: `NOT NULL staff_id`
- staff_services_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- staff_services_tenant_id_not_null: `NOT NULL tenant_id`
- staff_services_tenant_id_service_id_fkey: `FOREIGN KEY (tenant_id, service_id) REFERENCES services(tenant_id, id)`
- staff_services_tenant_id_staff_id_fkey: `FOREIGN KEY (tenant_id, staff_id) REFERENCES staff(tenant_id, id)`
- staff_services_version_not_null: `NOT NULL version`
- staff_services_version_positive: `CHECK ((version > 0))`

Indeksid:

- `CREATE UNIQUE INDEX staff_services_pkey ON public.staff_services USING btree (tenant_id, staff_id, service_id)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT, UPDATE.

## subscriptions

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| plan_id | uuid | jah | — |
| plan_version | integer | jah | — |
| status | text | jah | 'pending'::text |
| period_start | date | jah | — |
| period_end | date | jah | — |
| paid_through | date | ei | — |
| trial_ends_at | timestamp with time zone | ei | — |
| ends_at | timestamp with time zone | ei | — |
| billing_contact_name | text | jah | ''::text |
| billing_email | text | jah | ''::text |
| version | integer | jah | 1 |
| created_at | timestamp with time zone | jah | now() |
| anchor_day | integer | jah | — |
| billing_recipient | jsonb | jah | '{}'::jsonb |
| contract_start | date | jah | — |
| payment_mode | text | jah | 'invoice'::text |

Piirangud:

- standard_no_trial: `CHECK (((plan_id <> 'e3a9a986-fc1f-4d22-b548-99e18f6a7929'::uuid) OR ((status <> 'trial'::text) AND (trial_ends_at IS NULL))))`
- subscription_anchor: `CHECK (((anchor_day >= 1) AND (anchor_day <= 31)))`
- subscriptions_anchor_day_not_null: `NOT NULL anchor_day`
- subscriptions_billing_contact_name_not_null: `NOT NULL billing_contact_name`
- subscriptions_billing_email_not_null: `NOT NULL billing_email`
- subscriptions_billing_recipient_check: `CHECK ((jsonb_typeof(billing_recipient) = 'object'::text))`
- subscriptions_billing_recipient_not_null: `NOT NULL billing_recipient`
- subscriptions_check: `CHECK ((period_end > period_start))`
- subscriptions_check1: `CHECK (((status <> 'trial'::text) OR (trial_ends_at IS NOT NULL)))`
- subscriptions_check2: `CHECK (((status <> 'ended'::text) OR (ends_at IS NOT NULL)))`
- subscriptions_contract_start_not_null: `NOT NULL contract_start`
- subscriptions_created_at_not_null: `NOT NULL created_at`
- subscriptions_id_not_null: `NOT NULL id`
- subscriptions_payment_mode_check: `CHECK ((payment_mode = ANY (ARRAY['invoice'::text, 'autopay'::text])))`
- subscriptions_payment_mode_not_null: `NOT NULL payment_mode`
- subscriptions_period_end_not_null: `NOT NULL period_end`
- subscriptions_period_start_not_null: `NOT NULL period_start`
- subscriptions_pkey: `PRIMARY KEY (id)`
- subscriptions_plan_id_not_null: `NOT NULL plan_id`
- subscriptions_plan_id_plan_version_fkey: `FOREIGN KEY (plan_id, plan_version) REFERENCES plan_versions(id, version)`
- subscriptions_plan_version_not_null: `NOT NULL plan_version`
- subscriptions_status_check: `CHECK ((status = ANY (ARRAY['pending'::text, 'trial'::text, 'active'::text, 'limited'::text, 'ended'::text])))`
- subscriptions_status_not_null: `NOT NULL status`
- subscriptions_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- subscriptions_tenant_id_id_key: `UNIQUE (tenant_id, id)`
- subscriptions_tenant_id_key: `UNIQUE (tenant_id)`
- subscriptions_tenant_id_not_null: `NOT NULL tenant_id`
- subscriptions_version_check: `CHECK ((version > 0))`
- subscriptions_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id)`
- `CREATE UNIQUE INDEX subscriptions_tenant_id_id_key ON public.subscriptions USING btree (tenant_id, id)`
- `CREATE UNIQUE INDEX subscriptions_tenant_id_key ON public.subscriptions USING btree (tenant_id)`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER subscription_anchor_default BEFORE INSERT ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION initialize_subscription_anchor()`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: INSERT, SELECT.

## support_grants

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| platform_user_id | text | jah | — |
| reason | text | jah | — |
| scope | text | jah | 'read_only'::text |
| expires_at | timestamp with time zone | jah | — |
| revoked_at | timestamp with time zone | ei | — |
| created_at | timestamp with time zone | jah | now() |

Piirangud:

- support_grants_created_at_not_null: `NOT NULL created_at`
- support_grants_expires_at_not_null: `NOT NULL expires_at`
- support_grants_id_not_null: `NOT NULL id`
- support_grants_pkey: `PRIMARY KEY (id)`
- support_grants_platform_user_id_fkey: `FOREIGN KEY (platform_user_id) REFERENCES auth_user(id) ON DELETE RESTRICT`
- support_grants_platform_user_id_not_null: `NOT NULL platform_user_id`
- support_grants_reason_check: `CHECK (((length(btrim(reason)) >= 1) AND (length(btrim(reason)) <= 500)))`
- support_grants_reason_not_null: `NOT NULL reason`
- support_grants_scope_check: `CHECK ((scope = 'read_only'::text))`
- support_grants_scope_not_null: `NOT NULL scope`
- support_grants_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- support_grants_tenant_id_not_null: `NOT NULL tenant_id`

Indeksid:

- `CREATE INDEX support_grants_active ON public.support_grants USING btree (platform_user_id, tenant_id, expires_at) WHERE (revoked_at IS NULL)`
- `CREATE UNIQUE INDEX support_grants_pkey ON public.support_grants USING btree (id)`

RLS access_support_tenant_or_platform: USING `((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (platform_user_id = NULLIF(current_setting('app.user_id'::text, true), ''::text)))`; WITH CHECK `(USING)`.

booking_app: INSERT, SELECT, UPDATE.

## tenant_domains

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| hostname | text | jah | — |
| tenant_id | uuid | jah | — |
| ready | boolean | jah | true |

Piirangud:

- tenant_domains_hostname_check: `CHECK ((hostname = lower(hostname)))`
- tenant_domains_hostname_not_null: `NOT NULL hostname`
- tenant_domains_pkey: `PRIMARY KEY (hostname)`
- tenant_domains_ready_not_null: `NOT NULL ready`
- tenant_domains_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- tenant_domains_tenant_id_not_null: `NOT NULL tenant_id`

Indeksid:

- `CREATE UNIQUE INDEX tenant_domains_pkey ON public.tenant_domains USING btree (hostname)`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER reserve_tenant_domain BEFORE INSERT OR UPDATE ON public.tenant_domains FOR EACH ROW EXECUTE FUNCTION reserve_tenant_domain()`

booking_app: INSERT, SELECT.

## tenant_embed_origins

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| origin | text | jah | — |

Piirangud:

- tenant_embed_origins_origin_check: `CHECK (((length(origin) >= 8) AND (length(origin) <= 300)))`
- tenant_embed_origins_origin_not_null: `NOT NULL origin`
- tenant_embed_origins_pkey: `PRIMARY KEY (tenant_id, origin)`
- tenant_embed_origins_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- tenant_embed_origins_tenant_id_not_null: `NOT NULL tenant_id`

Indeksid:

- `CREATE UNIQUE INDEX tenant_embed_origins_pkey ON public.tenant_embed_origins USING btree (tenant_id, origin)`

RLS embed_origins_tenant: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(USING)`.

booking_app: DELETE, INSERT, SELECT.

## tenants

Tabel; RLS: ei; FORCE RLS: ei.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| slug | text | jah | — |
| name | text | jah | — |
| address | text | jah | — |
| description | text | jah | ''::text |
| timezone | text | jah | 'Europe/Tallinn'::text |
| lead_minutes | integer | jah | 120 |
| window_days | integer | jah | 90 |
| step_minutes | integer | jah | 15 |
| cancellation_hours | integer | jah | 24 |
| active | boolean | jah | true |
| demo | boolean | jah | true |
| rules_version | integer | jah | 1 |
| contact_email | text | jah | ''::text |
| contact_phone | text | jah | ''::text |
| management_link_hours | integer | ei | — |
| management_policy_version | integer | jah | 1 |
| default_language | text | jah | 'et'::text |
| notification_email | text | ei | — |
| reminder_minutes | integer | ei | — |
| notification_settings_version | integer | jah | 1 |
| public_state | text | jah | 'published'::text |
| lifecycle_version | integer | jah | 1 |
| booking_terms | text | jah | ''::text |
| reviewed_rules_version | integer | ei | — |
| published_at | timestamp with time zone | ei | — |
| booking_stops_at | timestamp with time zone | ei | — |
| service_ends_at | timestamp with time zone | ei | — |
| data_access_until | timestamp with time zone | ei | — |
| deletion_not_before | timestamp with time zone | ei | — |
| exit_agreement | text | ei | — |
| exit_approved_by | text | ei | — |
| exit_approved_at | timestamp with time zone | ei | — |
| exit_version | integer | jah | 1 |

Piirangud:

- company_exit_complete: `CHECK (((num_nonnulls(booking_stops_at, service_ends_at, data_access_until, deletion_not_before, exit_agreement, exit_approved_by, exit_approved_at) = 0) OR ((num_nonnulls(booking_stops_at, service_ends_at, data_access_until, deletion_not_before, exit_agreement, exit_approved_by, exit_approved_at) = 7) AND (booking_stops_at <= service_ends_at) AND (service_ends_at <= data_access_until) AND (data_access_until <= deletion_not_before) AND ((length(btrim(exit_agreement)) >= 10) AND (length(btrim(exit_agreement)) <= 1000)))))`
- tenant_management_version_positive: `CHECK ((management_policy_version > 0))`
- tenant_rules_version_positive: `CHECK ((rules_version > 0))`
- tenants_active_not_null: `NOT NULL active`
- tenants_address_not_null: `NOT NULL address`
- tenants_booking_terms_check: `CHECK ((length(booking_terms) <= 5000))`
- tenants_booking_terms_not_null: `NOT NULL booking_terms`
- tenants_cancellation_hours_check: `CHECK ((cancellation_hours >= 0))`
- tenants_cancellation_hours_not_null: `NOT NULL cancellation_hours`
- tenants_contact_email_not_null: `NOT NULL contact_email`
- tenants_contact_phone_not_null: `NOT NULL contact_phone`
- tenants_default_language_check: `CHECK ((default_language = ANY (ARRAY['et'::text, 'en'::text, 'ru'::text])))`
- tenants_default_language_not_null: `NOT NULL default_language`
- tenants_demo_not_null: `NOT NULL demo`
- tenants_description_not_null: `NOT NULL description`
- tenants_exit_approved_by_fkey: `FOREIGN KEY (exit_approved_by) REFERENCES auth_user(id)`
- tenants_exit_version_check: `CHECK ((exit_version > 0))`
- tenants_exit_version_not_null: `NOT NULL exit_version`
- tenants_id_not_null: `NOT NULL id`
- tenants_lead_minutes_check: `CHECK ((lead_minutes >= 0))`
- tenants_lead_minutes_not_null: `NOT NULL lead_minutes`
- tenants_lifecycle_version_check: `CHECK ((lifecycle_version > 0))`
- tenants_lifecycle_version_not_null: `NOT NULL lifecycle_version`
- tenants_management_link_hours_check: `CHECK (((management_link_hours >= 0) AND (management_link_hours <= 8760)))`
- tenants_management_policy_version_not_null: `NOT NULL management_policy_version`
- tenants_name_not_null: `NOT NULL name`
- tenants_notification_settings_version_check: `CHECK ((notification_settings_version > 0))`
- tenants_notification_settings_version_not_null: `NOT NULL notification_settings_version`
- tenants_pkey: `PRIMARY KEY (id)`
- tenants_public_state_check: `CHECK ((public_state = ANY (ARRAY['draft'::text, 'published'::text, 'paused'::text, 'closed'::text])))`
- tenants_public_state_not_null: `NOT NULL public_state`
- tenants_reminder_minutes_check: `CHECK (((reminder_minutes >= 5) AND (reminder_minutes <= 43200)))`
- tenants_rules_version_not_null: `NOT NULL rules_version`
- tenants_slug_check: `CHECK (((slug ~ '^[a-z][a-z0-9-]{1,48}[a-z0-9]$'::text) AND (slug <> ALL (ARRAY['haldus'::text, 'app'::text, 'api'::text, 'admin'::text, 'cdn'::text, 'www'::text, 'mail'::text]))))`
- tenants_slug_key: `UNIQUE (slug)`
- tenants_slug_not_null: `NOT NULL slug`
- tenants_step_minutes_check: `CHECK (((step_minutes >= 5) AND (step_minutes <= 60)))`
- tenants_step_minutes_not_null: `NOT NULL step_minutes`
- tenants_timezone_not_null: `NOT NULL timezone`
- tenants_window_days_check: `CHECK (((window_days >= 1) AND (window_days <= 365)))`
- tenants_window_days_not_null: `NOT NULL window_days`

Indeksid:

- `CREATE UNIQUE INDEX tenants_pkey ON public.tenants USING btree (id)`
- `CREATE UNIQUE INDEX tenants_slug_key ON public.tenants USING btree (slug)`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER tenant_timezone_valid BEFORE INSERT OR UPDATE OF timezone ON public.tenants FOR EACH ROW EXECUTE FUNCTION valid_tenant_timezone()`

booking_app: INSERT, SELECT, UPDATE.

## theme_configs

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| tenant_id | uuid | jah | — |
| version | integer | jah | — |
| status | text | jah | 'draft'::text |
| config | jsonb | jah | '{}'::jsonb |
| logo_media_id | uuid | ei | — |
| created_by | text | ei | — |
| created_at | timestamp with time zone | jah | now() |
| published_at | timestamp with time zone | ei | — |

Piirangud:

- theme_configs_check: `CHECK (((status <> 'published'::text) OR (published_at IS NOT NULL)))`
- theme_configs_config_check: `CHECK ((jsonb_typeof(config) = 'object'::text))`
- theme_configs_config_not_null: `NOT NULL config`
- theme_configs_created_at_not_null: `NOT NULL created_at`
- theme_configs_created_by_fkey: `FOREIGN KEY (created_by) REFERENCES auth_user(id)`
- theme_configs_pkey: `PRIMARY KEY (tenant_id, version)`
- theme_configs_status_check: `CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))`
- theme_configs_status_not_null: `NOT NULL status`
- theme_configs_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- theme_configs_tenant_id_logo_media_id_fkey: `FOREIGN KEY (tenant_id, logo_media_id) REFERENCES media(tenant_id, id)`
- theme_configs_tenant_id_not_null: `NOT NULL tenant_id`
- theme_configs_version_check: `CHECK ((version > 0))`
- theme_configs_version_not_null: `NOT NULL version`

Indeksid:

- `CREATE UNIQUE INDEX theme_configs_pkey ON public.theme_configs USING btree (tenant_id, version)`
- `CREATE UNIQUE INDEX theme_single_draft ON public.theme_configs USING btree (tenant_id) WHERE (status = 'draft'::text)`
- `CREATE UNIQUE INDEX theme_single_published ON public.theme_configs USING btree (tenant_id) WHERE (status = 'published'::text)`

Päästikud (funktsioonide sisu on migratsioonides):

- `CREATE TRIGGER theme_snapshot_immutable BEFORE UPDATE ON public.theme_configs FOR EACH ROW EXECUTE FUNCTION protect_published_theme()`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: SELECT.

## weekly_hours

Tabel; RLS: jah; FORCE RLS: jah.

| Väli | Tüüp | NOT NULL | Vaikeväärtus |
| --- | --- | --- | --- |
| id | uuid | jah | gen_random_uuid() |
| tenant_id | uuid | jah | — |
| staff_id | uuid | ei | — |
| weekday | integer | jah | — |
| start_minute | integer | jah | — |
| end_minute | integer | jah | — |

Piirangud:

- weekly_hours_check: `CHECK ((((end_minute >= 1) AND (end_minute <= 1440)) AND (end_minute > start_minute)))`
- weekly_hours_end_minute_not_null: `NOT NULL end_minute`
- weekly_hours_id_not_null: `NOT NULL id`
- weekly_hours_pkey: `PRIMARY KEY (id)`
- weekly_hours_start_minute_check: `CHECK (((start_minute >= 0) AND (start_minute <= 1439)))`
- weekly_hours_start_minute_not_null: `NOT NULL start_minute`
- weekly_hours_tenant_id_fkey: `FOREIGN KEY (tenant_id) REFERENCES tenants(id)`
- weekly_hours_tenant_id_not_null: `NOT NULL tenant_id`
- weekly_hours_tenant_id_staff_id_fkey: `FOREIGN KEY (tenant_id, staff_id) REFERENCES staff(tenant_id, id)`
- weekly_hours_weekday_check: `CHECK (((weekday >= 1) AND (weekday <= 7)))`
- weekly_hours_weekday_not_null: `NOT NULL weekday`
- weekly_location_no_overlap: `EXCLUDE USING gist (tenant_id WITH =, weekday WITH =, int4range(start_minute, end_minute, '[)'::text) WITH &&) WHERE ((staff_id IS NULL))`
- weekly_staff_no_overlap: `EXCLUDE USING gist (tenant_id WITH =, staff_id WITH =, weekday WITH =, int4range(start_minute, end_minute, '[)'::text) WITH &&) WHERE ((staff_id IS NOT NULL))`

Indeksid:

- `CREATE UNIQUE INDEX weekly_hours_pkey ON public.weekly_hours USING btree (id)`
- `CREATE INDEX weekly_hours_tenant_staff ON public.weekly_hours USING btree (tenant_id, staff_id, weekday)`
- `CREATE INDEX weekly_location_no_overlap ON public.weekly_hours USING gist (tenant_id, weekday, int4range(start_minute, end_minute, '[)'::text)) WHERE (staff_id IS NULL)`
- `CREATE INDEX weekly_staff_no_overlap ON public.weekly_hours USING gist (tenant_id, staff_id, weekday, int4range(start_minute, end_minute, '[)'::text)) WHERE (staff_id IS NOT NULL)`

RLS tenant_isolation: USING `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`; WITH CHECK `(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)`.

booking_app: DELETE, INSERT, SELECT, UPDATE.
