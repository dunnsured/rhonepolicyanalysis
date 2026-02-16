import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Tenant = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  settings: Record<string, unknown>
  subscription_plan: string
  subscription_status: string
  created_at: string
  updated_at: string
}

export type User = {
  id: string
  auth_user_id: string | null
  tenant_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  is_active: boolean
  last_login_at: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Contact = {
  id: string
  tenant_id: string
  company_id: string | null
  type: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  job_title: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  website: string | null
  linkedin_url: string | null
  source: string | null
  status: string
  notes: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
  company?: Company
}

export type Pipeline = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  is_default: boolean
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  stages?: PipelineStage[]
}

export type PipelineStage = {
  id: string
  pipeline_id: string
  name: string
  color: string
  position: number
  probability: number
  is_won: boolean
  is_lost: boolean
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  sku: string | null
  unit_price: number
  currency: string
  is_active: boolean
  category: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Deal = {
  id: string
  tenant_id: string
  pipeline_id: string
  stage_id: string
  contact_id: string | null
  company_id: string | null
  assigned_to: string | null
  title: string
  description: string | null
  value: number
  currency: string
  priority: string
  probability: number
  expected_close_date: string | null
  actual_close_date: string | null
  won_at: string | null
  lost_at: string | null
  lost_reason: string | null
  source: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
  stage?: PipelineStage
  contact?: Contact
  company?: Company
  assignee?: User
  products?: DealProduct[]
}

export type DealProduct = {
  id: string
  deal_id: string
  product_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  discount_percent: number
  total_price: number
  created_at: string
  updated_at: string
  product?: Product
}

export type Ticket = {
  id: string
  tenant_id: string
  contact_id: string | null
  assigned_to: string | null
  title: string
  description: string | null
  status: string
  priority: string
  category: string | null
  source: string
  ticket_number: number
  first_response_at: string | null
  resolved_at: string | null
  closed_at: string | null
  sla_due_at: string | null
  satisfaction_rating: number | null
  satisfaction_comment: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
  contact?: Contact
  assignee?: User
  comments?: TicketComment[]
}

export type TicketComment = {
  id: string
  ticket_id: string
  user_id: string | null
  content: string
  is_internal: boolean
  is_from_customer: boolean
  created_at: string
  updated_at: string
  user?: User
}

export type Partner = {
  id: string
  tenant_id: string
  contact_id: string | null
  name: string
  company: string | null
  email: string | null
  phone: string | null
  partner_type: string
  commission_rate: number
  status: string
  tier: string
  total_referrals: number
  total_revenue: number
  total_commission_paid: number
  reward_points: number
  notes: string | null
  contract_start_date: string | null
  contract_end_date: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Referral = {
  id: string
  tenant_id: string
  partner_id: string
  deal_id: string | null
  contact_id: string | null
  referred_name: string
  referred_email: string | null
  referred_phone: string | null
  referred_company: string | null
  status: string
  commission_amount: number
  commission_paid_at: string | null
  converted_at: string | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  estimated_revenue: number | null
  employee_count: number | null
  policy_file_name: string | null
  policy_file_type: string | null
  policy_file_size: number | null
  policy_storage_path: string | null
  partner?: Partner
  deal?: Deal
}

export type Tag = {
  id: string
  tenant_id: string
  name: string
  color: string
  entity_type: string
  created_at: string
}

export type EntityTag = {
  id: string
  tag_id: string
  entity_id: string
  entity_type: string
  created_at: string
  tag?: Tag
}

export type CustomFieldDefinition = {
  id: string
  tenant_id: string
  entity_type: string
  field_name: string
  field_label: string
  field_type: string
  is_required: boolean
  options: unknown[] | null
  default_value: string | null
  position: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CustomFieldValue = {
  id: string
  field_definition_id: string
  entity_id: string
  entity_type: string
  value_text: string | null
  value_number: number | null
  value_date: string | null
  value_boolean: boolean | null
  value_json: unknown | null
  created_at: string
  updated_at: string
  definition?: CustomFieldDefinition
}

export type Activity = {
  id: string
  tenant_id: string
  user_id: string | null
  entity_type: string
  entity_id: string
  action: string
  description: string | null
  changes: Record<string, unknown> | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: User
}

export type Notification = {
  id: string
  tenant_id: string
  user_id: string
  type: string
  title: string
  message: string | null
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  read_at: string | null
  action_url: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type Attachment = {
  id: string
  tenant_id: string
  entity_type: string
  entity_id: string
  file_name: string
  file_type: string | null
  file_size: number | null
  storage_path: string
  storage_bucket: string
  uploaded_by: string | null
  created_at: string
  uploader?: User
}

export type PartnerUser = {
  id: string
  tenant_id: string
  partner_id: string
  user_id: string | null
  email: string
  name: string
  is_primary: boolean
  created_at: string
  updated_at: string
  partner?: Partner
}

export type PartnerOnboardingTask = {
  id: string
  tenant_id: string
  partner_id: string
  title: string
  description: string | null
  is_completed: boolean
  completed_at: string | null
  due_date: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type PartnerRewardPoints = {
  id: string
  tenant_id: string
  partner_id: string
  referral_id: string | null
  deal_id: string | null
  points: number
  description: string | null
  transaction_type: string
  created_at: string
  referral?: Referral
  deal?: Deal
}

export type PartnerClient = {
  id: string
  tenant_id: string
  partner_id: string
  contact_id: string | null
  company_name: string
  primary_contact_name: string | null
  email: string | null
  phone: string | null
  industry: string | null
  employee_count: string | null
  status: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
  partner?: Partner
}

export type ClientUser = {
  id: string
  tenant_id: string
  partner_id: string
  client_id: string
  user_id: string | null
  email: string
  name: string
  role: string
  is_primary: boolean
  created_at: string
  updated_at: string
  client?: PartnerClient
}

export type ClientRiskAssessment = {
  id: string
  tenant_id: string
  partner_id: string
  client_id: string
  category: string
  risk_level: string
  score: number
  title: string
  description: string | null
  impact: string | null
  likelihood: string | null
  mitigation_status: string
  identified_date: string | null
  target_resolution_date: string | null
  resolved_date: string | null
  created_at: string
  updated_at: string
}

export type ClientSecurityRecommendation = {
  id: string
  tenant_id: string
  partner_id: string
  client_id: string
  category: string
  priority: string
  title: string
  description: string | null
  current_state: string | null
  recommended_action: string | null
  expected_improvement: string | null
  effort_level: string | null
  status: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type ClientSecurityScore = {
  id: string
  tenant_id: string
  partner_id: string
  client_id: string
  overall_score: number
  network_security_score: number
  endpoint_security_score: number
  access_control_score: number
  data_protection_score: number
  incident_response_score: number
  compliance_score: number
  first_party_score: number
  third_party_score: number
  cyber_crime_score: number
  inherent_risk_score: number
  cyber_maturity_score: number
  compliance_maturity_score: number
  insurance_maturity_score: number
  assessment_date: string
  notes: string | null
  created_at: string
}

export type Company = {
  id: string
  tenant_id: string
  partner_id: string | null
  name: string
  industry: string | null
  employee_count: string | null
  annual_revenue: number | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  website: string | null
  insurance_premium: number | null
  insurance_taxes: number | null
  surplus_lines_taxes: number | null
  insurance_fees: number | null
  commission_amount: number | null
  commission_rate: number | null
  notes: string | null
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
  partner?: Partner
  deals?: Deal[]
}

export type CompanyDocument = {
  id: string
  tenant_id: string
  company_id: string
  name: string
  description: string | null
  document_type: string | null
  file_name: string | null
  file_type: string | null
  file_size: number | null
  storage_path: string | null
  storage_bucket: string
  uploaded_by: string | null
  created_at: string
  updated_at: string
  uploader?: User
}

export const DEMO_TENANT_ID = '11111111-1111-1111-1111-111111111111'
export const DEMO_PIPELINE_ID = '44444444-4444-4444-4444-444444444444'
export const DEMO_PARTNER_ID = '99999999-9999-9999-9999-999999999991'
export const DEMO_CLIENT_ID = '88888888-8888-8888-8888-888888888881'

export type Incident = {
  id: string
  tenant_id: string
  partner_id: string | null
  client_id: string | null
  company_id: string | null
  incident_number: number
  title: string
  description: string | null
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'investigating' | 'containment' | 'eradication' | 'recovery' | 'closed' | 'resolved'
  incident_type: string | null
  source: string | null
  detected_at: string | null
  contained_at: string | null
  resolved_at: string | null
  closed_at: string | null
  assigned_to: string | null
  reported_by: string | null
  affected_systems: string | null
  impact_assessment: string | null
  root_cause: string | null
  lessons_learned: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
  assignee?: User
  partner?: Partner
  client?: PartnerClient
  company?: Company
  tasks?: IncidentTask[]
  timeline?: IncidentTimeline[]
}

export type IncidentTask = {
  id: string
  tenant_id: string
  incident_id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
  priority: 'critical' | 'high' | 'medium' | 'low'
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  sort_order: number
  phase: 'detection' | 'containment' | 'eradication' | 'recovery' | 'post_incident' | null
  created_by: string | null
  created_at: string
  updated_at: string
  assignee?: User
}

export type IncidentTimeline = {
  id: string
  tenant_id: string
  incident_id: string
  event_type: string
  title: string
  description: string | null
  event_time: string
  user_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  user?: User
}

export type IncidentEvidence = {
  id: string
  tenant_id: string
  incident_id: string
  title: string
  description: string | null
  evidence_type: string | null
  file_name: string | null
  file_type: string | null
  file_size: number | null
  storage_path: string | null
  storage_bucket: string
  hash_md5: string | null
  hash_sha256: string | null
  collected_by: string | null
  collected_at: string
  chain_of_custody: string | null
  created_at: string
  collector?: User
}

export type InsurancePolicy = {
  id: string
  tenant_id: string
  company_id: string
  partner_id: string | null
  policy_number: string | null
  carrier: string
  line_of_coverage: string
  coverage_limit: number | null
  deductible: number | null
  effective_date: string | null
  expiration_date: string | null
  premium: number | null
  file_name: string | null
  file_type: string | null
  file_size: number | null
  storage_path: string | null
  storage_bucket: string
  status: string
  notes: string | null
  uploaded_by: string | null
  uploaded_by_type: string | null
  created_at: string
  updated_at: string
  // Analysis fields
  analysis_id?: string | null
  analysis_status?: string | null
  analysis_score?: number | null
  analysis_recommendation?: string | null
  analysis_data?: Record<string, unknown> | null
  analysis_started_at?: string | null
  analysis_completed_at?: string | null
  analysis_error?: string | null
  report_storage_path?: string | null
  analysis_retries?: number
  analysis_tokens_used?: Record<string, number> | null
  company?: Company
  partner?: Partner
}

export type CompanyUser = {
  id: string
  tenant_id: string
  company_id: string
  partner_id: string | null
  email: string
  name: string | null
  role: string
  is_primary: boolean
  user_id: string | null
  created_at: string
  updated_at: string
  company?: Company
}

export const LINES_OF_COVERAGE = [
  'General Liability',
  'Professional Liability (E&O)',
  'Directors & Officers (D&O)',
  'Cyber Liability',
  'Workers Compensation',
  'Commercial Property',
  'Business Owners Policy (BOP)',
  'Commercial Auto',
  'Umbrella/Excess Liability',
  'Employment Practices Liability (EPLI)',
  'Product Liability',
  'Inland Marine',
  'Crime/Fidelity',
  'Fiduciary Liability',
  'Media Liability',
  'Other',
] as const

export const DEMO_COMPANY_ID = '77777777-7777-7777-7777-777777777771'
export const DEMO_COMPANY_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccc01'
