'use client'
import '@/app/store'
import Sign from '@/app/components/Auth/sign'


export default function RootLayout({ children }) {
  return (
    <div className="log-layout">
      <Sign />
      {children}
    </div>
  );
}
