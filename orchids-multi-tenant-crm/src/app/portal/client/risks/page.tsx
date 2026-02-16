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
import { supabase, DEMO_PARTNER_ID, DEMO_CLIENT_ID } from '@/lib/supabase'
import type { PartnerClient, Partner, ClientRiskAssessment, ClientSecurityScore } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { ShieldAlert, AlertTriangle, Shield, ShieldCheck, TrendingDown, Clock, CheckCircle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'

const SECURITY_DOMAINS = {
  inherent_risk: {
    label: 'Inherent Risk',
    description: 'Baseline risk profile',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
  },
  cyber_maturity: {
    label: 'Cyber Maturity',
    description: 'Control effectiveness',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  compliance_maturity: {
    label: 'Compliance Maturity',
    description: 'Regulatory alignment',
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
  insurance_maturity: {
    label: 'Insurance Maturity',
    description: 'Insurance readiness',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
  },
}

export default function ClientRisksPage() {
  const [client, setClient] = useState<PartnerClient | null>(null)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [risks, setRisks] = useState<ClientRiskAssessment[]>([])
  const [securityScore, setSecurityScore] = useState<ClientSecurityScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRisk, setSelectedRisk] = useState<ClientRiskAssessment | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterLevel, setFilterLevel] = useState<string>('all')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [clientRes, partnerRes, risksRes, scoreRes] = await Promise.all([
      supabase.from('partner_clients').select('*').eq('id', DEMO_CLIENT_ID).single(),
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase.from('client_risk_assessments').select('*').eq('client_id', DEMO_CLIENT_ID).order('score', { ascending: false }),
      supabase.from('client_security_scores').select('*').eq('client_id', DEMO_CLIENT_ID).order('assessment_date', { ascending: false }).limit(1).single(),
    ])

    setClient(clientRes.data)
    setPartner(partnerRes.data)
    setRisks(risksRes.data || [])
    setSecurityScore(scoreRes.data)
    setLoading(false)
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      identified: { color: 'bg-red-500', icon: <AlertTriangle className="h-3 w-3" /> },
      in_progress: { color: 'bg-amber-500', icon: <Clock className="h-3 w-3" /> },
      mitigated: { color: 'bg-emerald-500', icon: <CheckCircle className="h-3 w-3" /> },
    }
    const c = config[status] || config.identified
    return (
      <Badge className={cn("text-xs capitalize text-white gap-1", c.color)}>
        {c.icon}
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getCategoryBadge = (category: string) => {
    const cat = SECURITY_DOMAINS[category as keyof typeof SECURITY_DOMAINS]
    if (!cat) return <Badge variant="secondary" className="text-xs">{category}</Badge>
    return (
      <Badge className={cn("text-xs gap-1", cat.bgColor, cat.color)}>
        <cat.icon className="h-3 w-3" />
        {cat.label}
      </Badge>
    )
  }

  const filteredRisks = risks.filter(r => {
    if (filterCategory !== 'all' && r.category !== filterCategory) return false
    if (filterLevel !== 'all' && r.risk_level !== filterLevel) return false
    return true
  })

  const criticalCount = risks.filter(r => r.risk_level === 'critical').length
  const highCount = risks.filter(r => r.risk_level === 'high').length
  const mediumCount = risks.filter(r => r.risk_level === 'medium').length
  const lowCount = risks.filter(r => r.risk_level === 'low').length
  const mitigatedCount = risks.filter(r => r.mitigation_status === 'mitigated').length

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500'
    if (score >= 60) return 'text-amber-500'
    return 'text-red-500'
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return '[&>div]:bg-emerald-500'
    if (score >= 60) return '[&>div]:bg-amber-500'
    return '[&>div]:bg-red-500'
  }

  const securityDomains = securityScore ? [
    { 
      key: 'inherent_risk',
      ...SECURITY_DOMAINS.inherent_risk,
      score: securityScore.inherent_risk_score || 0,
      examples: ['Industry profile', 'Data volume', 'Digital footprint', 'Third-party reliance'],
    },
    { 
      key: 'cyber_maturity',
      ...SECURITY_DOMAINS.cyber_maturity,
      score: securityScore.cyber_maturity_score || 0,
      examples: ['Access control', 'Endpoint protection', 'Network defense', 'Incident response'],
    },
    { 
      key: 'compliance_maturity',
      ...SECURITY_DOMAINS.compliance_maturity,
      score: securityScore.compliance_maturity_score || 0,
      examples: ['Framework alignment', 'Policy documentation', 'Audit readiness', 'Regulatory compliance'],
    },
    { 
      key: 'insurance_maturity',
      ...SECURITY_DOMAINS.insurance_maturity,
      score: securityScore.insurance_maturity_score || 0,
      examples: ['Coverage adequacy', 'Premium optimization', 'Policy compliance', 'Claims readiness'],
    },
  ] : []

  return (
    <ClientPortalSidebar 
      clientName={client?.primary_contact_name || 'Client'} 
      companyName={client?.company_name}
      partnerName={partner?.company || partner?.name}
    >
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Risk Dashboard</h1>
          <p className="text-muted-foreground">Monitor risks across your key security domains</p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{highCount}</p>
                <p className="text-sm text-muted-foreground">High</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Shield className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mediumCount}</p>
                <p className="text-sm text-muted-foreground">Medium</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lowCount}</p>
                <p className="text-sm text-muted-foreground">Low</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
                <TrendingDown className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mitigatedCount}</p>
                <p className="text-sm text-muted-foreground">Mitigated</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-cyan-600" />
              <h2 className="text-lg font-semibold">Security Domain Scores</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {securityDomains.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.key} className="p-4 rounded-xl border bg-muted/30 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", item.bgColor)}>
                          <Icon className={cn("h-5 w-5", item.color)} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Domain</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-xl font-bold", getScoreColor(item.score))}>{item.score}%</p>
                      </div>
                    </div>
                    <Progress value={item.score} className={cn("h-1.5", getProgressColor(item.score))} />
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{item.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.examples.slice(0, 3).map(ex => (
                        <span key={ex} className="text-[10px] bg-background border px-1.5 py-0.5 rounded text-muted-foreground">{ex}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Overall Risk Posture</h2>
            <div className="text-center py-4">
              <div className={cn(
                "inline-flex h-24 w-24 items-center justify-center rounded-full mb-3",
                securityScore ? (securityScore.overall_score >= 70 ? 'bg-emerald-500/10' : 'bg-amber-500/10') : 'bg-muted'
              )}>
                <span className={cn(
                  "text-3xl font-bold",
                  securityScore ? getScoreColor(securityScore.overall_score) : 'text-muted-foreground'
                )}>
                  {securityScore?.overall_score || '--'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Cyber Readiness Score</p>
              {securityScore && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last assessed: {format(new Date(securityScore.assessment_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Active Risks</span>
                <span className="font-semibold">{risks.filter(r => r.mitigation_status !== 'mitigated').length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Mitigated</span>
                <span className="font-semibold text-emerald-600">{mitigatedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span>Risk Exposure</span>
                <Badge variant={securityScore && securityScore.overall_score >= 70 ? "default" : "destructive"} className="text-xs">
                  {securityScore && securityScore.overall_score >= 70 ? 'Low' : 'High'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                <SelectItem value="inherent_risk">Inherent Risk</SelectItem>
                <SelectItem value="cyber_maturity">Cyber Maturity</SelectItem>
                <SelectItem value="compliance_maturity">Compliance Maturity</SelectItem>
                <SelectItem value="insurance_maturity">Insurance Maturity</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk</TableHead>
                <TableHead>Security Domain</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Identified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-12 bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredRisks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
                    <p className="text-muted-foreground">No risks matching your filters</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRisks.map(risk => (
                  <TableRow 
                    key={risk.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => { setSelectedRisk(risk); setIsDetailOpen(true); }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={cn("h-4 w-4",
                          risk.risk_level === 'critical' ? 'text-red-500' :
                          risk.risk_level === 'high' ? 'text-orange-500' : 
                          risk.risk_level === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                        )} />
                        <div>
                          <p className="font-medium">{risk.title}</p>
                          {risk.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{risk.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryBadge(risk.category)}</TableCell>
                    <TableCell>{getRiskLevelBadge(risk.risk_level)}</TableCell>
                    <TableCell>
                      <span className={cn("font-semibold", 
                        risk.score >= 80 ? 'text-red-600' : 
                        risk.score >= 60 ? 'text-orange-600' : 
                        risk.score >= 40 ? 'text-amber-600' : 'text-emerald-600'
                      )}>
                        {risk.score}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(risk.mitigation_status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {risk.identified_date && format(new Date(risk.identified_date), 'MMM d, yyyy')}
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
                <AlertTriangle className={cn("h-5 w-5",
                  selectedRisk?.risk_level === 'critical' ? 'text-red-500' :
                  selectedRisk?.risk_level === 'high' ? 'text-orange-500' : 'text-amber-500'
                )} />
                {selectedRisk?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedRisk && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {getRiskLevelBadge(selectedRisk.risk_level)}
                  {getStatusBadge(selectedRisk.mitigation_status)}
                  {getCategoryBadge(selectedRisk.category)}
                  <span className="ml-auto text-sm">
                    Score: <span className="font-bold">{selectedRisk.score}</span>
                  </span>
                </div>
                
                {selectedRisk.description && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm">{selectedRisk.description}</p>
                  </div>
                )}

                <div className="p-4 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
                  <h4 className="text-sm font-medium mb-2 text-cyan-700">Domain Impact</h4>
                  <p className="text-sm text-muted-foreground">
                    This risk affects your <span className="font-medium text-foreground">{SECURITY_DOMAINS[selectedRisk.category as keyof typeof SECURITY_DOMAINS]?.label || selectedRisk.category}</span> domain. 
                    Mitigating this risk will improve your overall security maturity and potentially reduce insurance premiums.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Impact</p>
                    <p className="font-medium capitalize">{selectedRisk.impact || 'Not assessed'}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Likelihood</p>
                    <p className="font-medium capitalize">{selectedRisk.likelihood || 'Not assessed'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Identified</p>
                    <p>{selectedRisk.identified_date ? format(new Date(selectedRisk.identified_date), 'MMMM d, yyyy') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Target Resolution</p>
                    <p>{selectedRisk.target_resolution_date ? format(new Date(selectedRisk.target_resolution_date), 'MMMM d, yyyy') : 'Not set'}</p>
                  </div>
                </div>

                {selectedRisk.mitigation_status === 'mitigated' && selectedRisk.resolved_date && (
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-sm text-emerald-700">
                    Resolved on {format(new Date(selectedRisk.resolved_date), 'MMMM d, yyyy')}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card className="p-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Improve Your Security Posture</h3>
              <p className="text-muted-foreground text-sm">Address high-priority risks to improve your security maturity across all domains.</p>
            </div>
            <Link href="/portal/client/recommendations">
              <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors">
                View Recommendations
              </button>
            </Link>
          </div>
        </Card>
      </div>
    </ClientPortalSidebar>
  )
}
