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
  OpportunityStatus
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/pages/dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, Edit, ExternalLink, Activity, Calendar, Clock, Loader2, PlayCircle, Eye, RefreshCw, Trash2
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
  const canWrite = session?.permissions.includes("opportunities:write") ?? false;
  const canPublish = session?.permissions.includes("opportunities:publish") ?? false;
  const canDelete = session?.permissions.includes("opportunities:delete") ?? false;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error || !opp) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Opportunity not found</h2>
        <Button onClick={() => setLocation("/opportunities")}>Back to Opportunities</Button>
      </div>
    );
  }

  const handleTransition = async (newStatus: OpportunityStatus) => {
    try {
      await transition.mutateAsync({ id, data: { status: newStatus } });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: getGetPortalOpportunityQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListPortalOpportunitiesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPortalDashboardQueryKey() });
      
      toast({ title: `Moved to ${newStatus}` });
    } catch (e: any) {
      toast({ title: "Action failed", description: e.error, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await del.mutateAsync({ id, data: { confirm: "DELETE" } });
      toast({ title: "Permanently deleted" });
      setLocation("/opportunities");
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

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/opportunities">
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-muted/50 hover:bg-accent shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{opp.title}</h1>
              <StatusBadge status={opp.status} />
            </div>
            <p className="text-muted-foreground mt-1">/{opp.slug}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {canWrite && opp.status !== "archived" && (
            <Link href={`/opportunities/${id}/edit`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" /> Edit Content
              </Button>
            </Link>
          )}
          
          {canPublish && opp.status === "draft" && (
            <Button onClick={() => handleTransition("published")}>
              <PlayCircle className="w-4 h-4 mr-2" /> Publish
            </Button>
          )}
          
          {canPublish && opp.status === "published" && (
            <>
              <Button variant="outline" onClick={() => handleTransition("draft")}>Unpublish</Button>
              <Button variant="outline" onClick={() => handleTransition("closed")}>Close Applications</Button>
              <Button onClick={() => handleTransition("filled")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Mark Filled
              </Button>
            </>
          )}

          {canPublish && opp.status === "closed" && (
            <>
              <Button variant="outline" onClick={() => handleTransition("published")}>Re-open</Button>
              <Button onClick={() => handleTransition("filled")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Mark Filled
              </Button>
            </>
          )}

          {canPublish && opp.status !== "archived" && (
            <Button variant="secondary" onClick={() => handleTransition("archived")}>
              Archive
            </Button>
          )}

          {canPublish && opp.status === "archived" && (
            <Button variant="secondary" onClick={() => handleTransition("draft")}>
              Restore to Draft
            </Button>
          )}

          {canDelete && opp.status === "archived" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the opportunity "{opp.title}" and its history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4">
                  <label className="text-sm font-medium mb-2 block text-foreground">Type DELETE to confirm:</label>
                  <input 
                    type="text" 
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button 
                    variant="destructive" 
                    disabled={deleteConfirmText !== "DELETE" || del.isPending} 
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Public Preview Style */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-2">
            <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Public Layout Preview</div>
              {opp.status === "published" && <a href={`/larkin2-opportunities/roles/${opp.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary"><ExternalLink className="w-3 h-3" /> Live URL</a>}
            </div>
            <div className="p-6 md:p-10 bg-[#080a0c] text-[#f4f1ed]">
              {/* Inline public styles matching the requested look */}
              <div className="mb-4">
                <span className="text-[#f4773f] text-[11px] uppercase tracking-[0.18em]">{opp.publicationLabel} / {opp.department}</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {opp.deadlineExtended && <span className="bg-[#f4773f] text-[#080a0c] px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full">Deadline extended</span>}
                {opp.urgent && <span className="bg-[#f4773f] text-[#080a0c] px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full">Urgent</span>}
                {opp.featured && <span className="border border-[#f4773f] text-[#f4773f] px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full">Featured</span>}
              </div>
              <h1 className="font-mono text-4xl md:text-5xl mb-6 tracking-tight">{opp.title}</h1>
              <p className="text-[#c6c6c0] text-lg leading-relaxed max-w-2xl mb-12">{opp.summary}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 order-2 md:order-1">
                  <div className={`p-6 border ${opp.status === 'published' ? 'border-[#f4773f]/30 bg-[#f4773f]/5' : 'border-white/10 bg-white/5'} rounded-lg`}>
                    <div className="text-[11px] uppercase tracking-widest text-[#f4773f] mb-3">
                      {opp.status === 'published' ? "Applications open" : "Applications unavailable"}
                    </div>
                    <h3 className="text-xl font-medium mb-4">
                      {opp.status === 'published' ? "This role is accepting applications." : `This role is ${opp.status.toLowerCase()}.`}
                    </h3>
                    <div className="text-sm text-[#c6c6c0] space-y-2">
                      <p>{opp.applicationDeadline}</p>
                      {opp.responseDate && <p>{opp.responseDate}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2 order-1 md:order-2 space-y-10">
                  {responsibilities.length > 0 && (
                    <section>
                      <h2 className="text-xl font-medium mb-4 border-b border-white/10 pb-2">About the role</h2>
                      <ul className="list-disc pl-5 space-y-2 text-[#c6c6c0]">
                        {responsibilities.map(r => <li key={r.id}>{r.content}</li>)}
                      </ul>
                    </section>
                  )}
                  {essentials.length > 0 && (
                    <section>
                      <h2 className="text-xl font-medium mb-4 border-b border-white/10 pb-2">Essential experience</h2>
                      <ul className="list-disc pl-5 space-y-2 text-[#c6c6c0]">
                        {essentials.map(e => <li key={e.id}>{e.content}</li>)}
                      </ul>
                    </section>
                  )}
                  {desired.length > 0 && (
                    <section>
                      <h2 className="text-xl font-medium mb-4 border-b border-white/10 pb-2">Desired experience</h2>
                      <ul className="list-disc pl-5 space-y-2 text-[#c6c6c0]">
                        {desired.map(d => <li key={d.id}>{d.content}</li>)}
                      </ul>
                    </section>
                  )}
                  {sortedDetails.length > 0 && (
                    <section>
                      <h2 className="text-xl font-medium mb-4 border-b border-white/10 pb-2">Role details</h2>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                        {sortedDetails.map((detail, idx) => (
                          <div key={idx}>
                            <dt className="text-sm text-[#85898a] mb-1">{detail.label}</dt>
                            <dd className="text-[#f4f1ed]">{detail.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Metadata & Audit */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Created</dt>
                  <dd className="font-medium text-foreground">{format(new Date(opp.createdAt), "MMM d, yyyy h:mm a")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Last Updated</dt>
                  <dd className="font-medium text-foreground">{format(new Date(opp.updatedAt), "MMM d, yyyy h:mm a")}</dd>
                </div>
                {opp.publishedAt && (
                  <div>
                    <dt className="text-muted-foreground mb-1 flex items-center gap-1.5"><PlayCircle className="w-3.5 h-3.5" /> Published</dt>
                    <dd className="font-medium text-foreground">{format(new Date(opp.publishedAt), "MMM d, yyyy")}</dd>
                  </div>
                )}
                {opp.archivedAt && (
                  <div>
                    <dt className="text-muted-foreground mb-1">Archived</dt>
                    <dd className="font-medium text-foreground">{format(new Date(opp.archivedAt), "MMM d, yyyy")}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground mb-1">System Deadline</dt>
                  <dd className="font-medium text-foreground">{opp.deadline ? format(new Date(opp.deadline), "MMM d, yyyy") : "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Created By</dt>
                  <dd className="font-medium text-foreground truncate">{opp.createdBy}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Audit History</CardTitle>
              <CardDescription>Recent lifecycle changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-border ml-3 pl-4 space-y-6">
                {!auditEvents?.length ? (
                  <p className="text-sm text-muted-foreground">No events recorded.</p>
                ) : (
                  auditEvents.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-border ring-4 ring-card" />
                      <p className="text-sm font-medium text-foreground">{event.action.replace(/_/g, " ").toLowerCase()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.actorName}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {format(new Date(event.createdAt), "MMM d, h:mm a")}
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
