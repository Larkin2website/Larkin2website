import { useState } from "react";
import { 
  useGetPortalOpportunity, 
  useGetPortalSession,
  useTransitionPortalOpportunity,
  useDeletePortalOpportunity,
  useListOpportunityAuditEvents,
  getGetPortalOpportunityQueryKey,
  getListPortalOpportunitiesQueryKey,
  getGetPortalDashboardQueryKey,
  getListOpportunityAuditEventsQueryKey,
  OpportunityStatus,
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/pages/dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/brand";
import { MatchingCriteriaPanel } from "@/components/matching-criteria-panel";
import { 
  ChevronLeft, Edit, ExternalLink, Calendar, Clock, Loader2, PlayCircle, Eye, RefreshCw, Trash2, ShieldAlert, SlidersHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const publishedStatusOptions: {
  status: Exclude<OpportunityStatus, "published">;
  label: string;
  description: string;
  publicEffect: string;
  remainsPublic: boolean;
}[] = [
  {
    status: "draft",
    label: "Move to Draft",
    description: "Return the role to editing before publishing it again.",
    publicEffect: "Removed from the public site immediately",
    remainsPublic: false,
  },
  {
    status: "closed",
    label: "Close Applications",
    description: "Keep the role available as a record, but stop accepting applications.",
    publicEffect: "Remains public with a Closed status",
    remainsPublic: true,
  },
  {
    status: "filled",
    label: "Mark as Filled",
    description: "Show that recruitment has completed and the position has been filled.",
    publicEffect: "Remains public with a Filled status",
    remainsPublic: true,
  },
  {
    status: "archived",
    label: "Archive Role",
    description: "Remove the role from public listings and keep it in the portal archive.",
    publicEffect: "Removed from the public site immediately",
    remainsPublic: false,
  },
];

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const message = (error as { error?: unknown }).error;
    if (typeof message === "string" && message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "The role status could not be changed. Refresh the page and try again.";
}

export default function DetailOpportunityPage() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: opp, isLoading, error } = useGetPortalOpportunity(id);
  const { data: session } = useGetPortalSession();
  const { data: auditEvents } = useListOpportunityAuditEvents(id, { 
    query: { 
      enabled: !!opp,
      queryKey: getListOpportunityAuditEventsQueryKey(id)
    } 
  });
  
  const transition = useTransitionPortalOpportunity();
  const del = useDeletePortalOpportunity();

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Exclude<OpportunityStatus, "published">>("closed");
  const canWrite = session?.permissions.includes("opportunities:write") ?? false;
  const canPublish = session?.permissions.includes("opportunities:publish") ?? false;
  const canDelete = session?.permissions.includes("opportunities:delete") ?? false;

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh] min-w-0"><Loader2 className="w-8 h-8 animate-spin text-primary shrink-0" /></div>;
  }

  if (error || !opp) {
    return (
      <div className="text-center py-32 border border-[#2a2f31] bg-[#171b1d] px-4 break-words min-w-0">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-6 shrink-0" />
        <h2 className="font-mono text-2xl font-medium mb-3">Role not found</h2>
        <p className="text-muted-foreground mb-8">The role may have been permanently deleted.</p>
        <Button variant="outline" className="rounded-none font-mono text-xs uppercase tracking-wider h-11 px-8 w-full sm:w-auto" onClick={() => setLocation("/roles")}>Back to Roles</Button>
      </div>
    );
  }

  const handleTransition = async (newStatus: OpportunityStatus) => {
    try {
      const updatedOpportunity = await transition.mutateAsync({ id, data: { status: newStatus } });

      queryClient.setQueryData(getGetPortalOpportunityQueryKey(id), updatedOpportunity);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListPortalOpportunitiesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetPortalDashboardQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListOpportunityAuditEventsQueryKey(id) }),
      ]);

      toast({ title: `Moved to ${newStatus}` });
      setStatusDialogOpen(false);
    } catch (error: unknown) {
      toast({ title: "Status change failed", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await del.mutateAsync({ id, data: { confirm: "DELETE" } });
      toast({ title: "Permanently deleted" });
      setLocation("/roles");
      queryClient.invalidateQueries({ queryKey: getListPortalOpportunitiesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPortalDashboardQueryKey() });
    } catch (e: any) {
      toast({ title: "Deletion failed", description: e.error, variant: "destructive" });
    }
  };

  // Group content items for preview
  const responsibilities = opp.contentItems.filter(i => i.section === "responsibility").sort((a,b) => a.position - b.position);
  const essentials = opp.contentItems.filter(i => i.section === "essential").sort((a,b) => a.position - b.position);
  const desired = opp.contentItems.filter(i => i.section === "desired").sort((a,b) => a.position - b.position);
  const sortedDetails = [...opp.details].sort((a,b) => a.position - b.position);

  const ActionButtons = () => (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 min-w-0">
      {canWrite && opp.status !== "archived" && (
        <Link href={`/roles/${id}/edit`} className="w-full sm:w-auto block">
          <Button variant="outline" className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider border-border shrink-0">
            <Edit className="w-3.5 h-3.5 mr-2 shrink-0" /> Edit Content
          </Button>
        </Link>
      )}

      {canPublish && opp.status === "draft" && (
        <Button onClick={() => handleTransition("published")} className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider shrink-0">
          <PlayCircle className="w-3.5 h-3.5 mr-2 shrink-0" /> Publish
        </Button>
      )}

      {canPublish && opp.status === "published" && (
        <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-2 shrink-0" /> Change Status
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-xl bg-[#171b1d] border-border rounded-none max-h-[90dvh] overflow-hidden flex flex-col p-4 sm:p-6 min-w-0">
            <AlertDialogHeader className="shrink-0 text-left">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-mono">Published role</p>
              <AlertDialogTitle className="font-mono font-medium tracking-tight text-xl sm:text-2xl text-foreground break-words mt-1">
                Change the status of “{opp.title}”
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed mt-2 break-words">
                Choose how this live role should appear. The change takes effect on the public roles site immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="my-4 grid gap-2 overflow-y-auto shrink min-h-0 pr-1 min-w-0" role="radiogroup" aria-label="New role status">
              {publishedStatusOptions.map((option) => {
                const selected = selectedStatus === option.status;
                return (
                  <button
                    key={option.status}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`w-full border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#171b1d] min-w-0 ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-[#2a2f31] bg-[#101315] hover:border-[#85898a]"
                    }`}
                    onClick={() => setSelectedStatus(option.status)}
                  >
                    <span className="flex items-start gap-3 min-w-0">
                      <span
                        aria-hidden="true"
                        className={`mt-1 h-3 w-3 shrink-0 rounded-full border ${
                          selected ? "border-primary bg-primary shadow-[inset_0_0_0_3px_#171b1d]" : "border-[#85898a]"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm font-medium text-foreground break-words">{option.label}</span>
                        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground break-words">{option.description}</span>
                        <span className={`mt-2 block text-[10px] font-mono uppercase tracking-[0.12em] break-words ${
                          option.remainsPublic ? "text-[#c6c6c0]" : "text-primary"
                        }`}>
                          {option.publicEffect}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <AlertDialogFooter className="shrink-0 pt-2 flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel
                className="rounded-none font-mono text-xs uppercase tracking-wider border-border h-11 sm:h-10 mt-0 w-full sm:w-auto shrink-0"
                disabled={transition.isPending}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-none bg-primary text-[#080a0c] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#ff8d57] h-11 sm:h-10 w-full sm:w-auto shrink-0"
                disabled={transition.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  void handleTransition(selectedStatus);
                }}
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
      )}

      {canPublish && opp.status === "closed" && (
        <>
          <Button variant="outline" className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider border-border shrink-0" onClick={() => handleTransition("published")}>Re-open</Button>
          <Button onClick={() => handleTransition("filled")} className="w-full sm:w-auto bg-[#e9e5df] text-[#1d2020] hover:bg-white rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider font-bold shrink-0">
            Mark Filled
          </Button>
        </>
      )}

      {canPublish && opp.status !== "archived" && opp.status !== "published" && (
        <Button variant="ghost" className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground shrink-0" onClick={() => handleTransition("archived")}>
          Archive
        </Button>
      )}

      {canPublish && opp.status === "archived" && (
        <Button variant="outline" className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider border-border shrink-0" onClick={() => handleTransition("draft")}>
          Restore to Draft
        </Button>
      )}

      {canDelete && opp.status === "archived" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider shrink-0">
              <Trash2 className="w-3.5 h-3.5 mr-2 shrink-0" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md bg-[#171b1d] border-border rounded-none max-h-[90dvh] flex flex-col p-4 sm:p-6 overflow-hidden min-w-0">
            <AlertDialogHeader className="shrink-0 text-left">
              <AlertDialogTitle className="font-mono font-medium tracking-tight text-xl text-foreground break-words">Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed mt-2 break-words">
                This action cannot be undone. This will permanently delete the role "{opp.title}" and its history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-6 shrink-0 min-w-0">
              <label className="text-[10px] uppercase tracking-widest font-medium mb-3 block text-primary break-words">Type DELETE to confirm:</label>
              <input
                type="text"
                className="flex h-12 w-full border border-border bg-[#101315] px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:border-primary font-mono placeholder:text-muted-foreground/50 min-w-0 break-words"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </div>
            <AlertDialogFooter className="shrink-0 mt-auto flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel className="rounded-none font-mono text-xs uppercase tracking-wider border-border h-11 sm:h-10 mt-0 w-full sm:w-auto shrink-0">Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                className="rounded-none font-mono text-xs uppercase tracking-wider h-11 sm:h-10 w-full sm:w-auto shrink-0"
                disabled={deleteConfirmText !== "DELETE" || del.isPending}
                onClick={handleDelete}
              >
                Delete Permanently
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 min-w-0">
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-[#85898a] mb-2 font-mono break-all min-w-0">
        <Link href="/roles" className="hover:text-primary transition-colors flex items-center shrink-0">
          <ChevronLeft className="w-3 h-3 mr-1 shrink-0" /> Roles
        </Link>
        <span className="shrink-0">/</span>
        <span className="truncate">{opp.slug}</span>
      </div>

      <PageHeader
        title={
          <div className="flex items-center gap-4 flex-wrap mt-2 min-w-0">
            <span className="break-words min-w-0">{opp.title}</span>
            <StatusBadge status={opp.status} />
          </div>
        }
        action={<ActionButtons />}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 min-w-0">
        
        {/* Left Col: Public Preview Style */}
        <div className="xl:col-span-2 space-y-6 sm:space-y-8 min-w-0">
          <div className="border border-[#2a2f31] overflow-hidden min-w-0">
            <div className="bg-[#101315] px-4 sm:px-5 py-3 border-b border-[#2a2f31] flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-[#85898a] gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0"><Eye className="w-3.5 h-3.5 text-primary shrink-0" /> <span className="break-words">Public Layout Preview</span></div>
              {opp.status === "published" && <a href={`/larkin2-opportunities/roles/${opp.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors shrink-0 break-words"><ExternalLink className="w-3 h-3 shrink-0" /> Live URL</a>}
            </div>
            <div className="p-6 sm:p-8 md:p-12 bg-[#171b1d] text-[#f4f1ed] min-w-0">
              <div className="mb-5 min-w-0">
                <span className="text-primary text-[11px] uppercase tracking-[0.18em] break-words">{opp.publicationLabel} / {opp.department}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 min-w-0">
                {opp.deadlineExtended && <span className="bg-primary text-[#080a0c] px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full shrink-0">Deadline extended</span>}
                {opp.urgent && <span className="bg-primary text-[#080a0c] px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full shrink-0">Urgent</span>}
                {opp.featured && <span className="border border-primary text-primary px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full shrink-0">Featured</span>}
              </div>
              <h1 className="font-mono text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 sm:mb-8 tracking-tight font-medium leading-[1.05] break-words">{opp.title}</h1>
              <p className="text-[#c6c6c0] text-base sm:text-lg leading-relaxed max-w-2xl mb-10 sm:mb-14 break-words">{opp.summary}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 min-w-0">
                <div className="md:col-span-1 order-2 md:order-1 min-w-0">
                  <div className={`p-5 sm:p-6 border ${opp.status === 'published' ? 'border-primary/30 bg-primary/5' : 'border-white/10 bg-[#101315]'} min-w-0`}>
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-primary mb-4 break-words">
                      {opp.status === 'published' ? "Applications open" : "Applications unavailable"}
                    </div>
                    <h3 className="text-base sm:text-lg font-medium mb-4 sm:mb-5 leading-snug break-words">
                      {opp.status === 'published' ? "This role is accepting applications." : `This role is ${opp.status.toLowerCase()}.`}
                    </h3>
                    <div className="text-sm text-[#85898a] space-y-2 break-words">
                      <p>{opp.applicationDeadline}</p>
                      {opp.responseDate && <p>{opp.responseDate}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2 order-1 md:order-2 space-y-10 sm:space-y-12 min-w-0">
                  {responsibilities.length > 0 && (
                    <section className="min-w-0">
                      <h2 className="font-mono text-lg sm:text-xl font-medium mb-4 sm:mb-5 border-b border-[#2a2f31] pb-3 text-foreground break-words">About the role</h2>
                      <ul className="list-disc pl-5 space-y-3 text-[#c6c6c0] text-[15px] marker:text-primary min-w-0">
                        {responsibilities.map(r => <li key={r.id} className="pl-1 leading-relaxed break-words">{r.content}</li>)}
                      </ul>
                    </section>
                  )}
                  {essentials.length > 0 && (
                    <section className="min-w-0">
                      <h2 className="font-mono text-lg sm:text-xl font-medium mb-4 sm:mb-5 border-b border-[#2a2f31] pb-3 text-foreground break-words">Essential experience</h2>
                      <ul className="list-disc pl-5 space-y-3 text-[#c6c6c0] text-[15px] marker:text-primary min-w-0">
                        {essentials.map(e => <li key={e.id} className="pl-1 leading-relaxed break-words">{e.content}</li>)}
                      </ul>
                    </section>
                  )}
                  {desired.length > 0 && (
                    <section className="min-w-0">
                      <h2 className="font-mono text-lg sm:text-xl font-medium mb-4 sm:mb-5 border-b border-[#2a2f31] pb-3 text-foreground break-words">Desired experience</h2>
                      <ul className="list-disc pl-5 space-y-3 text-[#c6c6c0] text-[15px] marker:text-primary min-w-0">
                        {desired.map(d => <li key={d.id} className="pl-1 leading-relaxed break-words">{d.content}</li>)}
                      </ul>
                    </section>
                  )}
                  {sortedDetails.length > 0 && (
                    <section className="min-w-0">
                      <h2 className="font-mono text-lg sm:text-xl font-medium mb-5 sm:mb-6 border-b border-[#2a2f31] pb-3 text-foreground break-words">Role details</h2>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 min-w-0">
                        {sortedDetails.map((detail, idx) => (
                          <div key={idx} className="min-w-0">
                            <dt className="text-[11px] font-mono uppercase tracking-widest text-[#85898a] mb-2 break-words">{detail.label}</dt>
                            <dd className="text-[#f4f1ed] text-[15px] break-words">{detail.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Metadata & Audit */}
        <div className="space-y-6 sm:space-y-8 min-w-0">
          <Card className="bg-[#171b1d] border border-[#2a2f31] rounded-none shadow-none min-w-0">
            <CardHeader className="pb-4 pt-6 px-4 sm:px-6 border-b border-[#2a2f31] min-w-0">
              <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 min-w-0">
              <dl className="space-y-5 text-sm min-w-0">
                <div className="min-w-0">
                  <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 flex items-center gap-1.5 break-words"><Calendar className="w-3.5 h-3.5 text-primary shrink-0" /> Created</dt>
                  <dd className="font-medium text-foreground break-words">{format(new Date(opp.createdAt), "MMM d, yyyy h:mm a")}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 flex items-center gap-1.5 break-words"><RefreshCw className="w-3.5 h-3.5 text-primary shrink-0" /> Last Updated</dt>
                  <dd className="font-medium text-foreground break-words">{format(new Date(opp.updatedAt), "MMM d, yyyy h:mm a")}</dd>
                </div>
                {opp.publishedAt && (
                  <div className="min-w-0">
                    <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 flex items-center gap-1.5 break-words"><PlayCircle className="w-3.5 h-3.5 text-primary shrink-0" /> Published</dt>
                    <dd className="font-medium text-foreground break-words">{format(new Date(opp.publishedAt), "MMM d, yyyy")}</dd>
                  </div>
                )}
                {opp.archivedAt && (
                  <div className="min-w-0">
                    <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 flex items-center gap-1.5 break-words">Archived</dt>
                    <dd className="font-medium text-foreground break-words">{format(new Date(opp.archivedAt), "MMM d, yyyy")}</dd>
                  </div>
                )}
                <div className="pt-2 border-t border-[#2a2f31] min-w-0">
                  <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 break-words">System Deadline</dt>
                  <dd className="font-medium text-foreground break-words">{opp.deadline ? format(new Date(opp.deadline), "MMM d, yyyy") : "Not set"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 break-words">Created By</dt>
                  <dd className="font-medium text-foreground break-words">{opp.createdBy}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <MatchingCriteriaPanel id={id} entityType="role" canWrite={canWrite} />

          <Card className="bg-[#171b1d] border border-[#2a2f31] rounded-none shadow-none min-w-0">
            <CardHeader className="pb-4 pt-6 px-4 sm:px-6 border-b border-[#2a2f31] min-w-0">
              <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">Audit History</CardTitle>
              <CardDescription className="text-xs break-words">Recent lifecycle changes</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 min-w-0">
              <div className="relative border-l border-[#2a2f31] ml-2 pl-5 space-y-6 min-w-0">
                {!auditEvents?.length ? (
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#85898a] break-words">No events recorded.</p>
                ) : (
                  auditEvents.map((event) => (
                    <div key={event.id} className="relative min-w-0">
                      <div className="absolute -left-[25px] top-1 w-2 h-2 rounded-full bg-primary ring-4 ring-[#171b1d] shrink-0" />
                      <p className="text-sm font-medium text-foreground capitalize break-words">{event.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-[#85898a] mt-1 break-words">{event.actorName}</p>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-[#85898a] mt-1.5 flex flex-wrap items-center gap-1.5 break-words">
                        <Clock className="w-3 h-3 shrink-0" /> {format(new Date(event.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
