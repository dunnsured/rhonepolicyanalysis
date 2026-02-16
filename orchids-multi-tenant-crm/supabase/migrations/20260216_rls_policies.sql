-- ============================================================================
-- Rhône Risk Advisory — Row Level Security Policies
-- Migration: 20260216_rls_policies.sql
-- Enables RLS on all tables with tenant isolation
-- ============================================================================

-- ============================================================================
-- HELPER: Get current user's tenant_id from the users table
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_reward_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_security_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_security_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SERVICE ROLE BYPASS (for server-side operations / webhooks)
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'tenants', 'users', 'companies', 'contacts', 'pipelines', 'pipeline_stages',
      'products', 'deals', 'deal_products', 'insurance_policies', 'company_documents',
      'partners', 'partner_users', 'partner_clients', 'partner_onboarding_tasks',
      'partner_reward_points', 'client_users', 'company_users', 'referrals',
      'incidents', 'incident_tasks', 'incident_timeline', 'incident_evidence',
      'tickets', 'ticket_comments', 'client_risk_assessments',
      'client_security_recommendations', 'client_security_scores',
      'tags', 'entity_tags', 'custom_field_definitions', 'custom_field_values',
      'activities', 'notifications', 'attachments'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "service_role_bypass" ON %I FOR ALL USING (auth.role() = ''service_role'')',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- TENANT ISOLATION POLICIES (for authenticated users)
-- ============================================================================

-- Tenants: users can only see their own tenant
CREATE POLICY "tenant_select_own" ON tenants
  FOR SELECT USING (id = auth.tenant_id());

-- Users: can see users in same tenant
CREATE POLICY "users_tenant_isolation" ON users
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Companies: tenant isolation
CREATE POLICY "companies_tenant_isolation" ON companies
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Contacts: tenant isolation
CREATE POLICY "contacts_tenant_isolation" ON contacts
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Pipelines: tenant isolation
CREATE POLICY "pipelines_tenant_isolation" ON pipelines
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Pipeline Stages: accessible if pipeline is in user's tenant
CREATE POLICY "pipeline_stages_tenant_isolation" ON pipeline_stages
  FOR ALL USING (
    pipeline_id IN (SELECT id FROM pipelines WHERE tenant_id = auth.tenant_id())
  );

-- Products: tenant isolation
CREATE POLICY "products_tenant_isolation" ON products
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Deals: tenant isolation
CREATE POLICY "deals_tenant_isolation" ON deals
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Deal Products: accessible if deal is in user's tenant
CREATE POLICY "deal_products_tenant_isolation" ON deal_products
  FOR ALL USING (
    deal_id IN (SELECT id FROM deals WHERE tenant_id = auth.tenant_id())
  );

-- Insurance Policies: tenant isolation
CREATE POLICY "insurance_policies_tenant_isolation" ON insurance_policies
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Company Documents: tenant isolation
CREATE POLICY "company_documents_tenant_isolation" ON company_documents
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Partners: tenant isolation
CREATE POLICY "partners_tenant_isolation" ON partners
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Partner Users: tenant isolation
CREATE POLICY "partner_users_tenant_isolation" ON partner_users
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Partner Clients: tenant isolation
CREATE POLICY "partner_clients_tenant_isolation" ON partner_clients
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Partner Onboarding Tasks: tenant isolation
CREATE POLICY "partner_onboarding_tasks_tenant_isolation" ON partner_onboarding_tasks
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Partner Reward Points: tenant isolation
CREATE POLICY "partner_reward_points_tenant_isolation" ON partner_reward_points
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Client Users: tenant isolation
CREATE POLICY "client_users_tenant_isolation" ON client_users
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Company Users: tenant isolation
CREATE POLICY "company_users_tenant_isolation" ON company_users
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Referrals: tenant isolation
CREATE POLICY "referrals_tenant_isolation" ON referrals
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Incidents: tenant isolation
CREATE POLICY "incidents_tenant_isolation" ON incidents
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Incident Tasks: tenant isolation
CREATE POLICY "incident_tasks_tenant_isolation" ON incident_tasks
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Incident Timeline: tenant isolation
CREATE POLICY "incident_timeline_tenant_isolation" ON incident_timeline
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Incident Evidence: tenant isolation
CREATE POLICY "incident_evidence_tenant_isolation" ON incident_evidence
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Tickets: tenant isolation
CREATE POLICY "tickets_tenant_isolation" ON tickets
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Ticket Comments: accessible if ticket is in user's tenant
CREATE POLICY "ticket_comments_tenant_isolation" ON ticket_comments
  FOR ALL USING (
    ticket_id IN (SELECT id FROM tickets WHERE tenant_id = auth.tenant_id())
  );

