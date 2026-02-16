"use client"

import { AppSidebar } from '@/components/app-sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase'
import type { Company } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Plus, Building2, DollarSign, Globe, MapPin, Search, MoreHorizontal, FileText } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const INDUSTRIES = [
  'Technology',
  'Software',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Construction',
  'Education',
  'Hospitality',
  'Transportation',
  'Energy',
  'Agriculture',
  'Professional Services',
  'Other',
]

const EMPLOYEE_COUNTS = [
  '1-10',
  '11-50',
  '50-100',
  '100-500',
  '500-1000',
  '1000-5000',
  '5000+',
]

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<(Company & { deal_count?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    employee_count: '',
    annual_revenue: '',
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    website: '',
    insurance_premium: '',
    insurance_taxes: '',
    surplus_lines_taxes: '',
    insurance_fees: '',
    commission_rate: '',
    notes: '',
  })

  useEffect(() => {
    fetchCompanies()
  }, [])

  async function fetchCompanies() {
    const { data: companiesData } = await supabase
      .from('companies')
      .select('*')
      .eq('tenant_id', DEMO_TENANT_ID)
      .eq('status', 'active')
      .order('name', { ascending: true })

    if (companiesData) {
      const companiesWithDeals = await Promise.all(
        companiesData.map(async (company) => {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const commissionRate = parseFloat(formData.commission_rate) || 15
    const premium = parseFloat(formData.insurance_premium) || 0
    const commissionAmount = (premium * commissionRate) / 100

    const companyData = {
      tenant_id: DEMO_TENANT_ID,
      name: formData.name,
      industry: formData.industry || null,
      employee_count: formData.employee_count || null,
      annual_revenue: parseFloat(formData.annual_revenue) || null,
      address_line1: formData.address_line1 || null,
      city: formData.city || null,
      state: formData.state || null,
      postal_code: formData.postal_code || null,
      country: formData.country || null,
      website: formData.website || null,
      insurance_premium: parseFloat(formData.insurance_premium) || null,
      insurance_taxes: parseFloat(formData.insurance_taxes) || null,
      surplus_lines_taxes: parseFloat(formData.surplus_lines_taxes) || null,
      insurance_fees: parseFloat(formData.insurance_fees) || null,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      notes: formData.notes || null,
    }

    if (selectedCompany) {
      await supabase.from('companies').update(companyData).eq('id', selectedCompany.id)
    } else {
      await supabase.from('companies').insert(companyData)
    }

    setIsDialogOpen(false)
    resetForm()
    fetchCompanies()
  }

  async function handleDelete(id: string) {
    await supabase.from('companies').update({ status: 'inactive' }).eq('id', id)
    fetchCompanies()
  }

  function resetForm() {
    setFormData({
      name: '',
      industry: '',
      employee_count: '',
      annual_revenue: '',
      address_line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'USA',
      website: '',
      insurance_premium: '',
      insurance_taxes: '',
      surplus_lines_taxes: '',
      insurance_fees: '',
      commission_rate: '',
      notes: '',
    })
    setSelectedCompany(null)
  }

  function openEditDialog(company: Company) {
    setSelectedCompany(company)
    setFormData({
      name: company.name,
      industry: company.industry || '',
      employee_count: company.employee_count || '',
      annual_revenue: company.annual_revenue?.toString() || '',
      address_line1: company.address_line1 || '',
      city: company.city || '',
      state: company.state || '',
      postal_code: company.postal_code || '',
      country: company.country || 'USA',
      website: company.website || '',
      insurance_premium: company.insurance_premium?.toString() || '',
      insurance_taxes: company.insurance_taxes?.toString() || '',
      surplus_lines_taxes: company.surplus_lines_taxes?.toString() || '',
      insurance_fees: company.insurance_fees?.toString() || '',
      commission_rate: company.commission_rate?.toString() || '',
      notes: company.notes || '',
    })
    setIsDialogOpen(true)
  }

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPremium = companies.reduce((sum, c) => sum + (Number(c.insurance_premium) || 0), 0)
  const totalCommission = companies.reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0)

  return (
    <AppSidebar>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
            <p className="text-muted-foreground">Manage company data, policies, and documents</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Company Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="name">Company Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select value={formData.industry} onValueChange={(v) => setFormData({ ...formData, industry: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map(ind => (
                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employee_count">Employee Count</Label>
                      <Select value={formData.employee_count} onValueChange={(v) => setFormData({ ...formData, employee_count: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          {EMPLOYEE_COUNTS.map(ec => (
                            <SelectItem key={ec} value={ec}>{ec}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annual_revenue">Annual Revenue ($)</Label>
                      <Input
                        id="annual_revenue"
                        type="number"
                        value={formData.annual_revenue}
                        onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="address_line1">Street Address</Label>
                      <Input
                        id="address_line1"
                        value={formData.address_line1}
                        onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Insurance Policy</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="insurance_premium">Premium ($)</Label>
                      <Input
                        id="insurance_premium"
                        type="number"
                        value={formData.insurance_premium}
                        onChange={(e) => setFormData({ ...formData, insurance_premium: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insurance_taxes">Taxes ($)</Label>
                      <Input
                        id="insurance_taxes"
                        type="number"
                        value={formData.insurance_taxes}
                        onChange={(e) => setFormData({ ...formData, insurance_taxes: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="surplus_lines_taxes">Surplus Lines Taxes ($)</Label>
                      <Input
                        id="surplus_lines_taxes"
                        type="number"
                        value={formData.surplus_lines_taxes}
                        onChange={(e) => setFormData({ ...formData, surplus_lines_taxes: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insurance_fees">Fees ($)</Label>
                      <Input
                        id="insurance_fees"
                        type="number"
                        value={formData.insurance_fees}
                        onChange={(e) => setFormData({ ...formData, insurance_fees: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                      <Input
                        id="commission_rate"
                        type="number"
                        step="0.01"
                        value={formData.commission_rate}
                        onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                        placeholder="15"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  {selectedCompany && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        handleDelete(selectedCompany.id)
                        setIsDialogOpen(false)
                        resetForm()
                      }}
                    >
                      Archive
                    </Button>
                  )}
                  <Button type="submit" className="ml-auto">
                    {selectedCompany ? 'Update' : 'Create'} Company
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{companies.length}</p>
                <p className="text-sm text-muted-foreground">Companies</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(totalPremium / 1000000).toFixed(1)}M</p>
                <p className="text-sm text-muted-foreground">Total Premium</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(totalCommission / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">Total Commission</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <FileText className="h-5 w-5 text-amber-500" />
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
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-12 bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No companies found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company) => (
                  <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/companies/${company.id}`} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
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
                      </Link>
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/companies/${company.id}`}>
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(company)}>
                            Edit Company
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(company.id)}
                          >
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppSidebar>
  )
}
