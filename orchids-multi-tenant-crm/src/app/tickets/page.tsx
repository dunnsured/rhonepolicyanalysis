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
import type { Ticket, Contact } from '@/lib/supabase'
import { TICKET_STATUSES, PRIORITIES } from '@/lib/types'
import { useEffect, useState } from 'react'
import { Plus, Search, Filter, Clock, User, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'technical', label: 'Technical' },
  { id: 'billing', label: 'Billing' },
  { id: 'feature_request', label: 'Feature Request' },
  { id: 'bug', label: 'Bug Report' },
]

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    category: 'general',
    contact_id: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [ticketsRes, contactsRes] = await Promise.all([
      supabase
        .from('tickets')
        .select('*, contact:contacts(*)')
        .eq('tenant_id', DEMO_TENANT_ID)
        .order('created_at', { ascending: false }),
      supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', DEMO_TENANT_ID)
        .eq('status', 'active')
    ])

    setTickets(ticketsRes.data || [])
    setContacts(contactsRes.data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const ticketData = {
      tenant_id: DEMO_TENANT_ID,
      title: formData.title,
      description: formData.description || null,
      status: formData.status,
      priority: formData.priority,
      category: formData.category || null,
      contact_id: formData.contact_id === 'none' || !formData.contact_id ? null : formData.contact_id,
      resolved_at: formData.status === 'resolved' ? new Date().toISOString() : null,
    }

    if (selectedTicket) {
      await supabase
        .from('tickets')
        .update(ticketData)
        .eq('id', selectedTicket.id)
    } else {
      await supabase.from('tickets').insert(ticketData)
    }

    setIsDialogOpen(false)
    resetForm()
    fetchData()
  }

  async function handleDelete(id: string) {
    await supabase.from('tickets').delete().eq('id', id)
    fetchData()
  }

  async function updateStatus(ticket: Ticket, newStatus: string) {
    const updateData: { status: string; resolved_at?: string | null } = { status: newStatus }
    if (newStatus === 'resolved') {
      updateData.resolved_at = new Date().toISOString()
    } else {
      updateData.resolved_at = null
    }

    await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticket.id)

    fetchData()
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      status: 'open',
      priority: 'medium',
      category: 'general',
      contact_id: '',
    })
    setSelectedTicket(null)
  }

  function openEditDialog(ticket: Ticket) {
    setSelectedTicket(ticket)
    setFormData({
      title: ticket.title,
      description: ticket.description || '',
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category || 'general',
      contact_id: ticket.contact_id || 'none',
    })
    setIsDialogOpen(true)
  }

  const getContactName = (contact?: Contact) => {
    if (!contact) return null
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
    }
    return contact.company_name
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
      <Badge variant="outline" className={cn("text-xs border-2", {
        'border-red-500 text-red-500': priority === 'high',
        'border-amber-500 text-amber-500': priority === 'medium',
        'border-slate-400 text-slate-400': priority === 'low',
      })}>
        {priorityConfig?.label || priority}
      </Badge>
    )
  }

  const filteredTickets = tickets.filter(ticket => {
    const contactName = getContactName(ticket.contact) || ''
    const matchesSearch = searchQuery === '' || 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contactName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const openCount = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length

  return (
    <AppSidebar>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
            <p className="text-muted-foreground">Track and manage customer support requests</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{selectedTicket ? 'Edit Ticket' : 'Create New Ticket'}</DialogTitle>
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
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_STATUSES.map(status => (
                          <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Customer Contact</Label>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  {selectedTicket && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        handleDelete(selectedTicket.id)
                        setIsDialogOpen(false)
                        resetForm()
                      }}
                    >
                      Delete
                    </Button>
                  )}
                  <Button type="submit" className="ml-auto">
                    {selectedTicket ? 'Update' : 'Create'} Ticket
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openCount}</p>
                <p className="text-sm text-muted-foreground">Open</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressCount}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <User className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedCount}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tickets.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {TICKET_STATUSES.map(status => (
                  <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {PRIORITIES.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditDialog(ticket)}>
                    <TableCell>
                      <div className="font-medium">{ticket.title}</div>
                      {ticket.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {ticket.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{getContactName(ticket.contact) || '-'}</div>
                      {ticket.contact?.email && (
                        <div className="text-xs text-muted-foreground">{ticket.contact.email}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORIES.find(c => c.id === ticket.category)?.label || ticket.category || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{format(new Date(ticket.created_at), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={ticket.status}
                        onValueChange={(v) => {
                          updateStatus(ticket, v)
                        }}
                      >
                        <SelectTrigger className="w-[120px] h-8" onClick={(e) => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TICKET_STATUSES.map(status => (
                            <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
