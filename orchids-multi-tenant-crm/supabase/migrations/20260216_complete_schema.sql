-- ============================================================================
-- Rhône Risk Advisory — Complete Database Schema
-- Migration: 20260216_complete_schema.sql
-- Ensures all tables exist with proper relationships for multi-tenant CRM
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE MULTI-TENANT TABLES
-- ============================================================================

-- Tenants (organizations)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  subscription_plan TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users (CRM team members)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user ON users(auth_user_id);

-- ============================================================================
-- CRM ENTITIES
-- ============================================================================

-- Companies (client organizations)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id UUID,
  name TEXT NOT NULL,
  industry TEXT,
  employee_count TEXT,
  annual_revenue NUMERIC,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  website TEXT,
  insurance_premium NUMERIC,
  insurance_taxes NUMERIC,
  surplus_lines_taxes NUMERIC,
  insurance_fees NUMERIC,
  commission_amount NUMERIC,
  commission_rate NUMERIC,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);

-- Contacts (people at companies)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'contact',
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  job_title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  website TEXT,
  linkedin_url TEXT,
  source TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);

-- ============================================================================
-- SALES PIPELINE
-- ============================================================================

-- Pipelines
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON pipelines(tenant_id);

-- Pipeline Stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  position INTEGER DEFAULT 0,
  probability NUMERIC DEFAULT 0,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  unit_price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  category TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);

-- Deals
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES pipelines(id),
  stage_id UUID REFERENCES pipeline_stages(id),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  priority TEXT DEFAULT 'medium',
  probability NUMERIC DEFAULT 0,
  expected_close_date DATE,
  actual_close_date DATE,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason TEXT,
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deals_tenant ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id);

-- Deal Products
CREATE TABLE IF NOT EXISTS deal_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_products_deal ON deal_products(deal_id);

-- ============================================================================
-- INSURANCE POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS insurance_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  partner_id UUID,
  policy_number TEXT,
  carrier TEXT NOT NULL,
  line_of_coverage TEXT NOT NULL,
  coverage_limit NUMERIC,
  deductible NUMERIC,
  effective_date DATE,
  expiration_date DATE,
  premium NUMERIC,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT,
  storage_bucket TEXT DEFAULT 'insurance-policies',
  status TEXT DEFAULT 'active',
  notes TEXT,
  uploaded_by UUID,
  uploaded_by_type TEXT DEFAULT 'tenant',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Analysis fields (from 20250204 migration)
  analysis_id TEXT,
  analysis_status TEXT,
  analysis_score NUMERIC(5,2),
  analysis_recommendation TEXT,
  analysis_data JSONB,
  analysis_started_at TIMESTAMPTZ,
  analysis_completed_at TIMESTAMPTZ,
  analysis_error TEXT,
  -- New fields for report storage and retry tracking
  report_storage_path TEXT,
  analysis_retries INTEGER DEFAULT 0,
  analysis_tokens_used JSONB
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_tenant ON insurance_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_company ON insurance_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_analysis_id ON insurance_policies(analysis_id) WHERE analysis_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insurance_policies_analysis_status ON insurance_policies(analysis_status) WHERE analysis_status IS NOT NULL;

-- ============================================================================
-- COMPANY DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT,
  storage_bucket TEXT DEFAULT 'documents',
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_documents_company ON company_documents(company_id);

-- ============================================================================
-- PARTNER / CHANNEL
-- ============================================================================

-- Partners
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  partner_type TEXT DEFAULT 'referral',
  commission_rate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  tier TEXT DEFAULT 'silver',
  total_referrals INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_commission_paid NUMERIC DEFAULT 0,
  reward_points INTEGER DEFAULT 0,
  notes TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_tenant ON partners(tenant_id);

-- Partner Users (portal access)
CREATE TABLE IF NOT EXISTS partner_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  name TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_users_partner ON partner_users(partner_id);

-- Partner Clients
CREATE TABLE IF NOT EXISTS partner_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  contact_id UUID,
  company_name TEXT NOT NULL,
  primary_contact_name TEXT,
  email TEXT,
  phone TEXT,
  industry TEXT,
  employee_count TEXT,
  status TEXT DEFAULT 'active',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_clients_partner ON partner_clients(partner_id);

-- Partner Onboarding Tasks
CREATE TABLE IF NOT EXISTS partner_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partner Reward Points
CREATE TABLE IF NOT EXISTS partner_reward_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  referral_id UUID,
  deal_id UUID,
  points INTEGER DEFAULT 0,
  description TEXT,
  transaction_type TEXT DEFAULT 'earned',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client Users (client portal access)
