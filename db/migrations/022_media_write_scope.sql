-- Workers may change lifecycle status; file identity, digest, size and expiry remain immutable to the app role.
REVOKE UPDATE ON media FROM booking_app;
GRANT UPDATE(status,version) ON media TO booking_app;
