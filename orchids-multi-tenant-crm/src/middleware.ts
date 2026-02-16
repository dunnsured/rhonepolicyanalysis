import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-middleware'

// Pages that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/portal/partner/login',
  '/portal/client/login',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths through without auth check
  if (PUBLIC_PATHS.some(p => pathname === p)) {
    const { response } = createMiddlewareClient(request)
    return response
  }

  const { supabase, response } = createMiddlewareClient(request)

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Determine which login page to redirect to based on path
    let loginPath = '/login'
    if (pathname.startsWith('/portal/partner')) {
      loginPath = '/portal/partner/login'
    } else if (pathname.startsWith('/portal/client')) {
      loginPath = '/portal/client/login'
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = loginPath
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
