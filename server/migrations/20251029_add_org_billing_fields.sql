-- Add billing address columns to organizations
ALTER TABLE IF EXISTS public.organizations
ADD COLUMN IF NOT EXISTS billing_line1 text;

ALTER TABLE IF EXISTS public.organizations
ADD COLUMN IF NOT EXISTS billing_line2 text;

ALTER TABLE IF EXISTS public.organizations
ADD COLUMN IF NOT EXISTS billing_city text;

ALTER TABLE IF EXISTS public.organizations
ADD COLUMN IF NOT EXISTS billing_state text;

ALTER TABLE IF EXISTS public.organizations
ADD COLUMN IF NOT EXISTS billing_zip text;

ALTER TABLE IF EXISTS public.organizations
ADD COLUMN IF NOT EXISTS billing_country text;

ALTER TABLE IF EXISTS public.organizations
ADD COLUMN IF NOT EXISTS billing_phone text;

-- Update updated_at trigger is already present on organizations via trigger_set_timestamp
