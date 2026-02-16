"use client"

import { AppSidebar } from '@/components/app-sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase'
import type { Company, CompanyDocument, Deal, InsurancePolicy } from '@/lib/supabase'
import { InsurancePoliciesSection } from '@/components/insurance-policies-section'
import { useEffect, useState } from 'react'
import { use } from 'react'
import { 
  Building2, DollarSign, Globe, MapPin, ArrowLeft, 
  FileText, Trash2, ExternalLink, Plus,
  TrendingUp, Shield
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

const DOCUMENT_TYPES = [
  'Policy Document',
  'Certificate of Insurance',
  'Endorsement',
  'Quote',
  'Application',
  'Claims Document',
  'Audit Report',
  'Risk Assessment',
  'Contract',
  'Other',
]

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [company, setCompany] = useState<Company | null>(null)
  const [documents, setDocuments] = useState<CompanyDocument[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const [docForm, setDocForm] = useState({
    name: '',
    description: '',
    document_type: '',
  })

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchData() {
    const [companyRes, docsRes, dealsRes, policiesRes] = await Promise.all([
      supabase.from('companies').select('*').eq('id', id).single(),
      supabase.from('company_documents').select('*').eq('company_id', id).order('created_at', { ascending: false }),
      supabase.from('deals').select('*, stage:pipeline_stages(*)').eq('company_id', id).order('created_at', { ascending: false }),
      supabase.from('insurance_policies').select('*').eq('company_id', id).order('created_at', { ascending: false }),
    ])

    setCompany(companyRes.data)
    setDocuments(docsRes.data || [])
    setDeals(dealsRes.data || [])
    setPolicies(policiesRes.data || [])
    setLoading(false)
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault()
    
    await supabase.from('company_documents').insert({
      tenant_id: DEMO_TENANT_ID,
      company_id: id,
      name: docForm.name,
      description: docForm.description || null,
      document_type: docForm.document_type || null,
    })

    setIsDocDialogOpen(false)
    setDocForm({ name: '', description: '', document_type: '' })
    fetchData()
  }

  async function handleDeleteDocument(docId: string) {
    await supabase.from('company_documents').delete().eq('id', docId)
    fetchData()
  }

  const totalPolicyValue = (Number(company?.insurance_premium) || 0) + 
    (Number(company?.insurance_taxes) || 0) + 
    (Number(company?.surplus_lines_taxes) || 0) + 
    (Number(company?.insurance_fees) || 0)

  const totalDealValue = deals.reduce((sum, d) => sum + Number(d.value), 0)

  if (loading) {
    return (
      <AppSidebar>
        <div className="p-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </AppSidebar>
    )
  }

  if (!company) {
    return (
      <AppSidebar>
        <div className="p-6 text-center py-12">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Company not found</h2>
          <Link href="/companies">
            <Button variant="outline">Back to Companies</Button>
          </Link>
        </div>
      </AppSidebar>
    )
  }

  return (
    <AppSidebar>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/companies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
                <div className="flex items-center gap-3 text-muted-foreground text-sm">
                  {company.industry && <Badge variant="secondary">{company.industry}</Badge>}
                  {company.city && company.state && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {company.city}, {company.state}
                    </span>
                  )}
                  {company.website && (
                    <a 
                      href={company.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Globe className="h-3 w-3" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Link href={`/pipeline?company=${company.id}`}>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${Number(company.insurance_premium || 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Premium</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${Number(company.commission_amount || 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Commission</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{deals.length}</p>
                <p className="text-sm text-muted-foreground">Deals</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <FileText className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </div>
            </div>
          </Card>
        </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="policies" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Policies ({policies.length})
              </TabsTrigger>
              <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
              <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{company.industry || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Employees</p>
                      <p className="font-medium">{company.employee_count || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Annual Revenue</p>
                      <p className="font-medium">
                        {company.annual_revenue ? `$${Number(company.annual_revenue).toLocaleString()}` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      {company.website ? (
                        <a 
                          href={company.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {company.website.replace('https://', '').replace('http://', '')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="font-medium">-</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {[company.address_line1, company.city, company.state, company.postal_code, company.country]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </p>
                  </div>
                  {company.notes && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{company.notes}</p>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Insurance Policy</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Premium</p>
                      <p className="text-xl font-bold">
                        ${Number(company.insurance_premium || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Commission ({company.commission_rate || 15}%)</p>
                      <p className="text-xl font-bold text-emerald-600">
                        ${Number(company.commission_amount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxes</p>
                      <p className="font-medium">${Number(company.insurance_taxes || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Surplus Lines</p>
                      <p className="font-medium">${Number(company.surplus_lines_taxes || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fees</p>
                      <p className="font-medium">${Number(company.insurance_fees || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Total Policy Value</p>
                      <p className="text-lg font-bold">${totalPolicyValue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Deals</h3>
                <Link href={`/pipeline?company=${company.id}`}>
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
              {deals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No deals yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deals.slice(0, 5).map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: deal.stage?.color || '#6b7280' }} 
                        />
                        <div>
                          <p className="font-medium">{deal.title}</p>
                          <p className="text-xs text-muted-foreground">{deal.stage?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${Number(deal.value).toLocaleString()}</p>
                        {deal.expected_close_date && (
                          <p className="text-xs text-muted-foreground">
                            Close: {format(new Date(deal.expected_close_date), 'MMM d')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </Card>
            </TabsContent>

            <TabsContent value="policies" className="mt-6">
              <InsurancePoliciesSection
                tenantId={DEMO_TENANT_ID}
                companyId={company.id}
                partnerId={company.partner_id}
                policies={policies}
                onPoliciesChange={fetchData}
                uploadedByType="tenant"
              />
            </TabsContent>

            <TabsContent value="deals" className="mt-6">
            <Card>
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">All Deals</h3>
                <p className="text-sm text-muted-foreground">
                  Total Value: <span className="font-semibold text-foreground">${totalDealValue.toLocaleString()}</span>
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Expected Close</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No deals for this company</p>
                        <Link href={`/pipeline?company=${company.id}`}>
                          <Button variant="outline" size="sm" className="mt-3">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Deal
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ) : (
                    deals.map((deal) => (
                      <TableRow key={deal.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{deal.title}</p>
                            {deal.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{deal.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className="text-xs text-white"
                            style={{ backgroundColor: deal.stage?.color || '#6b7280' }}
                          >
                            {deal.stage?.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">${Number(deal.value).toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          {deal.expected_close_date ? (
                            <span className="text-sm">
                              {format(new Date(deal.expected_close_date), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(deal.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <Card>
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Company Documents</h3>
                <Dialog open={isDocDialogOpen} onOpenChange={setIsDocDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Document</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddDocument} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="doc_name">Document Name *</Label>
                        <Input
                          id="doc_name"
                          value={docForm.name}
                          onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doc_type">Document Type</Label>
                        <Select 
                          value={docForm.document_type} 
                          onValueChange={(v) => setDocForm({ ...docForm, document_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_TYPES.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doc_description">Description</Label>
                        <Textarea
                          id="doc_description"
                          value={docForm.description}
                          onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <Button type="submit" className="w-full">Add Document</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No documents uploaded</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                              <FileText className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              {doc.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.document_type && (
                            <Badge variant="secondary" className="text-xs">
                              {doc.document_type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(doc.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppSidebar>
  )
}
