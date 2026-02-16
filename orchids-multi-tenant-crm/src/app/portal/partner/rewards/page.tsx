"use client"

import { PartnerPortalSidebar } from '@/components/partner-portal-sidebar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase, DEMO_PARTNER_ID } from '@/lib/supabase'
import type { Partner, PartnerRewardPoints } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Gift, TrendingUp, Award, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function PartnerRewardsPage() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [rewardHistory, setRewardHistory] = useState<PartnerRewardPoints[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [partnerRes, rewardsRes] = await Promise.all([
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase.from('partner_reward_points').select('*, referral:referrals(*), deal:deals(*)').eq('partner_id', DEMO_PARTNER_ID).order('created_at', { ascending: false }),
    ])

    setPartner(partnerRes.data)
    setRewardHistory(rewardsRes.data || [])
    setLoading(false)
  }

  const totalEarned = rewardHistory.filter(r => r.transaction_type === 'earned').reduce((sum, r) => sum + r.points, 0)
  const totalRedeemed = rewardHistory.filter(r => r.transaction_type === 'redeemed').reduce((sum, r) => sum + r.points, 0)
  const currentBalance = partner?.reward_points || 0

  const getTierBenefits = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'gold':
        return { color: 'bg-amber-500', benefits: ['15% commission rate', 'Priority support', 'Early access to features'] }
      case 'platinum':
        return { color: 'bg-slate-400', benefits: ['20% commission rate', 'Dedicated account manager', 'Custom integrations'] }
      default:
        return { color: 'bg-purple-500', benefits: ['10% commission rate', 'Standard support', 'Partner dashboard access'] }
    }
  }

  const tierInfo = getTierBenefits(partner?.tier || 'standard')

  return (
    <PartnerPortalSidebar partnerName={partner?.name} companyName={partner?.company || undefined}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reward Points</h1>
          <p className="text-muted-foreground">Track your reward points and benefits</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-4xl font-bold text-purple-600 mt-1">{currentBalance.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-2">points available</p>
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/20">
                <Gift className="h-10 w-10 text-purple-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", tierInfo.color)}>
                <Award className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Tier</p>
                <p className="font-semibold capitalize">{partner?.tier || 'Standard'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {tierInfo.benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEarned.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Gift className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRedeemed.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Redeemed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Award className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{partner?.commission_rate || 10}%</p>
                <p className="text-sm text-muted-foreground">Commission Rate</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">How to Earn Points</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
                  <span className="text-sm font-bold text-purple-600">1</span>
                </div>
                <h3 className="font-medium">Submit Referrals</h3>
              </div>
              <p className="text-sm text-muted-foreground">Earn 100 points for each new referral submitted</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
                  <span className="text-sm font-bold text-purple-600">2</span>
                </div>
                <h3 className="font-medium">Convert Deals</h3>
              </div>
              <p className="text-sm text-muted-foreground">Earn 500 points when your referral converts to a closed deal</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
                  <span className="text-sm font-bold text-purple-600">3</span>
                </div>
                <h3 className="font-medium">Complete Onboarding</h3>
              </div>
              <p className="text-sm text-muted-foreground">Earn bonus points for completing onboarding tasks</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b">
            <h2 className="font-semibold">Points History</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Related To</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead>Date</TableHead>
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
              ) : rewardHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Gift className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No points history yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Start earning by submitting referrals</p>
                  </TableCell>
                </TableRow>
              ) : (
                rewardHistory.map(reward => (
                  <TableRow key={reward.id}>
                    <TableCell>
                      <p className="font-medium">{reward.description || 'Points transaction'}</p>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={reward.transaction_type === 'earned' ? 'default' : 'secondary'}
                        className={cn(
                          "text-xs capitalize",
                          reward.transaction_type === 'earned' ? 'bg-emerald-500' : 'bg-slate-500'
                        )}
                      >
                        {reward.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {reward.referral ? (
                        <span className="text-sm">Referral: {reward.referral.referred_name}</span>
                      ) : reward.deal ? (
                        <span className="text-sm">Deal: {reward.deal.title}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-semibold",
                        reward.transaction_type === 'earned' ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {reward.transaction_type === 'earned' ? '+' : '-'}{reward.points.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(reward.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PartnerPortalSidebar>
  )
}
