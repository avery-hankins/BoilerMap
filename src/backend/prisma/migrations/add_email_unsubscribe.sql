-- Add email unsubscribe field to Club_Memberships table
-- This allows users to opt out of blast emails while remaining club members

ALTER TABLE Club_Memberships
ADD COLUMN Email_Unsubscribed BOOLEAN DEFAULT false NOT NULL;
