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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase'
import type { Partner, Referral, Deal } from '@/lib/supabase'
import { PARTNER_STATUSES, REFERRAL_STATUSES } from '@/lib/types'
import { useEffect, useState } from 'react'
import { Plus, Search, Users, DollarSign, TrendingUp, UserPlus, Mail, Phone, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false)
  const [isReferralDialogOpen, setIsReferralDialogOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    commission_rate: '10',
    status: 'active',
    notes: '',
  })

  const [referralForm, setReferralForm] = useState({
    partner_id: '',
    deal_id: '',
    referred_name: '',
    referred_email: '',
    referred_phone: '',
    status: 'pending',
    commission_amount: '0',
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [partnersRes, referralsRes, dealsRes] = await Promise.all([
      supabase.from('partners').select('*').eq('tenant_id', DEMO_TENANT_ID).order('created_at', { ascending: false }),
      supabase.from('referrals').select('*, partner:partners(*)').eq('tenant_id', DEMO_TENANT_ID).order('created_at', { ascending: false }),
      supabase.from('deals').select('*').eq('tenant_id', DEMO_TENANT_ID),
    ])

    setPartners(partnersRes.data || [])
    setReferrals(referralsRes.data || [])
    setDeals(dealsRes.data || [])
    setLoading(false)
  }

  async function handlePartnerSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const data = {
      tenant_id: DEMO_TENANT_ID,
      name: partnerForm.name,
      email: partnerForm.email || null,
      phone: partnerForm.phone || null,
      company: partnerForm.company || null,
      commission_rate: parseFloat(partnerForm.commission_rate) || 10,
      status: partnerForm.status,
      notes: partnerForm.notes || null,
    }

    if (selectedPartner) {
      await supabase.from('partners').update(data).eq('id', selectedPartner.id)
    } else {
      await supabase.from('partners').insert(data)
    }

    setIsPartnerDialogOpen(false)
    resetPartnerForm()
    fetchData()
  }

  async function handleReferralSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const data = {
      tenant_id: DEMO_TENANT_ID,
      partner_id: referralForm.partner_id,
      deal_id: referralForm.deal_id === 'none' || !referralForm.deal_id ? null : referralForm.deal_id,
      referred_name: referralForm.referred_name,
      referred_email: referralForm.referred_email || null,
      referred_phone: referralForm.referred_phone || null,
      status: referralForm.status,
      commission_amount: parseFloat(referralForm.commission_amount) || 0,
      notes: referralForm.notes || null,
    }

    if (selectedReferral) {
      await supabase.from('referrals').update(data).eq('id', selectedReferral.id)
    } else {
      await supabase.from('referrals').insert(data)
    }

    setIsReferralDialogOpen(false)
    resetReferralForm()
    fetchData()
  }

  async function handleDeletePartner(id: string) {
    await supabase.from('partners').delete().eq('id', id)
    fetchData()
  }

  async function handleDeleteReferral(id: string) {
    await supabase.from('referrals').delete().eq('id', id)
    fetchData()
  }

  function resetPartnerForm() {
    setPartnerForm({
      name: '',
      email: '',
      phone: '',
      company: '',
      commission_rate: '10',
      status: 'active',
      notes: '',
    })
    setSelectedPartner(null)
  }

  function resetReferralForm() {
    setReferralForm({
      partner_id: '',
      deal_id: '',
      referred_name: '',
      referred_email: '',
      referred_phone: '',
      status: 'pending',
      commission_amount: '0',
      notes: '',
    })
    setSelectedReferral(null)
  }

  function openEditPartnerDialog(partner: Partner) {
    setSelectedPartner(partner)
    setPartnerForm({
      name: partner.name,
      email: partner.email || '',
      phone: partner.phone || '',
      company: partner.company || '',
      commission_rate: partner.commission_rate.toString(),
      status: partner.status,
      notes: partner.notes || '',
    })
    setIsPartnerDialogOpen(true)
  }

  function openEditReferralDialog(referral: Referral) {
    setSelectedReferral(referral)
    setReferralForm({
      partner_id: referral.partner_id,
      deal_id: referral.deal_id || 'none',
      referred_name: referral.referred_name,
      referred_email: referral.referred_email || '',
      referred_phone: referral.referred_phone || '',
      status: referral.status,
      commission_amount: referral.commission_amount.toString(),
      notes: referral.notes || '',
    })
    setIsReferralDialogOpen(true)
  }

  const getStatusBadge = (status: string, type: 'partner' | 'referral') => {
    const statuses = type === 'partner' ? PARTNER_STATUSES : REFERRAL_STATUSES
    const statusConfig = statuses.find(s => s.id === status)
    return (
      <Badge className={cn("text-xs", statusConfig?.color, "text-white")}>
        {statusConfig?.label || status}
      </Badge>
    )
  }

  const filteredPartners = partners.filter(p =>
    searchQuery === '' ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.company?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activePartners = partners.filter(p => p.status === 'active').length
  const totalReferrals = referrals.length
  const convertedReferrals = referrals.filter(r => r.status === 'converted').length
  const totalCommissions = referrals.reduce((sum, r) => sum + Number(r.commission_amount), 0)

  return (
    <AppSidebar>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Referral Partners</h1>
            <p className="text-muted-foreground">Manage partners and track referrals</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activePartners}</p>
                <p className="text-sm text-muted-foreground">Active Partners</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <UserPlus className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalReferrals}</p>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{convertedReferrals}</p>
                <p className="text-sm text-muted-foreground">Converted</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalCommissions.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Commissions</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="partners" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="partners">Partners</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Dialog open={isPartnerDialogOpen} onOpenChange={(open) => {
                setIsPartnerDialogOpen(open)
                if (!open) resetPartnerForm()
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Partner
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{selectedPartner ? 'Edit Partner' : 'Add New Partner'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handlePartnerSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company</Label>
                        <Input value={partnerForm.company} onChange={(e) => setPartnerForm({ ...partnerForm, company: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Commission Rate (%)</Label>
                        <Input type="number" min="0" max="100" value={partnerForm.commission_rate} onChange={(e) => setPartnerForm({ ...partnerForm, commission_rate: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={partnerForm.status} onValueChange={(v) => setPartnerForm({ ...partnerForm, status: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PARTNER_STATUSES.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea value={partnerForm.notes} onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })} rows={3} />
                    </div>
                    <div className="flex gap-2 pt-4">
                      {selectedPartner && (
                        <Button type="button" variant="destructive" onClick={() => { handleDeletePartner(selectedPartner.id); setIsPartnerDialogOpen(false); resetPartnerForm() }}>
                          Delete
                        </Button>
                      )}
                      <Button type="submit" className="ml-auto">{selectedPartner ? 'Update' : 'Create'} Partner</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isReferralDialogOpen} onOpenChange={(open) => {
                setIsReferralDialogOpen(open)
                if (!open) resetReferralForm()
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Referral
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{selectedReferral ? 'Edit Referral' : 'Add New Referral'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleReferralSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Partner</Label>
                      <Select value={referralForm.partner_id} onValueChange={(v) => setReferralForm({ ...referralForm, partner_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select partner" />
                        </SelectTrigger>
                        <SelectContent>
                          {partners.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Referred Name</Label>
                      <Input value={referralForm.referred_name} onChange={(e) => setReferralForm({ ...referralForm, referred_name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={referralForm.referred_email} onChange={(e) => setReferralForm({ ...referralForm, referred_email: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={referralForm.referred_phone} onChange={(e) => setReferralForm({ ...referralForm, referred_phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={referralForm.status} onValueChange={(v) => setReferralForm({ ...referralForm, status: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERRAL_STATUSES.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Commission ($)</Label>
                        <Input type="number" min="0" value={referralForm.commission_amount} onChange={(e) => setReferralForm({ ...referralForm, commission_amount: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Link to Deal (Optional)</Label>
                      <Select value={referralForm.deal_id} onValueChange={(v) => setReferralForm({ ...referralForm, deal_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select deal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No deal</SelectItem>
                          {deals.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea value={referralForm.notes} onChange={(e) => setReferralForm({ ...referralForm, notes: e.target.value })} rows={3} />
                    </div>
                    <div className="flex gap-2 pt-4">
                      {selectedReferral && (
                        <Button type="button" variant="destructive" onClick={() => { handleDeleteReferral(selectedReferral.id); setIsReferralDialogOpen(false); resetReferralForm() }}>
                          Delete
                        </Button>
                      )}
                      <Button type="submit" className="ml-auto">{selectedReferral ? 'Update' : 'Create'} Referral</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <TabsContent value="partners" className="space-y-4">
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search partners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="h-32 bg-muted animate-pulse rounded" />
                  </Card>
                ))
              ) : filteredPartners.length === 0 ? (
                <Card className="col-span-full p-8 text-center text-muted-foreground">
                  No partners found
                </Card>
              ) : (
                filteredPartners.map(partner => (
                  <Card key={partner.id} className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEditPartnerDialog(partner)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-lg font-semibold text-primary">
                            {partner.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{partner.name}</h3>
                          {partner.company && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              {partner.company}
                            </div>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(partner.status, 'partner')}
                    </div>

                    <div className="space-y-2 text-sm">
                      {partner.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {partner.email}
                        </div>
                      )}
                      {partner.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {partner.phone}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Commission Rate</p>
                        <p className="font-semibold">{partner.commission_rate}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Referrals</p>
                        <p className="font-semibold">{partner.total_referrals}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="font-semibold">${Number(partner.total_revenue).toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="referrals">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referred</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <div className="h-12 bg-muted animate-pulse rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : referrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No referrals found
                      </TableCell>
                    </TableRow>
                  ) : (
                    referrals.map(referral => (
                      <TableRow key={referral.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditReferralDialog(referral)}>
                        <TableCell>
                          <div className="font-medium">{referral.referred_name}</div>
                          {referral.referred_email && (
                            <div className="text-xs text-muted-foreground">{referral.referred_email}</div>
                          )}
                        </TableCell>
                        <TableCell>{referral.partner?.name || '-'}</TableCell>
                        <TableCell>{getStatusBadge(referral.status, 'referral')}</TableCell>
                        <TableCell className="font-medium">${Number(referral.commission_amount).toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(referral.created_at), 'MMM d, yyyy')}</TableCell>
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
