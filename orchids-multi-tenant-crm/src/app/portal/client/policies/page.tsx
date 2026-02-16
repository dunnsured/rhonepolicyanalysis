"use client"

import { ClientPortalSidebar } from '@/components/client-portal-sidebar'
import { Card } from '@/components/ui/card'
import { supabase, DEMO_TENANT_ID, DEMO_PARTNER_ID, DEMO_COMPANY_ID, DEMO_COMPANY_USER_ID } from '@/lib/supabase'
import type { Company, Partner, InsurancePolicy, CompanyUser } from '@/lib/supabase'
import { InsurancePoliciesSection } from '@/components/insurance-policies-section'
import { useEffect, useState } from 'react'
import { Building2, Shield, DollarSign, AlertCircle } from 'lucide-react'
import { isPast, isBefore, addDays } from 'date-fns'

export default function ClientPoliciesPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [companyUser, setCompanyUser] = useState<CompanyUser | null>(null)
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [companyUserRes, partnerRes] = await Promise.all([
      supabase.from('company_users').select('*, company:companies(*)').eq('id', DEMO_COMPANY_USER_ID).single(),
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
    ])

    setCompanyUser(companyUserRes.data)
    setPartner(partnerRes.data)

    if (companyUserRes.data?.company) {
      setCompany(companyUserRes.data.company as Company)
      
      const { data: policiesData } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('company_id', companyUserRes.data.company_id)
        .order('created_at', { ascending: false })
      
      setPolicies(policiesData || [])
    }
    
    setLoading(false)
  }

  async function refreshPolicies() {
    if (!company) return
    const { data } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    setPolicies(data || [])
  }

  const activePolicies = policies.filter(p => p.status === 'active')
  const totalPremium = activePolicies.reduce((sum, p) => sum + (Number(p.premium) || 0), 0)
  const expiringCount = activePolicies.filter(p => {
    if (!p.expiration_date) return false
    const date = new Date(p.expiration_date)
    return isBefore(date, addDays(new Date(), 30)) && !isPast(date)
  }).length
  const expiredCount = activePolicies.filter(p => p.expiration_date && isPast(new Date(p.expiration_date))).length

  if (loading) {
    return (
      <ClientPortalSidebar>
        <div className="p-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </Card>
            ))}
          </div>
        </div>
      </ClientPortalSidebar>
    )
  }

  return (
    <ClientPortalSidebar
      clientName={companyUser?.name || 'Client'}
      companyName={company?.name}
      partnerName={partner?.company || partner?.name}
    >
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insurance Policies</h1>
          <p className="text-muted-foreground">Manage and upload your company's insurance policies</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
                <Shield className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activePolicies.length}</p>
                <p className="text-sm text-muted-foreground">Active Policies</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalPremium.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Premium</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringCount}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiredCount}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </Card>
        </div>

        {company && (
          <InsurancePoliciesSection
            tenantId={DEMO_TENANT_ID}
            companyId={company.id}
            partnerId={company.partner_id}
            policies={policies}
            onPoliciesChange={refreshPolicies}
            uploadedByType="company"
          />
        )}
      </div>
    </ClientPortalSidebar>
  )
}
