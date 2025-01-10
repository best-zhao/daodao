import { NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0/edge';
// import { cookies } from 'next/headers'

export default async function middleware(req) {
  const { pathname } = req.nextUrl
  
  if (pathname.startsWith('/api/') ){
    //get user from auth0
    const session = await getSession();
    const { user } = session || {}
    const role = user?.role || []
    const is_admin = role.includes('admin')

    if (pathname.startsWith('/api/admin/') && !is_admin ){
      return Response.json({ errno: 401, info: 'Unauthorized' }, {status: 401})
    }

    const response = NextResponse.next()
    response.headers.set('session', JSON.stringify({
      user_id: user?.sub,      
      role,
      is_admin
    }))

    return response
  }
  
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!_next/static|_next/image|.*\\.png|.*\\.ico$).*)'],
};
