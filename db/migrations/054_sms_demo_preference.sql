-- Persist the SMS choice used by the demo booking design.
-- This does not enqueue or send SMS. Real tenants cannot request it until a provider is integrated.
ALTER TABLE bookings ADD COLUMN customer_sms_reminders boolean NOT NULL DEFAULT false;
