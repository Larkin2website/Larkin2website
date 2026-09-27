import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { useGetCrmAudienceMember, getGetCrmAudienceMemberQueryKey } from '@workspace/api-client-react';
import { PageHeading, State, Status, date, label } from '@/components/crm-ui';

function Detail({ title, value }: { title:string; value:string|null|undefined }) { return <div className="py-4 border-b rule flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-6"><dt className="micro text-[#625d58]">{title}</dt><dd className="text-sm sm:text-right break-words m-0">{value || 'Not specified'}</dd></div>; }
function Tags({ values }: { values:string[] }) { return values.length ? <div className="flex flex-wrap gap-2">{values.map(v=><span key={v} className="border border-[#c8c1b9] bg-[#e9e5df] px-3 py-1.5 text-xs">{label(v)}</span>)}</div> : <p className="text-sm text-[#625d58]">Not specified</p>; }

export default function Profile() {
  const { id='' } = useParams<{id:string}>();
  const query = useGetCrmAudienceMember(id,{ query:{ enabled:!!id, queryKey:getGetCrmAudienceMemberQueryKey(id) } });
  const p = query.data;
  return <>
    <Link href="/audience" data-testid="link-back-audience" className="inline-flex items-center gap-2 micro text-[#625d58] mb-8 hover:text-[#b45024]"><ArrowLeft size={15}/> BACK TO AUDIENCE</Link>
    {query.isLoading ? <State kind="loading"/> : query.isError ? <State kind="error" title="Profile unavailable" detail="This subscriber may no longer be available, or your access may have changed." retry={()=>query.refetch()}/> : !p ? <State kind="empty" title="Profile not found"/> : <>
       <PageHeading eyebrow="02 / Private subscriber profile" title={p.name || 'Subscriber profile'} description="The preferences and registration details shared by this audience member." action={<Status value={p.deliverySuppression || (p.active?'active':'inactive')}/>}/>
       {p.deliverySuppression && <p role="status" className="surface p-4 mb-5 text-sm text-[#874b39]">Future alerts stopped: provider reported a {p.deliverySuppression === 'bounce' ? 'bounce' : 'spam complaint'} for this address.</p>}
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-5">
        <div className="space-y-5">
          <section className="surface p-6 lg:p-8"><p className="micro text-[#b45024] mb-4">PERSONAL DETAILS</p><h2 className="display text-2xl font-semibold mb-4">At a glance</h2><dl><Detail title="EMAIL" value={p.email}/><Detail title="NAME" value={p.name}/><Detail title="CRAFT" value={p.craft}/><Detail title="CAREER LEVEL" value={p.careerLevel ? label(p.careerLevel):null}/><Detail title="LOCATION" value={p.location}/></dl></section>
          <section className="surface p-6 lg:p-8"><p className="micro text-[#b45024] mb-4">CONTENT PREFERENCES</p><h2 className="display text-2xl font-semibold mb-6">What matters to them</h2><div className="space-y-6"><div><h3 className="micro text-[#625d58] mb-3">INTERESTS</h3><Tags values={p.interests}/></div><div><h3 className="micro text-[#625d58] mb-3">CONTENT TYPES</h3><Tags values={p.contentTypes}/></div><div><h3 className="micro text-[#625d58] mb-3">CAREER LEVELS</h3><Tags values={p.careerLevels}/></div><div><h3 className="micro text-[#625d58] mb-3">CRAFTS</h3><Tags values={p.crafts}/></div><div className="border-t rule pt-5 flex justify-between gap-4 text-sm"><span>All opportunities</span><strong className="display">{p.allOpportunities?'Yes':'No'}</strong></div></div></section>
        </div>
        <div className="space-y-5">
          <section className="ink p-6 lg:p-8"><p className="micro text-[#f4773f]">REGISTRATION RECORD</p><h2 className="display text-2xl font-semibold mt-3 mb-8">How they joined</h2><div className="space-y-6"><div className="border-t border-[#3b4142] pt-4"><span className="micro text-[#929997]">ACQUISITION SOURCE</span><div className="text-lg display mt-2">{label(p.acquisitionSource)}</div></div><div className="border-t border-[#3b4142] pt-4"><span className="micro text-[#929997]">SOURCE DETAIL</span><div className="text-sm mt-2 break-words">{p.acquisitionDetail || 'Not recorded'}</div></div><div className="border-t border-[#3b4142] pt-4"><span className="micro text-[#929997]">CONSENT RECORDED</span><div className="text-sm mt-2">{date(p.consentedAt)}</div></div></div></section>
          <section className="surface p-6 lg:p-8"><div className="flex items-start gap-4 border-b rule pb-5"><CalendarDays size={20} strokeWidth={1.5}/><div><p className="micro text-[#625d58] mb-2">JOINED HETV</p><div className="display text-xl">{date(p.createdAt)}</div></div></div><div className="flex items-start gap-4 pt-5"><MapPin size={20} strokeWidth={1.5}/><div><p className="micro text-[#625d58] mb-2">LOCATION</p><div className="text-sm">{p.location || 'Not specified'}</div></div></div></section>
          <p className="text-xs leading-5 text-[#625d58] px-1">Private audience information. Use only to understand and serve subscribers.</p>
        </div>
      </div>
    </>}
  </>;
}