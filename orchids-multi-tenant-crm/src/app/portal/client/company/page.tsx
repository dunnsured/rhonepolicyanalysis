"use client"

import { ClientPortalSidebar } from '@/components/client-portal-sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase, DEMO_PARTNER_ID, DEMO_COMPANY_USER_ID } from '@/lib/supabase'
import type { Company, Partner, CompanyUser, InsurancePolicy } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Building2, Globe, MapPin, Users, DollarSign, Shield, FileText, ExternalLink, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { isPast, isBefore, addDays } from 'date-fns'

export default function ClientCompanyPage() {
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
        .eq('status', 'active')
        .order('expiration_date', { ascending: true })
      
      setPolicies(policiesData || [])
    }
    
    setLoading(false)
  }

  const expiringCount = policies.filter(p => {
    if (!p.expiration_date) return false
    const date = new Date(p.expiration_date)
    return isBefore(date, addDays(new Date(), 30)) && !isPast(date)
  }).length

  if (loading) {
    return (
      <ClientPortalSidebar>
        <div className="p-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{company?.name || 'Your Company'}</h1>
            <p className="text-muted-foreground">Company profile and information</p>
          </div>
          <Badge variant="secondary" className="text-emerald-600 bg-emerald-50">
            {company?.status === 'active' ? 'Active' : company?.status}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                <Building2 className="h-5 w-5 text-cyan-500" />
              </div>
              <h2 className="text-lg font-semibold">Company Details</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Industry</p>
                  <p className="font-medium">{company?.industry || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employees</p>
                  <p className="font-medium">{company?.employee_count || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Annual Revenue</p>
                  <p className="font-medium">
                    {company?.annual_revenue ? `$${Number(company.annual_revenue).toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  {company?.website ? (
                    <a 
                      href={company.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-cyan-600 hover:underline flex items-center gap-1"
                    >
                      Visit <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>
              </div>
              {(company?.city || company?.state) && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Location</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {[company?.city, company?.state, company?.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold">Insurance Overview</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Premium</p>
                  <p className="text-xl font-bold">
                    ${Number(company?.insurance_premium || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Policies</p>
                  <p className="text-xl font-bold">{policies.length}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
                <div>
                  <p className="text-muted-foreground">Taxes & Fees</p>
                  <p className="font-medium">
                    ${(Number(company?.insurance_taxes || 0) + Number(company?.insurance_fees || 0)).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Surplus Lines Tax</p>
                  <p className="font-medium">
                    ${Number(company?.surplus_lines_taxes || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <FileText className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Insurance Policies</h2>
                  {expiringCount > 0 && (
                    <p className="text-sm text-amber-600">{expiringCount} policy(ies) expiring soon</p>
                  )}
                </div>
              </div>
              <Link 
                href="/portal/client/policies"
                className="text-sm text-cyan-600 hover:underline flex items-center gap-1"
              >
                Manage Policies <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {policies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No active policies found</p>
                <Link href="/portal/client/policies" className="text-cyan-600 hover:underline text-sm">
                  Upload a policy
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {policies.slice(0, 4).map((policy) => {
                  const isExpiring = policy.expiration_date && isBefore(new Date(policy.expiration_date), addDays(new Date(), 30)) && !isPast(new Date(policy.expiration_date))
                  const isExpired = policy.expiration_date && isPast(new Date(policy.expiration_date))
                  return (
                    <div key={policy.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/10">
                          <FileText className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{policy.carrier}</p>
                          <p className="text-xs text-muted-foreground">{policy.line_of_coverage}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {policy.coverage_limit && (
                          <span className="text-sm font-medium">
                            ${Number(policy.coverage_limit).toLocaleString()}
                          </span>
                        )}
                        {isExpired && (
                          <Badge className="bg-red-100 text-red-700 text-xs">Expired</Badge>
                        )}
                        {isExpiring && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs">Expiring Soon</Badge>
                        )}
                        {!isExpired && !isExpiring && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
                {policies.length > 4 && (
                  <Link href="/portal/client/policies" className="block text-center text-sm text-cyan-600 hover:underline pt-2">
                    View all {policies.length} policies
                  </Link>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </ClientPortalSidebar>
  )
}
