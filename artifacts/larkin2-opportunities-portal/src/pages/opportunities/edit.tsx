import { 
  useGetPortalOpportunity, 
  useUpdatePortalOpportunity,
  OpportunityInput,
  getGetPortalOpportunityQueryKey,
  getListPortalOpportunitiesQueryKey
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/brand";

export default function EditOpportunityPage() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: opp, isLoading, error } = useGetPortalOpportunity(id);
  const update = useUpdatePortalOpportunity();

  const handleSubmit = async (data: OpportunityInput) => {
    try {
      await update.mutateAsync({ id, data });
      toast({
        title: "Changes saved",
        description: "Opportunity content has been updated."
      });
      queryClient.invalidateQueries({ queryKey: getGetPortalOpportunityQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListPortalOpportunitiesQueryKey() });
      setLocation(`/opportunities/${id}`);
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.error || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error || !opp) {
    return (
      <div className="text-center py-32 border border-[#2a2f31] bg-[#171b1d]">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-6" />
        <h2 className="font-mono text-2xl font-medium mb-3">Opportunity not found</h2>
        <Button variant="outline" className="rounded-none font-mono text-xs uppercase tracking-wider h-11 px-8 mt-6" onClick={() => setLocation("/opportunities")}>Back to Opportunities</Button>
      </div>
    );
  }

  if (opp.status === "archived") {
    return (
      <div className="text-center py-32 border border-[#2a2f31] bg-[#171b1d]">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-6" />
        <h2 className="font-mono text-2xl font-medium mb-3">Cannot edit archived opportunity</h2>
        <p className="text-muted-foreground mb-8">Restore this opportunity to draft state before editing.</p>
        <Link href={`/opportunities/${id}`}>
          <Button variant="outline" className="rounded-none font-mono text-xs uppercase tracking-wider h-11 px-8">View Opportunity</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-[#85898a] mb-2 font-mono">
        <Link href="/opportunities" className="hover:text-primary transition-colors flex items-center">
          <ChevronLeft className="w-3 h-3 mr-1" /> Opportunities
        </Link>
        <span>/</span>
        <Link href={`/opportunities/${id}`} className="hover:text-primary transition-colors">
          {opp.slug}
        </Link>
        <span>/</span>
        <span>Edit</span>
      </div>

      <PageHeader
        title={`Edit ${opp.title}`}
        subtitle="Update content, requirements, and metadata for this opportunity."
      />

      <OpportunityForm 
        initialValues={opp}
        onSubmit={handleSubmit} 
        isSubmitting={update.isPending}
      />
    </div>
  );
}