import { useCreatePortalOpportunity } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function NewOpportunityPage() {
  const [, setLocation] = useLocation();
  const createOpp = useCreatePortalOpportunity();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      const result = await createOpp.mutateAsync({ data });
      toast({ title: "Draft created", description: "The opportunity has been saved as a draft." });
      setLocation(`/opportunities/${result.id}`);
    } catch (e: any) {
      toast({ 
        title: "Error creating opportunity", 
        description: e.error || "An unexpected error occurred.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/opportunities">
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-muted/50 hover:bg-accent">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Opportunity</h1>
          <p className="text-muted-foreground mt-1">Draft a new public role posting.</p>
        </div>
      </div>

      <OpportunityForm 
        onSubmit={handleSubmit} 
        isSubmitting={createOpp.isPending} 
      />
    </div>
  );
}
