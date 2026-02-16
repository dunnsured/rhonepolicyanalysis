"use client"

import { PartnerPortalSidebar } from '@/components/partner-portal-sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { supabase, DEMO_TENANT_ID, DEMO_PARTNER_ID } from '@/lib/supabase'
import type { Incident, Partner } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { 
  AlertTriangle, Shield, Plus, Search, Filter,
  Clock, AlertCircle, Activity
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

const SEVERITY_CONFIG = {
  critical: { color: 'bg-red-500', textColor: 'text-red-500', bgLight: 'bg-red-500/10' },
  high: { color: 'bg-orange-500', textColor: 'text-orange-500', bgLight: 'bg-orange-500/10' },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-500', bgLight: 'bg-yellow-500/10' },
  low: { color: 'bg-blue-500', textColor: 'text-blue-500', bgLight: 'bg-blue-500/10' },
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  investigating: { label: 'Investigating', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  containment: { label: 'Containment', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  eradication: { label: 'Eradication', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  recovery: { label: 'Recovery', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  closed: { label: 'Closed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
}

const INCIDENT_TYPES = [
  'Malware',
  'Phishing',
  'Ransomware',
  'Data Breach',
  'DDoS',
  'Unauthorized Access',
  'Insider Threat',
  'Social Engineering',
  'Supply Chain',
  'Other',
]

export default function PartnerIncidentsPage() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'medium',
    incident_type: '',
    affected_systems: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [partnerRes, incidentsRes] = await Promise.all([
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase.from('incidents').select('*').eq('partner_id', DEMO_PARTNER_ID).order('created_at', { ascending: false }),
    ])

    setPartner(partnerRes.data)
    setIncidents(incidentsRes.data || [])
    setLoading(false)
  }

  async function handleReportIncident(e: React.FormEvent) {
    e.preventDefault()
    
    await supabase.from('incidents').insert({
      tenant_id: DEMO_TENANT_ID,
      partner_id: DEMO_PARTNER_ID,
      title: form.title,
      description: form.description || null,
      severity: form.severity,
      incident_type: form.incident_type || null,
      affected_systems: form.affected_systems || null,
      source: 'Partner Portal',
      detected_at: new Date().toISOString(),
      reported_by: partner?.name || 'Partner',
    })

    await supabase.from('incident_timeline').insert({
      tenant_id: DEMO_TENANT_ID,
      incident_id: (await supabase.from('incidents').select('id').order('created_at', { ascending: false }).limit(1).single()).data?.id,
      event_type: 'detection',
      title: 'Incident Reported',
      description: `Incident reported via Partner Portal by ${partner?.name || 'Partner'}`,
    })

    setIsDialogOpen(false)
    setForm({
      title: '',
      description: '',
      severity: 'medium',
      incident_type: '',
      affected_systems: '',
    })
    fetchData()
  }

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    inProgress: incidents.filter(i => ['investigating', 'containment', 'eradication', 'recovery'].includes(i.status)).length,
    resolved: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
  }

  return (
    <PartnerPortalSidebar partnerName={partner?.name} companyName={partner?.company || undefined}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Incident Response</h1>
            <p className="text-muted-foreground">Report and track security incidents</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Report Security Incident</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleReportIncident} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Incident Title *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Brief description of the incident"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Severity *</Label>
                    <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Incident Type</Label>
                    <Select value={form.incident_type} onValueChange={(v) => setForm({ ...form, incident_type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {INCIDENT_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="affected_systems">Affected Systems</Label>
                  <Input
                    id="affected_systems"
                    value={form.affected_systems}
                    onChange={(e) => setForm({ ...form, affected_systems: e.target.value })}
                    placeholder="List affected systems, servers, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Provide details about the incident..."
                    rows={4}
                  />
                </div>
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                  Submit Incident Report
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 border-l-4 border-l-slate-500">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-500/10">
                <Shield className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-red-500">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-sm text-muted-foreground">Open</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Shield className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Sev</TableHead>
                <TableHead>Incident</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No incidents reported</p>
                    <p className="text-sm text-muted-foreground mt-1">Report a security incident to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents.map((incident) => {
                  const severityConfig = SEVERITY_CONFIG[incident.severity]
                  const statusConfig = STATUS_CONFIG[incident.status]
                  return (
                    <TableRow key={incident.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/portal/partner/incidents/${incident.id}`} className="block">
                          <div className={`w-3 h-3 rounded-full ${severityConfig.color}`} title={incident.severity} />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/portal/partner/incidents/${incident.id}`} className="block">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${severityConfig.bgLight}`}>
                              <AlertTriangle className={`h-4 w-4 ${severityConfig.textColor}`} />
                            </div>
                            <div>
                              <p className="font-medium">{incident.title}</p>
                              {incident.affected_systems && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{incident.affected_systems}</p>
                              )}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/portal/partner/incidents/${incident.id}`} className="block">
                          {incident.incident_type && (
                            <Badge variant="secondary" className="text-xs">{incident.incident_type}</Badge>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/portal/partner/incidents/${incident.id}`} className="block">
                          <Badge className={`text-xs border ${statusConfig.color}`}>
                            {statusConfig.label}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/portal/partner/incidents/${incident.id}`} className="block">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {incident.detected_at
                              ? formatDistanceToNow(new Date(incident.detected_at), { addSuffix: true })
                              : format(new Date(incident.created_at), 'MMM d')}
                          </div>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PartnerPortalSidebar>
  )
}
