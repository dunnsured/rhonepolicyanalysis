"use client"

import { ClientPortalSidebar } from '@/components/client-portal-sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase, DEMO_PARTNER_ID, DEMO_CLIENT_ID } from '@/lib/supabase'
import type { PartnerClient, Partner, ClientSecurityRecommendation } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Lightbulb, CheckCircle, Clock, AlertCircle, TrendingUp, Zap, Shield, Lock, Server, FileWarning } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function ClientRecommendationsPage() {
  const [client, setClient] = useState<PartnerClient | null>(null)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [recommendations, setRecommendations] = useState<ClientSecurityRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRec, setSelectedRec] = useState<ClientSecurityRecommendation | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [clientRes, partnerRes, recsRes] = await Promise.all([
      supabase.from('partner_clients').select('*').eq('id', DEMO_CLIENT_ID).single(),
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase.from('client_security_recommendations').select('*').eq('client_id', DEMO_CLIENT_ID).order('created_at', { ascending: false }),
    ])

    setClient(clientRes.data)
    setPartner(partnerRes.data)
    setRecommendations(recsRes.data || [])
    setLoading(false)
  }

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { color: string; bg: string }> = {
      critical: { color: 'text-red-700', bg: 'bg-red-100' },
      high: { color: 'text-orange-700', bg: 'bg-orange-100' },
      medium: { color: 'text-amber-700', bg: 'bg-amber-100' },
      low: { color: 'text-emerald-700', bg: 'bg-emerald-100' },
    }
    const c = config[priority] || config.medium
    return <Badge className={cn("text-xs capitalize", c.color, c.bg)}>{priority}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: 'bg-slate-500', icon: <AlertCircle className="h-3 w-3" /> },
      in_progress: { color: 'bg-amber-500', icon: <Clock className="h-3 w-3" /> },
      completed: { color: 'bg-emerald-500', icon: <CheckCircle className="h-3 w-3" /> },
    }
    const c = config[status] || config.pending
    return (
      <Badge className={cn("text-xs capitalize text-white gap-1", c.color)}>
        {c.icon}
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getEffortBadge = (effort: string | null) => {
    if (!effort) return null
    const config: Record<string, string> = {
      low: 'bg-emerald-100 text-emerald-700',
      medium: 'bg-amber-100 text-amber-700',
      high: 'bg-red-100 text-red-700',
    }
    return <Badge className={cn("text-xs capitalize", config[effort] || 'bg-slate-100')}>{effort} effort</Badge>
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      network: <Server className="h-5 w-5" />,
      endpoint: <Shield className="h-5 w-5" />,
      access: <Lock className="h-5 w-5" />,
      data: <FileWarning className="h-5 w-5" />,
      compliance: <FileWarning className="h-5 w-5" />,
      incident: <Zap className="h-5 w-5" />,
    }
    return icons[category] || <Lightbulb className="h-5 w-5" />
  }

  const categories = [...new Set(recommendations.map(r => r.category))]
  
  const filteredRecs = recommendations.filter(r => {
    if (filterCategory !== 'all' && r.category !== filterCategory) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    return true
  })

  const pendingCount = recommendations.filter(r => r.status === 'pending').length
  const inProgressCount = recommendations.filter(r => r.status === 'in_progress').length
  const completedCount = recommendations.filter(r => r.status === 'completed').length
  const totalCount = recommendations.length
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <ClientPortalSidebar 
      clientName={client?.primary_contact_name || 'Client'} 
      companyName={client?.company_name}
      partnerName={partner?.company || partner?.name}
    >
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Recommendations</h1>
          <p className="text-muted-foreground">Improve your security posture with these recommended actions</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-500/10">
                <AlertCircle className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
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
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
                <TrendingUp className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completionRate}%</p>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Overall Progress</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{completedCount} of {totalCount} recommendations completed</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-3" />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            {categories.map(cat => {
              const catRecs = recommendations.filter(r => r.category === cat)
              const catCompleted = catRecs.filter(r => r.status === 'completed').length
              const catRate = catRecs.length > 0 ? Math.round((catCompleted / catRecs.length) * 100) : 0
              return (
                <div key={cat} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-muted-foreground">{getCategoryIcon(cat)}</span>
                    <span className="text-sm font-medium capitalize">{cat}</span>
                  </div>
                  <p className="text-lg font-bold">{catRate}%</p>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </Card>
            ))
          ) : filteredRecs.length === 0 ? (
            <Card className="p-12 col-span-2 text-center">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No recommendations matching your filters</p>
            </Card>
          ) : (
            filteredRecs.map(rec => (
              <Card 
                key={rec.id} 
                className={cn(
                  "p-6 cursor-pointer transition-all hover:shadow-md",
                  rec.status === 'completed' && "opacity-70"
                )}
                onClick={() => { setSelectedRec(rec); setIsDetailOpen(true); }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    rec.priority === 'critical' ? 'bg-red-500/10 text-red-500' :
                    rec.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-amber-500/10 text-amber-500'
                  )}>
                    {getCategoryIcon(rec.category)}
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(rec.priority)}
                    {getStatusBadge(rec.status)}
                  </div>
                </div>
                <h3 className={cn("font-semibold mb-2", rec.status === 'completed' && "line-through")}>{rec.title}</h3>
                {rec.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{rec.description}</p>
                )}
                <div className="flex items-center justify-between mt-auto pt-3 border-t">
                  <Badge variant="secondary" className="text-xs capitalize">{rec.category}</Badge>
                  {getEffortBadge(rec.effort_level)}
                </div>
              </Card>
            ))
          )}
        </div>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                {selectedRec?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedRec && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {getPriorityBadge(selectedRec.priority)}
                  {getStatusBadge(selectedRec.status)}
                  <Badge variant="secondary" className="text-xs capitalize">{selectedRec.category}</Badge>
                  {getEffortBadge(selectedRec.effort_level)}
                </div>
                
                {selectedRec.description && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm">{selectedRec.description}</p>
                  </div>
                )}

                {selectedRec.current_state && (
                  <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                    <h4 className="text-sm font-medium mb-2 text-red-700">Current State</h4>
                    <p className="text-sm">{selectedRec.current_state}</p>
                  </div>
                )}

                {selectedRec.recommended_action && (
                  <div className="p-4 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
                    <h4 className="text-sm font-medium mb-2 text-cyan-700">Recommended Action</h4>
                    <p className="text-sm">{selectedRec.recommended_action}</p>
                  </div>
                )}

                {selectedRec.expected_improvement && (
                  <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                    <h4 className="text-sm font-medium mb-2 text-emerald-700">Expected Improvement</h4>
                    <p className="text-sm">{selectedRec.expected_improvement}</p>
                  </div>
                )}

                {selectedRec.status === 'completed' && selectedRec.completed_at && (
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Completed on {format(new Date(selectedRec.completed_at), 'MMMM d, yyyy')}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card className="p-6 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Need Help Implementing?</h3>
              <p className="text-muted-foreground text-sm">Our security team can assist with any of these recommendations.</p>
            </div>
            <a href="/portal/client/tickets">
              <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors">
                Request Assistance
              </button>
            </a>
          </div>
        </Card>
      </div>
    </ClientPortalSidebar>
  )
}
