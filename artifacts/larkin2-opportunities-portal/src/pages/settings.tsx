import { useState } from "react";
import { useListPortalMembers, useUpdatePortalMember, useGetPortalSession, PortalRole, PortalMember, getListPortalMembersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ShieldAlert, ShieldCheck, UserCog, UserX, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
  }
  
  if (session?.member?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portal Settings</h1>
        <p className="text-muted-foreground mt-1">Manage users, roles, and access controls.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Approve access requests and manage permissions for production staff.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!members?.length ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No team members found.
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.userId} className={member.active ? "bg-card" : "bg-muted/30"}>
                        <td className="px-4 py-3 font-medium">
                          {member.displayName}
                          {member.userId === session.member.userId && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded">You</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                        <td className="px-4 py-3">
                          <Select
                            disabled={member.userId === session.member.userId}
                            value={member.role}
                            onValueChange={(val) => handleUpdateRole(member.userId, val as PortalRole, member.active)}
                          >
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="opportunity_manager">Opportunity Manager</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          {member.active ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-xs font-medium">
                              <ShieldCheck className="w-3.5 h-3.5" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-destructive bg-destructive/10 px-2 py-0.5 rounded text-xs font-medium">
                              <AlertCircle className="w-3.5 h-3.5" /> Suspended
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(member.createdAt), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={member.userId === session.member.userId}
                            onClick={() => handleToggleActive(member)}
                            className={member.active ? "text-destructive hover:text-destructive hover:bg-destructive/10" : "text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10"}
                          >
                            {member.active ? (
                              <><UserX className="w-4 h-4 mr-2" /> Suspend</>
                            ) : (
                              <><UserCog className="w-4 h-4 mr-2" /> Activate</>
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
        </CardContent>
      </Card>
    </div>
  );
}
