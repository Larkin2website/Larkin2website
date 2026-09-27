import { useEffect, useState } from 'react';
import { MailCheck } from 'lucide-react';
import {
  getCrmDeliverySettings, sendCrmCommunicationTest, useListCrmCommunications,
} from '@workspace/api-client-react';
import { PageHeading, State, Status, date, label, number } from '@/components/crm-ui';

export default function Communications() {
  const query = useListCrmCommunications();
  const [settings, setSettings] = useState<{ testReady: boolean; liveEnabled: boolean } | null>(null);
  const [settingsError, setSettingsError] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;
    void getCrmDeliverySettings()
      .then(value => { if (active) setSettings(value); })
      .catch(() => { if (active) setSettingsError(true); });
    return () => { active = false; };
  }, []);

  async function sendTest(id: string) {
    if (sendingId || !settings?.testReady) return;
    setSendingId(id);
    setFeedback('');
    try {
      await sendCrmCommunicationTest(id);
      setFeedback('Resend accepted the test email for the configured mailbox. No subscribers were emailed. Confirm inbox receipt separately.');
      await query.refetch();
    } catch {
      setFeedback('Test delivery could not be confirmed. Check the test inbox and sender configuration before retrying; no subscribers were targeted.');
      await query.refetch();
    } finally {
      setSendingId(null);
    }
  }

  return <>
    <PageHeading eyebrow="03 / Delivery" title="Communications."
      description="First publications create matched notification batches. Sent means Resend accepted the message, not inbox receipt. Tests go only to the approved mailbox; audience sending requires separate live approval." />
    <div className="surface p-5 mb-5 text-sm space-y-2">
      <p className="font-semibold">{settings?.liveEnabled ? 'Live audience delivery enabled' : 'Live audience delivery disabled'}</p>
      <p>{settings?.testReady
        ? 'Controlled test delivery is available. A test never marks subscriber messages as sent.'
        : 'Controlled test delivery is unavailable until an approved test mailbox and verified sender are configured.'}</p>
      {settingsError && <p role="alert">Delivery settings could not be loaded. Test sending is unavailable.</p>}
    </div>
    {feedback && <p role="status" className="surface p-4 mb-5">{feedback}</p>}
    {query.isLoading
      ? <State kind="loading" />
      : query.isError
        ? <State kind="error" title="Delivery records unavailable" retry={() => query.refetch()} />
        : !query.data?.length
          ? <State kind="empty" title="No communications recorded" detail="Matched notification batches appear after a new role or programme is first published. No subscriber email is sent while live delivery is disabled." />
          : <div className="surface">
            <div className="p-5 border-b rule flex justify-between items-center">
              <div className="flex items-center gap-3">
                <MailCheck size={18} />
                <span className="micro">NOTIFICATION QUEUE · {settings?.liveEnabled ? 'LIVE DELIVERY ON' : 'LIVE DELIVERY OFF'}</span>
              </div>
              <span className="display text-xl font-semibold">{number(query.data.length)}</span>
            </div>
            <div className="hidden md:grid grid-cols-[minmax(180px,2fr)_1fr_1fr_1fr_1fr] gap-4 p-5 py-3 border-b rule micro text-[#625d58]">
              <span>SUBJECT / CHANNEL</span><span>RECIPIENTS</span><span>CREATED</span><span>SENT</span><span>STATE</span>
            </div>
            <div className="divide-y divide-[#c8c1b9]">{query.data.map(item =>
              <div data-testid={`row-communication-${item.id}`} key={item.id}
                className="p-5 grid grid-cols-1 md:grid-cols-[minmax(180px,2fr)_1fr_1fr_1fr_1fr] gap-2 md:gap-4 items-start">
                <div>
                  <div className="text-sm font-semibold">{item.subject || 'Untitled notification'}</div>
                  <div className="micro !text-[9px] text-[#625d58] mt-1">{label(item.channel)}</div>
                  <button type="button" disabled={!settings?.testReady || !!sendingId} onClick={() => void sendTest(item.id)}
                    className="mt-3 text-xs underline disabled:opacity-50 disabled:no-underline">
                    {sendingId === item.id ? 'Sending test…' : 'Send controlled test'}
                  </button>
                  {item.testSentAt && <p className="mt-2 text-xs text-[#625d58]">Test accepted by Resend: {date(item.testSentAt)}. Inbox receipt not confirmed.</p>}
                  {item.testLastError && <p className="mt-2 text-xs text-red-700">Last test failed. No subscribers were emailed.</p>}
                </div>
                <span className="text-xs text-[#625d58]">
                  {item.recipientCount === undefined ? 'Not recorded' : `${number(item.recipientCount)} matched`}
                  {item.deliveryCounts && <span className="block mt-1">
                    {item.deliveryCounts.sent + item.deliveryCounts.delivered} accepted · {item.deliveryCounts.failed} failed · {item.deliveryCounts.pending + item.deliveryCounts.processing} waiting
                  </span>}
                </span>
                <span className="text-xs text-[#625d58]">{date(item.createdAt)}</span>
                <span className="text-xs text-[#625d58]">{date(item.sentAt)}</span>
                <div>
                  <Status value={item.status} />
                  {item.nextRetryAt && <span className="block mt-2 text-xs text-[#625d58]">Retry scheduled: {date(item.nextRetryAt)}</span>}
                  {item.status === 'failed' && !item.nextRetryAt && <span className="block mt-2 text-xs text-[#625d58]">No automatic retries remain.</span>}
                  {item.status === 'pending' && item.recipientCount === 0 && <span className="block mt-2 text-xs text-[#625d58]">No eligible recipients remain.</span>}
                </div>
              </div>,
            )}</div>
          </div>}
  </>;
}