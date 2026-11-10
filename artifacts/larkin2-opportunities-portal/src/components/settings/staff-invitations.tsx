import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { MailPlus, RotateCw, Ban, KeyRound } from "lucide-react";
import {
  getListPortalMembersQueryKey,
  getListStaffInvitationsQueryKey,
  useCreateStaffInvitation,
  useListStaffInvitations,
  useResendStaffInvitation,
  useRevokeStaffInvitation,
  type PortalMember,
  type StaffInvitation,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/lib/staff-auth";

const statusText: Record<StaffInvitation["status"], string> = {
  pending: "Invitation pending",
  accepted: "Password set",
  expired: "Invitation expired",
  revoked: "Invitation revoked",
};
const statusTone: Record<StaffInvitation["status"], string> = {
  pending: "text-amber-600",
  accepted: "text-emerald-600",
  expired: "text-[#85898a]",
  revoked: "text-destructive",
};
const deliveryText: Record<StaffInvitation["deliveryStatus"], string> = {
  queued: "Email queued",
  accepted: "Accepted by mail provider (inbox receipt not confirmed)",
  deferred: "Delivery deferred, provider retrying",
  failed: "Email delivery failed",
};

/** Invitations, newest first as returned by the API, with the latest per member. */
export function useStaffInvitations(enabled: boolean) {
  const query = useListStaffInvitations({ query: { enabled, queryKey: getListStaffInvitationsQueryKey() } });
  const latestByMember = useMemo(() => {
    const map = new Map<string, StaffInvitation>();
    for (const invitation of query.data ?? []) {
      if (!map.has(invitation.memberId)) map.set(invitation.memberId, invitation);
    }
    return map;
  }, [query.data]);
  return { ...query, latestByMember };
}

export function useInvitationActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const create = useCreateStaffInvitation();
  const resend = useResendStaffInvitation();
  const revoke = useRevokeStaffInvitation();
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getListStaffInvitationsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getListPortalMembersQueryKey() }),
  ]);

  const describeSent = (invitation: StaffInvitation) =>
    invitation.deliveryStatus === "failed"
      ? `The invitation was created for ${invitation.email}, but the email failed${invitation.lastError ? `: ${invitation.lastError}` : "."} Try resending.`
      : `Invitation for ${invitation.email} is ${deliveryText[invitation.deliveryStatus].toLowerCase()}. It expires ${format(new Date(invitation.expiresAt), "MMM d, HH:mm")}.`;

  const invite = async (memberId: string) => {
    try {
      const invitation = await create.mutateAsync({ data: { memberId } });
      await refresh();
      toast({ title: invitation.deliveryStatus === "failed" ? "Invitation not delivered" : "Invitation sent", description: describeSent(invitation), variant: invitation.deliveryStatus === "failed" ? "destructive" : undefined });
      return invitation;
    } catch (error) {
      await refresh();
      throw error;
    }
  };

  const inviteWithToast = async (memberId: string) => {
    try { await invite(memberId); } catch (error) {
      toast({ title: "Could not send invitation", description: errorMessage(error) ?? "Try again shortly.", variant: "destructive" });
    }
  };

  const resendInvitation = async (id: string) => {
    try {
      const invitation = await resend.mutateAsync({ id });
      await refresh();
      toast({ title: invitation.deliveryStatus === "failed" ? "Resend not delivered" : "Invitation resent", description: describeSent(invitation), variant: invitation.deliveryStatus === "failed" ? "destructive" : undefined });
    } catch (error) {
      await refresh();
      toast({ title: "Could not resend invitation", description: errorMessage(error) ?? "Try again shortly.", variant: "destructive" });
    }
  };

  const revokeInvitation = async (invitation: StaffInvitation) => {
    if (!window.confirm(`Revoke the pending invitation for ${invitation.email}? The emailed link will stop working immediately.`)) return;
    try {
      await revoke.mutateAsync({ id: invitation.id });
      await refresh();
      toast({ title: "Invitation revoked", description: "The link can no longer be used to set a password." });
    } catch (error) {
      toast({ title: "Could not revoke invitation", description: errorMessage(error) ?? "Try again shortly.", variant: "destructive" });
    }
  };

  return {
    invite,
    inviteWithToast,
    resendInvitation,
    revokeInvitation,
    busy: create.isPending || resend.isPending || revoke.isPending,
  };
}

type Actions = ReturnType<typeof useInvitationActions>;

