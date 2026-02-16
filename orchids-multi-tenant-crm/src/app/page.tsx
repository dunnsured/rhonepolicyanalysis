"use client"

import { AppSidebar } from '@/components/app-sidebar'
import { Card } from '@/components/ui/card'
import { supabase, DEMO_TENANT_ID, DEMO_PIPELINE_ID } from '@/lib/supabase'
import type { Deal, Ticket, Partner, PipelineStage, Contact } from '@/lib/supabase'
import { TICKET_STATUSES } from '@/lib/types'
import { useEffect, useState } from 'react'
import { TrendingUp, Headphones, Users, DollarSign, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function DashboardPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [dealsRes, ticketsRes, partnersRes, stagesRes] = await Promise.all([
        supabase.from('deals').select('*, stage:pipeline_stages(*), contact:contacts(*)').eq('tenant_id', DEMO_TENANT_ID),
        supabase.from('tickets').select('*, contact:contacts(*)').eq('tenant_id', DEMO_TENANT_ID),
        supabase.from('partners').select('*').eq('tenant_id', DEMO_TENANT_ID),
        supabase.from('pipeline_stages').select('*').eq('pipeline_id', DEMO_PIPELINE_ID).order('position', { ascending: true }),
      ])

      setDeals(dealsRes.data || [])
      setTickets(ticketsRes.data || [])
      setPartners(partnersRes.data || [])
      setStages(stagesRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const totalPipelineValue = deals
    .filter(d => !d.stage?.is_won && !d.stage?.is_lost)
    .reduce((sum, d) => sum + Number(d.value), 0)

  const closedWonValue = deals
    .filter(d => d.stage?.is_won)
    .reduce((sum, d) => sum + Number(d.value), 0)

  const openTickets = tickets.filter(t => t.status === 'open').length
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length

  const activePartners = partners.filter(p => p.status === 'active').length
  const totalPartnerRevenue = partners.reduce((sum, p) => sum + Number(p.total_revenue), 0)

  const recentDeals = [...deals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const urgentTickets = tickets
    .filter(t => t.priority === 'high' && t.status !== 'resolved')
    .slice(0, 5)

  const getContactName = (contact?: Contact) => {
    if (!contact) return null
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
    }
    return contact.company_name
  }

  const getStatusColor = (status: string) => {
    return TICKET_STATUSES.find(s => s.id === status)?.color || 'bg-slate-500'
  }

  return (
    <AppSidebar>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, John. Here&apos;s your overview.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">${totalPipelineValue.toLocaleString()}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">12%</span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Won</p>
                <p className="text-2xl font-bold">${closedWonValue.toLocaleString()}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <DollarSign className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">8%</span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Tickets</p>
                <p className="text-2xl font-bold">{openTickets + inProgressTickets}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <Headphones className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowDownRight className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">3</span>
              <span className="text-muted-foreground ml-1">resolved this week</span>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Partners</p>
                <p className="text-2xl font-bold">{activePartners}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">${totalPartnerRevenue.toLocaleString()} total revenue</span>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold mb-4">Recent Deals</h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {recentDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: deal.stage?.color || '#64748b' }} />
                      <div>
                        <p className="font-medium text-sm">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">{getContactName(deal.contact)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">${Number(deal.value).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground capitalize">{deal.stage?.name || 'Unknown'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold mb-4">Urgent Tickets</h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : urgentTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Headphones className="h-8 w-8 mb-2 opacity-50" />
                <p>No urgent tickets</p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", getStatusColor(ticket.status))} />
                      <div>
                        <p className="font-medium text-sm">{ticket.title}</p>
                        <p className="text-xs text-muted-foreground">{getContactName(ticket.contact)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(ticket.created_at), 'MMM d')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold mb-4">Pipeline Overview</h2>
          <div className="flex gap-2 h-3 rounded-full overflow-hidden bg-muted">
            {stages.filter(s => !s.is_lost).map((stage) => {
              const stageDeals = deals.filter(d => d.stage_id === stage.id)
              const percentage = deals.length > 0 ? (stageDeals.length / deals.length) * 100 : 0
              return (
                <div
                  key={stage.id}
                  className="transition-all"
                  style={{ width: `${percentage}%`, backgroundColor: stage.color }}
                  title={`${stage.name}: ${stageDeals.length} deals`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            {stages.filter(s => !s.is_lost).map((stage) => {
              const stageDeals = deals.filter(d => d.stage_id === stage.id)
              return (
                <div key={stage.id} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-muted-foreground">{stage.name}</span>
                  <span className="font-medium">{stageDeals.length}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </AppSidebar>
  )
}
