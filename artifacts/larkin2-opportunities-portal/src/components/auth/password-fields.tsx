import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/staff-auth";
import { authInput, authLabel } from "./auth-shell";

export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use no more than ${PASSWORD_MAX} characters.`;
  if (password !== confirm) return "The two passwords do not match.";
  return null;
}

export function NewPasswordFields({ password, confirm, onPassword, onConfirm, email }: {
  password: string; confirm: string; onPassword: (v: string) => void; onConfirm: (v: string) => void; email?: string;
}) {
  const [visible, setVisible] = useState(false);
  const type = visible ? "text" : "password";
  const tooShort = password.length > 0 && password.length < PASSWORD_MIN;
  const mismatch = confirm.length > 0 && confirm !== password;
  return (
    <>
      {email !== undefined && <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="new-password" className={authLabel}>New password</label>
          <button type="button" onClick={() => setVisible((v) => !v)} data-testid="button-toggle-password" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#625d58] hover:text-[#1d2020]">
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{visible ? "Hide" : "Show"}
          </button>
        </div>
        <Input id="new-password" name="new-password" type={type} autoComplete="new-password" required minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX}
          value={password} onChange={(e) => onPassword(e.target.value)} aria-describedby="password-policy" data-testid="input-new-password" className={authInput} />
        <p id="password-policy" className={`text-xs ${tooShort ? "text-[#9f2d2a]" : "text-[#625d58]"}`}>
          {PASSWORD_MIN}–{PASSWORD_MAX} characters. A long passphrase or a password-manager suggestion works well.
          {password.length > 0 && <span className="font-mono"> ({password.length})</span>}
        </p>
      </div>
      <div className="space-y-3">
        <label htmlFor="confirm-password" className={authLabel}>Confirm password</label>
        <Input id="confirm-password" name="confirm-password" type={type} autoComplete="new-password" required maxLength={PASSWORD_MAX}
          value={confirm} onChange={(e) => onConfirm(e.target.value)} data-testid="input-confirm-password" className={authInput} />
        {mismatch && <p className="text-xs text-[#9f2d2a]">The two passwords do not match yet.</p>}
      </div>
    </>
  );
}
