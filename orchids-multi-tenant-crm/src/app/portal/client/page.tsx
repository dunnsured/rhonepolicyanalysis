"use client"

import { ClientPortalSidebar } from '@/components/client-portal-sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { supabase, DEMO_CLIENT_ID, DEMO_PARTNER_ID } from '@/lib/supabase'
import type { PartnerClient, Partner, ClientSecurityScore, ClientRiskAssessment, ClientSecurityRecommendation, Ticket } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Lightbulb, Headphones, TrendingUp, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'

export default function ClientDashboardPage() {
  const [client, setClient] = useState<PartnerClient | null>(null)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [securityScore, setSecurityScore] = useState<ClientSecurityScore | null>(null)
  const [risks, setRisks] = useState<ClientRiskAssessment[]>([])
  const [recommendations, setRecommendations] = useState<ClientSecurityRecommendation[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [clientRes, partnerRes, scoreRes, risksRes, recsRes, ticketsRes] = await Promise.all([
      supabase.from('partner_clients').select('*').eq('id', DEMO_CLIENT_ID).single(),
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase.from('client_security_scores').select('*').eq('client_id', DEMO_CLIENT_ID).order('assessment_date', { ascending: false }).limit(1).single(),
      supabase.from('client_risk_assessments').select('*').eq('client_id', DEMO_CLIENT_ID).order('score', { ascending: false }),
      supabase.from('client_security_recommendations').select('*').eq('client_id', DEMO_CLIENT_ID).order('created_at', { ascending: false }),
      supabase.from('tickets').select('*').eq('client_id', DEMO_CLIENT_ID).order('created_at', { ascending: false }).limit(5),
    ])

    setClient(clientRes.data)
    setPartner(partnerRes.data)
    setSecurityScore(scoreRes.data)
    setRisks(risksRes.data || [])
    setRecommendations(recsRes.data || [])
    setTickets(ticketsRes.data || [])
    setLoading(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500'
    if (score >= 60) return 'text-amber-500'
    return 'text-red-500'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500'
    if (score >= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getRiskLevelBadge = (level: string) => {
    const config: Record<string, { color: string; bg: string }> = {
      critical: { color: 'text-red-700', bg: 'bg-red-100' },
      high: { color: 'text-orange-700', bg: 'bg-orange-100' },
      medium: { color: 'text-amber-700', bg: 'bg-amber-100' },
      low: { color: 'text-emerald-700', bg: 'bg-emerald-100' },
    }
    const c = config[level] || config.medium
    return <Badge className={cn("text-xs capitalize", c.color, c.bg)}>{level}</Badge>
  }

  const criticalRisks = risks.filter(r => r.risk_level === 'critical').length
  const highRisks = risks.filter(r => r.risk_level === 'high').length
  const pendingRecs = recommendations.filter(r => r.status === 'pending').length
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length

  const scoreCategories = securityScore ? [
    { name: 'Inherent Risk', score: securityScore.inherent_risk_score },
    { name: 'Cyber Security Maturity', score: securityScore.cyber_maturity_score },
    { name: 'Compliance Maturity', score: securityScore.compliance_maturity_score },
    { name: 'Insurance Maturity', score: securityScore.insurance_maturity_score },
  ] : []

  if (loading) {
    return (
      <ClientPortalSidebar>
        <div className="p-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </Card>
            ))}
          </div>
        </div>
      </ClientPortalSidebar>
    )
  }

  return (
    <ClientPortalSidebar 
      clientName={client?.primary_contact_name || 'Client'} 
      companyName={client?.company_name}
      partnerName={partner?.company || partner?.name}
    >
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {client?.primary_contact_name}. Here&apos;s your security overview.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 col-span-1 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", 
                securityScore ? getScoreBgColor(securityScore.overall_score) + '/10' : 'bg-muted')}>
                <Shield className={cn("h-6 w-6", securityScore ? getScoreColor(securityScore.overall_score) : 'text-muted-foreground')} />
              </div>
              <div>
                <p className={cn("text-3xl font-bold", securityScore ? getScoreColor(securityScore.overall_score) : '')}>
                  {securityScore?.overall_score || '--'}
                </p>
                <p className="text-sm text-muted-foreground">Security Score</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <ShieldAlert className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalRisks + highRisks}</p>
                <p className="text-sm text-muted-foreground">High Priority Risks</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Lightbulb className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRecs}</p>
                <p className="text-sm text-muted-foreground">Pending Actions</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Headphones className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openTickets}</p>
                <p className="text-sm text-muted-foreground">Open Tickets</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Security Score Breakdown</h2>
            <div className="space-y-4">
              {scoreCategories.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{cat.name}</span>
                    <span className={cn("font-semibold", getScoreColor(cat.score))}>{cat.score}%</span>
                  </div>
                  <Progress value={cat.score} className={cn("h-2", `[&>div]:${getScoreBgColor(cat.score)}`)} />
                </div>
              ))}
            </div>
            {securityScore && (
              <p className="text-xs text-muted-foreground mt-4">
                Last assessed: {format(new Date(securityScore.assessment_date), 'MMMM d, yyyy')}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Active Risks</h2>
              <Link href="/portal/client/risks" className="text-sm text-cyan-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {risks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
                <p>No active risks identified</p>
              </div>
            ) : (
              <div className="space-y-3">
                {risks.filter(r => r.mitigation_status !== 'mitigated').slice(0, 4).map(risk => (
                  <div key={risk.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={cn("h-4 w-4",
                        risk.risk_level === 'critical' ? 'text-red-500' :
                        risk.risk_level === 'high' ? 'text-orange-500' : 'text-amber-500'
                      )} />
                      <div>
                        <p className="font-medium text-sm">{risk.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{risk.category}</p>
                      </div>
                    </div>
                    {getRiskLevelBadge(risk.risk_level)}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recommended Actions</h2>
              <Link href="/portal/client/recommendations" className="text-sm text-cyan-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No recommendations at this time</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.filter(r => r.status !== 'completed').slice(0, 4).map(rec => (
                  <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <TrendingUp className={cn("h-4 w-4",
                        rec.priority === 'critical' ? 'text-red-500' :
                        rec.priority === 'high' ? 'text-orange-500' : 'text-amber-500'
                      )} />
                      <div>
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{rec.category}</p>
                      </div>
                    </div>
                    <Badge variant={rec.status === 'in_progress' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {rec.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Support Tickets</h2>
              <Link href="/portal/client/tickets" className="text-sm text-cyan-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Headphones className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No support tickets</p>
                <Link href="/portal/client/tickets" className="text-cyan-600 hover:underline text-sm">
                  Create a ticket
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        #{ticket.ticket_number} · {format(new Date(ticket.created_at), 'MMM d')}
                      </p>
                    </div>
                    <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Need Security Assistance?</h3>
              <p className="text-muted-foreground text-sm">Our team is here to help you improve your security posture.</p>
            </div>
            <Link href="/portal/client/tickets">
              <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors">
                Contact Support
              </button>
            </Link>
          </div>
        </Card>
      </div>
    </ClientPortalSidebar>
  )
}
