import { useState } from "react";
import { useListPortalMembers, useUpdatePortalMember, useGetPortalSession, PortalRole, PortalMember, getListPortalMembersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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
  const { toast } = useToast();
  
  if (sessionLoading || membersLoading) {
    return <div className="p-16 text-center text-muted-foreground font-mono text-xs uppercase tracking-wider animate-pulse">Loading settings...</div>;
  }
  
  if (session?.member?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 px-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="font-mono text-3xl font-medium tracking-tight break-words">Access Denied</h1>
        <p className="text-muted-foreground max-w-md leading-relaxed text-sm">
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

  return (
    <div className="space-y-6 sm:space-y-10">
      <PageHeader
        title="Settings"
        subtitle="Manage users, roles, and access controls for the opportunities portal."
      />

      <div className="bg-[#171b1d] border border-[#2a2f31]">
        <div className="pb-4 pt-6 px-4 sm:px-6 border-b border-[#2a2f31]">
          <h2 className="font-mono text-lg uppercase tracking-widest font-medium">Team Members</h2>
          <p className="text-xs text-[#85898a] mt-2">Approve access requests and manage permissions for production staff.</p>
        </div>
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#101315] border-b border-[#2a2f31] text-[#85898a] uppercase tracking-[0.15em] text-[10px] font-mono hidden md:table-header-group">
                <tr>
                  <th className="px-6 py-5 font-normal">Name</th>
                  <th className="px-6 py-5 font-normal hidden md:table-cell">Email</th>
                  <th className="px-6 py-5 font-normal">Role</th>
                  <th className="px-6 py-5 font-normal">Status</th>
                  <th className="px-6 py-5 font-normal hidden lg:table-cell">Joined</th>
                  <th className="px-6 py-5 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2f31]">
                {!members?.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 sm:px-6 py-12 text-center text-[#85898a]">
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.userId} className={`${member.active ? "bg-[#171b1d]" : "bg-[#101315]"} hover:bg-[#101315] transition-colors flex flex-col md:table-row border-b md:border-b-0 border-[#2a2f31]`}>
                      <td className="px-4 py-4 md:px-6 md:py-5 block md:table-cell font-medium text-foreground min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="truncate">{member.displayName}</span>
                          {member.userId === session.member.userId && (
                            <span className="text-[9px] uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full font-bold shrink-0">You</span>
                          )}
                        </div>
                        <div className="md:hidden mt-1 text-xs text-[#85898a] font-normal break-all">{member.email}</div>
                      </td>
                      <td className="px-6 py-5 text-[#c6c6c0] hidden md:table-cell break-all">{member.email}</td>
                      <td className="px-4 py-2 md:px-6 md:py-5 block md:table-cell border-t border-[#2a2f31]/50 md:border-0">
                        <Select
                          disabled={member.userId === session.member.userId}
                          value={member.role}
                          onValueChange={(val) => handleUpdateRole(member.userId, val as PortalRole, member.active)}
                        >
                          <SelectTrigger className="w-full md:w-[180px] h-11 md:h-9 rounded-none bg-[#101315] border-[#2a2f31] font-mono text-[10px] uppercase tracking-wider">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#171b1d] border-[#2a2f31] rounded-none">
                            <SelectItem value="viewer" className="font-mono text-[10px] uppercase tracking-wider">Viewer</SelectItem>
                            <SelectItem value="opportunity_manager" className="font-mono text-[10px] uppercase tracking-wider">Opportunity Manager</SelectItem>
                            <SelectItem value="super_admin" className="font-mono text-[10px] uppercase tracking-wider">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2 md:px-6 md:py-5 block md:table-cell">
                        {member.active ? (
                          <span className="inline-flex items-center gap-2 text-emerald-500 text-[10px] uppercase tracking-widest font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-destructive text-[10px] uppercase tracking-widest font-bold">
                            <AlertCircle className="w-3.5 h-3.5" /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-[#85898a] hidden lg:table-cell">
                        {format(new Date(member.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 pb-4 pt-2 md:px-6 md:py-5 block md:table-cell md:text-right">
                        <Button
                          variant="ghost"
                          disabled={member.userId === session.member.userId}
                          onClick={() => handleToggleActive(member)}
                          className={`w-full md:w-auto h-11 md:h-9 px-4 justify-center md:justify-start rounded-none font-mono text-[10px] uppercase tracking-widest ${
                            member.active
                              ? "text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/20 md:border-transparent"
                              : "text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20 md:border-transparent"
                          }`}
                        >
                          {member.active ? (
                            <><UserX className="w-3.5 h-3.5 mr-2" /> Suspend</>
                          ) : (
                            <><UserCog className="w-3.5 h-3.5 mr-2" /> Activate</>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}