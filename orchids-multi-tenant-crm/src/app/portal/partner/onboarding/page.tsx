"use client"

import { PartnerPortalSidebar } from '@/components/partner-portal-sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { supabase, DEMO_PARTNER_ID } from '@/lib/supabase'
import type { Partner, PartnerOnboardingTask } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { ClipboardCheck, CheckCircle2, Circle, Calendar, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function PartnerOnboardingPage() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [tasks, setTasks] = useState<PartnerOnboardingTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [partnerRes, tasksRes] = await Promise.all([
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase.from('partner_onboarding_tasks').select('*').eq('partner_id', DEMO_PARTNER_ID).order('sort_order'),
    ])

    setPartner(partnerRes.data)
    setTasks(tasksRes.data || [])
    setLoading(false)
  }

  async function toggleTaskComplete(task: PartnerOnboardingTask) {
    const newIsCompleted = !task.is_completed
    await supabase
      .from('partner_onboarding_tasks')
      .update({ 
        is_completed: newIsCompleted,
        completed_at: newIsCompleted ? new Date().toISOString() : null
      })
      .eq('id', task.id)
    
    fetchData()
  }

  const completedTasks = tasks.filter(t => t.is_completed).length
  const totalTasks = tasks.length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const allCompleted = completedTasks === totalTasks && totalTasks > 0

  return (
    <PartnerPortalSidebar partnerName={partner?.name} companyName={partner?.company || undefined}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Onboarding Tasks</h1>
          <p className="text-muted-foreground">Complete these tasks to get started as a partner</p>
        </div>

        <Card className={cn(
          "p-6",
          allCompleted && "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {allCompleted ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                  <ClipboardCheck className="h-6 w-6 text-purple-500" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold">
                  {allCompleted ? 'Onboarding Complete!' : 'Your Progress'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {allCompleted 
                    ? 'Congratulations! You\'ve completed all onboarding tasks.' 
                    : `${completedTasks} of ${totalTasks} tasks completed`
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-3xl font-bold",
                allCompleted ? "text-emerald-600" : "text-purple-600"
              )}>
                {Math.round(progress)}%
              </p>
            </div>
          </div>
          <Progress value={progress} className={cn("h-3", allCompleted && "[&>div]:bg-emerald-500")} />
        </Card>

        <div className="space-y-3">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </Card>
            ))
          ) : tasks.length === 0 ? (
            <Card className="p-8 text-center">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No onboarding tasks assigned</p>
            </Card>
          ) : (
            tasks.map((task, index) => (
              <Card 
                key={task.id} 
                className={cn(
                  "p-4 transition-all",
                  task.is_completed && "bg-muted/30"
                )}
              >
                <div className="flex items-start gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full shrink-0 mt-0.5",
                      task.is_completed 
                        ? "text-emerald-500 hover:text-emerald-600" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => toggleTaskComplete(task)}
                  >
                    {task.is_completed ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Step {index + 1}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due {format(new Date(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <h3 className={cn(
                      "font-medium mt-1",
                      task.is_completed && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className={cn(
                        "text-sm text-muted-foreground mt-1",
                        task.is_completed && "line-through"
                      )}>
                        {task.description}
                      </p>
                    )}
                    {task.is_completed && task.completed_at && (
                      <p className="text-xs text-emerald-600 mt-2">
                        Completed on {format(new Date(task.completed_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {!allCompleted && tasks.length > 0 && (
          <Card className="p-4 bg-purple-500/5 border-purple-500/20">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Complete all tasks to unlock bonus rewards!</p>
                <p className="text-sm text-muted-foreground">
                  Earn extra points and benefits when you finish your onboarding.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PartnerPortalSidebar>
  )
}
