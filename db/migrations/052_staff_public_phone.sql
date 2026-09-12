-- Separate opt-in public contact. Never sourced from an authentication account.
ALTER TABLE staff ADD COLUMN public_phone text NOT NULL DEFAULT ''
 CHECK (public_phone='' OR (
   char_length(public_phone)<=30 AND public_phone ~ '^\+?[0-9][0-9 ()-]*$'
   AND length(regexp_replace(public_phone,'[^0-9]','','g')) BETWEEN 6 AND 15
 ));
