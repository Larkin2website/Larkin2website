import { useCreatePortalProgramme, getListPortalProgrammesQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/brand";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";
import { ProgrammeForm } from "@/components/programmes/programme-form";

export default function NewProgrammePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const create = useCreatePortalProgramme();
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 min-w-0">
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-[#85898a] mb-2 font-mono min-w-0">
        <Link href="/opportunities" className="hover:text-primary transition-colors flex items-center shrink-0">
          <ChevronLeft className="w-3 h-3 mr-1 shrink-0" /> Opportunities
        </Link>
        <span className="shrink-0">/</span>
        <span className="text-foreground shrink-0">New</span>
      </div>

      <PageHeader
        title="New Opportunity"
        subtitle="Create a new opportunity. It will be saved as a draft initially."
      />

      <ProgrammeForm
        isSubmitting={create.isPending}
        onSubmit={async (data) => {
          try {
            const result = await create.mutateAsync({ data });
            toast({ title: "Opportunity created" });
            queryClient.invalidateQueries({ queryKey: getListPortalProgrammesQueryKey() });
            setLocation(`/opportunities/${result.id}`);
          } catch (e: any) {
            toast({
              title: "Failed to create opportunity",
              description: e.error || e.message || "An error occurred",
              variant: "destructive",
            });
          }
        }}
      />
    </div>
  );
}
