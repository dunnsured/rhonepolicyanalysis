"use client"

import { ClientPortalSidebar } from '@/components/client-portal-sidebar'
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
import { supabase, DEMO_TENANT_ID, DEMO_PARTNER_ID, DEMO_CLIENT_ID } from '@/lib/supabase'
import type { Incident, IncidentTask, IncidentTimeline, PartnerClient, Partner } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { use } from 'react'
import { 
  AlertTriangle, Shield, ArrowLeft, Plus, Clock, 
  CheckCircle2, Circle, PlayCircle, Timer,
  AlertCircle, Zap, Target, RotateCcw, FileCheck, Activity, FileText
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

const SEVERITY_CONFIG = {
  critical: { color: 'bg-red-500', textColor: 'text-red-500', bgLight: 'bg-red-500/10', border: 'border-red-500/30' },
  high: { color: 'bg-orange-500', textColor: 'text-orange-500', bgLight: 'bg-orange-500/10', border: 'border-orange-500/30' },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-500', bgLight: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  low: { color: 'bg-blue-500', textColor: 'text-blue-500', bgLight: 'bg-blue-500/10', border: 'border-blue-500/30' },
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle },
  investigating: { label: 'Investigating', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Zap },
  containment: { label: 'Containment', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Target },
  eradication: { label: 'Eradication', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Activity },
  recovery: { label: 'Recovery', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: RotateCcw },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: FileCheck },
}

const TASK_STATUS_ICONS = {
  pending: Circle,
  in_progress: PlayCircle,
  completed: CheckCircle2,
  blocked: Circle,
  cancelled: Circle,
}

