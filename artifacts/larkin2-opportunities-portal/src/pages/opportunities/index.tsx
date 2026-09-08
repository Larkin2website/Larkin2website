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
  Opportunity,
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

  const renderActions = (opp: Opportunity) => (
    <div className="flex items-center justify-start xl:justify-end gap-1">
      {canPublish && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 xl:h-9 xl:w-9 text-[#85898a] hover:bg-[#202527] hover:text-primary shrink-0"
              aria-label={`Change status for ${opp.title}`}
              data-testid={`button-status-menu-${opp.id}`}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-none border-[#2a2f31] bg-[#171b1d] break-words">
            <DropdownMenuLabel className="font-mono text-[10px] font-normal uppercase tracking-wider text-[#85898a]">
              Change status
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#2a2f31]" />
            {statusActions[opp.status].map((action) => (
              <DropdownMenuItem
                key={action.status}
                className="rounded-none font-mono text-xs uppercase tracking-wider focus:bg-primary/10 focus:text-primary break-words whitespace-normal"
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
        <Button variant="ghost" size="icon" className="h-11 w-11 xl:h-9 xl:w-9 text-[#85898a] group-hover:text-primary transition-colors hover:bg-transparent shrink-0">
          <ArrowRight className="w-5 h-5" />
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      <PageHeader
        title="Opportunities"
        subtitle="Manage public roles and job postings."
        action={
          canWrite && (
            <Link href="/opportunities/new" className="block w-full lg:w-auto">
              <Button className="w-full lg:w-auto rounded-full font-mono text-xs uppercase tracking-wider h-11 px-6">
                <Plus className="w-4 h-4 mr-2 shrink-0" />
                New Opportunity
              </Button>
            </Link>
          )
        }
      />

      <div className="bg-[#171b1d] border border-[#2a2f31] p-4 sm:p-5 flex flex-col lg:flex-row gap-4 min-w-0">
        <form onSubmit={handleSearch} className="flex-1 w-full relative min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#85898a] w-4 h-4 shrink-0" />
          <Input 
            placeholder="Search titles or departments..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-[#101315] border-[#2a2f31] h-11 sm:h-12 rounded-none font-mono text-sm placeholder:text-[#85898a] focus-visible:ring-primary focus-visible:border-primary min-w-0"
          />
        </form>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full lg:w-auto shrink-0 min-w-0">
          <Select 
            value={statusFilter} 
            onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}
          >
            <SelectTrigger className="w-full sm:w-[160px] bg-[#101315] border-[#2a2f31] h-11 sm:h-12 rounded-none font-mono text-xs uppercase tracking-wider min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Filter className="w-4 h-4 text-[#85898a] shrink-0" />
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
            <SelectTrigger className="w-full sm:w-[180px] bg-[#101315] border-[#2a2f31] h-11 sm:h-12 rounded-none font-mono text-xs uppercase tracking-wider min-w-0">
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

      <div className="bg-[#171b1d] border border-[#2a2f31] min-w-0">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground font-mono text-xs uppercase tracking-wider animate-pulse">
            Loading opportunities...
          </div>
        ) : !pageData?.items.length ? (
          <div className="p-8 text-center text-muted-foreground text-sm break-words">
            No opportunities match your filters.
          </div>
        ) : (
          <>
            {/* Mobile Card List (Hidden on xl) */}
            <div className="xl:hidden divide-y divide-[#2a2f31]">
              {pageData.items.map((opp) => (
                <div key={opp.id} className="p-4 sm:p-5 hover:bg-[#101315] transition-colors group flex flex-col gap-4 min-w-0">
                  <div className="min-w-0">
                    <Link href={`/opportunities/${opp.id}`} className="font-mono text-base sm:text-[15px] font-medium text-[#f4f1ed] group-hover:text-primary transition-colors block mb-1 break-words">
                      {opp.title}
                    </Link>
                    <div className="text-[11px] text-[#85898a] tracking-wide break-all">/{opp.slug}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 min-w-0">
                    <StatusBadge status={opp.status} />
                    <div className="text-[10px] text-primary uppercase tracking-wider truncate min-w-0 max-w-[200px]">{opp.department}</div>
                    {opp.deadline && (
                      <div className={new Date(opp.deadline) < new Date() ? "text-[#ef625f] text-[10px] font-bold uppercase tracking-wider" : "text-[#85898a] text-[10px] uppercase tracking-wider"}>
                        Due {format(new Date(opp.deadline), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-[#2a2f31]/50 flex justify-end">
                    {renderActions(opp)}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (Visible on xl and above) */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#101315] border-b border-[#2a2f31] text-[#85898a] uppercase tracking-[0.15em] text-[10px] font-mono">
                  <tr>
                    <th className="px-6 py-5 font-normal">Role</th>
                    <th className="px-6 py-5 font-normal">Department</th>
                    <th className="px-6 py-5 font-normal">Status</th>
                    <th className="px-6 py-5 font-normal">Deadline</th>
                    <th className="px-6 py-5 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2f31]">
                  {pageData.items.map((opp) => (
                    <tr key={opp.id} className="hover:bg-[#101315] transition-colors group">
                      <td className="px-6 py-5 min-w-0 max-w-sm">
                        <Link href={`/opportunities/${opp.id}`} className="font-mono text-[15px] font-medium text-[#f4f1ed] group-hover:text-primary transition-colors block mb-1 break-words">
                          {opp.title}
                        </Link>
                        <div className="text-[11px] text-[#85898a] tracking-wide break-all">/{opp.slug}</div>
                      </td>
                      <td className="px-6 py-5 text-[#c6c6c0] break-words max-w-[250px]">{opp.department}</td>
                      <td className="px-6 py-5"><StatusBadge status={opp.status} /></td>
                      <td className="px-6 py-5">
                        {opp.deadline ? (
                          <span className={new Date(opp.deadline) < new Date() ? "text-[#ef625f] font-medium" : "text-[#c6c6c0]"}>
                            {format(new Date(opp.deadline), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-[#85898a] italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {renderActions(opp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        {pageData && pageData.pageCount > 1 && (
          <div className="border-t border-[#2a2f31] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#101315] min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-mono text-[#85898a] text-center sm:text-left w-full sm:w-auto break-words">
              Showing {((page - 1) * pageData.pageSize) + 1} to {Math.min(page * pageData.pageSize, pageData.total)} of {pageData.total}
            </p>
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none h-11 sm:h-9 px-4 rounded-none font-mono text-xs uppercase tracking-wider border-[#2a2f31] hover:bg-[#171b1d] hover:text-foreground"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2 shrink-0" /> Prev
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none h-11 sm:h-9 px-4 rounded-none font-mono text-xs uppercase tracking-wider border-[#2a2f31] hover:bg-[#171b1d] hover:text-foreground"
                onClick={() => setPage(p => Math.min(pageData.pageCount, p + 1))}
                disabled={page >= pageData.pageCount}
              >
                Next <ChevronRight className="w-4 h-4 ml-2 shrink-0" />
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
        <AlertDialogContent className="max-w-lg rounded-none border-[#2a2f31] bg-[#171b1d] max-h-[90dvh] flex flex-col p-4 sm:p-6 overflow-hidden min-w-0">
          <AlertDialogHeader className="shrink-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Status change</p>
            <AlertDialogTitle className="font-mono text-2xl font-medium tracking-tight break-words">
              {pendingStatusChange?.action.label} “{pendingStatusChange?.title}”?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="overflow-y-auto min-h-0 pr-1 shrink space-y-3 text-sm leading-relaxed text-muted-foreground my-2">
            <span className="block break-words">This lifecycle change takes effect immediately.</span>
            <span className="block border border-[#2a2f31] bg-[#101315] p-4 text-foreground break-words">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#85898a]">Public impact</span>
              {pendingStatusChange?.action.publicEffect}
            </span>
          </div>
          <AlertDialogFooter className="shrink-0 pt-4 flex-col sm:flex-row gap-2 sm:gap-0 mt-auto">
            <AlertDialogCancel
              className="rounded-none border-border font-mono text-xs uppercase tracking-wider h-11 sm:h-10 mt-0 w-full sm:w-auto shrink-0"
              disabled={transition.isPending}
              data-testid="button-cancel-status-change"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-primary font-mono text-xs font-bold uppercase tracking-wider text-[#080a0c] hover:bg-[#ff8d57] h-11 sm:h-10 w-full sm:w-auto shrink-0"
              disabled={transition.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleTransition();
              }}
              data-testid="button-confirm-status-change"
            >
              {transition.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin shrink-0" /> Updating
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
