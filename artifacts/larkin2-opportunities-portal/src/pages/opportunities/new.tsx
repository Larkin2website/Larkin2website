import { useCreatePortalOpportunity, OpportunityInput } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/brand";

export default function NewOpportunityPage() {
  const [, setLocation] = useLocation();
  const create = useCreatePortalOpportunity();
  const { toast } = useToast();

  const handleSubmit = async (data: OpportunityInput) => {
    try {
      const result = await create.mutateAsync({ data });
      toast({
        title: "Draft created",
        description: "Opportunity has been saved as a draft."
      });
      setLocation(`/opportunities/${result.id}`);
    } catch (error: any) {
      toast({
        title: "Failed to create",
        description: error?.data?.error || error?.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-8 pb-20 min-w-0">
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-[#85898a] mb-2 font-mono min-w-0">
        <Link href="/opportunities" className="hover:text-primary transition-colors flex items-center shrink-0">
          <ChevronLeft className="w-3 h-3 mr-1 shrink-0" /> Opportunities
        </Link>
        <span className="shrink-0">/</span>
        <span className="shrink-0">New</span>
      </div>

      <PageHeader
        title="Create Opportunity"
        subtitle="Draft a new public opportunity for the careers portal."
      />

      <OpportunityForm 
        onSubmit={handleSubmit} 
        isSubmitting={create.isPending}
      />
    </div>
  );
}