-- Client Risk Assessments: tenant isolation
CREATE POLICY "client_risk_assessments_tenant_isolation" ON client_risk_assessments
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Client Security Recommendations: tenant isolation
CREATE POLICY "client_security_recommendations_tenant_isolation" ON client_security_recommendations
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Client Security Scores: tenant isolation
CREATE POLICY "client_security_scores_tenant_isolation" ON client_security_scores
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Tags: tenant isolation
CREATE POLICY "tags_tenant_isolation" ON tags
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Entity Tags: accessible if tag is in user's tenant
CREATE POLICY "entity_tags_tenant_isolation" ON entity_tags
  FOR ALL USING (
    tag_id IN (SELECT id FROM tags WHERE tenant_id = auth.tenant_id())
  );

-- Custom Field Definitions: tenant isolation
CREATE POLICY "custom_field_definitions_tenant_isolation" ON custom_field_definitions
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Custom Field Values: accessible if definition is in user's tenant
CREATE POLICY "custom_field_values_tenant_isolation" ON custom_field_values
  FOR ALL USING (
    field_definition_id IN (SELECT id FROM custom_field_definitions WHERE tenant_id = auth.tenant_id())
  );

-- Activities: tenant isolation
CREATE POLICY "activities_tenant_isolation" ON activities
  FOR ALL USING (tenant_id = auth.tenant_id());

-- Notifications: users can only see their own notifications
CREATE POLICY "notifications_user_isolation" ON notifications
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Attachments: tenant isolation
CREATE POLICY "attachments_tenant_isolation" ON attachments
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ============================================================================
-- PARTNER PORTAL POLICIES
-- Partner users can see data for their partner and their clients
-- ============================================================================

-- Partner users can see their own partner record
CREATE POLICY "partner_users_own_partner" ON partners
  FOR SELECT USING (
    id IN (SELECT partner_id FROM partner_users WHERE user_id = auth.uid())
  );

-- Partner users can see their assigned clients
CREATE POLICY "partner_users_own_clients" ON partner_clients
  FOR SELECT USING (
    partner_id IN (SELECT partner_id FROM partner_users WHERE user_id = auth.uid())
  );

-- Partner users can see referrals for their partner
CREATE POLICY "partner_users_own_referrals" ON referrals
  FOR SELECT USING (
    partner_id IN (SELECT partner_id FROM partner_users WHERE user_id = auth.uid())
  );

-- ============================================================================
-- CLIENT PORTAL POLICIES
-- Client users can see data for their company only
-- ============================================================================

-- Client users can see their own client record
CREATE POLICY "client_users_own_client" ON partner_clients
  FOR SELECT USING (
    id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid())
  );

-- Client users can see insurance policies for their company
CREATE POLICY "client_users_own_policies" ON insurance_policies
  FOR SELECT USING (
    company_id IN (
      SELECT pc.id FROM partner_clients pc
      JOIN client_users cu ON cu.client_id = pc.id
      WHERE cu.user_id = auth.uid()
    )
  );

-- Client users can see their security scores
CREATE POLICY "client_users_own_scores" ON client_security_scores
  FOR SELECT USING (
    client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid())
  );

-- Client users can see their risk assessments
CREATE POLICY "client_users_own_risks" ON client_risk_assessments
  FOR SELECT USING (
    client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid())
  );

-- Client users can see their security recommendations
CREATE POLICY "client_users_own_recommendations" ON client_security_recommendations
  FOR SELECT USING (
    client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid())
  );
