import type { ReactNode } from 'react';
import { useClerk } from '@clerk/react';
import { ArrowUpRight, ChartNoAxesCombined, ChevronRight, Inbox, LayoutDashboard, LogOut, MailCheck, PanelLeftClose, UsersRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { basePath } from '@/lib/clerk';

export function Brand({ light = false }: { light?: boolean }) {
  return <div className={`flex items-center gap-2 display font-bold text-xl tracking-[-.07em] ${light ? 'text-[#f4f1ed]' : 'text-[#1d2020]'}`}><span className="border border-[#f4773f] px-1.5 py-0.5 leading-none">HE<span className="text-[#f4773f]">TV</span></span><span className="text-[11px] tracking-[.15em] font-medium ml-2 uppercase">Hub</span></div>;
}
const navigation = [
  { href:'/', label:'Overview', icon:LayoutDashboard, sub:'01' },
  { href:'/audience', label:'Audience', icon:UsersRound, sub:'02' },
  { href:'/communications', label:'Communications', icon:MailCheck, sub:'03' },
  { href:'/enquiries', label:'Enquiries', icon:Inbox, sub:'04' },
];
export function Shell({ children, name }: { children:ReactNode; name?:string }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  return <div className="min-h-[100dvh] md:flex">
    <aside className="ink md:w-[250px] lg:w-[270px] md:shrink-0 md:min-h-[100dvh] flex flex-col">
      <div className="px-6 pt-7 pb-7 border-b border-[#34393a]"><Brand light /><div className="micro text-[#85898a] mt-8">Audience / Engagement</div><div className="text-xs text-[#a4a7a6] mt-1">Internal workspace</div></div>
      <div className="flex md:flex-col overflow-x-auto md:overflow-visible px-2 md:pt-7 md:flex-1" aria-label="Main navigation">
        <div className="hidden md:block micro text-[#777e7e] px-4 pb-3">Workspace</div>
        {navigation.map(({ href,label,icon:Icon,sub }) => <Link key={href} href={href} data-testid={`link-${label.toLowerCase()}`} className={`nav-link shrink-0 ${location===href || (href==='/audience' && location.startsWith('/audience/')) ? 'active' : ''}`}><Icon size={16} strokeWidth={1.7} /><span>{label}</span><span className="hidden lg:block ml-auto text-[10px] text-[#747c7d]">{sub}</span></Link>)}
      </div>
      <div className="hidden md:block border-t border-[#34393a] p-5"><div className="flex gap-3 items-center"><div className="h-9 w-9 bg-[#363c3d] grid place-items-center display text-sm">{name?.slice(0,2).toUpperCase() || 'ST'}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{name || 'Staff member'}</div><div className="micro text-[#85898a] !text-[9px] mt-1">Staff access</div></div><button data-testid="button-sign-out" aria-label="Sign out" title="Sign out" onClick={() => signOut({ redirectUrl:`${window.location.origin}${basePath}/sign-in` })} className="text-[#9ba2a2] hover:text-[#f4773f]"><LogOut size={16}/></button></div></div>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="h-[68px] border-b rule flex items-center justify-between px-5 sm:px-9 lg:px-12">
        <div className="flex items-center gap-3 micro text-[#625d58]"><PanelLeftClose size={16} className="hidden md:block" /><span>HETV HUB</span><ChevronRight size={12}/><span className="text-[#1d2020]">{location.startsWith('/audience/') ? 'AUDIENCE PROFILE' : navigation.find(n=>n.href===location)?.label.toUpperCase() || 'WORKSPACE'}</span></div>
        <div className="flex items-center gap-4"><span className="hidden sm:block micro text-[#625d58]">PRIVATE · STAFF ONLY</span><button data-testid="button-mobile-sign-out" title="Sign out" aria-label="Sign out" onClick={() => signOut({ redirectUrl:`${window.location.origin}${basePath}/sign-in` })} className="md:hidden"><LogOut size={17}/></button><div className="h-2 w-2 rounded-full bg-[#f4773f]" /></div>
      </header>
      <div className="max-w-[1520px] mx-auto px-5 sm:px-9 lg:px-12 py-9 lg:py-12">{children}</div>
    </main>
  </div>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow:string; title:string; description:string; action?:ReactNode }) {
  return <div className="mb-9 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5"><div><p className="micro text-[#b45024] mb-3">{eyebrow}</p><h1 className="display text-[clamp(36px,4vw,58px)] leading-[1.05] font-semibold">{title}</h1><p className="mt-3 text-sm text-[#625d58] max-w-[590px] leading-6">{description}</p></div>{action}</div>;
}
export function State({ kind, title, detail, retry }: { kind:'loading'|'error'|'empty'; title?:string; detail?:string; retry?:()=>void }) {
  if(kind==='loading') return <div aria-label="Loading data" className="surface p-7 space-y-5"><div className="skeleton h-4 w-36"/><div className="skeleton h-12 w-1/2"/><div className="skeleton h-4 w-3/4"/><div className="skeleton h-16 w-full"/></div>;
  return <div data-testid={`status-${kind}`} className="surface px-8 py-16 text-center"><div className="w-12 h-12 bg-[#e9e5df] mx-auto grid place-items-center mb-6">{kind==='error' ? <ChartNoAxesCombined size={22} className="text-[#b45024]"/> : <Inbox size={22} className="text-[#625d58]"/>}</div><h2 className="display text-2xl font-semibold">{title || (kind==='error'?'Unable to load this view':'Nothing here yet')}</h2><p className="text-sm leading-6 text-[#625d58] mt-3 max-w-md mx-auto">{detail || (kind==='error'?'The latest information could not be retrieved. Try again.':'There are no records to show right now.')}</p>{retry && <button data-testid="button-retry" onClick={retry} className="quiet-button mt-7">Try again <ArrowUpRight size={14}/></button>}</div>;
}
export const number = (n:number) => new Intl.NumberFormat('en-GB').format(n);
export const date = (v:string|null|undefined) => v ? new Intl.DateTimeFormat('en-GB',{ day:'numeric', month:'short', year:'numeric' }).format(new Date(v)) : 'Not recorded';
export const label = (v:string|null|undefined) => v ? v.replaceAll('_',' ').replace(/\b\w/g,s=>s.toUpperCase()) : 'Not specified';
export function Status({ value }: { value:string }) { const tone = ['active','delivered','resolved'].includes(value) ? 'bg-[#dbe5dc] text-[#365443]' : ['failed','closed','inactive'].includes(value) ? 'bg-[#eddcd6] text-[#874b39]' : 'bg-[#e8dfd2] text-[#775b3e]'; return <span data-testid={`status-${value}`} className={`inline-flex px-2.5 py-1 micro !tracking-[.08em] !text-[10px] ${tone}`}>{label(value)}</span>; }