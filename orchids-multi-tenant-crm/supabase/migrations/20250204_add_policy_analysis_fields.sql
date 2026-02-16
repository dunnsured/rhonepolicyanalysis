-- Migration: Add Policy Analysis Integration Fields
-- This migration adds fields to track policy analysis status from the Analysis API

-- Add analysis tracking fields to insurance_policies table
ALTER TABLE insurance_policies
ADD COLUMN IF NOT EXISTS analysis_id TEXT,
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS analysis_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS analysis_recommendation TEXT,
ADD COLUMN IF NOT EXISTS analysis_data JSONB,
ADD COLUMN IF NOT EXISTS analysis_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS analysis_error TEXT;

-- Add index for faster lookups by analysis_id
CREATE INDEX IF NOT EXISTS idx_insurance_policies_analysis_id
ON insurance_policies(analysis_id)
WHERE analysis_id IS NOT NULL;

-- Add index for filtering by analysis status
CREATE INDEX IF NOT EXISTS idx_insurance_policies_analysis_status
ON insurance_policies(analysis_status)
WHERE analysis_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN insurance_policies.analysis_id IS 'Unique identifier from the Policy Analysis API';
COMMENT ON COLUMN insurance_policies.analysis_status IS 'Status: processing, analyzing, completed, failed';
COMMENT ON COLUMN insurance_policies.analysis_score IS 'Overall maturity score from analysis (0-100)';
COMMENT ON COLUMN insurance_policies.analysis_recommendation IS 'Summary recommendation from analysis';
COMMENT ON COLUMN insurance_policies.analysis_data IS 'Full analysis results as JSON';
COMMENT ON COLUMN insurance_policies.analysis_started_at IS 'When analysis was initiated';
COMMENT ON COLUMN insurance_policies.analysis_completed_at IS 'When analysis completed or failed';
COMMENT ON COLUMN insurance_policies.analysis_error IS 'Error message if analysis failed';
