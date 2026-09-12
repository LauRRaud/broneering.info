-- Existing/manual bookings retain their reminder policy. New public forms send
-- an explicit opt-in/out without disabling confirmation/change/cancellation mail.
ALTER TABLE bookings ADD COLUMN customer_reminders boolean NOT NULL DEFAULT true;
