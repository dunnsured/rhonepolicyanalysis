"use client"

import { PartnerPortalSidebar } from '@/components/partner-portal-sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { supabase, DEMO_TENANT_ID, DEMO_PARTNER_ID } from '@/lib/supabase'
import type { Partner, Referral, PartnerOnboardingTask, PartnerRewardPoints, Ticket } from '@/lib/supabase'
import { REFERRAL_STATUSES } from '@/lib/types'
import { useEffect, useState } from 'react'
import { Gift, UserPlus, TrendingUp, ClipboardCheck, ArrowRight, Headphones } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'

export default function PartnerDashboardPage() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [onboardingTasks, setOnboardingTasks] = useState<PartnerOnboardingTask[]>([])
  const [rewardHistory, setRewardHistory] = useState<PartnerRewardPoints[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [partnerRes, referralsRes, tasksRes, rewardsRes, ticketsRes] = await Promise.all([
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase.from('referrals').select('*, deal:deals(*)').eq('partner_id', DEMO_PARTNER_ID).order('created_at', { ascending: false }),
      supabase.from('partner_onboarding_tasks').select('*').eq('partner_id', DEMO_PARTNER_ID).order('sort_order'),
      supabase.from('partner_reward_points').select('*').eq('partner_id', DEMO_PARTNER_ID).order('created_at', { ascending: false }).limit(5),
      supabase.from('tickets').select('*').eq('submitted_by_partner_id', DEMO_PARTNER_ID).order('created_at', { ascending: false }).limit(5),
    ])

    setPartner(partnerRes.data)
    setReferrals(referralsRes.data || [])
    setOnboardingTasks(tasksRes.data || [])
    setRewardHistory(rewardsRes.data || [])
    setTickets(ticketsRes.data || [])
    setLoading(false)
  }

  const completedTasks = onboardingTasks.filter(t => t.is_completed).length
  const totalTasks = onboardingTasks.length
  const onboardingProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const pendingReferrals = referrals.filter(r => r.status === 'pending' || r.status === 'contacted').length
  const convertedReferrals = referrals.filter(r => r.status === 'converted').length
  const totalCommissions = referrals.reduce((sum, r) => sum + Number(r.commission_amount), 0)

  const getStatusBadge = (status: string) => {
    const statusConfig = REFERRAL_STATUSES.find(s => s.id === status)
    return (
      <Badge className={cn("text-xs", statusConfig?.color, "text-white")}>
        {statusConfig?.label || status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <PartnerPortalSidebar>
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
      </PartnerPortalSidebar>
    )
  }

  return (
    <PartnerPortalSidebar partnerName={partner?.name} companyName={partner?.company || undefined}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {partner?.name}!</h1>
          <p className="text-muted-foreground">Here&apos;s your partner dashboard overview</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <Gift className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{partner?.reward_points?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Reward Points</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <UserPlus className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingReferrals}</p>
                <p className="text-sm text-muted-foreground">Pending Referrals</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{convertedReferrals}</p>
                <p className="text-sm text-muted-foreground">Converted Deals</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <ClipboardCheck className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalCommissions.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Commissions</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Onboarding Progress</h2>
              <Link href="/portal/partner/onboarding" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{completedTasks} of {totalTasks} tasks completed</span>
                <span className="font-medium">{Math.round(onboardingProgress)}%</span>
              </div>
              <Progress value={onboardingProgress} className="h-2" />
              <div className="space-y-2 mt-4">
                {onboardingTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                      task.is_completed ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground"
                    )}>
                      {task.is_completed && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={cn("text-sm", task.is_completed && "line-through text-muted-foreground")}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Referrals</h2>
              <Link href="/portal/partner/referrals" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {referrals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No referrals yet</p>
                <Link href="/portal/partner/referrals" className="text-purple-600 hover:underline text-sm">
                  Submit your first referral
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.slice(0, 4).map(referral => (
                  <div key={referral.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{referral.referred_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(referral.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {getStatusBadge(referral.status)}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Points Activity</h2>
              <Link href="/portal/partner/rewards" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {rewardHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No point activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rewardHistory.map(reward => (
                  <div key={reward.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{reward.description || 'Points earned'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(reward.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className={cn(
                      "font-semibold",
                      reward.transaction_type === 'earned' ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {reward.transaction_type === 'earned' ? '+' : '-'}{reward.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Support Tickets</h2>
              <Link href="/portal/partner/tickets" className="text-sm text-purple-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Headphones className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No support tickets</p>
                <Link href="/portal/partner/tickets" className="text-purple-600 hover:underline text-sm">
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
                    <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                      {ticket.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Your Commission Rate</h3>
              <p className="text-muted-foreground text-sm">Based on your current partner tier</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-purple-600">{partner?.commission_rate || 10}%</p>
              <Badge variant="secondary">{partner?.tier || 'Standard'} Tier</Badge>
            </div>
          </div>
        </Card>
      </div>
    </PartnerPortalSidebar>
  )
}
