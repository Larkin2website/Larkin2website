import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const external = import.meta.env.VITE_AUTH_PROVIDER === 'external';
const key = external ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  : publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const proxyUrl = external ? undefined : import.meta.env.VITE_CLERK_PROXY_URL;
export const clerkAvailable = Boolean(key);

function CacheGuard() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (previous.current !== undefined && previous.current !== id) client.clear();
    previous.current = id;
  }), [addListener, client]);
  return null;
}

export function StaffClerkProvider({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  if (!key) return <div className="min-h-[100dvh] flex items-center justify-center p-6"><div className="surface max-w-md p-8"><p className="micro text-[#b45024]">Configuration required</p><h1 className="display text-3xl mt-5">Staff sign-in is unavailable.</h1><p className="text-sm leading-6 mt-4 text-[#625d58]">This workspace is closed until its Clerk publishable key is configured. No audience data has been loaded.</p></div></div>;
  const strip = (url: string) => basePath && url.startsWith(basePath) ? url.slice(basePath.length) || '/' : url;
  return <ClerkProvider publishableKey={key} proxyUrl={proxyUrl} signInUrl={`${basePath}/sign-in`} appearance={{ cssLayerName:'clerk', variables:{ colorPrimary:'#f4773f', colorForeground:'#1d2020', colorMutedForeground:'#625d58', colorBackground:'#f4f1ed', colorInput:'#e9e5df', fontFamily:"'DM Sans', sans-serif", borderRadius:'0px' }, elements:{ cardBox:'!shadow-none !rounded-none', card:'!shadow-none !rounded-none', formButtonPrimary:'!rounded-none', formFieldInput:'!rounded-none' } }} routerPush={to => navigate(strip(to))} routerReplace={to => navigate(strip(to), { replace:true })}>
    <CacheGuard />{children}
  </ClerkProvider>;
}