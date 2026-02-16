import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/portal/partner/login',
  '/portal/client/login',
  '/api/webhook', // Allow webhook callbacks without auth
]

// Check if path starts with any public route
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes and static assets
  if (
    isPublicRoute(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Create a response to modify
  const res = NextResponse.next()

  // Create Supabase client for middleware
  const supabase = createMiddlewareClient({ req: request, res })

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session, redirect to appropriate login page
  if (!session) {
    // Determine which login page based on the route
    let loginPath = '/login'
    if (pathname.startsWith('/portal/partner')) {
      loginPath = '/portal/partner/login'
    } else if (pathname.startsWith('/portal/client')) {
      loginPath = '/portal/client/login'
    }

    const redirectUrl = new URL(loginPath, request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
