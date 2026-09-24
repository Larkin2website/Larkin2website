import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateCrmEnquiry, useListCrmEnquiries, useUpdateCrmEnquiry, getListCrmEnquiriesQueryKey, type CrmEnquiryStatus } from '@workspace/api-client-react';
import { PageHeading, State, Status, date, label, number } from '@/components/crm-ui';

const statuses:CrmEnquiryStatus[] = ['new','open','in_progress','resolved','closed'];
export default function Enquiries() {
  const query = useListCrmEnquiries();
  const client = useQueryClient();
  const update = useUpdateCrmEnquiry();
  const create = useCreateCrmEnquiry();
  const [failure,setFailure] = useState<string|null>(null);
  const [busyId,setBusyId] = useState<string|null>(null);
  const [showForm,setShowForm] = useState(false);
  const [entry,setEntry] = useState({name:'',email:'',subject:'',source:'',message:''});
  const record = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailure(null);
    try {
      await create.mutateAsync({data:entry});
      await client.invalidateQueries({queryKey:getListCrmEnquiriesQueryKey()});
      setEntry({name:'',email:'',subject:'',source:'',message:''});
      setShowForm(false);
    } catch {
      setFailure('The enquiry could not be recorded. Please try again.');
    }
  };
  const change = async (id:string, status:CrmEnquiryStatus) => {
    setFailure(null); setBusyId(id);
    try { await update.mutateAsync({id,data:{status}}); await client.invalidateQueries({queryKey:getListCrmEnquiriesQueryKey()}); }
    catch { setFailure('The status could not be saved. Please try again.'); }
    finally { setBusyId(null); }
  };
  return <>
    <PageHeading eyebrow="04 / Subscriber support" title="Enquiries." description="Keep track of questions from the HETV community and mark their progress as they are handled."/>
    <div className="mb-5 flex items-center justify-between gap-4">
      <p className="text-sm text-[#625d58]">Received a question by email? Record it here for staff to follow up through the existing contact address.</p>
      <button type="button" className="orange-button shrink-0" onClick={()=>setShowForm(value=>!value)}>{showForm?'Cancel':'Record enquiry'}</button>
    </div>
    {showForm && <form onSubmit={record} className="surface p-5 sm:p-7 mb-6 grid gap-4 sm:grid-cols-2">
      <div><label className="micro block mb-2" htmlFor="enquiry-name">Name</label><input className="input" id="enquiry-name" maxLength={160} value={entry.name} onChange={e=>setEntry({...entry,name:e.target.value})}/></div>
      <div><label className="micro block mb-2" htmlFor="enquiry-email">Email</label><input className="input" id="enquiry-email" type="email" required maxLength={254} value={entry.email} onChange={e=>setEntry({...entry,email:e.target.value})}/></div>
      <div><label className="micro block mb-2" htmlFor="enquiry-subject">Subject</label><input className="input" id="enquiry-subject" maxLength={250} value={entry.subject} onChange={e=>setEntry({...entry,subject:e.target.value})}/></div>
      <div><label className="micro block mb-2" htmlFor="enquiry-source">Source</label><input className="input" id="enquiry-source" maxLength={120} placeholder="e.g. Contact email" value={entry.source} onChange={e=>setEntry({...entry,source:e.target.value})}/></div>
      <div className="sm:col-span-2"><label className="micro block mb-2" htmlFor="enquiry-message">Message</label><textarea className="input min-h-28" id="enquiry-message" required maxLength={5000} value={entry.message} onChange={e=>setEntry({...entry,message:e.target.value})}/></div>
      <div className="sm:col-span-2"><button className="orange-button" type="submit" disabled={create.isPending}>{create.isPending?'Recording…':'Save enquiry'}</button></div>
    </form>}
    {failure && <div data-testid="status-enquiry-update-error" role="alert" className="bg-[#eddcd6] text-[#874b39] border border-[#d7afa0] p-4 mb-5 text-sm">{failure}<button data-testid="button-dismiss-error" className="ml-4 underline" onClick={()=>setFailure(null)}>Dismiss</button></div>}
    {query.isLoading ? <State kind="loading"/> : query.isError ? <State kind="error" title="Enquiries unavailable" retry={()=>query.refetch()}/> : !query.data?.length ? <State kind="empty" title="No enquiries yet" detail="Record an enquiry received through the contact address to begin."/> : <div className="surface">
      <div className="p-5 border-b rule flex justify-between items-center"><span className="micro">INCOMING ENQUIRIES</span><strong className="display text-xl">{number(query.data.length)}</strong></div>
      <div className="divide-y divide-[#c8c1b9]">{query.data.map(item=><article data-testid={`row-enquiry-${item.id}`} key={item.id} className="p-5 lg:p-7 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_190px] gap-6">
        <div><div className="flex flex-wrap items-center gap-3 mb-3"><Status value={item.status}/><span className="micro text-[#625d58] !text-[9px]">{date(item.createdAt)}</span></div><h2 className="display text-xl font-semibold">{item.subject || 'No subject'}</h2><div className="text-xs text-[#625d58] mt-2">{item.name || 'Name not provided'} · {item.email}{item.source ? ` · ${item.source}` : ''}</div><p className="text-sm leading-6 mt-5 whitespace-pre-wrap break-words max-w-[770px]">{item.message}</p></div>
        <div className="lg:border-l lg:pl-6 rule lg:flex lg:flex-col lg:justify-start"><label htmlFor={`enquiry-${item.id}`} className="micro text-[#625d58] block mb-3">UPDATE STATUS</label><select id={`enquiry-${item.id}`} data-testid={`select-enquiry-status-${item.id}`} className="input" value={item.status} disabled={busyId===item.id} onChange={e=>change(item.id,e.target.value as CrmEnquiryStatus)}>{statuses.map(s=><option key={s} value={s}>{label(s)}</option>)}</select>{busyId===item.id && <span className="text-xs text-[#625d58] mt-2">Saving status…</span>}</div>
      </article>)}</div>
    </div>}
  </>;
}