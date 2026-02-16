"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldAlert, Loader2, AlertCircle } from 'lucide-react'
import { signIn, getClientUserAccess } from '@/lib/auth'

const portalMode = process.env.NEXT_PUBLIC_PORTAL_MODE

export default function ClientLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await signIn(email, password)
      
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Login failed. Please try again.')
        setLoading(false)
        return
      }

      // Verify user has Client Portal access
      const userAccess = await getClientUserAccess(data.user.id)
      if (!userAccess) {
        setError('You do not have access to the Client Portal. Please contact your administrator.')
        setLoading(false)
        return
      }

      // Redirect to client dashboard
      const dashboardPath = portalMode === 'client' ? '/' : '/portal/client'
      router.push(dashboardPath)
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600 mb-4">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Client Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your security dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need access? Contact your service provider.
        </p>
      </Card>
    </div>
  )
}
