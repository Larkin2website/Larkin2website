import { useState } from 'react';
import { ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { Link } from 'wouter';
import { useGetCrmTaxonomy, useListCrmAudience, type CareerLevel, type AudienceContentType } from '@workspace/api-client-react';
import { PageHeading, State, Status, acquisitionSourceLabel, date, label, number } from '@/components/crm-ui';

export default function Audience() {
  const [search,setSearch] = useState('');
  const [active,setActive] = useState('');
  const [source,setSource] = useState('');
  const [career,setCareer] = useState('');
  const [content,setContent] = useState('');
  const [segment,setSegment] = useState('');
  const params = { search:search.trim() || undefined, active:active ? active==='active' : undefined, source:source || undefined, careerLevel:career ? career as CareerLevel : undefined, contentType:content ? content as AudienceContentType : undefined };
  const query = useListCrmAudience(params);
  const taxonomy = useGetCrmTaxonomy();
  const filtered = !!(search || active || source || career || content || segment);
  const visiblePeople = query.data?.filter(person => {
    const hasOpportunityPreferences = person.contentTypes.some(type => ['role','programme','training'].includes(type));
    const personSegment = person.allOpportunities ? 'all' : hasOpportunityPreferences ? 'preferences' : 'general';
    return !segment || segment === personSegment;
  });
  return <>
    <PageHeading eyebrow="02 / People" title="The audience." description="Understand the people who have chosen to hear from HETV. Profiles are private and only visible to authorised staff."/>
    <div className="surface p-5 lg:p-6 mb-5"><div className="flex items-center gap-2 micro text-[#625d58] mb-4"><SlidersHorizontal size={15}/> FILTER AUDIENCE</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(5,minmax(120px,1fr))] gap-3">
        <div className="relative"><Search size={17} className="absolute top-3.5 left-3.5 text-[#625d58]"/><input data-testid="input-search-audience" aria-label="Search audience" className="input !pl-10" placeholder="Search name or email" value={search} maxLength={120} onChange={e=>setSearch(e.target.value)}/></div>
        <select data-testid="select-active" aria-label="Subscription status" className="input" value={active} onChange={e=>setActive(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select data-testid="select-source" aria-label="Acquisition source" className="input" value={source} onChange={e=>setSource(e.target.value)}><option value="">All sources</option>{taxonomy.data?.acquisitionSources.map(v=><option key={v} value={v}>{acquisitionSourceLabel(v)}</option>)}</select>
        <select data-testid="select-career" aria-label="Career level" className="input" value={career} onChange={e=>setCareer(e.target.value)}><option value="">All levels</option>{taxonomy.data?.careerLevels.map(v=><option key={v} value={v}>{label(v)}</option>)}</select>
        <select data-testid="select-content" aria-label="Content type" className="input" value={content} onChange={e=>setContent(e.target.value)}><option value="">All content</option>{taxonomy.data?.contentTypes.map(v=><option key={v} value={v}>{label(v)}</option>)}</select>
         <select data-testid="select-segment" aria-label="Audience preference segment" className="input" value={segment} onChange={e=>setSegment(e.target.value)}><option value="">All preference segments</option><option value="general">General only</option><option value="preferences">Opportunity preferences</option><option value="all">All opportunities</option></select>
      </div>
      {taxonomy.isError && <p data-testid="status-taxonomy-error" className="text-xs text-[#a34e31] mt-3">Filter options could not load. <button data-testid="button-retry-taxonomy" className="underline" onClick={()=>taxonomy.refetch()}>Retry</button></p>}
      {filtered && <button data-testid="button-clear-filters" className="text-xs text-[#a44e2b] mt-4 inline-flex items-center gap-1 hover:underline" onClick={()=>{setSearch('');setActive('');setSource('');setCareer('');setContent('');setSegment('');}}><X size={13}/> Clear filters</button>}
    </div>
    {query.isLoading ? <State kind="loading"/> : query.isError ? <State kind="error" title="Audience could not be loaded" retry={()=>query.refetch()} /> : !visiblePeople?.length ? <State kind="empty" title={filtered?'No matching people':'No subscribers yet'} detail={filtered?'Try broadening your search or removing a filter.':'Subscriber profiles will appear here once people join.'}/> : <div className="surface">
      <div className="flex justify-between items-center p-5 border-b rule"><div className="micro text-[#625d58]">PEOPLE IN VIEW</div><span data-testid="value-audience-results" className="display text-xl font-semibold">{number(visiblePeople.length)}</span></div>
      <div className="hidden lg:grid grid-cols-[minmax(240px,2fr)_1fr_1fr_1fr_1fr_100px_20px] gap-4 py-3 px-5 micro text-[#625d58] border-b rule"><span>PERSON</span><span>CRAFT</span><span>SOURCE</span><span>JOINED</span><span>PREFERENCE SEGMENT</span><span>STATUS</span><span/></div>
      <div className="divide-y divide-[#c8c1b9]">{visiblePeople.map(person=>{
        const hasOpportunityPreferences = person.contentTypes.some(type => ['role','programme','training'].includes(type));
        const audienceSegment = person.allOpportunities ? 'All opportunities' : hasOpportunityPreferences ? 'Opportunity preferences' : 'General only';
        return <Link key={person.subscriberId} href={`/audience/${encodeURIComponent(person.subscriberId)}`} data-testid={`link-audience-${person.subscriberId}`} className="row-link grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(240px,2fr)_1fr_1fr_1fr_1fr_100px_20px] items-center gap-4 px-5 py-4">
        <div className="flex gap-3 items-center min-w-0"><div className="h-10 w-10 shrink-0 grid place-items-center bg-[#e2dbd2] display text-base">{(person.name || person.email).slice(0,1).toUpperCase()}</div><div className="min-w-0"><div className="font-semibold text-sm truncate">{person.name || 'Name not provided'}</div><div className="text-xs text-[#625d58] truncate mt-1">{person.email}</div></div></div>
        <span className="hidden lg:block text-xs truncate">{label(person.craft)}</span><span className="hidden lg:block text-xs truncate">{acquisitionSourceLabel(person.acquisitionSource)}</span><span className="hidden lg:block text-xs">{date(person.createdAt)}</span><span className="hidden lg:block text-xs">{audienceSegment}</span><Status value={person.deliverySuppression || (person.active?'active':'inactive')}/><ArrowRight size={15} className="hidden lg:block text-[#8c837b]"/>
      </Link>})}</div>
    </div>}
  </>;
}