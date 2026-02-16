"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  UserPlus,
  Headphones,
  Gift,
  ClipboardCheck,
  ChevronLeft,
  Menu,
  LogOut,
  Users,
  ExternalLink,
  Building2,
  Shield,
  UserCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { signOut } from '@/lib/auth'

const portalMode = process.env.NEXT_PUBLIC_PORTAL_MODE

// When in partner portal mode, use root paths. Otherwise use /portal/partner prefix
const basePrefix = portalMode === 'partner' ? '' : '/portal/partner'

const navigation = [
  { name: 'Dashboard', href: basePrefix || '/', icon: LayoutDashboard },
  { name: 'Companies', href: `${basePrefix}/companies`, icon: Building2 },
  { name: 'Contacts', href: `${basePrefix}/contacts`, icon: UserCircle },
  { name: 'My Referrals', href: `${basePrefix}/referrals`, icon: UserPlus },
  { name: 'Incidents', href: `${basePrefix}/incidents`, icon: Shield },
  { name: 'Support Tickets', href: `${basePrefix}/tickets`, icon: Headphones },
  { name: 'Reward Points', href: `${basePrefix}/rewards`, icon: Gift },
  { name: 'Onboarding', href: `${basePrefix}/onboarding`, icon: ClipboardCheck },
]

interface PartnerPortalSidebarProps {
  children: React.ReactNode
  partnerName?: string
  companyName?: string
}

export function PartnerPortalSidebar({ children, partnerName = 'Partner', companyName }: PartnerPortalSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await signOut()
    const loginPath = portalMode === 'partner' ? '/login' : '/portal/partner/login'
    router.push(loginPath)
    router.refresh()
  }

  // Check if current path matches nav item (handle both /portal/partner and root paths)
  const isNavActive = (href: string) => {
    if (portalMode === 'partner') {
      // In partner mode, match against root paths
      return pathname === href || (href === '/' && pathname === '/portal/partner')
    }
    return pathname === href
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sidebar-foreground">Partner Portal</span>
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
            const isActive = isNavActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-purple-500/10 text-purple-600"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-purple-600")} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

<div className="border-t border-sidebar-border p-4 space-y-3">
            {/* Only show cross-portal links when not in standalone mode */}
            {!portalMode && (
              <Link href="/portal/client">
                <Button variant="outline" size="sm" className={cn("w-full justify-start text-cyan-600 border-cyan-600/30 hover:bg-cyan-500/10", collapsed && "px-2")}>
                  <ExternalLink className="h-4 w-4" />
                  {!collapsed && <span className="ml-2">Client Portal</span>}
                </Button>
              </Link>
            )}
            <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-purple-500/20 text-purple-600 text-sm">
                  {partnerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium text-sidebar-foreground">{partnerName}</span>
                  {companyName && (
                    <span className="text-xs text-muted-foreground">{companyName}</span>
                  )}
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
            {/* Only show Exit Portal when not in standalone mode */}
            {!collapsed && !portalMode && (
              <Link href="/">
                <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                  <LogOut className="h-4 w-4 mr-2" />
                  Exit Portal
                </Button>
              </Link>
            )}
          </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
