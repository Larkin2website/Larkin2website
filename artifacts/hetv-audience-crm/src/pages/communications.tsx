import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import {
  getCrmDeliverySettings, sendCrmCommunicationTest, sendCrmPublicationSample, useListCrmCommunications,
  getListCrmCommunicationsQueryKey, getGetCrmEmailHealthQueryKey,
} from '@workspace/api-client-react';
import { BlockedSendDialog, EmailHealthDetails, extractBlocked, useEmailHealth, type BlockedSend } from '@/components/email-health';
import { PageHeading, State, Status, date, label, number } from '@/components/crm-ui';

export default function Communications() {
  const query = useListCrmCommunications({ query: { queryKey: getListCrmCommunicationsQueryKey(), refetchInterval: 30_000 } });
  const [settings, setSettings] = useState<{ testReady: boolean; liveEnabled: boolean; trackingReady: boolean } | null>(null);
  const [settingsError, setSettingsError] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sampleSending, setSampleSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [blocked, setBlocked] = useState<BlockedSend | null>(null);
  const health = useEmailHealth();
  const qc = useQueryClient();

  useEffect(() => {
    let active = true;
    const load = () => void getCrmDeliverySettings()
      .then(value => { if (active) { setSettings(value); setSettingsError(false); } })
      .catch(() => { if (active) setSettingsError(true); });
    load();
    const timer = setInterval(load, 60_000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, []);

  const settle = () => Promise.all([
    qc.invalidateQueries({ queryKey: getGetCrmEmailHealthQueryKey() }),
    qc.invalidateQueries({ queryKey: getListCrmCommunicationsQueryKey() }),
  ]);

  async function sendTest(id: string) {
    if (sendingId || !settings?.testReady) return;
    setSendingId(id);
    setFeedback('');
    try {
      await sendCrmCommunicationTest(id);
      setFeedback('Resend accepted the test email for the configured mailbox. No subscribers were emailed. Confirm inbox receipt separately.');
    } catch (error) {
      const b = extractBlocked(error);
      if (b) { setBlocked(b); setFeedback('Test not sent: email sending is currently blocked. No subscribers were targeted.'); }
      else setFeedback('Test delivery could not be confirmed. Check the test inbox and sender configuration before retrying; no subscribers were targeted.');
    } finally {
      setSendingId(null);
      void settle();
    }
  }

  async function sendSample() {
    if (sampleSending || !settings?.testReady) return;
    setSampleSending(true);
    setFeedback('');
    try {
      await sendCrmPublicationSample();
      setFeedback('Resend accepted or deduplicated the sample test. Only the configured mailbox was targeted. Confirm inbox receipt separately.');
    } catch (error) {
      const b = extractBlocked(error);
      if (b) { setBlocked(b); setFeedback('Sample not sent: email sending is currently blocked. No subscribers were targeted.'); }
      else setFeedback('Sample delivery could not be confirmed. Check the test inbox before retrying; no subscribers were targeted.');
    } finally {
      setSampleSending(false);
      void settle();
    }
  }

  return <>
    <PageHeading eyebrow="03 / Delivery" title="Communications."
      description="First publications create matched notification batches. Accepted means Resend accepted the message; delivered is confirmed by a provider event, not guaranteed inbox placement. Bounces and complaints stop future alerts. Tests go only to the approved mailbox." />
    <BlockedSendDialog blocked={blocked} billingUrl={health.data?.billingUrl} onClose={() => setBlocked(null)} />
    <EmailHealthDetails />
    <div className="surface p-5 mb-5 text-sm space-y-2">
      <p className="font-semibold">{settings?.liveEnabled ? 'Live audience delivery enabled' : 'Live audience delivery disabled'}</p>
      <p>{settings?.testReady
        ? 'Controlled test delivery is available. A test never marks subscriber messages as sent.'
        : 'Controlled test delivery is unavailable until an approved test mailbox and verified sender are configured.'}</p>
      {settings && !settings.trackingReady && <p role="status" className="text-[#874b39]">Provider event tracking is not configured. Accepted messages cannot yet be confirmed as delivered or bounced in this CRM.</p>}
      <button type="button" disabled={!settings?.testReady || sampleSending}
        onClick={() => void sendSample()}
        className="quiet-button disabled:opacity-50">
        {sampleSending ? 'Sending sample…' : 'Send sample test'}
      </button>
      <p className="text-xs text-[#625d58]">The sample works even with no publication batches. It contains no real role or programme and never uses the subscriber queue.</p>
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
                    {item.deliveryCounts.delivered} delivered · {item.deliveryCounts.sent} accepted, unconfirmed · {item.deliveryCounts.bounced} bounced · {item.deliveryCounts.complained} complaints · {item.deliveryCounts.failed - item.deliveryCounts.bounced - item.deliveryCounts.complained} other failures · {item.deliveryCounts.pending + item.deliveryCounts.processing} waiting
                  </span>}
                </span>
                <span className="text-xs text-[#625d58]">{date(item.createdAt)}</span>
                <span className="text-xs text-[#625d58]">{date(item.sentAt)}</span>
                <div>
                  <Status value={item.status} />
                  {item.nextRetryAt && <span className="block mt-2 text-xs text-[#625d58]">Retry scheduled: {date(item.nextRetryAt)}</span>}
                  {item.status === 'failed' && !item.nextRetryAt && <span className="block mt-2 text-xs text-[#625d58]">No automatic retries remain.</span>}
                  {!!item.deferredCount && <span data-testid={`text-deferred-${item.id}`} className="block mt-2 text-xs text-[#7a3a24]">{number(item.deferredCount)} deferred by email limits</span>}
                  {item.status === 'pending' && item.recipientCount === 0 && <span className="block mt-2 text-xs text-[#625d58]">No eligible recipients remain.</span>}
                </div>
              </div>,
            )}</div>
          </div>}
  </>;
}