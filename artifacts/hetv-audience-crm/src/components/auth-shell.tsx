import { useState, type ReactNode } from 'react';
import { Brand } from '@/components/crm-ui';
import { PASSWORD_MAX, PASSWORD_MIN } from '@/lib/staff-auth';

export function AuthShell({ eyebrow = 'STAFF ACCESS', title, detail, children }: { eyebrow?: string; title: string; detail: string; children: ReactNode }) {
  return <div className="min-h-[100dvh] grid lg:grid-cols-[.9fr_1.1fr]">
    <section className="ink min-h-[340px] lg:min-h-[100dvh] flex flex-col justify-between p-8 sm:p-12 lg:p-16"><Brand light/><div className="my-16 max-w-lg"><div className="micro text-[#f4773f] mb-7">AUDIENCE & ENGAGEMENT / HETV HUB</div><h1 className="display text-5xl sm:text-6xl xl:text-7xl leading-[1.02] font-medium">Closer to<br/>the people<br/><span className="text-[#f4773f]">we serve.</span></h1><p className="text-[#aaaeaa] text-sm leading-7 mt-8 max-w-sm">Audience insight, delivery visibility and subscriber enquiries. Manage your audience and communications in one place.</p></div><div className="border-t border-[#373d3e] pt-5 micro text-[#85898a]">HETV / AUDIENCE & ENGAGEMENT</div></section>
    <section className="flex items-center justify-center p-6 sm:p-12 lg:p-16"><div className="w-full max-w-[440px]"><div className="micro text-[#b45024] mb-6">{eyebrow}</div><h2 className="display text-3xl sm:text-4xl font-semibold mb-3">{title}</h2><p className="text-sm leading-6 text-[#625d58] mb-8">{detail}</p><div className="border-t rule pt-8">{children}</div><p className="text-xs leading-5 text-[#625d58] mt-10">Need help accessing your workspace? Contact your administrator.</p></div></section>
  </div>;
}

export function Notice({ tone, title, children, testId }: { tone:'error'|'success'|'info'; title?:string; children:ReactNode; testId?:string }) {
  const style = tone==='error' ? 'border-[#b45024] bg-[#b45024]/10 text-[#7d3415]' : tone==='success' ? 'border-[#4f7a5a] bg-[#4f7a5a]/10 text-[#2f5238]' : 'border-[#c8c1b9] bg-[#ebe5dd] text-[#1d2020]';
  return <div role={tone==='error'?'alert':'status'} data-testid={testId} className={`border p-4 text-sm leading-6 ${style}`}>{title && <p className="micro mb-1">{title}</p>}{children}</div>;
}

export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use no more than ${PASSWORD_MAX} characters.`;
  if (password !== confirm) return 'The two passwords do not match.';
  return null;
}

export function NewPasswordFields({ password, confirm, onPassword, onConfirm }: { password:string; confirm:string; onPassword:(v:string)=>void; onConfirm:(v:string)=>void }) {
  const [visible, setVisible] = useState(false);
  const type = visible ? 'text' : 'password';
  return <>
    <div><div className="flex items-center justify-between mb-2"><label htmlFor="new-password" className="micro">New password</label><button type="button" data-testid="button-toggle-password" onClick={() => setVisible(v => !v)} className="micro text-[#625d58] hover:text-[#1d2020]">{visible ? 'Hide' : 'Show'}</button></div>
      <input id="new-password" name="new-password" type={type} autoComplete="new-password" required minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} value={password} onChange={e => onPassword(e.target.value)} aria-describedby="password-policy" data-testid="input-new-password" className="input h-12" />
      <p id="password-policy" className={`text-xs mt-2 ${password.length>0 && password.length<PASSWORD_MIN ? 'text-[#b45024]' : 'text-[#625d58]'}`}>{PASSWORD_MIN}–{PASSWORD_MAX} characters. A long passphrase or a password-manager suggestion works well.{password.length>0 && ` (${password.length})`}</p></div>
    <div><label htmlFor="confirm-password" className="micro block mb-2">Confirm password</label>
      <input id="confirm-password" name="confirm-password" type={type} autoComplete="new-password" required maxLength={PASSWORD_MAX} value={confirm} onChange={e => onConfirm(e.target.value)} data-testid="input-confirm-password" className="input h-12" />
      {confirm.length>0 && confirm!==password && <p className="text-xs mt-2 text-[#b45024]">The two passwords do not match yet.</p>}</div>
  </>;
}
