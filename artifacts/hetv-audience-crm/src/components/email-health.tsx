import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, CircleHelp, Clock3, X } from 'lucide-react';
import { getGetCrmEmailHealthQueryKey, useGetCrmEmailHealth, type CrmEmailHealth } from '@workspace/api-client-react';

export function useEmailHealth() {
  return useGetCrmEmailHealth({ query: { queryKey: getGetCrmEmailHealthQueryKey(), refetchInterval: 30_000, refetchOnWindowFocus: true, retry: false } });
}

const when = (v: string | null | undefined) => v ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(v)) : null;
function age(v: string | null, now: number) {
  if (!v) return 'never synced';
  const mins = Math.max(0, Math.round((now - new Date(v).getTime()) / 60_000));
  if (mins < 1) return 'synced just now';
  if (mins < 60) return `synced ${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `synced ${h} h ago` : `synced ${Math.round(h / 24)} days ago`;
}

const titles: Record<CrmEmailHealth['status'], string> = {
  ready: 'Email sending available',
  warning: 'Email quota running low',
  daily_limit: 'Daily email limit reached',
  monthly_limit: 'Monthly email limit reached',
  rate_limited: 'Email provider is throttling requests',
  unconfigured: 'Email sending is not configured',
  unavailable: 'Email provider unavailable',
  stale: 'Quota information is out of date',
  unknown: 'Quota status unknown',
};
const tone = (s: CrmEmailHealth['status']) =>
  s === 'ready' ? 'border-[#9fb5a4] bg-[#e4ebe3] text-[#2f4a3a]'
  : s === 'unknown' || s === 'stale' ? 'border-[#b9b2c4] bg-[#e7e3ea] text-[#4a4258]'
  : s === 'warning' ? 'border-[#d2b48a] bg-[#f1e6d3] text-[#6e4f27]'
  : 'border-[#d29a83] bg-[#f2dfd6] text-[#7a3a24]';

function windowText(w: CrmEmailHealth['daily'], synced: boolean, kind: string) {
  if (w.limit === null) return synced ? `${w.used.toLocaleString('en-GB')} used · no ${kind} cap` : `${w.used.toLocaleString('en-GB')} used · cap unknown`;
  return `${w.used.toLocaleString('en-GB')} / ${w.limit.toLocaleString('en-GB')} used${w.remaining !== null ? ` · ${w.remaining.toLocaleString('en-GB')} left` : ''}`;
}

const noticeText: Record<CrmEmailHealth['adminNotice'], string> = {
  not_configured: 'Admin alert email not configured',
  waiting: 'Admin alert waiting to send',
  accepted: 'Admin alert accepted by provider (inbox receipt unconfirmed)',
  unavailable: 'Admin alert could not be sent',
};

/** Persistent strip rendered in the Shell. Hidden only when status is ready with nothing deferred. */
export function EmailHealthBanner() {
  const q = useEmailHealth();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  if (q.isLoading) return null;
  if (q.isError || !q.data) return <div role="status" data-testid="banner-email-health-error" className="border-b border-[#b9b2c4] bg-[#e7e3ea] text-[#4a4258] px-5 sm:px-9 lg:px-12 py-2.5 text-xs flex items-center gap-2"><CircleHelp size={14} aria-hidden="true" />Email health could not be checked. Treat sending capacity as unknown.<button type="button" data-testid="button-retry-email-health" onClick={() => void q.refetch()} className="underline ml-1">Retry</button></div>;
  const h = q.data;
  if (h.status === 'ready' && h.deferredCount === 0) return null;
  const reset = when(h.retryAt);
  return <div role={h.status === 'warning' || h.status === 'unknown' || h.status === 'stale' ? 'status' : 'alert'} data-testid={`banner-email-health-${h.status}`}
    className={`border-b px-5 sm:px-9 lg:px-12 py-2.5 text-xs flex flex-wrap items-center gap-x-4 gap-y-1 ${tone(h.status)}`}>
    <span className="flex items-center gap-2 font-semibold">{h.status === 'unknown' ? <CircleHelp size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}{titles[h.status]}</span>
    <span className="opacity-90">{h.message}</span>
    {h.deferredCount > 0 && <span data-testid="text-deferred-count" className="micro !text-[9px]">{h.deferredCount.toLocaleString('en-GB')} alerts deferred</span>}
    {reset && <span className="flex items-center gap-1"><Clock3 size={12} aria-hidden="true" />Retry from {reset}</span>}
    <span className="opacity-70 sm:ml-auto">{age(h.lastSyncedAt, now)}</span>
  </div>;
}

/** Detailed quota panel for Communications. */
export function EmailHealthDetails() {
  const q = useEmailHealth();
  const [now] = useState(() => Date.now());
  if (q.isLoading) return <div className="surface p-5 mb-5"><div className="skeleton h-4 w-40" /><div className="skeleton h-10 w-full mt-4" /></div>;
  if (q.isError || !q.data) return <div className="surface p-5 mb-5 text-sm" role="status">Email quota could not be loaded; capacity is unknown. <button type="button" data-testid="button-retry-email-details" className="underline" onClick={() => void q.refetch()}>Retry</button></div>;
  const h = q.data;
  const synced = !!h.lastSyncedAt && h.status !== 'unknown';
  const cells: [string, string, string | null][] = [
    ['Today', windowText(h.daily, synced, 'daily'), when(h.daily.resetsAt)],
    ['This month', windowText(h.monthly, synced, 'monthly'), when(h.monthly.resetsAt)],
  ];
  return <section aria-labelledby="email-quota-title" data-testid="panel-email-quota" className="surface mb-5">
    <div className="p-5 border-b rule flex flex-wrap items-center justify-between gap-3">
      <div><p className="micro text-[#625d58]">EMAIL CAPACITY</p><h2 id="email-quota-title" className="display text-xl font-semibold mt-1">{titles[h.status]}</h2></div>
      <span className={`border px-2.5 py-1 micro !text-[10px] ${tone(h.status)}`}>{h.status.replace('_', ' ')}</span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#c8c1b9]">
      {cells.map(([k, v, r]) => <div key={k} className="p-5"><p className="micro !text-[9px] text-[#625d58]">{k}</p><p className="text-sm font-semibold mt-2">{v}</p><p className="text-xs text-[#625d58] mt-1">{r ? `Resets ${r}` : 'Reset time not reported'}</p></div>)}
      <div className="p-5"><p className="micro !text-[9px] text-[#625d58]">Deferred alerts</p><p data-testid="text-quota-deferred" className="display text-2xl font-semibold mt-1">{h.deferredCount.toLocaleString('en-GB')}</p><p className="text-xs text-[#625d58] mt-1">{h.retryAt ? `Next attempt ${when(h.retryAt)}` : 'No retry scheduled'}</p></div>
      <div className="p-5"><p className="micro !text-[9px] text-[#625d58]">Sync / admin alert</p><p className="text-sm font-semibold mt-2">{age(h.lastSyncedAt, now)}</p><p className="text-xs text-[#625d58] mt-1">{noticeText[h.adminNotice]}</p></div>
    </div>
    <p className="px-5 py-3 border-t rule text-xs text-[#625d58]">{h.message} Account usage may include external or inbound mail and conservative reservations. Acceptance does not confirm inbox delivery.</p>
  </section>;
}

export type BlockedSend = { code: string; message: string; retryAt?: string | null; billingUrl?: string };

export function extractBlocked(error: unknown): BlockedSend | null {
  const e = error as { status?: number; data?: unknown } | null;
  if (!e || (e.status !== 503 && e.status !== 429)) return null;
  const d = (e.data && typeof e.data === 'object' ? e.data : {}) as { error?: unknown; code?: unknown; retryAt?: unknown };
  return {
    code: typeof d.code === 'string' ? d.code : e.status === 429 ? 'rate_limited' : 'unavailable',
    message: typeof d.error === 'string' ? d.error : 'Email sending is temporarily blocked.',
    retryAt: typeof d.retryAt === 'string' ? d.retryAt : null,
  };
}

function guidance(code: string, billing?: string): { title: string; body: string; upgrade: boolean } {
  if (code.includes('daily')) return { title: 'Daily sending limit reached', body: 'Wait for the daily allowance to reset, or upgrade the email plan if this happens regularly.', upgrade: !!billing };
  if (code.includes('monthly') || code.includes('quota')) return { title: 'Monthly sending limit reached', body: 'Subscriber and test sending is paused; some capacity may be reserved for essential mail. Upgrade the email plan to send more now, or wait for the monthly reset.', upgrade: !!billing };
  if (code.includes('rate')) return { title: 'Sending too quickly', body: 'The provider is throttling requests. Wait a moment and retry; no plan change is needed.', upgrade: false };
  if (code.includes('config') || code.includes('sender') || code.includes('domain')) return { title: 'Email configuration incomplete', body: 'The sender, domain or test mailbox needs to be configured before sending. Ask the technical owner to review delivery settings.', upgrade: false };
  if (code === 'unknown') return { title: 'Email acceptance needs review', body: 'Do not resend blindly. Ask the technical owner to reconcile the provider record before another attempt.', upgrade: false };
  if (code === 'stale') return { title: 'Email usage needs refreshing', body: 'Sending is paused until the account allowance can be confirmed. Wait for the next usage check.', upgrade: false };
  return { title: 'Email provider unavailable', body: 'Delivery could not be confirmed. Check the test inbox and provider record before retrying.', upgrade: false };
}

export function BlockedSendDialog({ blocked, billingUrl, onClose }: { blocked: BlockedSend | null; billingUrl?: string; onClose: () => void }) {
  const g = blocked ? guidance(blocked.code, billingUrl) : null;
  return <Dialog.Root open={!!blocked} onOpenChange={o => { if (!o) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-[#171b1d]/50" />
      <Dialog.Content data-testid="dialog-send-blocked" className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md surface p-7 shadow-[0_20px_60px_-20px_rgba(23,27,29,.45)]">
        <p className="micro text-[#b45024]">TEST DELIVERY NOT CONFIRMED</p>
        <Dialog.Title className="display text-2xl font-semibold mt-3">{g?.title}</Dialog.Title>
        <Dialog.Description className="text-sm leading-6 text-[#625d58] mt-3">{blocked?.message} {g?.body} No subscribers were emailed.</Dialog.Description>
        {blocked?.retryAt && <p className="text-xs mt-3 flex items-center gap-1.5"><Clock3 size={13} aria-hidden="true" />Earliest retry: {when(blocked.retryAt)}</p>}
        <div className="flex flex-wrap gap-3 mt-7">
          {g?.upgrade && billingUrl && <a data-testid="link-email-billing" href={billingUrl} target="_blank" rel="noreferrer" className="orange-button">Review email plan</a>}
          <Dialog.Close data-testid="button-close-blocked" className="quiet-button">Understood</Dialog.Close>
        </div>
        <Dialog.Close aria-label="Close" className="absolute right-4 top-4 text-[#625d58] hover:text-[#1d2020]"><X size={16} /></Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
