import { ArrowUpRight, MoveDownRight } from 'lucide-react';
import { Link } from 'wouter';
import { useGetCrmDashboard } from '@workspace/api-client-react';
import { PageHeading, State, Status, date, number, label } from '@/components/crm-ui';

export default function Dashboard() {
  const query = useGetCrmDashboard();
  const data = query.data;
  return <>
    <PageHeading eyebrow="01 / Audience intelligence" title="At a glance." description="A clear view of who has joined HETV, how they found us, and whether our updates are reaching them." action={<span className="micro text-[#625d58] border-l border-[#bdb5ad] pl-4 py-2">LIVE WORKSPACE DATA</span>} />
    {query.isLoading ? <State kind="loading"/> : query.isError ? <State kind="error" title="Insights are unavailable" retry={()=>query.refetch()} /> : !data ? <State kind="empty"/> : <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px border border-[#c8c1b9] bg-[#c8c1b9]">
        <div className="ink p-6 lg:p-8 sm:col-span-1"><div className="micro text-[#9b9e9d]">TOTAL AUDIENCE</div><div data-testid="value-total-audience" className="display text-6xl lg:text-7xl mt-5 font-medium">{number(data.counts.total)}</div><p className="text-xs text-[#9b9e9d] mt-4">All subscriber records</p></div>
        <div className="surface !border-0 p-6 lg:p-8"><div className="micro text-[#625d58]">ACTIVE SUBSCRIBERS</div><div data-testid="value-active-audience" className="display text-6xl lg:text-7xl mt-5 font-medium">{number(data.counts.active)}</div><p className="text-xs text-[#625d58] mt-4">Eligible for future updates</p></div>
        <div className="surface !border-0 p-6 lg:p-8"><div className="micro text-[#625d58]">INACTIVE</div><div data-testid="value-inactive-audience" className="display text-6xl lg:text-7xl mt-5 font-medium">{number(data.counts.inactive)}</div><p className="text-xs text-[#625d58] mt-4">No longer active</p></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-5 mt-6">
        <section className="surface p-6 lg:p-8"><div className="flex justify-between items-start border-b rule pb-5"><div><p className="micro text-[#b45024]">DISCOVERY</p><h2 className="display text-2xl font-semibold mt-2">Where they found us</h2></div><MoveDownRight size={21} strokeWidth={1.5}/></div>
          {data.acquisitionBreakdown.length ? <div className="mt-6 space-y-5">{data.acquisitionBreakdown.map((item,i) => <div key={`${item.source}-${i}`}><div className="flex justify-between text-sm mb-2"><span>{label(item.source) === 'Not specified' ? 'Unattributed' : label(item.source)}</span><span className="display font-semibold">{number(item.count)}</span></div><div className="h-[6px] bg-[#ded9d1]"><div className="h-full bg-[#f4773f]" style={{width:`${Math.min(100,data.counts.total ? item.count/data.counts.total*100 : 0)}%`}}/></div></div>)}</div> : <p className="text-sm text-[#625d58] py-8">Acquisition sources have not been recorded yet.</p>}
          <div className="border-t rule mt-7 pt-5"><h3 className="micro text-[#625d58]">SPECIFIC GROUPS & ACCOUNTS</h3>
            {data.acquisitionDetailBreakdown.length ? <div className="mt-4 divide-y divide-[#ded9d1]">{data.acquisitionDetailBreakdown.map((item, index) => <div data-testid="row-acquisition-detail" key={`${item.source}-${item.detail}-${index}`} className="flex justify-between items-start gap-4 py-3 text-sm"><div className="min-w-0"><div className="font-medium break-words">{item.detail}</div><div className="text-xs text-[#625d58] mt-1">{label(item.source)}</div></div><strong className="display shrink-0">{number(item.count)}</strong></div>)}</div> : <p className="text-sm text-[#625d58] mt-4">No specific sources have been recorded yet.</p>}
          </div>
        </section>
        <section className="ink p-6 lg:p-8"><p className="micro text-[#f4773f]">ENGAGEMENT</p><h2 className="display text-2xl font-semibold mt-2 mb-8">What people are exploring</h2><div className="grid grid-cols-2 gap-x-6 gap-y-8">
          {([['Content views',data.engagement.views],['Apply link clicks',data.engagement.applications],['Role views',data.engagement.roleViews],['Programme views',data.engagement.programmeViews]] as const).map(([title,value])=><div key={title} className="border-t border-[#3b4142] pt-4"><div data-testid={`value-${title.toLowerCase().replaceAll(' ','-')}`} className="display text-4xl font-medium">{number(value)}</div><div className="text-xs text-[#9fa3a1] mt-2">{title}</div></div>)}
        </div></section>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[.9fr_1.1fr] gap-5 mt-5">
        <section className="surface p-6 lg:p-8"><div className="flex justify-between items-center border-b rule pb-5"><div><p className="micro text-[#b45024]">DELIVERY STATUS</p><h2 className="display text-2xl font-semibold mt-2">Notification queue</h2></div><Link href="/communications" data-testid="link-communications-detail" className="quiet-button">View log <ArrowUpRight size={14}/></Link></div><p className="text-xs text-[#625d58] mt-4">Email sending is not enabled. Pending means matched, not sent.</p><div className="grid grid-cols-2 gap-x-5 mt-5">{([['Delivered',data.delivery.delivered],['Sent',data.delivery.sent],['Pending',data.delivery.pending],['Failed',data.delivery.failed]] as const).map(([name,value])=><div key={name} className="py-4 border-b rule flex justify-between items-center"><span className="text-sm">{name}</span><strong className="display text-xl">{number(value)}</strong></div>)}</div></section>
        <section className="surface p-6 lg:p-8"><div className="flex justify-between items-center border-b rule pb-5"><div><p className="micro text-[#b45024]">LATEST ARRIVALS</p><h2 className="display text-2xl font-semibold mt-2">Recent registrations</h2></div><Link href="/audience" data-testid="link-all-audience" className="quiet-button">View audience <ArrowUpRight size={14}/></Link></div>
          {data.recentRegistrations.length ? <div className="divide-y divide-[#c8c1b9]">{data.recentRegistrations.map(person=><Link key={person.subscriberId} href={`/audience/${encodeURIComponent(person.subscriberId)}`} data-testid={`link-member-${person.subscriberId}`} className="row-link py-4 flex items-center gap-4"><div className="h-9 w-9 bg-[#dfd8d0] grid place-items-center display text-sm shrink-0">{(person.name || person.email).slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{person.name || person.email}</div><div className="text-xs text-[#625d58] truncate">{person.name ? person.email : label(person.craft)}</div></div><span className="hidden sm:block text-xs text-[#625d58]">{date(person.createdAt)}</span><Status value={person.active?'active':'inactive'}/></Link>)}</div> : <p className="text-sm text-[#625d58] py-8">No registrations yet.</p>}
        </section>
      </div>
    </>}
  </>;
}