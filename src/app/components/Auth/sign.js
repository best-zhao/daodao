'use client';
import { useUser } from '@auth0/nextjs-auth0/client'


const Page = () => {
  const { user, error, isLoading } = useUser();
  if (isLoading) return <div>Loading...</div>;
  // if (error) return <div>{error.message}</div>;
  // console.log(user)

  if (user) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <img src={user.user_metadata?.avatar || user.picture} alt='' height={36} style={{ borderRadius: '100%' }} />
        {user.nickname} <a href="/api/auth/logout?returnTo=/">Logout</a>
      </span>
    );
  }

  return <a href="/api/auth/login?returnTo=/log">Login</a>;
};

export default Page;
