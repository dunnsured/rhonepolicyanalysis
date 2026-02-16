"use client"

import { AppSidebar } from '@/components/app-sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase, DEMO_TENANT_ID } from '@/lib/supabase'
import type { Incident, IncidentTask, IncidentTimeline, IncidentEvidence } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { use } from 'react'
import { 
  AlertTriangle, Shield, ArrowLeft, Plus, Clock, 
  CheckCircle2, Circle, PlayCircle, XCircle,
  FileText, Activity, ListTodo, Trash2, Timer,
  AlertCircle, Zap, Target, RotateCcw, FileCheck
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
  eradication: { label: 'Eradication', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Trash2 },
  recovery: { label: 'Recovery', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: RotateCcw },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: FileCheck },
}

const TASK_STATUS_ICONS = {
  pending: Circle,
  in_progress: PlayCircle,
  completed: CheckCircle2,
  blocked: XCircle,
  cancelled: XCircle,
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
  eradication: Trash2,
  recovery: RotateCcw,
  resolution: CheckCircle2,
  update: FileText,
}

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [incident, setIncident] = useState<Incident | null>(null)
  const [tasks, setTasks] = useState<IncidentTask[]>([])
  const [timeline, setTimeline] = useState<IncidentTimeline[]>([])
  const [evidence, setEvidence] = useState<IncidentEvidence[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false)
  const [isEvidenceDialogOpen, setIsEvidenceDialogOpen] = useState(false)

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    phase: '',
  })

  const [timelineForm, setTimelineForm] = useState({
    event_type: 'update',
    title: '',
    description: '',
  })

  const [evidenceForm, setEvidenceForm] = useState({
    title: '',
    description: '',
    evidence_type: '',
  })

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchData() {
    const [incidentRes, tasksRes, timelineRes, evidenceRes] = await Promise.all([
      supabase.from('incidents').select('*').eq('id', id).single(),
      supabase.from('incident_tasks').select('*').eq('incident_id', id).order('sort_order'),
      supabase.from('incident_timeline').select('*').eq('incident_id', id).order('event_time', { ascending: false }),
      supabase.from('incident_evidence').select('*').eq('incident_id', id).order('collected_at', { ascending: false }),
    ])

    setIncident(incidentRes.data)
    setTasks(tasksRes.data || [])
    setTimeline(timelineRes.data || [])
    setEvidence(evidenceRes.data || [])
    setLoading(false)
  }

  async function handleStatusChange(newStatus: string) {
    if (!incident) return
    const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
    
    if (newStatus === 'resolved' && !incident.resolved_at) {
      updates.resolved_at = new Date().toISOString()
    }
    if (newStatus === 'closed' && !incident.closed_at) {
      updates.closed_at = new Date().toISOString()
    }
    if (newStatus === 'containment' && !incident.contained_at) {
      updates.contained_at = new Date().toISOString()
    }

    await supabase.from('incidents').update(updates).eq('id', id)
    
    await supabase.from('incident_timeline').insert({
      tenant_id: DEMO_TENANT_ID,
      incident_id: id,
      event_type: 'update',
      title: `Status changed to ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG].label}`,
      description: `Incident status updated from ${STATUS_CONFIG[incident.status].label} to ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG].label}`,
    })

    fetchData()
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    
    await supabase.from('incident_tasks').insert({
      tenant_id: DEMO_TENANT_ID,
      incident_id: id,
      title: taskForm.title,
      description: taskForm.description || null,
      priority: taskForm.priority,
      phase: taskForm.phase || null,
      sort_order: tasks.length,
    })

    setIsTaskDialogOpen(false)
    setTaskForm({ title: '', description: '', priority: 'medium', phase: '' })
    fetchData()
  }

  async function handleTaskStatusChange(taskId: string, newStatus: string) {
    const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
    }
    await supabase.from('incident_tasks').update(updates).eq('id', taskId)
    fetchData()
  }

  async function handleAddTimeline(e: React.FormEvent) {
    e.preventDefault()
    
    await supabase.from('incident_timeline').insert({
      tenant_id: DEMO_TENANT_ID,
      incident_id: id,
      event_type: timelineForm.event_type,
      title: timelineForm.title,
      description: timelineForm.description || null,
    })

    setIsTimelineDialogOpen(false)
    setTimelineForm({ event_type: 'update', title: '', description: '' })
    fetchData()
  }

  async function handleAddEvidence(e: React.FormEvent) {
    e.preventDefault()
    
    await supabase.from('incident_evidence').insert({
      tenant_id: DEMO_TENANT_ID,
      incident_id: id,
      title: evidenceForm.title,
      description: evidenceForm.description || null,
      evidence_type: evidenceForm.evidence_type || null,
    })

    setIsEvidenceDialogOpen(false)
    setEvidenceForm({ title: '', description: '', evidence_type: '' })
    fetchData()
  }

  async function handleDeleteTask(taskId: string) {
    await supabase.from('incident_tasks').delete().eq('id', taskId)
    fetchData()
  }

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

  if (!incident) {
    return (
      <AppSidebar>
        <div className="p-6 text-center py-12">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Incident not found</h2>
          <Link href="/incidents">
            <Button variant="outline">Back to Incidents</Button>
          </Link>
        </div>
      </AppSidebar>
    )
  }

  const severityConfig = SEVERITY_CONFIG[incident.severity]
  const statusConfig = STATUS_CONFIG[incident.status]
  const StatusIcon = statusConfig.icon

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  }

  const tasksByPhase = tasks.reduce((acc, task) => {
    const phase = task.phase || 'unassigned'
    if (!acc[phase]) acc[phase] = []
    acc[phase].push(task)
    return acc
  }, {} as Record<string, IncidentTask[]>)

  return (
    <AppSidebar>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/incidents">
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
                  {incident.source && <span>Source: {incident.source}</span>}
                  {incident.detected_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Detected {formatDistanceToNow(new Date(incident.detected_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Select value={incident.status} onValueChange={handleStatusChange}>
            <SelectTrigger className={`w-[180px] border ${statusConfig.color}`}>
              <StatusIcon className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const Icon = config.icon
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-500/10">
                <ListTodo className="h-5 w-5 text-slate-500" />
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
                <p className="text-sm text-muted-foreground">Timeline Events</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
            <TabsTrigger value="evidence">Evidence ({evidence.length})</TabsTrigger>
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
                  {(incident.root_cause || incident.lessons_learned) && (
                    <div className="pt-4 border-t space-y-3">
                      {incident.root_cause && (
                        <div>
                          <p className="text-sm text-muted-foreground">Root Cause</p>
                          <p className="text-sm mt-1">{incident.root_cause}</p>
                        </div>
                      )}
                      {incident.lessons_learned && (
                        <div>
                          <p className="text-sm text-muted-foreground">Lessons Learned</p>
                          <p className="text-sm mt-1">{incident.lessons_learned}</p>
                        </div>
                      )}
                    </div>
                  )}
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

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Response Tasks</h3>
                <Button size="sm" onClick={() => setIsTaskDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tasks assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map((task) => {
                    const TaskIcon = TASK_STATUS_ICONS[task.status]
                    const phaseConfig = task.phase ? PHASE_CONFIG[task.phase] : null
                    return (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Checkbox
                          checked={task.status === 'completed'}
                          onCheckedChange={(checked) => 
                            handleTaskStatusChange(task.id, checked ? 'completed' : 'pending')
                          }
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {phaseConfig && (
                              <Badge variant="secondary" className={`text-xs ${phaseConfig.bg} ${phaseConfig.color}`}>
                                {phaseConfig.label}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                          </div>
                        </div>
                        <TaskIcon className={`h-4 w-4 ${task.status === 'completed' ? 'text-emerald-500' : task.status === 'in_progress' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <Card>
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Response Tasks by Phase</h3>
                <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Response Task</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddTask} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="task_title">Task Title *</Label>
                        <Input
                          id="task_title"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
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
                          <Label>Phase</Label>
                          <Select value={taskForm.phase} onValueChange={(v) => setTaskForm({ ...taskForm, phase: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select phase" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PHASE_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task_description">Description</Label>
                        <Textarea
                          id="task_description"
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <Button type="submit" className="w-full">Add Task</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="p-4 space-y-6">
                {Object.entries(PHASE_CONFIG).map(([phaseKey, phaseConfig]) => {
                  const phaseTasks = tasksByPhase[phaseKey] || []
                  return (
                    <div key={phaseKey}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-3 h-3 rounded-full ${phaseConfig.bg}`} />
                        <h4 className={`font-medium ${phaseConfig.color}`}>{phaseConfig.label}</h4>
                        <Badge variant="secondary" className="text-xs">{phaseTasks.length}</Badge>
                      </div>
                      {phaseTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground ml-5">No tasks in this phase</p>
                      ) : (
                        <div className="space-y-2 ml-5">
                          {phaseTasks.map((task) => {
                            const TaskIcon = TASK_STATUS_ICONS[task.status]
                            return (
                              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                <Checkbox
                                  checked={task.status === 'completed'}
                                  onCheckedChange={(checked) => 
                                    handleTaskStatusChange(task.id, checked ? 'completed' : 'pending')
                                  }
                                />
                                <div className="flex-1">
                                  <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                    {task.title}
                                  </p>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteTask(task.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
                {tasksByPhase['unassigned']?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      <h4 className="font-medium text-gray-500">Unassigned Phase</h4>
                      <Badge variant="secondary" className="text-xs">{tasksByPhase['unassigned'].length}</Badge>
                    </div>
                    <div className="space-y-2 ml-5">
                      {tasksByPhase['unassigned'].map((task) => (
                        <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                          <Checkbox
                            checked={task.status === 'completed'}
                            onCheckedChange={(checked) => 
                              handleTaskStatusChange(task.id, checked ? 'completed' : 'pending')
                            }
                          />
                          <div className="flex-1">
                            <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <Card>
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Incident Timeline</h3>
                <Dialog open={isTimelineDialogOpen} onOpenChange={setIsTimelineDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Timeline Event</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddTimeline} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Event Type</Label>
                        <Select value={timelineForm.event_type} onValueChange={(v) => setTimelineForm({ ...timelineForm, event_type: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="detection">Detection</SelectItem>
                            <SelectItem value="escalation">Escalation</SelectItem>
                            <SelectItem value="containment">Containment</SelectItem>
                            <SelectItem value="analysis">Analysis</SelectItem>
                            <SelectItem value="eradication">Eradication</SelectItem>
                            <SelectItem value="recovery">Recovery</SelectItem>
                            <SelectItem value="resolution">Resolution</SelectItem>
                            <SelectItem value="update">Update</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event_title">Event Title *</Label>
                        <Input
                          id="event_title"
                          value={timelineForm.title}
                          onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event_description">Description</Label>
                        <Textarea
                          id="event_description"
                          value={timelineForm.description}
                          onChange={(e) => setTimelineForm({ ...timelineForm, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <Button type="submit" className="w-full">Add Event</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="p-4">
                {timeline.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No timeline events recorded</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-4">
                      {timeline.map((event, index) => {
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

          <TabsContent value="evidence" className="mt-6">
            <Card>
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Evidence & Artifacts</h3>
                <Dialog open={isEvidenceDialogOpen} onOpenChange={setIsEvidenceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Evidence
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Evidence</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddEvidence} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="evidence_title">Title *</Label>
                        <Input
                          id="evidence_title"
                          value={evidenceForm.title}
                          onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Evidence Type</Label>
                        <Select value={evidenceForm.evidence_type} onValueChange={(v) => setEvidenceForm({ ...evidenceForm, evidence_type: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="log_file">Log File</SelectItem>
                            <SelectItem value="screenshot">Screenshot</SelectItem>
                            <SelectItem value="memory_dump">Memory Dump</SelectItem>
                            <SelectItem value="network_capture">Network Capture</SelectItem>
                            <SelectItem value="malware_sample">Malware Sample</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="evidence_description">Description</Label>
                        <Textarea
                          id="evidence_description"
                          value={evidenceForm.description}
                          onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <Button type="submit" className="w-full">Add Evidence</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="p-4">
                {evidence.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No evidence collected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {evidence.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-4 rounded-lg border">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                          <FileText className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {item.evidence_type && (
                              <Badge variant="secondary" className="text-xs">{item.evidence_type}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Collected {format(new Date(item.collected_at), 'MMM d, yyyy HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppSidebar>
  )
}
