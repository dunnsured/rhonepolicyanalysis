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
import { supabase, DEMO_TENANT_ID, DEMO_PIPELINE_ID } from '@/lib/supabase'
import type { Deal, PipelineStage, Contact, Company } from '@/lib/supabase'
import { PRIORITIES } from '@/lib/types'
import { useEffect, useState } from 'react'
import { Plus, DollarSign, User, Calendar, GripVertical, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    stage_id: '',
    priority: 'medium',
    contact_id: '',
    company_id: '',
    expected_close_date: '',
  })

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchData() {
    const [dealsRes, stagesRes, contactsRes, companiesRes] = await Promise.all([
      supabase
        .from('deals')
        .select('*, stage:pipeline_stages(*), contact:contacts(*), company:companies(*)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('pipeline_id', DEMO_PIPELINE_ID)
        .order('created_at', { ascending: false }),
      supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', DEMO_PIPELINE_ID)
        .order('position', { ascending: true }),
      supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('status', 'active'),
      supabase
        .from('companies')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('status', 'active')
        .order('name', { ascending: true })
    ])

    setDeals(dealsRes.data || [])
    setStages(stagesRes.data || [])
    setContacts(contactsRes.data || [])
    setCompanies(companiesRes.data || [])
    
    if (stagesRes.data && stagesRes.data.length > 0 && !formData.stage_id) {
      setFormData(prev => ({ ...prev, stage_id: stagesRes.data[0].id }))
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const dealData = {
      tenant_id: DEMO_TENANT_ID,
      pipeline_id: DEMO_PIPELINE_ID,
      title: formData.title,
      description: formData.description || null,
      value: parseFloat(formData.value) || 0,
      stage_id: formData.stage_id,
      priority: formData.priority,
      contact_id: formData.contact_id === 'none' || !formData.contact_id ? null : formData.contact_id,
      company_id: formData.company_id === 'none' || !formData.company_id ? null : formData.company_id,
      expected_close_date: formData.expected_close_date || null,
    }

    if (selectedDeal) {
      await supabase
        .from('deals')
        .update(dealData)
        .eq('id', selectedDeal.id)
    } else {
      await supabase.from('deals').insert(dealData)
    }

    setIsDialogOpen(false)
    resetForm()
    fetchData()
  }

  async function handleDelete(id: string) {
    await supabase.from('deals').delete().eq('id', id)
    fetchData()
  }

  async function handleDrop(stageId: string) {
    if (!draggedDeal || draggedDeal.stage_id === stageId) {
      setDraggedDeal(null)
      return
    }

    await supabase
      .from('deals')
      .update({ stage_id: stageId })
      .eq('id', draggedDeal.id)

    setDeals(deals.map(d => 
      d.id === draggedDeal.id ? { ...d, stage_id: stageId } : d
    ))
    setDraggedDeal(null)
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      value: '',
      stage_id: stages[0]?.id || '',
      priority: 'medium',
      contact_id: '',
      company_id: '',
      expected_close_date: '',
    })
    setSelectedDeal(null)
  }

  function openEditDialog(deal: Deal) {
    setSelectedDeal(deal)
    setFormData({
      title: deal.title,
      description: deal.description || '',
      value: deal.value.toString(),
      stage_id: deal.stage_id,
      priority: deal.priority,
      contact_id: deal.contact_id || 'none',
      company_id: deal.company_id || 'none',
      expected_close_date: deal.expected_close_date || '',
    })
    setIsDialogOpen(true)
  }

  const getPriorityColor = (priority: string) => {
    return PRIORITIES.find(p => p.id === priority)?.color || 'bg-slate-400'
  }

  const getStageValue = (stageId: string) => {
    return deals
      .filter(d => d.stage_id === stageId)
      .reduce((sum, d) => sum + Number(d.value), 0)
  }

  const getContactName = (contact?: Contact) => {
    if (!contact) return null
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
    }
    return contact.company_name
  }

  return (
    <AppSidebar>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
            <p className="text-muted-foreground">Manage your deals across stages</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{selectedDeal ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Value ($)</Label>
                    <Input
                      id="value"
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage</Label>
                    <Select value={formData.stage_id} onValueChange={(v) => setFormData({ ...formData, stage_id: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected_close_date">Expected Close</Label>
                    <Input
                      id="expected_close_date"
                      type="date"
                      value={formData.expected_close_date}
                      onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="contact">Contact</Label>
                    <Select value={formData.contact_id} onValueChange={(v) => setFormData({ ...formData, contact_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact" />
                      </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No contact</SelectItem>
                          {contacts.map(contact => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {getContactName(contact)} {contact.company_name && contact.first_name ? `(${contact.company_name})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Select value={formData.company_id} onValueChange={(v) => setFormData({ ...formData, company_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No company</SelectItem>
                          {companies.map(company => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  {selectedDeal && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        handleDelete(selectedDeal.id)
                        setIsDialogOpen(false)
                        resetForm()
                      }}
                    >
                      Delete
                    </Button>
                  )}
                  <Button type="submit" className="ml-auto">
                    {selectedDeal ? 'Update' : 'Create'} Deal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 h-full min-w-max pb-4">
            {stages.map((stage) => {
              const stageDeals = deals.filter(d => d.stage_id === stage.id)
              const stageValue = getStageValue(stage.id)
              
              return (
                <div
                  key={stage.id}
                  className="w-80 flex flex-col bg-muted/30 rounded-lg"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(stage.id)}
                >
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                        <h3 className="font-semibold">{stage.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {stageDeals.length}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      ${stageValue.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {loading ? (
                      [...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                      ))
                    ) : stageDeals.length === 0 ? (
                      <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                        Drop deals here
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <Card
                          key={deal.id}
                          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                          draggable
                          onDragStart={() => setDraggedDeal(deal)}
                          onClick={() => openEditDialog(deal)}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 cursor-grab" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-sm truncate">{deal.title}</h4>
                                <div className={cn("w-2 h-2 rounded-full shrink-0", getPriorityColor(deal.priority))} />
                              </div>
                              
                              <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-semibold">${Number(deal.value).toLocaleString()}</span>
                                  </div>
                                  
                                  {deal.company && (
                                    <Link 
                                      href={`/companies/${deal.company.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                    >
                                      <Building2 className="h-3 w-3" />
                                      <span className="truncate">{deal.company.name}</span>
                                    </Link>
                                  )}
                                  
                                  {deal.contact && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      <span className="truncate">{getContactName(deal.contact)}</span>
                                    </div>
                                  )}
                                  
                                  {deal.expected_close_date && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      <span>{format(new Date(deal.expected_close_date), 'MMM d, yyyy')}</span>
                                    </div>
                                  )}
                                </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppSidebar>
  )
}
