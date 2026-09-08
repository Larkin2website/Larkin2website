import { useState } from "react";
import {
  useGetPortalSession,
  useListPortalOpportunities,
  useTransitionPortalOpportunity,
  getListPortalOpportunitiesQueryKey,
  getGetPortalOpportunityQueryKey,
  getGetPortalDashboardQueryKey,
  getListOpportunityAuditEventsQueryKey,
  OpportunityStatus,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/pages/dashboard";
import { PageHeader } from "@/components/brand";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  ArrowRight,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StatusAction = {
  status: OpportunityStatus;
  label: string;
  publicEffect: string;
};

const statusActions: Record<OpportunityStatus, StatusAction[]> = {
  draft: [
    { status: "published", label: "Publish", publicEffect: "Appears publicly and begins accepting applications immediately." },
    { status: "archived", label: "Archive", publicEffect: "Stays hidden from the public site and moves to the portal archive." },
  ],
  published: [
    { status: "draft", label: "Move to Draft", publicEffect: "Removed from the public site immediately." },
    { status: "closed", label: "Close Applications", publicEffect: "Remains public with a Closed status and stops accepting applications." },
    { status: "filled", label: "Mark as Filled", publicEffect: "Remains public with a Filled status and stops accepting applications." },
    { status: "archived", label: "Archive", publicEffect: "Removed from the public site immediately and moved to the portal archive." },
  ],
  closed: [
    { status: "published", label: "Re-open", publicEffect: "Remains public and begins accepting applications again immediately." },
    { status: "filled", label: "Mark as Filled", publicEffect: "Remains public with a Filled status." },
    { status: "archived", label: "Archive", publicEffect: "Removed from the public site immediately and moved to the portal archive." },
  ],
  filled: [
    { status: "archived", label: "Archive", publicEffect: "Removed from the public site immediately and moved to the portal archive." },
  ],
  archived: [
    { status: "draft", label: "Restore to Draft", publicEffect: "Returns to editing but stays hidden from the public site." },
  ],
};

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const message = (error as { error?: unknown }).error;
    if (typeof message === "string" && message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "The role status could not be changed. Refresh the page and try again.";
}

export default function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: session } = useGetPortalSession();
  const canWrite = session?.permissions.includes("opportunities:write") ?? false;
  const canPublish = session?.permissions.includes("opportunities:publish") ?? false;
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | "all">("all");
  const [sortField, setSortField] = useState<"updatedAt" | "title" | "deadline">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    id: string;
    title: string;
    action: StatusAction;
  } | null>(null);
  const transition = useTransitionPortalOpportunity();

  const params = {
    page,
    pageSize: 15,
    q: searchQuery || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    sort: sortField,
    order: sortOrder
  };

  const { data: pageData, isLoading } = useListPortalOpportunities(params, {
    query: {
      queryKey: getListPortalOpportunitiesQueryKey(params)
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleTransition = async () => {
    if (!pendingStatusChange) return;

    const { id, action } = pendingStatusChange;
    try {
      const updatedOpportunity = await transition.mutateAsync({ id, data: { status: action.status } });
      queryClient.setQueryData(getGetPortalOpportunityQueryKey(id), updatedOpportunity);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListPortalOpportunitiesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetPortalDashboardQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListOpportunityAuditEventsQueryKey(id) }),
      ]);
      toast({ title: `Moved to ${action.status}` });
      setPendingStatusChange(null);
    } catch (error: unknown) {
      toast({ title: "Status change failed", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Opportunities"
        subtitle="Manage public roles and job postings."
        action={
          canWrite && (
            <Link href="/opportunities/new">
              <Button className="w-full sm:w-auto rounded-full font-mono text-xs uppercase tracking-wider h-11 px-6">
                <Plus className="w-4 h-4 mr-2" />
                New Opportunity
              </Button>
            </Link>
          )
        }
      />

      <div className="bg-[#171b1d] border border-[#2a2f31] p-5 flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#85898a] w-4 h-4" />
          <Input 
            placeholder="Search titles or departments..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-[#101315] border-[#2a2f31] h-12 rounded-none font-mono text-sm placeholder:text-[#85898a] focus-visible:ring-primary focus-visible:border-primary"
          />
        </form>
        
        <div className="flex gap-4">
          <Select 
            value={statusFilter} 
            onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}
          >
            <SelectTrigger className="w-[160px] bg-[#101315] border-[#2a2f31] h-12 rounded-none font-mono text-xs uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#85898a]" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-[#171b1d] border-[#2a2f31] rounded-none">
              <SelectItem value="all" className="font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary">All Statuses</SelectItem>
              <SelectItem value="draft" className="font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary">Draft</SelectItem>
              <SelectItem value="published" className="font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary">Published</SelectItem>
              <SelectItem value="closed" className="font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary">Closed</SelectItem>
              <SelectItem value="filled" className="font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary">Filled</SelectItem>
              <SelectItem value="archived" className="font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={`${sortField}-${sortOrder}`} 
            onValueChange={(v) => {
              const [field, order] = v.split("-");
              setSortField(field as any);
              setSortOrder(order as any);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] bg-[#101315] border-[#2a2f31] h-12 rounded-none font-mono text-xs uppercase tracking-wider">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-[#171b1d] border-[#2a2f31] rounded-none">
              <SelectItem value="updatedAt-desc" className="font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary">Newest First</SelectItem>
              <SelectItem value="updatedAt-asc" className="font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary">Oldest First</SelectItem>
              <SelectItem value="title-asc" className="font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary">Title (A-Z)</SelectItem>
              <SelectItem value="deadline-asc" className="font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary">Deadline (Soonest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-[#171b1d] border border-[#2a2f31]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#101315] border-b border-[#2a2f31] text-[#85898a] uppercase tracking-[0.15em] text-[10px] font-mono">
              <tr>
                <th className="px-6 py-5 font-normal">Role</th>
                <th className="px-6 py-5 font-normal hidden md:table-cell">Department</th>
                <th className="px-6 py-5 font-normal">Status</th>
                <th className="px-6 py-5 font-normal hidden lg:table-cell">Deadline</th>
                <th className="px-6 py-5 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2f31]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-muted-foreground font-mono text-xs uppercase tracking-wider animate-pulse">
                    Loading opportunities...
                  </td>
                </tr>
              ) : !pageData?.items.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-muted-foreground text-sm">
                    No opportunities match your filters.
                  </td>
                </tr>
              ) : (
                pageData.items.map((opp) => (
                  <tr key={opp.id} className="hover:bg-[#101315] transition-colors group">
                    <td className="px-6 py-5">
                      <Link href={`/opportunities/${opp.id}`} className="font-mono text-base font-medium text-[#f4f1ed] group-hover:text-primary transition-colors block mb-1">
                        {opp.title}
                      </Link>
                      <div className="text-[11px] text-[#85898a] tracking-wide">/{opp.slug}</div>
                      <div className="md:hidden mt-2 text-[10px] text-primary uppercase tracking-wider">{opp.department}</div>
                    </td>
                    <td className="px-6 py-5 text-[#c6c6c0] hidden md:table-cell">{opp.department}</td>
                    <td className="px-6 py-5"><StatusBadge status={opp.status} /></td>
                    <td className="px-6 py-5 hidden lg:table-cell">
                      {opp.deadline ? (
                        <span className={new Date(opp.deadline) < new Date() ? "text-[#ef625f] font-medium" : "text-[#c6c6c0]"}>
                          {format(new Date(opp.deadline), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-[#85898a] italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                      {canPublish && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-[#85898a] hover:bg-[#202527] hover:text-primary"
                              aria-label={`Change status for ${opp.title}`}
                              data-testid={`button-status-menu-${opp.id}`}
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-none border-[#2a2f31] bg-[#171b1d]">
                            <DropdownMenuLabel className="font-mono text-[10px] font-normal uppercase tracking-wider text-[#85898a]">
                              Change status
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-[#2a2f31]" />
                            {statusActions[opp.status].map((action) => (
                              <DropdownMenuItem
                                key={action.status}
                                className="rounded-none font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary"
                                onSelect={() => setPendingStatusChange({ id: opp.id, title: opp.title, action })}
                                data-testid={`button-status-${action.status}-${opp.id}`}
                              >
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Link href={`/opportunities/${opp.id}`} data-testid={`link-opportunity-${opp.id}`}>
                        <Button variant="ghost" size="icon" className="text-[#85898a] group-hover:text-primary transition-colors hover:bg-transparent">
                          <ArrowRight className="w-5 h-5" />
                        </Button>
                      </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {pageData && pageData.pageCount > 1 && (
          <div className="border-t border-[#2a2f31] p-5 flex items-center justify-between bg-[#101315]">
            <p className="text-[11px] uppercase tracking-wider font-mono text-[#85898a]">
              Showing {((page - 1) * pageData.pageSize) + 1} to {Math.min(page * pageData.pageSize, pageData.total)} of {pageData.total}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 px-4 rounded-none font-mono text-xs uppercase tracking-wider border-[#2a2f31] hover:bg-[#171b1d] hover:text-foreground"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 px-4 rounded-none font-mono text-xs uppercase tracking-wider border-[#2a2f31] hover:bg-[#171b1d] hover:text-foreground"
                onClick={() => setPage(p => Math.min(pageData.pageCount, p + 1))}
                disabled={page >= pageData.pageCount}
              >
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={pendingStatusChange !== null}
        onOpenChange={(open) => {
          if (!open && !transition.isPending) setPendingStatusChange(null);
        }}
      >
        <AlertDialogContent className="max-w-lg rounded-none border-[#2a2f31] bg-[#171b1d]">
          <AlertDialogHeader>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Status change</p>
            <AlertDialogTitle className="font-mono text-2xl font-medium tracking-tight">
              {pendingStatusChange?.action.label} “{pendingStatusChange?.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <span className="block">This lifecycle change takes effect immediately.</span>
              <span className="block border border-[#2a2f31] bg-[#101315] p-4 text-foreground">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#85898a]">Public impact</span>
                {pendingStatusChange?.action.publicEffect}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-none border-border font-mono text-xs uppercase tracking-wider"
              disabled={transition.isPending}
              data-testid="button-cancel-status-change"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-primary font-mono text-xs font-bold uppercase tracking-wider text-[#080a0c] hover:bg-[#ff8d57]"
              disabled={transition.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleTransition();
              }}
              data-testid="button-confirm-status-change"
            >
              {transition.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Updating
                </>
              ) : (
                "Confirm Status Change"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}