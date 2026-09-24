import { useState } from "react";
import { 
  useGetPortalProgramme, 
  useGetPortalSession,
  useTransitionPortalProgramme,
  useDeletePortalProgramme,
  getGetPortalProgrammeQueryKey,
  getListPortalProgrammesQueryKey,
  ProgrammeStatus,
  ProgrammeTransitionStatus,
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
  ChevronLeft, Edit, ExternalLink, Calendar, Loader2, PlayCircle, Eye, RefreshCw, Trash2, ShieldAlert, SlidersHorizontal
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
  status: typeof ProgrammeTransitionStatus[keyof typeof ProgrammeTransitionStatus];
  label: string;
  description: string;
  publicEffect: string;
  remainsPublic: boolean;
}[] = [
  {
    status: "closed",
    label: "Close Applications",
    description: "Keep the opportunity available as a record, but stop accepting applications.",
    publicEffect: "Status set to Closed (will show as closed when public site connects)",
    remainsPublic: true,
  },
  {
    status: "archived",
    label: "Archive Opportunity",
    description: "Remove the opportunity from public listings and keep it in the portal archive.",
    publicEffect: "Status set to Archived (will be hidden when public site connects)",
    remainsPublic: false,
  },
];

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const message = (error as { error?: unknown }).error;
    if (typeof message === "string" && message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "The status could not be changed. Refresh the page and try again.";
}

