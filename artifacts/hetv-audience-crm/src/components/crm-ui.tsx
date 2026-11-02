import { useState, type ReactNode } from 'react';
import { ArrowUpRight, ChartNoAxesCombined, ChevronRight, Inbox, LayoutDashboard, LogOut, MailCheck, PanelLeftClose, PanelLeftOpen, UsersRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { crmTestAccessLabel } from '@/lib/demo-mode';
import { EmailHealthBanner } from '@/components/email-health';

export function Brand({ light = false }: { light?: boolean }) {
  return <div className={`flex items-center gap-2 display font-bold text-xl tracking-[-.07em] ${light ? 'text-[#f4f1ed]' : 'text-[#1d2020]'}`}><span className="border border-[#f4773f] px-1.5 py-0.5 leading-none">HE<span className="text-[#f4773f]">TV</span></span><span className="text-[11px] tracking-[.15em] font-medium ml-2 uppercase">Hub</span></div>;
}
const navigation = [
  { href:'/', label:'Overview', icon:LayoutDashboard, sub:'01' },
  { href:'/audience', label:'Audience', icon:UsersRound, sub:'02' },
  { href:'/communications', label:'Communications', icon:MailCheck, sub:'03' },
  { href:'/enquiries', label:'Enquiries', icon:Inbox, sub:'04' },
];
const sidebarStorageKey = 'hetv-crm-sidebar-collapsed';
export function Shell({ children, name, onSignOut, development = false }: { children:ReactNode; name?:string; onSignOut:()=>void; development?:boolean }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return window.localStorage.getItem(sidebarStorageKey) === 'true'; }
    catch { return false; }
  });
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { window.localStorage.setItem(sidebarStorageKey, String(next)); }
    catch { /* Browsing without storage still supports the current session. */ }
  };
  return <div className="min-h-[100dvh] md:flex">
    <aside className={`ink flex flex-col md:sticky md:top-0 md:h-dvh md:self-start md:shrink-0 ${collapsed ? 'md:w-[72px]' : 'md:w-[250px] lg:w-[270px]'}`}>
      <div className={`border-b border-[#34393a] px-6 pt-7 pb-7 md:shrink-0 ${collapsed ? 'md:px-3 md:pt-5 md:pb-4' : ''}`}>
        <div className={collapsed ? 'md:hidden' : ''}><Brand light /></div>
        {collapsed && <div className="hidden md:flex h-9 items-center justify-center border border-[#f4773f] text-sm font-bold display" aria-label="HETV Hub" title="HETV Hub">HE<span className="text-[#f4773f]">TV</span></div>}
        <div className={collapsed ? 'md:hidden' : ''}>
          <div className="micro text-[#85898a] mt-8">Audience / Engagement</div>
          <div className="text-xs text-[#a4a7a6] mt-1">Internal workspace</div>
        </div>
        <button type="button" data-testid="button-toggle-sidebar" onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} aria-controls="crm-navigation"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`hidden md:flex items-center justify-center gap-2 mt-5 min-h-9 text-xs text-[#a4a7a6] hover:text-[#f4f1ed] ${collapsed ? 'w-full' : ''}`}>
          {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
      <nav id="crm-navigation" className={`flex overflow-x-auto px-2 md:min-h-0 md:flex-1 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:pt-7 ${collapsed ? 'md:px-2 md:pt-5' : ''}`} aria-label="Main navigation">
        {!collapsed && <div className="hidden md:block micro text-[#777e7e] px-4 pb-3">Workspace</div>}
        {navigation.map(({ href,label,icon:Icon,sub }) => <Link key={href} href={href}
          aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined}
          aria-current={location===href || (href==='/audience' && location.startsWith('/audience/')) ? 'page' : undefined}
          data-testid={`link-${label.toLowerCase()}`}
          className={`nav-link shrink-0 ${collapsed ? 'md:justify-center md:gap-0 md:px-0' : ''} ${location===href || (href==='/audience' && location.startsWith('/audience/')) ? 'active' : ''}`}>
          <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
          <span className={collapsed ? 'md:sr-only' : ''}>{label}</span>
          {!collapsed && <span className="hidden lg:block ml-auto text-[10px] text-[#747c7d]">{sub}</span>}
        </Link>)}
      </nav>
      <div className={`hidden md:block border-t border-[#34393a] md:shrink-0 ${collapsed ? 'p-3' : 'p-5'}`}>
        <div className={`flex gap-3 items-center ${collapsed ? 'flex-col' : ''}`}>
          <div className="h-9 w-9 shrink-0 bg-[#363c3d] grid place-items-center display text-sm" title={name || 'Staff member'}>{name?.slice(0,2).toUpperCase() || 'ST'}</div>
          {!collapsed && <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{name || 'Staff member'}</div><div className="micro text-[#85898a] !text-[9px] mt-1">Staff access</div></div>}
          <button data-testid="button-sign-out" aria-label="Sign out" title="Sign out" onClick={onSignOut} className="grid h-9 w-9 shrink-0 place-items-center text-[#9ba2a2] hover:text-[#f4773f]"><LogOut size={16}/></button>
        </div>
      </div>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="h-[68px] border-b rule flex items-center justify-between px-5 sm:px-9 lg:px-12">
        <div className="flex items-center gap-3 micro text-[#625d58]"><span>HETV HUB</span><ChevronRight size={12}/><span className="text-[#1d2020]">{location.startsWith('/audience/') ? 'AUDIENCE PROFILE' : navigation.find(n=>n.href===location)?.label.toUpperCase() || 'WORKSPACE'}</span></div>
        <div className="flex items-center gap-4"><span className={`micro ${development ? 'text-[#b45024]' : 'hidden sm:block text-[#625d58]'}`}>{development ? crmTestAccessLabel : 'PRIVATE · STAFF ONLY'}</span><button data-testid="button-mobile-sign-out" title="Sign out" aria-label="Sign out" onClick={onSignOut} className="md:hidden"><LogOut size={17}/></button><div className="h-2 w-2 rounded-full bg-[#f4773f]" /></div>
      </header>
      <EmailHealthBanner />
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
const acquisitionSourceLabels: Record<string,string> = {
  instagram:'Instagram',
  linkedin:'LinkedIn',
  whatsapp_group:'WhatsApp group',
  facebook_group:'Facebook group',
  industry_network:'Industry organisation/network',
  recommendation:'Recommendation / word of mouth',
  other:'Other',
};
export const acquisitionSourceLabel = (v:string|null|undefined) => v ? acquisitionSourceLabels[v] || label(v) : 'Not specified';
const websitePurposeLabels: Record<string,string> = {
  roles_self:'Find roles for myself',
  training_self:'Find training for myself',
  share_network:'Share opportunities with my network',
  on_behalf:'Find opportunities on someone else’s behalf',
  industry_interest:'Keep up with industry opportunities',
  other:'Other',
};
export const websitePurposeLabel = (v:string|null|undefined) => v ? websitePurposeLabels[v] || label(v) : 'Not specified';
export function Status({ value }: { value:string }) { const tone = ['active','delivered','resolved'].includes(value) ? 'bg-[#dbe5dc] text-[#365443]' : ['failed','closed','inactive','bounce','complaint'].includes(value) ? 'bg-[#eddcd6] text-[#874b39]' : 'bg-[#e8dfd2] text-[#775b3e]'; return <span data-testid={`status-${value}`} className={`inline-flex px-2.5 py-1 micro !tracking-[.08em] !text-[10px] ${tone}`}>{label(value)}</span>; }