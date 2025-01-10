import { handleAuth, handleCallback, handleLogout, handleLogin } from '@auth0/nextjs-auth0'
import { cookies } from 'next/headers'


export const GET = handleAuth({
  login: handleLogin((req) => {
    return { returnTo: '/log' };
  }),
  // logout: handleLogout((req) => {
  //   return { returnTo: '/api/auth/login' };
  // }),
  callback: handleCallback({ 
    // afterCallback: async (req, session, state)=>{
    //   const cookieStore = await cookies()
    //   return session;
    // }
  })
});