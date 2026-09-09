import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListPortalMembers, useUpdatePortalMember, useGetPortalSession, PortalRole, PortalMember, getListPortalMembersQueryKey, useListPortalOpportunityOptions, useRenamePortalOpportunityOption, useRetirePortalOpportunityOption, useRestorePortalOpportunityOption, useMergePortalOpportunityOption, getListPortalOpportunityOptionsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ShieldAlert, ShieldCheck, UserCog, UserX, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/brand";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { data: session, isLoading: sessionLoading } = useGetPortalSession();
  const { data: members, isLoading: membersLoading, refetch } = useListPortalMembers({
    query: { 
      enabled: session?.member?.role === "super_admin",
      queryKey: getListPortalMembersQueryKey()
    }
  });
  
  const updateMember = useUpdatePortalMember();
  const { data: managedOptions, isLoading: optionsLoading } = useListPortalOpportunityOptions(
    { includeRetired: true },
    {
      query: {
        enabled: session?.member?.role === "super_admin",
        queryKey: getListPortalOpportunityOptionsQueryKey({ includeRetired: true }),
      },
    },
  );
  const renameOption = useRenamePortalOpportunityOption();
  const retireOption = useRetirePortalOpportunityOption();
  const restoreOption = useRestorePortalOpportunityOption();
  const mergeOption = useMergePortalOpportunityOption();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [renameLabels, setRenameLabels] = useState<Record<string, string>>({});
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  
  if (sessionLoading || membersLoading || optionsLoading) {
    return <div className="p-16 text-center text-muted-foreground font-mono text-xs uppercase tracking-wider animate-pulse break-words">Loading settings...</div>;
  }
  
  if (session?.member?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 px-4 break-words min-w-0">
        <ShieldAlert className="w-16 h-16 text-destructive shrink-0" />
        <h1 className="font-mono text-3xl font-medium tracking-tight break-words">Access Denied</h1>
        <p className="text-muted-foreground max-w-md leading-relaxed text-sm break-words">
          You do not have permission to access the portal settings. This area is restricted to super administrators.
        </p>
      </div>
    );
  }

  const handleUpdateRole = async (userId: string, newRole: PortalRole, currentActive: boolean) => {
    try {
      await updateMember.mutateAsync({
        userId: userId,
        data: { role: newRole, active: currentActive }
      });
      toast({ title: "Role updated", description: "The member's role has been saved." });
      refetch();
    } catch (e) {
      toast({ title: "Error", description: "Failed to update role.", variant: "destructive" });
    }
  };

  const handleToggleActive = async (member: PortalMember) => {
    try {
      await updateMember.mutateAsync({
        userId: member.userId,
        data: { role: member.role, active: !member.active }
      });
      toast({ 
        title: member.active ? "Account suspended" : "Account activated", 
        description: `The user account has been ${member.active ? 'suspended' : 'activated'}.` 
      });
      refetch();
    } catch (e) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  const renderRoleSelect = (member: PortalMember) => (
    <Select
      disabled={member.userId === session.member.userId}
      value={member.role}
      onValueChange={(val) => handleUpdateRole(member.userId, val as PortalRole, member.active)}
    >
      <SelectTrigger className="w-full xl:w-[180px] h-11 xl:h-9 rounded-none bg-[#101315] border-[#2a2f31] font-mono text-[10px] uppercase tracking-wider min-w-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#171b1d] border-[#2a2f31] rounded-none">
        <SelectItem value="viewer" className="font-mono text-[10px] uppercase tracking-wider break-words">Viewer</SelectItem>
        <SelectItem value="opportunity_manager" className="font-mono text-[10px] uppercase tracking-wider break-words">Opportunity Manager</SelectItem>
        <SelectItem value="super_admin" className="font-mono text-[10px] uppercase tracking-wider break-words">Super Admin</SelectItem>
      </SelectContent>
    </Select>
  );

  const renderAction = (member: PortalMember) => (
    <Button
      variant="ghost"
      disabled={member.userId === session.member.userId}
      onClick={() => handleToggleActive(member)}
      className={`w-full xl:w-auto h-11 xl:h-9 px-4 justify-center xl:justify-start rounded-none font-mono text-[10px] uppercase tracking-widest shrink-0 ${
        member.active
          ? "text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/20 xl:border-transparent"
          : "text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20 xl:border-transparent"
      }`}
    >
      {member.active ? (
        <><UserX className="w-3.5 h-3.5 mr-2 shrink-0" /> Suspend</>
      ) : (
        <><UserCog className="w-3.5 h-3.5 mr-2 shrink-0" /> Activate</>
      )}
    </Button>
  );

  const invalidateOptions = () => queryClient.invalidateQueries({
    queryKey: getListPortalOpportunityOptionsQueryKey(),
  });

  const handleRenameOption = async (id: string, label: string) => {
    try {
      await renameOption.mutateAsync({ id, data: { label } });
      await invalidateOptions();
      toast({ title: "Option renamed", description: "Historical opportunity labels were not changed." });
    } catch (error: any) {
      toast({ title: "Could not rename option", description: error?.data?.error || "Please try a different name.", variant: "destructive" });
    }
  };

  const handleRetireOption = async (id: string) => {
    if (!window.confirm("Retire this category? It will remain on existing opportunities but cannot be selected for new ones.")) return;
    try {
      await retireOption.mutateAsync({ id });
      await invalidateOptions();
      toast({ title: "Option retired", description: "It remains visible on opportunities that already use it." });
    } catch (error: any) {
      toast({ title: "Could not retire option", description: error?.data?.error || "Please try again.", variant: "destructive" });
    }
  };

  const handleRestoreOption = async (id: string) => {
    try {
      await restoreOption.mutateAsync({ id });
      await invalidateOptions();
      toast({ title: "Option restored", description: "It is available for new opportunities again." });
    } catch (error: any) {
      toast({ title: "Could not restore option", description: error?.data?.error || "Please try again.", variant: "destructive" });
    }
  };

  const handleMergeOption = async (id: string, targetId: string) => {
    if (!targetId) return;
    if (!window.confirm("Merge this category into the selected option? The source will be retired and historical opportunity labels will remain unchanged.")) return;
    try {
      await mergeOption.mutateAsync({ id, data: { targetId } });
      await invalidateOptions();
      toast({ title: "Options merged", description: "The source was retired; historical opportunity labels were preserved." });
    } catch (error: any) {
      toast({ title: "Could not merge options", description: error?.data?.error || "Choose another active option of the same kind.", variant: "destructive" });
    }
  };

  const managedOptionRows = [
    ...(managedOptions?.departments ?? []),
    ...(managedOptions?.roleTypes ?? []),
  ];

  return (
    <div className="space-y-6 sm:space-y-10 min-w-0">
      <PageHeader
        title="Settings"
        subtitle="Manage users, roles, and access controls for the opportunities portal."
      />

      <div className="bg-[#171b1d] border border-[#2a2f31] min-w-0">
        <div className="pb-4 pt-6 px-4 sm:px-6 border-b border-[#2a2f31] min-w-0">
          <h2 className="font-mono text-lg uppercase tracking-widest font-medium break-words">Team Members</h2>
          <p className="text-xs text-[#85898a] mt-2 break-words">Approve access requests and manage permissions for production staff.</p>
        </div>

        <div className="min-w-0">
          {!members?.length ? (
            <div className="p-12 text-center text-[#85898a] break-words">
              No team members found.
            </div>
          ) : (
            <>
              {/* Mobile Card List (Hidden on xl) */}
              <div className="xl:hidden divide-y divide-[#2a2f31]">
                {members.map((member) => (
                  <div key={member.userId} className={`${member.active ? "bg-[#171b1d]" : "bg-[#101315]"} p-4 sm:p-5 flex flex-col gap-4 min-w-0`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 font-medium text-foreground">
                        <span className="truncate break-all">{member.displayName}</span>
                        {member.userId === session.member.userId && (
                          <span className="text-[9px] uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full font-bold shrink-0">You</span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-[#85898a] font-normal break-all">{member.email}</div>
                    </div>

                    <div className="border-t border-[#2a2f31]/50 pt-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-[#85898a] font-mono">Role & Status</span>
                        {member.active ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-500 text-[10px] uppercase tracking-widest font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-destructive text-[10px] uppercase tracking-widest font-bold">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Suspended
                          </span>
                        )}
                      </div>
                      {renderRoleSelect(member)}
                    </div>
                    <div className="pt-2">
                      {renderAction(member)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (Visible on xl and above) */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full text-sm text-left min-w-0">
                  <thead className="bg-[#101315] border-b border-[#2a2f31] text-[#85898a] uppercase tracking-[0.15em] text-[10px] font-mono">
                    <tr>
                      <th className="px-6 py-5 font-normal">Name</th>
                      <th className="px-6 py-5 font-normal">Email</th>
                      <th className="px-6 py-5 font-normal">Role</th>
                      <th className="px-6 py-5 font-normal">Status</th>
                      <th className="px-6 py-5 font-normal">Joined</th>
                      <th className="px-6 py-5 font-normal text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2f31]">
                    {members.map((member) => (
                      <tr key={member.userId} className={`${member.active ? "bg-[#171b1d]" : "bg-[#101315]"} hover:bg-[#101315] transition-colors`}>
                        <td className="px-6 py-5 font-medium text-foreground min-w-0 max-w-xs">
                          <div className="flex items-center gap-3">
                            <span className="truncate break-all">{member.displayName}</span>
                            {member.userId === session.member.userId && (
                              <span className="text-[9px] uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full font-bold shrink-0">You</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-[#c6c6c0] break-all max-w-[250px]">{member.email}</td>
                        <td className="px-6 py-5">
                          {renderRoleSelect(member)}
                        </td>
                        <td className="px-6 py-5">
                          {member.active ? (
                            <span className="inline-flex items-center gap-2 text-emerald-500 text-[10px] uppercase tracking-widest font-bold">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-destructive text-[10px] uppercase tracking-widest font-bold">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Suspended
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-[#85898a] whitespace-nowrap">
                          {format(new Date(member.createdAt), "MMM d, yyyy")}
                        </td>
                        <td className="px-6 py-5 text-right">
                          {renderAction(member)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#171b1d] border border-[#2a2f31] min-w-0">
        <div className="pb-4 pt-6 px-4 sm:px-6 border-b border-[#2a2f31] min-w-0">
          <h2 className="font-mono text-lg uppercase tracking-widest font-medium break-words">Opportunity Categories</h2>
          <p className="text-xs text-[#85898a] mt-2 break-words">
            Rename, retire, restore, or merge departments and role types. These actions never rewrite labels on existing opportunities.
          </p>
        </div>
        <div className="divide-y divide-[#2a2f31]">
          {!managedOptionRows.length ? (
            <p className="p-6 text-sm text-[#85898a]">No categories found.</p>
          ) : managedOptionRows.map((option) => {
            const targetOptions = managedOptionRows.filter((candidate) =>
              candidate.active && candidate.kind === option.kind && candidate.id !== option.id,
            );
            const label = renameLabels[option.id] ?? option.label;
            return (
              <div key={option.id} className="p-4 sm:p-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#85898a]">
                      {option.kind === "department" ? "Department" : "Role type"}
                    </span>
                    <span className={`font-mono text-[10px] uppercase tracking-widest ${option.active ? "text-emerald-500" : "text-amber-500"}`}>
                      {option.active ? "Active" : "Retired"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input value={label} maxLength={100} disabled={!option.active}
                      onChange={(event) => setRenameLabels((current) => ({ ...current, [option.id]: event.target.value }))}
                      className="h-10 rounded-none border-[#2a2f31] bg-[#101315] font-mono" />
                    <Button type="button" variant="outline" className="rounded-none" disabled={!option.active || label.trim() === option.label || renameOption.isPending}
                      onClick={() => handleRenameOption(option.id, label)}>
                      Rename
                    </Button>
                  </div>
                </div>
                {option.active && (
                  <div className="min-w-0">
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-[#85898a]">Merge into</label>
                    <div className="flex gap-2">
                      <Select value={mergeTargets[option.id]} onValueChange={(value) => setMergeTargets((current) => ({ ...current, [option.id]: value }))}>
                        <SelectTrigger className="h-10 rounded-none bg-[#101315] border-[#2a2f31] font-mono min-w-0"><SelectValue placeholder="Select active option" /></SelectTrigger>
                        <SelectContent className="bg-[#171b1d] border-[#2a2f31] rounded-none">
                          {targetOptions.map((target) => <SelectItem key={target.id} value={target.id}>{target.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" className="rounded-none" disabled={!mergeTargets[option.id] || mergeOption.isPending}
                        onClick={() => handleMergeOption(option.id, mergeTargets[option.id])}>Merge</Button>
                    </div>
                  </div>
                )}
                {option.active && (
                  <Button type="button" variant="ghost" className="rounded-none text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={retireOption.isPending} onClick={() => handleRetireOption(option.id)}>Retire</Button>
                )}
                {!option.active && (
                  <Button type="button" variant="outline" className="rounded-none border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
                    disabled={restoreOption.isPending} onClick={() => handleRestoreOption(option.id)}>Restore</Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
