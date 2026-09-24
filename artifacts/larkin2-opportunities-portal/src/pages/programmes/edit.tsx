import { 
  useGetPortalProgramme,
  useGetPortalSession,
  useUpdatePortalProgramme,
  getGetPortalProgrammeQueryKey,
  getListPortalProgrammesQueryKey
} from "@workspace/api-client-react";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/brand";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgrammeForm } from "@/components/programmes/programme-form";
import { MatchingCriteriaPanel } from "@/components/matching-criteria-panel";

export default function EditProgrammePage() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: programme, isLoading, error } = useGetPortalProgramme(id);
  const { data: session } = useGetPortalSession();
  const update = useUpdatePortalProgramme();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] min-w-0">
        <Loader2 className="w-8 h-8 animate-spin text-primary shrink-0" />
      </div>
    );
  }

  if (error || !programme) {
    return (
      <div className="text-center py-32 border border-[#2a2f31] bg-[#171b1d] px-4 min-w-0">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-6 shrink-0" />
        <h2 className="font-mono text-2xl font-medium mb-3">Opportunity not found</h2>
        <p className="text-muted-foreground mb-8">It may have been permanently deleted.</p>
        <Button variant="outline" className="rounded-none font-mono text-xs uppercase tracking-wider h-11 px-8" onClick={() => setLocation("/opportunities")}>
          Back to Opportunities
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 min-w-0">
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-[#85898a] mb-2 font-mono break-all min-w-0">
        <Link href="/opportunities" className="hover:text-primary transition-colors flex items-center shrink-0">
          <ChevronLeft className="w-3 h-3 mr-1 shrink-0" /> Opportunities
        </Link>
        <span className="shrink-0">/</span>
        <Link href={`/opportunities/${programme.id}`} className="hover:text-primary transition-colors truncate shrink-0 max-w-[150px]">
          {programme.slug}
        </Link>
        <span className="shrink-0">/</span>
        <span className="text-foreground shrink-0">Edit</span>
      </div>

      <PageHeader
        title={`Edit ${programme.title}`}
        subtitle="Update opportunity details. Changes are saved immediately and will be visible on the public website once integration is complete."
      />

      <ProgrammeForm
        initialValues={programme}
        isSubmitting={update.isPending}
        onSubmit={async (data) => {
          try {
            const result = await update.mutateAsync({ id, data });
            toast({ title: "Opportunity updated" });
            queryClient.setQueryData(getGetPortalProgrammeQueryKey(id), result);
            queryClient.invalidateQueries({ queryKey: getListPortalProgrammesQueryKey() });
            setLocation(`/opportunities/${result.id}`);
          } catch (e: any) {
            toast({
              title: "Failed to update opportunity",
              description: e.error || e.message || "An error occurred",
              variant: "destructive",
            });
          }
        }}
      />
      <MatchingCriteriaPanel
        id={id}
        entityType="programme"
        canWrite={session?.permissions.includes("programmes:write") ?? false}
      />
    </div>
  );
}