const PHASE_CONFIG = {
  detection: { label: 'Detection', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  containment: { label: 'Containment', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  eradication: { label: 'Eradication', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  recovery: { label: 'Recovery', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  post_incident: { label: 'Post-Incident', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
}

const EVENT_TYPE_ICONS: Record<string, typeof AlertCircle> = {
  detection: AlertCircle,
  escalation: Zap,
  containment: Target,
  analysis: Activity,
  eradication: Activity,
  recovery: RotateCcw,
  resolution: CheckCircle2,
  update: FileText,
}

export default function ClientIncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [client, setClient] = useState<PartnerClient | null>(null)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [incident, setIncident] = useState<Incident | null>(null)
  const [tasks, setTasks] = useState<IncidentTask[]>([])
  const [timeline, setTimeline] = useState<IncidentTimeline[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false)

  const [timelineForm, setTimelineForm] = useState({
    title: '',
    description: '',
  })

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchData() {
    const [clientRes, partnerRes, incidentRes, tasksRes, timelineRes] = await Promise.all([
      supabase.from('partner_clients').select('*').eq('id', DEMO_CLIENT_ID).single(),
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase.from('incidents').select('*').eq('id', id).single(),
      supabase.from('incident_tasks').select('*').eq('incident_id', id).order('sort_order'),
      supabase.from('incident_timeline').select('*').eq('incident_id', id).order('event_time', { ascending: false }),
    ])

    setClient(clientRes.data)
    setPartner(partnerRes.data)
    setIncident(incidentRes.data)
    setTasks(tasksRes.data || [])
    setTimeline(timelineRes.data || [])
    setLoading(false)
  }

  async function handleAddUpdate(e: React.FormEvent) {
    e.preventDefault()
    
    await supabase.from('incident_timeline').insert({
      tenant_id: DEMO_TENANT_ID,
      incident_id: id,
      event_type: 'update',
      title: timelineForm.title,
      description: timelineForm.description || null,
    })

    setIsTimelineDialogOpen(false)
    setTimelineForm({ title: '', description: '' })
    fetchData()
  }

  if (loading) {
    return (
      <ClientPortalSidebar 
        clientName={client?.primary_contact_name || undefined}
        companyName={client?.company_name}
        partnerName={partner?.company || partner?.name}
      >
        <div className="p-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </ClientPortalSidebar>
    )
  }

  if (!incident) {
    return (
      <ClientPortalSidebar 
        clientName={client?.primary_contact_name || undefined}
        companyName={client?.company_name}
        partnerName={partner?.company || partner?.name}
      >
        <div className="p-6 text-center py-12">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Incident not found</h2>
          <Link href="/portal/client/incidents">
            <Button variant="outline">Back to Incidents</Button>
          </Link>
        </div>
      </ClientPortalSidebar>
    )
  }

  const severityConfig = SEVERITY_CONFIG[incident.severity]
  const statusConfig = STATUS_CONFIG[incident.status]
  const StatusIcon = statusConfig.icon

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
  }

  return (
    <ClientPortalSidebar 
      clientName={client?.primary_contact_name || undefined}
      companyName={client?.company_name}
      partnerName={partner?.company || partner?.name}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/portal/client/incidents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${severityConfig.bgLight}`}>
                <AlertTriangle className={`h-6 w-6 ${severityConfig.textColor}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
                  <Badge className={`${severityConfig.bgLight} ${severityConfig.textColor} border ${severityConfig.border}`}>
                    {incident.severity.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-sm">
                  {incident.incident_type && <Badge variant="secondary">{incident.incident_type}</Badge>}
                  {incident.detected_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Reported {formatDistanceToNow(new Date(incident.detected_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Badge className={`text-sm border ${statusConfig.color} px-3 py-1`}>
            <StatusIcon className="h-4 w-4 mr-2" />
            {statusConfig.label}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-500/10">
                <Activity className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskStats.total}</p>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskStats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <PlayCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskStats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Timer className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{timeline.length}</p>
                <p className="text-sm text-muted-foreground">Updates</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Incident Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm mt-1">{incident.description || 'No description provided'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Affected Systems</p>
                      <p className="font-medium text-sm mt-1">{incident.affected_systems || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Impact Assessment</p>
                      <p className="font-medium text-sm mt-1">{incident.impact_assessment || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reported By</p>
                      <p className="font-medium text-sm mt-1">{incident.reported_by || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Detection Source</p>
                      <p className="font-medium text-sm mt-1">{incident.source || '-'}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Response Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Detected</span>
                    <span className="text-sm font-medium">
                      {incident.detected_at ? format(new Date(incident.detected_at), 'MMM d, yyyy HH:mm') : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t">
                    <span className="text-sm text-muted-foreground">Contained</span>
                    <span className="text-sm font-medium">
                      {incident.contained_at ? format(new Date(incident.contained_at), 'MMM d, yyyy HH:mm') : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t">
                    <span className="text-sm text-muted-foreground">Resolved</span>
                    <span className="text-sm font-medium">
                      {incident.resolved_at ? format(new Date(incident.resolved_at), 'MMM d, yyyy HH:mm') : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t">
                    <span className="text-sm text-muted-foreground">Closed</span>
                    <span className="text-sm font-medium">
                      {incident.closed_at ? format(new Date(incident.closed_at), 'MMM d, yyyy HH:mm') : '-'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Response Tasks</h3>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tasks assigned yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const TaskIcon = TASK_STATUS_ICONS[task.status]
                    const phaseConfig = task.phase ? PHASE_CONFIG[task.phase] : null
                    return (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <TaskIcon className={`h-5 w-5 ${task.status === 'completed' ? 'text-emerald-500' : task.status === 'in_progress' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                        <div className="flex-1">
                          <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {phaseConfig && (
                              <Badge variant="secondary" className={`text-xs ${phaseConfig.bg} ${phaseConfig.color}`}>
                                {phaseConfig.label}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                            <Badge variant="outline" className="text-xs capitalize">{task.status.replace('_', ' ')}</Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <Card>
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Incident Timeline</h3>
                <Dialog open={isTimelineDialogOpen} onOpenChange={setIsTimelineDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Update
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Update</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddUpdate} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="update_title">Title *</Label>
                        <Input
                          id="update_title"
                          value={timelineForm.title}
                          onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })}
                          placeholder="Brief update title"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="update_description">Description</Label>
                        <Textarea
                          id="update_description"
                          value={timelineForm.description}
                          onChange={(e) => setTimelineForm({ ...timelineForm, description: e.target.value })}
                          placeholder="Additional details..."
                          rows={3}
                        />
                      </div>
                      <Button type="submit" className="w-full">Add Update</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="p-4">
                {timeline.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No timeline events yet</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-4">
                      {timeline.map((event) => {
                        const EventIcon = EVENT_TYPE_ICONS[event.event_type] || Activity
                        return (
                          <div key={event.id} className="flex gap-4 relative">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border-2 border-border z-10">
                              <EventIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{event.title}</p>
                                <Badge variant="secondary" className="text-xs capitalize">{event.event_type}</Badge>
                              </div>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(event.event_time), 'MMM d, yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ClientPortalSidebar>
  )
}
