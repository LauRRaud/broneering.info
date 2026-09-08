-- Contact removal is not a claim of irreversible anonymisation.
ALTER TABLE retention_policies DROP CONSTRAINT retention_policies_action_check;
ALTER TABLE retention_policies ADD CONSTRAINT retention_policies_action_check CHECK(action IN ('delete','anonymize','redact'));
GRANT INSERT,UPDATE ON retention_policies TO booking_app;
