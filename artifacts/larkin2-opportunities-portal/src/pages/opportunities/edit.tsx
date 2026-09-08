import { 
  useGetPortalOpportunity, 
  useUpdatePortalOpportunity,
  getGetPortalOpportunityQueryKey 
} from "@workspace/api-client-react";
import { useLocation, useParams, Link } from "wouter";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function EditOpportunityPage() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: opportunity, isLoading, error } = useGetPortalOpportunity(id);
  const updateOpp = useUpdatePortalOpportunity();

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error || !opportunity) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Error loading opportunity</h2>
        <Button onClick={() => setLocation("/opportunities")}>Back to Opportunities</Button>
      </div>
    );
  }

  const handleSubmit = async (data: any) => {
    try {
      const result = await updateOpp.mutateAsync({ id, data });
      
      // Update cache in place to avoid full refetch
      queryClient.setQueryData(getGetPortalOpportunityQueryKey(id), result);
      
      toast({ title: "Opportunity updated", description: "Changes have been saved successfully." });
      setLocation(`/opportunities/${id}`);
    } catch (e: any) {
      toast({ 
        title: "Error updating opportunity", 
        description: e.error || "An unexpected error occurred.", 
        variant: "destructive" 
      });
    }
  };

  // Strip read-only fields for the form
  const initialValues = {
    ...opportunity,
    // Content items come back with IDs, strip them for the form just to match types 
    // or leave them since hook form handles extra fields generally.
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/opportunities/${id}`}>
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-muted/50 hover:bg-accent">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Content</h1>
          <p className="text-muted-foreground mt-1">{opportunity.title}</p>
        </div>
      </div>

      <OpportunityForm 
        initialValues={initialValues}
        onSubmit={handleSubmit} 
        isSubmitting={updateOpp.isPending} 
      />
    </div>
  );
}
