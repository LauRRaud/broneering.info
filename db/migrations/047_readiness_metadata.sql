-- Names only: runtime readiness verifies that all shipped migrations are applied.
GRANT SELECT ON schema_migrations TO booking_app;
