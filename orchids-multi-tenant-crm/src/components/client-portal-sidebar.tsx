"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Headphones,
  ShieldAlert,
  Lightbulb,
  ChevronLeft,
  Menu,
  LogOut,
  Building2,
  Shield,
  FileText,
  UserCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { signOut } from '@/lib/auth'

const portalMode = process.env.NEXT_PUBLIC_PORTAL_MODE

// When in client portal mode, use root paths. Otherwise use /portal/client prefix
const basePrefix = portalMode === 'client' ? '' : '/portal/client'

const navigation = [
  { name: 'Dashboard', href: basePrefix || '/', icon: LayoutDashboard },
  { name: 'Company', href: `${basePrefix}/company`, icon: Building2 },
  { name: 'Contacts', href: `${basePrefix}/contacts`, icon: UserCircle },
  { name: 'Insurance Policies', href: `${basePrefix}/policies`, icon: FileText },
  { name: 'Incidents', href: `${basePrefix}/incidents`, icon: Shield },
  { name: 'Support Tickets', href: `${basePrefix}/tickets`, icon: Headphones },
  { name: 'Risk Management', href: `${basePrefix}/risks`, icon: ShieldAlert },
  { name: 'Recommendations', href: `${basePrefix}/recommendations`, icon: Lightbulb },
]

interface ClientPortalSidebarProps {
  children: React.ReactNode
  clientName?: string
  companyName?: string
  partnerName?: string
}

export function ClientPortalSidebar({ children, clientName = 'Client', companyName, partnerName }: ClientPortalSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await signOut()
    const loginPath = portalMode === 'client' ? '/login' : '/portal/client/login'
    router.push(loginPath)
    router.refresh()
  }

  // Check if current path matches nav item (handle both /portal/client and root paths)
  const isNavActive = (href: string) => {
    if (portalMode === 'client') {
      // In client mode, match against root paths
      return pathname === href || (href === '/' && pathname === '/portal/client')
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600">
                <ShieldAlert className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sidebar-foreground">Client Portal</span>
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

        {!collapsed && partnerName && (
          <div className="px-4 py-3 border-b border-sidebar-border bg-cyan-500/5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>Managed by</span>
            </div>
            <p className="text-sm font-medium text-cyan-600 mt-0.5">{partnerName}</p>
          </div>
        )}

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
                    ? "bg-cyan-500/10 text-cyan-600"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-cyan-600")} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

<div className="border-t border-sidebar-border p-4 space-y-3">
            <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-cyan-500/20 text-cyan-600 text-sm">
                  {clientName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium text-sidebar-foreground">{clientName}</span>
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
