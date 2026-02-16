"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  AuthUser, 
  PortalType, 
  getCRMUserAccess, 
  getPartnerUserAccess, 
  getClientUserAccess,
  signOut 
} from '@/lib/auth'

interface AuthContextType {
  user: User | null
  authUser: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authUser: null,
  loading: true,
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  children: ReactNode
  portalType: PortalType
}

export function AuthProvider({ children, portalType }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const portalMode = process.env.NEXT_PUBLIC_PORTAL_MODE

  const getLoginPath = () => {
    if (portalMode === 'partner') return '/login'
    if (portalMode === 'client') return '/login'
    if (portalMode === 'crm') return '/login'
    
    switch (portalType) {
      case 'partner': return '/portal/partner/login'
      case 'client': return '/portal/client/login'
      default: return '/login'
    }
  }

  const isLoginPage = () => {
    return pathname === '/login' || 
           pathname === '/portal/partner/login' || 
           pathname === '/portal/client/login'
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          setUser(null)
          setAuthUser(null)
          setLoading(false)
          
          // Redirect to login if not on login page
          if (!isLoginPage()) {
            router.push(getLoginPath())
          }
          return
        }

        setUser(session.user)

        // Get portal-specific access
        let access: AuthUser | null = null
        switch (portalType) {
          case 'crm':
            access = await getCRMUserAccess(session.user.id)
            break
          case 'partner':
            access = await getPartnerUserAccess(session.user.id)
            break
          case 'client':
            access = await getClientUserAccess(session.user.id)
            break
        }

        if (!access && !isLoginPage()) {
          // User doesn't have access to this portal
          router.push(getLoginPath())
        } else {
          setAuthUser(access)
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setAuthUser(null)
        router.push(getLoginPath())
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        // Re-check access
        let access: AuthUser | null = null
        switch (portalType) {
          case 'crm':
            access = await getCRMUserAccess(session.user.id)
            break
          case 'partner':
            access = await getPartnerUserAccess(session.user.id)
            break
          case 'client':
            access = await getClientUserAccess(session.user.id)
            break
        }
        setAuthUser(access)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [portalType, pathname])

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
    setAuthUser(null)
    router.push(getLoginPath())
  }

  return (
    <AuthContext.Provider value={{ user, authUser, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}
