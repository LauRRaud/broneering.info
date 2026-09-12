-- The lifecycle scaffold granted SELECT only. The editor now needs mutations;
-- existing FORCE RLS and immutable published snapshot trigger remain in force.
GRANT INSERT, UPDATE ON theme_configs TO booking_app;
