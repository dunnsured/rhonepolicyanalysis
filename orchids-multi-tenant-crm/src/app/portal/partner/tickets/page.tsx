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
import { supabase, DEMO_TENANT_ID, DEMO_PARTNER_ID } from '@/lib/supabase'
import type { Partner, Ticket } from '@/lib/supabase'
import { TICKET_STATUSES, PRIORITIES } from '@/lib/types'
import { useEffect, useState } from 'react'
import { Plus, Search, Headphones, MessageSquare, Clock, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function PartnerTicketsPage() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [partnerRes, ticketsRes] = await Promise.all([
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase.from('tickets').select('*, comments:ticket_comments(*)').eq('submitted_by_partner_id', DEMO_PARTNER_ID).order('created_at', { ascending: false }),
    ])

    setPartner(partnerRes.data)
    setTickets(ticketsRes.data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const data = {
      tenant_id: DEMO_TENANT_ID,
      title: formData.title,
      description: formData.description || null,
      priority: formData.priority,
      category: formData.category,
      status: 'open',
      submitted_by_partner_id: DEMO_PARTNER_ID,
      source: 'partner_portal',
    }

    await supabase.from('tickets').insert(data)
    setIsDialogOpen(false)
    resetForm()
    fetchData()
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: 'general',
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = TICKET_STATUSES.find(s => s.id === status)
    return (
      <Badge className={cn("text-xs", statusConfig?.color, "text-white")}>
        {statusConfig?.label || status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = PRIORITIES.find(p => p.id === priority)
    return (
      <Badge variant="outline" className="text-xs">
        {priorityConfig?.label || priority}
      </Badge>
    )
  }

  const filteredTickets = tickets.filter(t =>
    searchQuery === '' ||
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalTickets = tickets.length
  const openTickets = tickets.filter(t => t.status === 'open').length
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length

  const categories = [
    { id: 'general', label: 'General Inquiry' },
    { id: 'technical', label: 'Technical Issue' },
    { id: 'billing', label: 'Billing' },
    { id: 'account', label: 'Account' },
    { id: 'feature', label: 'Feature Request' },
  ]

  return (
    <PartnerPortalSidebar partnerName={partner?.name} companyName={partner?.company || undefined}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
            <p className="text-muted-foreground">Submit and track your support requests</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input 
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                    placeholder="Brief description of your issue"
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
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
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    placeholder="Provide details about your issue or question..."
                    rows={5} 
                  />
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                  Submit Ticket
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Headphones className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTickets}</p>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <MessageSquare className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openTickets}</p>
                <p className="text-sm text-muted-foreground">Open</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressTickets}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedTickets}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
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
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Headphones className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No support tickets found</p>
                    <p className="text-sm text-muted-foreground mt-1">Create a ticket if you need assistance</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map(ticket => (
                  <TableRow 
                    key={ticket.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => { setSelectedTicket(ticket); setIsDetailOpen(true); }}
                  >
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">#{ticket.ticket_number}</span>
                        </div>
                        <p className="font-medium">{ticket.title}</p>
                        {ticket.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {ticket.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {ticket.category || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-muted-foreground">#{selectedTicket?.ticket_number}</span>
                {selectedTicket?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                  <Badge variant="secondary" className="text-xs capitalize">
                    {selectedTicket.category || 'General'}
                  </Badge>
                  <span className="text-sm text-muted-foreground ml-auto">
                    Created {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                {selectedTicket.description && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                )}
                {selectedTicket.resolved_at && (
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-sm text-emerald-700">
                    Resolved on {format(new Date(selectedTicket.resolved_at), 'MMM d, yyyy h:mm a')}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PartnerPortalSidebar>
  )
}
