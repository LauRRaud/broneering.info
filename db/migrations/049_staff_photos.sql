-- Small, normalized profile photos live with the staff record and existing tenant RLS.
-- Database backups include the image; no external file or orphan cleanup is needed.
ALTER TABLE staff ADD COLUMN photo_image bytea
 CHECK (photo_image IS NULL OR octet_length(photo_image) BETWEEN 1 AND 524288);
