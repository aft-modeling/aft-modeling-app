import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: object) {
          req.cookies.set({ name, value, ...options } as any)
          res.cookies.set({ name, value, ...options } as any)
        },
        remove(name: string, options: object) {
          req.cookies.set({ name, value: '', ...options } as any)
          res.cookies.set({ name, value: '', ...options } as any)
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const isAuth = !!session
  const isAuthPage = req.nextUrl.pathname.startsWith('/login')
  const isPortalRoute = req.nextUrl.pathname.startsWith('/portal/')

  // Unauthenticated users go to login
  if (!isAuth && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Authenticated users on login page go to dashboard
  if (isAuth && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Portal access control: check if user has access to the portal
  if (isAuth && isPortalRoute && session) {
    const portalMatch = req.nextUrl.pathname.match(/^\/portal\/([^/]+)/)
    if (portalMatch) {
      const portalId = portalMatch[1]

      // Get user's role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      // Admins always have access to all portals
      if (profile?.role === 'admin') {
        return res
      }

      // Check portal access for non-admin users
      const { data: access } = await supabase
        .from('employee_portal_access')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('portal_id', portalId)
        .single()

      if (!access) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)'],
}
