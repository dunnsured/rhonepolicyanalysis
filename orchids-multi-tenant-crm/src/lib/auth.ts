import { createClient, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type PortalType = 'crm' | 'partner' | 'client'

export interface AuthUser {
  id: string
  email: string
  portalType: PortalType
  tenantId: string
  // CRM users
  userId?: string
  fullName?: string
  role?: string
  // Partner users
  partnerId?: string
  partnerUserId?: string
  partnerName?: string
  companyName?: string
  // Client users
  clientId?: string
  clientUserId?: string
  clientName?: string
}

// Sign in with email/password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

// Sign up new user
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Get current session
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

// Get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Get user's portal access for CRM
export async function getCRMUserAccess(authUserId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, tenant_id, email, full_name, role')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  return {
    id: authUserId,
    email: data.email,
    portalType: 'crm',
    tenantId: data.tenant_id,
    userId: data.id,
    fullName: data.full_name,
    role: data.role,
  }
}

// Get user's portal access for Partner Portal
export async function getPartnerUserAccess(authUserId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('partner_users')
    .select('id, tenant_id, partner_id, email, name, partner:partners(name, company)')
    .eq('auth_user_id', authUserId)
    .single()

  if (error || !data) return null

  return {
    id: authUserId,
    email: data.email,
    portalType: 'partner',
    tenantId: data.tenant_id,
    partnerId: data.partner_id,
    partnerUserId: data.id,
    partnerName: data.name,
    companyName: (data.partner as any)?.company || (data.partner as any)?.name,
  }
}

// Get user's portal access for Client Portal
export async function getClientUserAccess(authUserId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('client_users')
    .select('id, tenant_id, partner_id, client_id, email, name, client:partner_clients(company_name)')
    .eq('auth_user_id', authUserId)
    .single()

  if (error || !data) return null

  return {
    id: authUserId,
    email: data.email,
    portalType: 'client',
    tenantId: data.tenant_id,
    partnerId: data.partner_id,
    clientId: data.client_id,
    clientUserId: data.id,
    clientName: data.name,
    companyName: (data.client as any)?.company_name,
  }
}

// Get user access based on portal type
export async function getUserAccess(portalType: PortalType): Promise<AuthUser | null> {
  const { user, error } = await getCurrentUser()
  if (error || !user) return null

  switch (portalType) {
    case 'crm':
      return getCRMUserAccess(user.id)
    case 'partner':
      return getPartnerUserAccess(user.id)
    case 'client':
      return getClientUserAccess(user.id)
    default:
      return null
  }
}

// Subscribe to auth state changes
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null)
  })
}
