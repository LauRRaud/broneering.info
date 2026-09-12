-- Keep small normalized logos in the immutable theme snapshot: publication and
-- rollback are atomic, tenant RLS and database backups include both variants.
ALTER TABLE theme_configs
 ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 ADD COLUMN logo_light bytea CHECK(logo_light IS NULL OR octet_length(logo_light) BETWEEN 1 AND 524288),
 ADD COLUMN logo_dark bytea CHECK(logo_dark IS NULL OR octet_length(logo_dark) BETWEEN 1 AND 524288);