CREATE TABLE IF NOT EXISTS client_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES partner_clients(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'viewer',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_users_client ON client_users(client_id);

-- Company Users (direct company portal access)
CREATE TABLE IF NOT EXISTS company_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  partner_id UUID,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'viewer',
  is_primary BOOLEAN DEFAULT false,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  deal_id UUID,
  contact_id UUID,
  referred_name TEXT NOT NULL,
  referred_email TEXT,
  referred_phone TEXT,
  referred_company TEXT,
  status TEXT DEFAULT 'new',
  commission_amount NUMERIC DEFAULT 0,
  commission_paid_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  estimated_revenue NUMERIC,
  employee_count INTEGER,
  policy_file_name TEXT,
  policy_file_type TEXT,
  policy_file_size INTEGER,
  policy_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_partner ON referrals(partner_id);

-- ============================================================================
-- SECURITY / INCIDENTS
-- ============================================================================

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id UUID,
  client_id UUID,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  incident_number SERIAL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  incident_type TEXT,
  source TEXT,
  detected_at TIMESTAMPTZ,
  contained_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_by UUID,
  affected_systems TEXT,
  impact_assessment TEXT,
  root_cause TEXT,
  lessons_learned TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);

-- Incident Tasks
CREATE TABLE IF NOT EXISTS incident_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  phase TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_tasks_incident ON incident_tasks(incident_id);

-- Incident Timeline
CREATE TABLE IF NOT EXISTS incident_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_time TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident ON incident_timeline(incident_id);

-- Incident Evidence
CREATE TABLE IF NOT EXISTS incident_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  evidence_type TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT,
  storage_bucket TEXT DEFAULT 'evidence',
  hash_md5 TEXT,
  hash_sha256 TEXT,
  collected_by UUID,
  collected_at TIMESTAMPTZ DEFAULT now(),
  chain_of_custody TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_evidence_incident ON incident_evidence(incident_id);

-- ============================================================================
-- SUPPORT TICKETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  category TEXT,
  source TEXT DEFAULT 'email',
  ticket_number SERIAL,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ,
  satisfaction_rating INTEGER,
  satisfaction_comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Ticket Comments
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  is_from_customer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);

-- ============================================================================
-- CLIENT SECURITY ASSESSMENTS
-- ============================================================================

-- Client Risk Assessments
CREATE TABLE IF NOT EXISTS client_risk_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES partner_clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  risk_level TEXT DEFAULT 'medium',
  score NUMERIC DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  impact TEXT,
  likelihood TEXT,
  mitigation_status TEXT DEFAULT 'open',
  identified_date DATE,
  target_resolution_date DATE,
  resolved_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_risk_assessments_client ON client_risk_assessments(client_id);

-- Client Security Recommendations
CREATE TABLE IF NOT EXISTS client_security_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES partner_clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  current_state TEXT,
  recommended_action TEXT,
  expected_improvement TEXT,
  effort_level TEXT,
  status TEXT DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_security_recommendations_client ON client_security_recommendations(client_id);

-- Client Security Scores
CREATE TABLE IF NOT EXISTS client_security_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES partner_clients(id) ON DELETE CASCADE,
  overall_score NUMERIC DEFAULT 0,
  network_security_score NUMERIC DEFAULT 0,
  endpoint_security_score NUMERIC DEFAULT 0,
  access_control_score NUMERIC DEFAULT 0,
  data_protection_score NUMERIC DEFAULT 0,
  incident_response_score NUMERIC DEFAULT 0,
  compliance_score NUMERIC DEFAULT 0,
  first_party_score NUMERIC DEFAULT 0,
  third_party_score NUMERIC DEFAULT 0,
  cyber_crime_score NUMERIC DEFAULT 0,
  inherent_risk_score NUMERIC DEFAULT 0,
  cyber_maturity_score NUMERIC DEFAULT 0,
  compliance_maturity_score NUMERIC DEFAULT 0,
  insurance_maturity_score NUMERIC DEFAULT 0,
  assessment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_security_scores_client ON client_security_scores(client_id);

-- ============================================================================
-- TAGS, CUSTOM FIELDS, ACTIVITIES, NOTIFICATIONS, ATTACHMENTS
-- ============================================================================

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  entity_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tags_tenant ON tags(tenant_id);

-- Entity Tags (join table)
CREATE TABLE IF NOT EXISTS entity_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_id, entity_type);

-- Custom Field Definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  options JSONB,
  default_value TEXT,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Custom Field Values
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_boolean BOOLEAN,
  value_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activities (audit trail)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  changes JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_tenant ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'attachments',
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
