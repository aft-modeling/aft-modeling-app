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

  if (!isAuth && !isAuthPage) {
        return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuth && isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
