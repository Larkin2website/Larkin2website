import { FormEvent, useMemo, useState } from "react";
import {
  getListPortalOpportunityOptionsQueryKey,
  useCreatePortalOpportunityOption,
  useGetPortalSession,
  useListPortalOpportunityOptions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type OptionKind = "department" | "role_type";

interface OpportunityOptionSelectProps {
  kind: OptionKind;
  value: string;
  onChange: (value: string) => void;
}

export function OpportunityOptionSelect({
  kind,
  value,
  onChange,
}: OpportunityOptionSelectProps) {
  const { data, isLoading, isError } = useListPortalOpportunityOptions();
  const { data: session } = useGetPortalSession();
  const createOption = useCreatePortalOpportunityOption();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const noun = kind === "department" ? "department" : "role type";
  const source = kind === "department" ? data?.departments : data?.roleTypes;
  const options = useMemo(() => {
    const labels = (source ?? []).map((option) => option.label);
    if (value && !labels.includes(value)) {
      const canonicalIndex = labels.findIndex(
        (label) => label.toLocaleLowerCase() === value.toLocaleLowerCase(),
      );
      if (canonicalIndex >= 0) labels[canonicalIndex] = value;
      else labels.unshift(value);
    }
    return labels;
  }, [source, value]);
  const canAdd = session?.permissions.includes("opportunity-options:manage") ?? false;

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const label = newLabel.trim().replace(/\s+/g, " ");
    if (label.length < 2) return;

    try {
      const created = await createOption.mutateAsync({ data: { kind, label } });
      onChange(created.label);
      setNewLabel("");
      setDialogOpen(false);
      toast({ title: `${kind === "department" ? "Department" : "Role type"} added` });
      void queryClient.invalidateQueries({ queryKey: getListPortalOpportunityOptionsQueryKey() });
    } catch (error: any) {
      toast({
        title: `Could not add ${noun}`,
        description: error?.data?.error || error?.error || "Please try a different name.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Select value={value || undefined} onValueChange={onChange} disabled={isLoading}>
          <SelectTrigger className="bg-[#101315] border-[#2a2f31] rounded-none focus:ring-primary font-mono text-sm h-11 sm:h-10 min-w-0">
            <SelectValue placeholder={isLoading ? "Loading options..." : `Select ${noun}`} />
          </SelectTrigger>
          <SelectContent className="max-h-72 rounded-none border-[#2a2f31]">
            {options.map((label) => (
              <SelectItem key={`${kind}-${label}`} value={label} className="font-mono text-sm rounded-none">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isError && (
          <p className="text-xs text-destructive">
            Options could not be loaded. Refresh the page to try again.
          </p>
        )}
        {canAdd && (
          <Button
            type="button"
            variant="ghost"
            className="h-auto p-0 text-[10px] font-mono uppercase tracking-widest text-primary hover:bg-transparent hover:text-[#ff8d57]"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Add new {noun}
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-none border-[#2a2f31] bg-[#171b1d] text-foreground">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="font-mono text-xl font-medium">
                Add {noun}
              </DialogTitle>
              <DialogDescription>
                This option will become available to every opportunity editor.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <Input
                autoFocus
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
                maxLength={100}
                placeholder={`New ${noun} name`}
                className="h-11 rounded-none border-[#2a2f31] bg-[#101315] font-mono"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-none"
                disabled={createOption.isPending || newLabel.trim().length < 2}
              >
                {createOption.isPending ? "Adding..." : `Add ${noun}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}