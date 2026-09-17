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
        description: "Role content has been updated."
      });
      queryClient.invalidateQueries({ queryKey: getGetPortalOpportunityQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListPortalOpportunitiesQueryKey() });
      setLocation(`/roles/${id}`);
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error?.data?.error || error?.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh] min-w-0"><Loader2 className="w-8 h-8 animate-spin text-primary shrink-0" /></div>;
  }

  if (error || !opp) {
    return (
      <div className="text-center py-32 border border-[#2a2f31] bg-[#171b1d] px-4 break-words min-w-0">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-6 shrink-0" />
        <h2 className="font-mono text-2xl font-medium mb-3">Role not found</h2>
        <Button variant="outline" className="rounded-none font-mono text-xs uppercase tracking-wider h-11 px-8 mt-6 w-full sm:w-auto" onClick={() => setLocation("/roles")}>Back to Roles</Button>
      </div>
    );
  }

  if (opp.status === "archived") {
    return (
      <div className="text-center py-32 border border-[#2a2f31] bg-[#171b1d] px-4 break-words min-w-0">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-6 shrink-0" />
        <h2 className="font-mono text-2xl font-medium mb-3">Cannot edit archived role</h2>
        <p className="text-muted-foreground mb-8">Restore this role to draft state before editing.</p>
        <Link href={`/roles/${id}`} className="block w-full sm:w-auto">
          <Button variant="outline" className="rounded-none font-mono text-xs uppercase tracking-wider h-11 px-8 w-full sm:w-auto">View Role</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 min-w-0">
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-[#85898a] mb-2 font-mono min-w-0">
        <Link href="/roles" className="hover:text-primary transition-colors flex items-center shrink-0">
          <ChevronLeft className="w-3 h-3 mr-1 shrink-0" /> Roles
        </Link>
        <span className="shrink-0">/</span>
        <Link href={`/roles/${id}`} className="hover:text-primary transition-colors truncate">
          {opp.slug}
        </Link>
        <span className="shrink-0">/</span>
        <span className="shrink-0">Edit</span>
      </div>

      <PageHeader
        title={`Edit ${opp.title}`}
        subtitle="Update content, requirements, and metadata for this role."
      />

      <OpportunityForm 
        initialValues={opp}
        onSubmit={handleSubmit} 
        isSubmitting={update.isPending}
      />
    </div>
  );
}
