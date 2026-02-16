"use client"

import { PartnerPortalSidebar } from '@/components/partner-portal-sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase, DEMO_PARTNER_ID, DEMO_TENANT_ID } from '@/lib/supabase'
import type { Company, Deal, Partner, InsurancePolicy } from '@/lib/supabase'
import { InsurancePoliciesSection } from '@/components/insurance-policies-section'
import { useEffect, useState } from 'react'
import { Building2, DollarSign, Search, MapPin, Globe, ExternalLink, TrendingUp, Shield } from 'lucide-react'
import { format } from 'date-fns'

export default function PartnerCompaniesPage() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [companies, setCompanies] = useState<(Company & { deal_count?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companyDeals, setCompanyDeals] = useState<Deal[]>([])
  const [companyPolicies, setCompanyPolicies] = useState<InsurancePolicy[]>([])
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [partnerRes, companiesRes] = await Promise.all([
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase.from('companies').select('*').eq('partner_id', DEMO_PARTNER_ID).eq('status', 'active').order('name', { ascending: true }),
    ])

    setPartner(partnerRes.data)
    
    if (companiesRes.data) {
      const companiesWithDeals = await Promise.all(
        companiesRes.data.map(async (company) => {
          const { count } = await supabase
            .from('deals')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
          return { ...company, deal_count: count || 0 }
        })
      )
      setCompanies(companiesWithDeals)
    }
    setLoading(false)
  }

  async function openCompanyDetail(company: Company) {
    setSelectedCompany(company)
    setIsDetailOpen(true)
    setActiveTab('overview')
    
    const [dealsRes, policiesRes] = await Promise.all([
      supabase
        .from('deals')
        .select('*, stage:pipeline_stages(*)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('insurance_policies')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
    ])
    
    setCompanyDeals(dealsRes.data || [])
    setCompanyPolicies(policiesRes.data || [])
  }

  async function refreshCompanyPolicies() {
    if (!selectedCompany) return
    const { data } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .order('created_at', { ascending: false })
    setCompanyPolicies(data || [])
  }

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPremium = companies.reduce((sum, c) => sum + (Number(c.insurance_premium) || 0), 0)
  const totalCommission = companies.reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0)

  return (
    <PartnerPortalSidebar partnerName={partner?.name} companyName={partner?.company || undefined}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Companies</h1>
          <p className="text-muted-foreground">View company information and deal status</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <Building2 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{companies.length}</p>
                <p className="text-sm text-muted-foreground">Companies</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(totalPremium / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">Total Premium</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(totalCommission / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">Your Commission</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{companies.reduce((sum, c) => sum + (c.deal_count || 0), 0)}</p>
                <p className="text-sm text-muted-foreground">Active Deals</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Deals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-12 bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No companies found</p>
                    <p className="text-sm text-muted-foreground mt-1">Companies you refer will appear here</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company) => (
                  <TableRow 
                    key={company.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openCompanyDetail(company)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                          <Building2 className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          {company.website && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {company.website.replace('https://', '').replace('http://', '')}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.industry && (
                        <Badge variant="secondary" className="text-xs">
                          {company.industry}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {(company.city || company.state) && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[company.city, company.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {company.insurance_premium ? (
                        <span className="font-medium">${Number(company.insurance_premium).toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {company.commission_amount ? (
                        <span className="text-emerald-600 font-medium">${Number(company.commission_amount).toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {company.deal_count || 0} deals
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                    <Building2 className="h-5 w-5 text-purple-500" />
                  </div>
                  {selectedCompany?.name}
                </DialogTitle>
              </DialogHeader>
              {selectedCompany && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="policies" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Policies ({companyPolicies.length})
                    </TabsTrigger>
                    <TabsTrigger value="deals">Deals ({companyDeals.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6 mt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Premium</p>
                        <p className="text-xl font-bold">${Number(selectedCompany.insurance_premium || 0).toLocaleString()}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Your Commission</p>
                        <p className="text-xl font-bold text-emerald-600">${Number(selectedCompany.commission_amount || 0).toLocaleString()}</p>
                      </Card>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Industry</p>
                        <p className="font-medium">{selectedCompany.industry || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Employees</p>
                        <p className="font-medium">{selectedCompany.employee_count || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">
                          {[selectedCompany.city, selectedCompany.state].filter(Boolean).join(', ') || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Website</p>
                        {selectedCompany.website ? (
                          <a 
                            href={selectedCompany.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-purple-600 hover:underline flex items-center gap-1"
                          >
                            Visit <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="font-medium">-</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-3">Policy Details</h4>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Taxes</p>
                          <p className="font-medium">${Number(selectedCompany.insurance_taxes || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Surplus Lines</p>
                          <p className="font-medium">${Number(selectedCompany.surplus_lines_taxes || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fees</p>
                          <p className="font-medium">${Number(selectedCompany.insurance_fees || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Commission Rate</p>
                          <p className="font-medium">{selectedCompany.commission_rate || 15}%</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="policies" className="mt-0">
                    <InsurancePoliciesSection
                      tenantId={DEMO_TENANT_ID}
                      companyId={selectedCompany.id}
                      partnerId={DEMO_PARTNER_ID}
                      policies={companyPolicies}
                      onPoliciesChange={refreshCompanyPolicies}
                      uploadedByType="partner"
                    />
                  </TabsContent>

                  <TabsContent value="deals" className="mt-0">
                    {companyDeals.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p>No active deals</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {companyDeals.map((deal) => (
                          <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: deal.stage?.color || '#6b7280' }} 
                              />
                              <div>
                                <p className="font-medium text-sm">{deal.title}</p>
                                <p className="text-xs text-muted-foreground">{deal.stage?.name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${Number(deal.value).toLocaleString()}</p>
                              {deal.expected_close_date && (
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(deal.expected_close_date), 'MMM d')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
      </div>
    </PartnerPortalSidebar>
  )
}