export function MemberCredentialStatus({ member, latest, actions, isSelf }: {
  member: PortalMember; latest?: StaffInvitation; actions: Actions; isSelf: boolean;
}) {
  // Legacy memberships can carry a userId without credentials; only hasPassword is authoritative.
  const hasCredentials = (member as PortalMember & { hasPassword?: boolean }).hasPassword === true || latest?.status === "accepted";
  const pending = latest?.status === "pending" ? latest : undefined;
  const btn = "h-9 px-3 rounded-none font-mono text-[10px] uppercase tracking-widest border border-[#2a2f31]";

  return (
    <div className="flex flex-col gap-2 min-w-0" data-testid={`status-credentials-${member.id}`}>
      {hasCredentials && !pending ? (
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-emerald-600">
          <KeyRound className="w-3.5 h-3.5 shrink-0" /> Password set
        </span>
      ) : latest ? (
        <div className="space-y-1 min-w-0">
          <span className={`block text-[10px] uppercase tracking-widest font-bold ${statusTone[latest.status]}`}>{statusText[latest.status]}</span>
          {latest.status === "pending" && (
            <>
              <span className={`block text-xs ${latest.deliveryStatus === "failed" ? "text-destructive" : "text-[#85898a]"}`}>{deliveryText[latest.deliveryStatus]}</span>
              {latest.lastError && <span className="block text-xs text-destructive break-words">{latest.lastError}</span>}
              <span className="block text-xs text-[#85898a]">Expires {format(new Date(latest.expiresAt), "MMM d, yyyy HH:mm")}</span>
            </>
          )}
        </div>
      ) : (
        <span className="text-[10px] uppercase tracking-widest font-bold text-[#85898a]">No password yet</span>
      )}

      {!isSelf && (
        <div className="flex flex-wrap gap-2">
          {pending ? (
            <>
              <Button variant="ghost" disabled={actions.busy} onClick={() => actions.resendInvitation(pending.id)} data-testid={`button-resend-invitation-${member.id}`} className={btn}>
                <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Resend
              </Button>
              <Button variant="ghost" disabled={actions.busy} onClick={() => actions.revokeInvitation(pending)} data-testid={`button-revoke-invitation-${member.id}`} className={`${btn} text-destructive hover:text-destructive`}>
                <Ban className="w-3.5 h-3.5 mr-1.5" /> Revoke
              </Button>
            </>
          ) : !hasCredentials && member.status !== "suspended" ? (
            <Button variant="ghost" disabled={actions.busy} onClick={() => actions.inviteWithToast(member.id)} data-testid={`button-invite-${member.id}`} className={btn}>
              <MailPlus className="w-3.5 h-3.5 mr-1.5" /> {latest ? "Send new invitation" : "Send invitation"}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function InvitationHistory({ invitations, isLoading, isError, retry }: {
  invitations?: StaffInvitation[]; isLoading: boolean; isError: boolean; retry: () => void;
}) {
  return (
    <div className="bg-[#171b1d] border border-[#2a2f31] min-w-0">
      <div className="pb-4 pt-6 px-4 sm:px-6 border-b border-[#2a2f31]">
        <h2 className="font-mono text-lg uppercase tracking-widest font-medium">Invitation History</h2>
        <p className="text-xs text-[#85898a] mt-2">Newest first. Provider acceptance means the mail service took the message; it does not confirm the email reached an inbox.</p>
      </div>
      {isLoading ? (
        <div className="p-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-10 bg-[#101315] animate-pulse" />)}</div>
      ) : isError ? (
        <div className="p-8 text-center text-sm text-[#85898a]">
          Invitation history could not be loaded.
          <Button variant="ghost" onClick={retry} data-testid="button-retry-invitations" className="ml-3 h-9 rounded-none font-mono text-[10px] uppercase tracking-widest border border-[#2a2f31]">Try again</Button>
        </div>
      ) : !invitations?.length ? (
        <div className="p-10 text-center text-sm text-[#85898a]">No invitations have been sent yet. Grant access above to invite a team member.</div>
      ) : (
        <ul className="divide-y divide-[#2a2f31]">
          {invitations.map((invitation) => (
            <li key={invitation.id} data-testid={`row-invitation-${invitation.id}`} className="px-4 sm:px-6 py-4 grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] md:items-center">
              <span className="text-sm break-all">{invitation.email}</span>
              <span className={`text-[10px] uppercase tracking-widest font-bold ${statusTone[invitation.status]}`}>{statusText[invitation.status]}</span>
              <span className={`text-xs break-words ${invitation.deliveryStatus === "failed" ? "text-destructive" : "text-[#85898a]"}`}>
                {deliveryText[invitation.deliveryStatus]}{invitation.lastError ? ` — ${invitation.lastError}` : ""}
              </span>
              <span className="text-xs text-[#85898a] whitespace-nowrap">
                {invitation.status === "pending" ? "Expires " : "Expiry "}{format(new Date(invitation.expiresAt), "MMM d, yyyy")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