export default function DetailProgrammePage() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prog, isLoading, error } = useGetPortalProgramme(id);
  const { data: session } = useGetPortalSession();
  
  const transition = useTransitionPortalProgramme();
  const del = useDeletePortalProgramme();

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<typeof ProgrammeTransitionStatus[keyof typeof ProgrammeTransitionStatus]>("closed");
  
  const canWrite = session?.permissions.includes("programmes:write") ?? false;
  const canPublish = session?.permissions.includes("programmes:publish") ?? false;
  const canDelete = session?.permissions.includes("programmes:delete") ?? false;

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh] min-w-0"><Loader2 className="w-8 h-8 animate-spin text-primary shrink-0" /></div>;
  }

  if (error || !prog) {
    return (
      <div className="text-center py-32 border border-[#2a2f31] bg-[#171b1d] px-4 break-words min-w-0">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-6 shrink-0" />
        <h2 className="font-mono text-2xl font-medium mb-3">Opportunity not found</h2>
        <p className="text-muted-foreground mb-8">The opportunity may have been permanently deleted.</p>
        <Button variant="outline" className="rounded-none font-mono text-xs uppercase tracking-wider h-11 px-8 w-full sm:w-auto" onClick={() => setLocation("/opportunities")}>Back to Opportunities</Button>
      </div>
    );
  }

  const handleTransition = async (newStatus: typeof ProgrammeTransitionStatus[keyof typeof ProgrammeTransitionStatus]) => {
    try {
      const updatedProgramme = await transition.mutateAsync({ id, data: { status: newStatus } });

      queryClient.setQueryData(getGetPortalProgrammeQueryKey(id), updatedProgramme);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListPortalProgrammesQueryKey() }),
      ]);

      toast({ title: `Moved to ${newStatus}` });
      setStatusDialogOpen(false);
    } catch (error: unknown) {
      toast({ title: "Status change failed", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await del.mutateAsync({ id });
      toast({ title: "Permanently deleted" });
      setLocation("/opportunities");
      queryClient.invalidateQueries({ queryKey: getListPortalProgrammesQueryKey() });
    } catch (e: any) {
      toast({ title: "Deletion failed", description: e.error, variant: "destructive" });
    }
  };

  const sortedSections = [...prog.sections].sort((a,b) => a.position - b.position);

  const renderActionButtons = () => (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0 min-w-0">
      {canWrite && prog.status !== "archived" && (
        <Link href={`/opportunities/${id}/edit`} className="w-full sm:w-auto block">
          <Button variant="outline" className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider border-border shrink-0">
            <Edit className="w-3.5 h-3.5 mr-2 shrink-0" /> Edit Content
          </Button>
        </Link>
      )}

      {canPublish && prog.status === "draft" && (
        <Button onClick={() => handleTransition("published")} className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider shrink-0">
          <PlayCircle className="w-3.5 h-3.5 mr-2 shrink-0" /> Publish
        </Button>
      )}

      {canPublish && prog.status === "published" && (
        <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-2 shrink-0" /> Change Status
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-xl bg-[#171b1d] border-border rounded-none max-h-[90dvh] overflow-hidden flex flex-col p-4 sm:p-6 min-w-0">
            <AlertDialogHeader className="shrink-0 text-left">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-mono">Published opportunity</p>
              <AlertDialogTitle className="font-mono font-medium tracking-tight text-xl sm:text-2xl text-foreground break-words mt-1">
                Change the status of “{prog.title}”
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed mt-2 break-words">
                Choose how this opportunity should be marked for publication. Once the public website integration is connected, this status will control its visibility.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="my-4 grid gap-2 overflow-y-auto shrink min-h-0 pr-1 min-w-0" role="radiogroup" aria-label="New opportunity status">
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

      {canPublish && prog.status === "closed" && (
        <Button variant="outline" className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider border-border shrink-0" onClick={() => handleTransition("published")}>Re-open</Button>
      )}

      {canPublish && prog.status !== "archived" && prog.status !== "published" && (
        <Button variant="ghost" className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground shrink-0" onClick={() => handleTransition("archived")}>
          Archive
        </Button>
      )}

      {canWrite && prog.status === "archived" && (
        <Button variant="outline" className="w-full sm:w-auto rounded-full h-11 sm:h-10 px-5 font-mono text-xs uppercase tracking-wider border-border shrink-0" onClick={() => handleTransition("draft")}>
          Restore to Draft
        </Button>
      )}

      {canDelete && prog.status === "archived" && (
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
                This action cannot be undone. This will permanently delete the opportunity "{prog.title}" and its history.
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
        <Link href="/opportunities" className="hover:text-primary transition-colors flex items-center shrink-0">
          <ChevronLeft className="w-3 h-3 mr-1 shrink-0" /> Opportunities
        </Link>
        <span className="shrink-0">/</span>
        <span className="truncate">{prog.slug}</span>
      </div>

      <PageHeader
        title={
          <div className="flex items-center gap-4 flex-wrap mt-2 min-w-0">
            <span className="break-words min-w-0">{prog.title}</span>
            <StatusBadge status={prog.status} />
          </div>
        }
        action={renderActionButtons()}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 min-w-0">
        
        {/* Left Col: Public Preview Style */}
        <div className="xl:col-span-2 space-y-6 sm:space-y-8 min-w-0">
          <div className="border border-[#2a2f31] overflow-hidden min-w-0">
            <div className="bg-[#101315] px-4 sm:px-5 py-3 border-b border-[#2a2f31] flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-[#85898a] gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0"><Eye className="w-3.5 h-3.5 text-primary shrink-0" /> <span className="break-words">Content Preview</span></div>
            </div>
            <div className="p-6 sm:p-8 md:p-12 bg-[#171b1d] text-[#f4f1ed] min-w-0">
              <div className="mb-5 min-w-0">
                <span className="text-primary text-[11px] uppercase tracking-[0.18em] break-words">{prog.location}</span>
                {prog.num && <span className="text-muted-foreground text-[11px] uppercase tracking-[0.18em] break-words"> / Cohort {prog.num}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 min-w-0">
                {prog.featured && <span className="border border-primary text-primary px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full shrink-0">Featured</span>}
              </div>
              <h1 className="font-mono text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 sm:mb-8 tracking-tight font-medium leading-[1.05] break-words">{prog.title}</h1>
              <p className="text-[#c6c6c0] text-base sm:text-lg leading-relaxed max-w-2xl mb-10 sm:mb-14 break-words">{prog.shortDescription}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 min-w-0">
                <div className="md:col-span-1 order-2 md:order-1 min-w-0">
                  <div className={`p-5 sm:p-6 border ${prog.status === 'published' ? 'border-primary/30 bg-primary/5' : 'border-white/10 bg-[#101315]'} min-w-0`}>
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-primary mb-4 break-words">
                      Status
                    </div>
                    <h3 className="text-base sm:text-lg font-medium mb-4 sm:mb-5 leading-snug break-words">
                      {prog.applicationStatus}
                    </h3>
                    <div className="text-sm text-[#85898a] space-y-2 break-words">
                      {prog.applicationDeadline && <p>{prog.applicationDeadline}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2 order-1 md:order-2 space-y-10 sm:space-y-12 min-w-0">
                  {sortedSections.length > 0 ? (
                    sortedSections.map(section => (
                      <section key={section.id} className="min-w-0">
                        <h2 className="font-mono text-lg sm:text-xl font-medium mb-4 sm:mb-5 border-b border-[#2a2f31] pb-3 text-foreground break-words capitalize">{section.section.replace('_', ' ')}</h2>
                        <div className="text-[#c6c6c0] text-[15px] min-w-0 leading-relaxed break-words whitespace-pre-wrap">
                          {section.content}
                        </div>
                      </section>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-sm italic">No content sections defined.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Metadata */}
        <div className="space-y-6 sm:space-y-8 min-w-0">
          <Card className="bg-[#171b1d] border border-[#2a2f31] rounded-none shadow-none min-w-0">
            <CardHeader className="pb-4 pt-6 px-4 sm:px-6 border-b border-[#2a2f31] min-w-0">
              <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 min-w-0">
              <dl className="space-y-5 text-sm min-w-0">
                <div className="min-w-0">
                  <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 flex items-center gap-1.5 break-words"><Calendar className="w-3.5 h-3.5 text-primary shrink-0" /> Created</dt>
                  <dd className="font-medium text-foreground break-words">{format(new Date(prog.createdAt), "MMM d, yyyy h:mm a")}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 flex items-center gap-1.5 break-words"><RefreshCw className="w-3.5 h-3.5 text-primary shrink-0" /> Last Updated</dt>
                  <dd className="font-medium text-foreground break-words">{format(new Date(prog.updatedAt), "MMM d, yyyy h:mm a")}</dd>
                </div>
                {prog.publishedAt && (
                  <div className="min-w-0">
                    <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 flex items-center gap-1.5 break-words"><PlayCircle className="w-3.5 h-3.5 text-primary shrink-0" /> Published</dt>
                    <dd className="font-medium text-foreground break-words">{format(new Date(prog.publishedAt), "MMM d, yyyy")}</dd>
                  </div>
                )}
                {prog.archivedAt && (
                  <div className="min-w-0">
                    <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 flex items-center gap-1.5 break-words">Archived</dt>
                    <dd className="font-medium text-foreground break-words">{format(new Date(prog.archivedAt), "MMM d, yyyy")}</dd>
                  </div>
                )}
                <div className="min-w-0">
                  <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 break-words">System Deadline</dt>
                  <dd className="font-medium text-foreground break-words">{prog.deadline ? format(new Date(prog.deadline), "MMM d, yyyy") : "Not set"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 break-words">Display Order</dt>
                  <dd className="font-medium text-foreground break-words">{prog.displayOrder}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#85898a] mb-1.5 break-words">Created By</dt>
                  <dd className="font-medium text-foreground break-words">{prog.createdBy}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <MatchingCriteriaPanel id={id} entityType="programme" canWrite={canWrite} />
        </div>

      </div>
    </div>
  );
}
