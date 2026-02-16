"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  TrendingUp,
  Headphones,
  Users,
  Settings,
  Building2,
  ChevronLeft,
  Menu,
  ExternalLink,
  Shield,
  UserCircle,
  LogOut,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { signOut } from '@/lib/auth'

const portalMode = process.env.NEXT_PUBLIC_PORTAL_MODE

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Contacts', href: '/contacts', icon: UserCircle },
  { name: 'Sales Pipeline', href: '/pipeline', icon: TrendingUp },
  { name: 'Incidents', href: '/incidents', icon: Shield },
  { name: 'Support Tickets', href: '/tickets', icon: Headphones },
  { name: 'Partners', href: '/partners', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground">TenantCRM</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary")} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

<div className="border-t border-sidebar-border p-4 space-y-3">
            {/* Only show portal links when not in CRM-only mode */}
            {!portalMode && (
              <>
                <Link href="/portal/partner">
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-purple-600 border-purple-600/30 hover:bg-purple-500/10", collapsed && "px-2")}>
                    <ExternalLink className="h-4 w-4" />
                    {!collapsed && <span className="ml-2">Partner Portal</span>}
                  </Button>
                </Link>
                <Link href="/portal/client">
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-cyan-600 border-cyan-600/30 hover:bg-cyan-500/10", collapsed && "px-2")}>
                    <ExternalLink className="h-4 w-4" />
                    {!collapsed && <span className="ml-2">Client Portal</span>}
                  </Button>
                </Link>
              </>
            )}
            <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/20 text-primary text-sm">JS</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium text-sidebar-foreground">John Smith</span>
                  <span className="text-xs text-muted-foreground">Acme Corp</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={loggingOut}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
