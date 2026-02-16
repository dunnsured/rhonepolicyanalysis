"use client"

import { PartnerPortalSidebar } from '@/components/partner-portal-sidebar'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase, DEMO_TENANT_ID, DEMO_PARTNER_ID } from '@/lib/supabase'
import type { Contact, Company, Partner } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Plus, UserCircle, Mail, Phone, Building2, Search, MoreHorizontal, Briefcase } from 'lucide-react'

const CONTACT_TYPES = ['Primary', 'Billing', 'Technical', 'Executive', 'Other']

export default function PartnerContactsPage() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [contacts, setContacts] = useState<(Contact & { company?: Company })[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCompany, setFilterCompany] = useState<string>('all')

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    job_title: '',
    company_id: '',
    type: 'Primary',
    linkedin_url: '',
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    // First get partner info and their companies
    const [partnerRes, companiesRes] = await Promise.all([
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase
        .from('companies')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('partner_id', DEMO_PARTNER_ID)
        .eq('status', 'active')
        .order('name', { ascending: true }),
    ])

    setPartner(partnerRes.data)
    setCompanies(companiesRes.data || [])

    // Get contacts linked to partner's companies
    if (companiesRes.data && companiesRes.data.length > 0) {
      const companyIds = companiesRes.data.map(c => c.id)
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('*, company:companies(*)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .in('company_id', companyIds)
        .order('last_name', { ascending: true })

      setContacts(contactsData || [])
    }
    
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const contactData = {
      tenant_id: DEMO_TENANT_ID,
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      email: formData.email || null,
      phone: formData.phone || null,
      mobile: formData.mobile || null,
      job_title: formData.job_title || null,
      company_id: formData.company_id || null,
      company_name: formData.company_id 
        ? companies.find(c => c.id === formData.company_id)?.name || null
        : null,
      type: formData.type,
      address_line1: null,
        city: null,
        state: null,
        postal_code: null,
      linkedin_url: formData.linkedin_url || null,
      notes: formData.notes || null,
      status: 'active',
    }

    if (selectedContact) {
      await supabase.from('contacts').update(contactData).eq('id', selectedContact.id)
    } else {
      await supabase.from('contacts').insert(contactData)
    }

    setIsDialogOpen(false)
    resetForm()
    fetchData()
  }

  async function handleDelete(id: string) {
    await supabase.from('contacts').update({ status: 'inactive' }).eq('id', id)
    fetchData()
  }

  function resetForm() {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile: '',
      job_title: '',
      company_id: '',
      type: 'Primary',
    linkedin_url: '',
      notes: '',
    })
    setSelectedContact(null)
  }

  function openEditDialog(contact: Contact) {
    setSelectedContact(contact)
    setFormData({
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      job_title: contact.job_title || '',
      company_id: contact.company_id || '',
      type: contact.type || 'Primary',
    linkedin_url: contact.linkedin_url || '',
      notes: contact.notes || '',
    })
    setIsDialogOpen(true)
  }

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = searchQuery === '' ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCompany = filterCompany === 'all' || c.company_id === filterCompany
    
    return matchesSearch && matchesCompany && c.status === 'active'
  })

  const activeContacts = contacts.filter(c => c.status === 'active')
  const primaryContacts = activeContacts.filter(c => c.type === 'Primary')

  return (
    <PartnerPortalSidebar partnerName={partner?.name} companyName={partner?.company || undefined}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
            <p className="text-muted-foreground">Manage contacts for your assigned companies</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedContact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile</Label>
                      <Input
                        id="mobile"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                      <Input
                        id="linkedin_url"
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Company Association</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_id">Company *</Label>
                      <Select 
                        value={formData.company_id} 
                        onValueChange={(v) => setFormData({ ...formData, company_id: v })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map(company => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job_title">Job Title</Label>
                      <Input
                        id="job_title"
                        value={formData.job_title}
                        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                        placeholder="e.g., CEO, CFO, IT Director"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Contact Type</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(v) => setFormData({ ...formData, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  {selectedContact && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        handleDelete(selectedContact.id)
                        setIsDialogOpen(false)
                        resetForm()
                      }}
                    >
                      Archive
                    </Button>
                  )}
                  <Button type="submit" className="ml-auto bg-purple-600 hover:bg-purple-700">
                    {selectedContact ? 'Update' : 'Create'} Contact
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <UserCircle className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeContacts.length}</p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
              </div>
            </div>
          </Card>
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
                <Briefcase className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{primaryContacts.length}</p>
                <p className="text-sm text-muted-foreground">Primary Contacts</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Mail className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeContacts.filter(c => c.email).length}</p>
                <p className="text-sm text-muted-foreground">With Email</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
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
              ) : filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <UserCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No contacts found</p>
                    <p className="text-sm text-muted-foreground mt-1">Add contacts to your assigned companies</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/10">
                          <span className="text-sm font-medium text-purple-600">
                            {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{contact.first_name} {contact.last_name}</p>
                          {contact.job_title && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {contact.job_title}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.company ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-3 w-3" />
                          {contact.company.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <a 
                          href={`mailto:${contact.email}`}
                          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <a 
                          href={`tel:${contact.phone}`}
                          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {contact.type}
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
                          <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                            Edit Contact
                          </DropdownMenuItem>
                          {contact.email && (
                            <DropdownMenuItem asChild>
                              <a href={`mailto:${contact.email}`}>Send Email</a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(contact.id)}
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
    </PartnerPortalSidebar>
  )
}
