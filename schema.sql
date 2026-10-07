-- Drop the old table if it exists to avoid conflicts.
DROP TABLE IF EXISTS public.class_section_allocations;

-- Create the new, normalized table for student allocations.
-- Each row represents a single student allocated to a single section for a specific year.
CREATE TABLE public.class_section_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    organization_key TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    class_name TEXT NOT NULL,
    section_name TEXT NOT NULL,
    register_no TEXT NOT NULL,
    full_name TEXT NOT NULL,
    -- This constraint ensures a student is not allocated to the same class/section twice in the same year.
    CONSTRAINT unique_student_allocation UNIQUE (organization_key, academic_year, class_name, section_name, register_no)
);

-- Optional: Add a policy for row-level security
ALTER TABLE public.class_section_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own organization's allocations"
ON public.class_section_allocations
FOR ALL
-- This policy assumes you have a way to get the user's organization_key.
-- For simplicity, this example allows any authenticated user.
-- Replace with your actual security rules, e.g., checking against a user profile table.
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
