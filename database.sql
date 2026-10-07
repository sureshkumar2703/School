-- Create the staff_salary_details table
-- You will need to run this query in your Supabase SQL Editor to create the table.
-- Go to your Supabase project -> SQL Editor -> New query.

CREATE TABLE staff_salary_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  organization_key TEXT,
  staff_name TEXT,
  staff_code TEXT,
  phone TEXT,
  total_salary NUMERIC,
  payment NUMERIC,
  balance NUMERIC,
  payment_date DATE,
  status TEXT
);

-- Note: By default, tables have Row Level Security (RLS) enabled.
-- For this setup to work, you must either disable RLS on this table
-- or create appropriate policies to allow insert operations.
-- To disable RLS (for development): Go to Authentication -> Policies,
-- select the 'staff_salary_details' table, and click "Disable RLS".
