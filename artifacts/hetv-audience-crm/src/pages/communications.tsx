import { MailCheck } from 'lucide-react';
import { useListCrmCommunications } from '@workspace/api-client-react';
import { PageHeading, State, Status, date, label, number } from '@/components/crm-ui';

export default function Communications() {
  const query = useListCrmCommunications();
  return <>
    <PageHeading eyebrow="03 / Delivery" title="Communications." description="See matched notification batches and their delivery status. Email sending is not enabled; pending records have not been sent."/>
    {query.isLoading ? <State kind="loading"/> : query.isError ? <State kind="error" title="Delivery records unavailable" retry={()=>query.refetch()}/> : !query.data?.length ? <State kind="empty" title="No communications recorded" detail="Matched notification batches will appear here after new roles or programmes are published. Email sending is not enabled."/> : <div className="surface"><div className="p-5 border-b rule flex justify-between items-center"><div className="flex items-center gap-3"><MailCheck size={18}/><span className="micro">NOTIFICATION QUEUE · SENDING DISABLED</span></div><span className="display text-xl font-semibold">{number(query.data.length)}</span></div>
      <div className="hidden md:grid grid-cols-[minmax(180px,2fr)_1fr_1fr_1fr_1fr] gap-4 p-5 py-3 border-b rule micro text-[#625d58]"><span>SUBJECT / CHANNEL</span><span>RECIPIENTS</span><span>CREATED</span><span>SENT</span><span>STATE</span></div>
      <div className="divide-y divide-[#c8c1b9]">{query.data.map(item=><div data-testid={`row-communication-${item.id}`} key={item.id} className="p-5 grid grid-cols-1 md:grid-cols-[minmax(180px,2fr)_1fr_1fr_1fr_1fr] gap-2 md:gap-4 items-center"><div><div className="text-sm font-semibold">{item.subject || 'Untitled notification'}</div><div className="micro !text-[9px] text-[#625d58] mt-1">{label(item.channel)}</div></div><span className="text-xs text-[#625d58]">{item.recipientCount === undefined ? 'Not recorded' : `${number(item.recipientCount)} recipients`}</span><span className="text-xs text-[#625d58]">{date(item.createdAt)}</span><span className="text-xs text-[#625d58]">{date(item.sentAt)}</span><div><Status value={item.status}/></div></div>)}</div>
    </div>}
  </>;
}