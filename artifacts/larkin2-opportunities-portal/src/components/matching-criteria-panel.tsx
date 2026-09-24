import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  AudienceContentType,
  CareerLevel,
  PortalMatchingCriteria,
  PortalMatchingCriteriaInput,
  getGetPortalOpportunityMatchingQueryKey,
  getGetPortalProgrammeMatchingQueryKey,
  useGetPortalOpportunityMatching,
  useGetPortalProgrammeMatching,
  useListPortalOpportunityOptions,
  useUpdatePortalOpportunityMatching,
  useUpdatePortalProgrammeMatching,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const careerLevelOptions: { value: CareerLevel; label: string }[] = [
  { value: "new_entrant", label: "New entrant" },
  { value: "mid_level", label: "Mid-level" },
  { value: "senior", label: "Senior" },
];

type MatchingEntityType = "role" | "programme";

interface MatchingCriteriaPanelProps {
  id: string;
  entityType: MatchingEntityType;
  canWrite: boolean;
}

interface MatchingCriteriaEditorProps {
  entityType: MatchingEntityType;
  canWrite: boolean;
  criteria?: PortalMatchingCriteria;
  isLoading: boolean;
  loadError: boolean;
  isSaving: boolean;
  onSave: (data: PortalMatchingCriteriaInput) => Promise<void>;
  onReload: () => void;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const message = (error as { error?: unknown }).error;
    if (typeof message === "string" && message) return message;
  }
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { error?: unknown } }).data;
    if (typeof data?.error === "string" && data.error) return data.error;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Matching settings could not be saved. Refresh the page and try again.";
}

function splitValues(value: string): string[] {
  return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
}

function MatchingCriteriaEditor({
  entityType,
  canWrite,
  criteria,
  isLoading,
  loadError,
  isSaving,
  onSave,
  onReload,
}: MatchingCriteriaEditorProps) {
  const { data: opportunityOptions } = useListPortalOpportunityOptions();
  const { toast } = useToast();
  const [contentType, setContentType] = useState<AudienceContentType>(
    entityType === "role" ? "role" : "programme",
  );
  const [careerLevels, setCareerLevels] = useState<CareerLevel[]>([]);
  const [craftsText, setCraftsText] = useState("");
  const [tagsText, setTagsText] = useState("");

  useEffect(() => {
    if (!criteria) return;
    setContentType(entityType === "role"
      ? "role"
      : criteria.contentType === "training" ? "training" : "programme");
    setCareerLevels(criteria.careerLevels);
    setCraftsText(criteria.crafts.join("\n"));
    setTagsText(criteria.tags.join("\n"));
  }, [criteria, entityType]);

  const toggleCareerLevel = (level: CareerLevel, checked: boolean) => {
    setCareerLevels((current) => checked
      ? [...new Set([...current, level])]
      : current.filter((item) => item !== level));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: PortalMatchingCriteriaInput = {
      contentType: entityType === "role" ? "role" : contentType,
      careerLevels,
      crafts: splitValues(craftsText),
      tags: splitValues(tagsText),
    };

    try {
      await onSave(input);
      toast({
        title: "Matching settings saved",
        description: "Only audience-matching metadata was updated. Publication status and notifications were not changed.",
      });
    } catch (error: unknown) {
      toast({
        title: "Could not save matching settings",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const craftSuggestions = [...new Set((opportunityOptions?.roleTypes ?? [])
    .filter((option) => option.active)
    .map((option) => option.label))];

  return (
    <Card className="bg-[#171b1d] border border-[#2a2f31] rounded-none shadow-none min-w-0">
      <CardHeader className="pb-4 pt-6 px-4 sm:px-6 border-b border-[#2a2f31] min-w-0">
        <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">
          Audience matching
        </CardTitle>
        <CardDescription className="text-xs text-[#85898a] leading-relaxed">
          Set who this {entityType} should match with. Saving these criteria does not publish content or send notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 min-w-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading matching settings…</p>
        ) : loadError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">Matching settings could not be loaded.</p>
            <Button type="button" variant="outline" className="rounded-none" onClick={onReload}>
              Retry
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 min-w-0">
            <div className="space-y-2 min-w-0">
              <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#85898a] block">
                Content type
              </label>
              {entityType === "role" ? (
                <div className="flex min-h-11 items-center border border-[#2a2f31] bg-[#101315] px-3 font-mono text-sm text-foreground">
                  Role
                </div>
              ) : (
                <select
                  value={contentType === "training" ? "training" : "programme"}
                  onChange={(event) => setContentType(event.target.value as "programme" | "training")}
                  disabled={!canWrite || isSaving}
                  className="flex h-11 w-full min-w-0 border border-[#2a2f31] bg-[#101315] px-3 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:border-primary disabled:opacity-60"
                  aria-label="Content type"
                >
                  <option value="programme">Programme</option>
                  <option value="training">Training</option>
                </select>
              )}
            </div>

            <fieldset className="space-y-3 min-w-0">
              <legend className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#85898a] mb-3">
                Career levels
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {careerLevelOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-11 items-center gap-3 border border-[#2a2f31] bg-[#101315] px-3 text-sm text-foreground cursor-pointer"
                  >
                    <Checkbox
                      checked={careerLevels.includes(option.value)}
                      onCheckedChange={(checked) => toggleCareerLevel(option.value, checked === true)}
                      disabled={!canWrite || isSaving}
                      className="border-[#85898a] data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2 min-w-0">
              <label htmlFor={`matching-crafts-${entityType}`} className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#85898a] block">
                Crafts
              </label>
              <Textarea
                id={`matching-crafts-${entityType}`}
                value={craftsText}
                onChange={(event) => setCraftsText(event.target.value)}
                disabled={!canWrite || isSaving}
                placeholder="Add crafts, one per line"
                className="min-h-[88px] resize-y bg-[#101315] border-[#2a2f31] rounded-none focus-visible:ring-primary focus-visible:border-primary font-mono text-sm min-w-0"
              />
              {craftSuggestions.length > 0 && (
                <div className="space-y-2 min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#85898a]">Portal options</p>
                  <div className="flex flex-wrap gap-2 min-w-0">
                    {craftSuggestions.map((craft) => {
                      const selected = splitValues(craftsText).some((item) => item.toLocaleLowerCase() === craft.toLocaleLowerCase());
                      return (
                        <button
                          key={craft}
                          type="button"
                          aria-pressed={selected}
                          disabled={!canWrite || isSaving}
                          onClick={() => {
                            const current = splitValues(craftsText);
                            const next = selected
                              ? current.filter((item) => item.toLocaleLowerCase() !== craft.toLocaleLowerCase())
                              : [...current, craft];
                            setCraftsText(next.join("\n"));
                          }}
                          className={`min-h-9 border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-[#2a2f31] bg-[#101315] text-foreground hover:border-[#85898a]"
                          }`}
                        >
                          {craft}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-xs text-[#85898a] break-words">
                Enter one or more crafts, separated by lines or commas. Suggestions come from the portal’s existing role-type options.
              </p>
            </div>

            <div className="space-y-2 min-w-0">
              <label htmlFor={`matching-tags-${entityType}`} className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#85898a] block">
                Tags <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <Input
                id={`matching-tags-${entityType}`}
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                disabled={!canWrite || isSaving}
                placeholder="e.g. apprenticeships, engineering"
                className="bg-[#101315] border-[#2a2f31] rounded-none focus-visible:ring-primary focus-visible:border-primary font-mono text-sm h-11 min-w-0"
              />
              <p className="text-xs text-[#85898a]">Separate multiple tags with commas or line breaks.</p>
            </div>

            {!canWrite && (
              <p className="text-xs text-[#85898a]">You have read-only access to matching settings.</p>
            )}
            <Button
              type="submit"
              disabled={!canWrite || isSaving}
              className="w-full sm:w-auto rounded-full h-11 px-6 font-mono text-xs uppercase tracking-wider font-bold"
            >
              {isSaving ? "Saving matching…" : "Save matching settings"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function RoleMatchingCriteriaPanel({ id, canWrite }: Omit<MatchingCriteriaPanelProps, "entityType">) {
  const queryClient = useQueryClient();
  const matchingQuery = useGetPortalOpportunityMatching(id);
  const updateMatching = useUpdatePortalOpportunityMatching();
  const queryKey = getGetPortalOpportunityMatchingQueryKey(id);

  const save = async (data: PortalMatchingCriteriaInput) => {
    const result = await updateMatching.mutateAsync({ id, data });
    queryClient.setQueryData(queryKey, result);
    await queryClient.invalidateQueries({ queryKey });
  };

  return (
    <MatchingCriteriaEditor
      entityType="role"
      canWrite={canWrite}
      criteria={matchingQuery.data}
      isLoading={matchingQuery.isLoading}
      loadError={matchingQuery.isError}
      isSaving={updateMatching.isPending}
      onSave={save}
      onReload={() => { void matchingQuery.refetch(); }}
    />
  );
}

function ProgrammeMatchingCriteriaPanel({ id, canWrite }: Omit<MatchingCriteriaPanelProps, "entityType">) {
  const queryClient = useQueryClient();
  const matchingQuery = useGetPortalProgrammeMatching(id);
  const updateMatching = useUpdatePortalProgrammeMatching();
  const queryKey = getGetPortalProgrammeMatchingQueryKey(id);

  const save = async (data: PortalMatchingCriteriaInput) => {
    const result = await updateMatching.mutateAsync({ id, data });
    queryClient.setQueryData(queryKey, result);
    await queryClient.invalidateQueries({ queryKey });
  };

  return (
    <MatchingCriteriaEditor
      entityType="programme"
      canWrite={canWrite}
      criteria={matchingQuery.data}
      isLoading={matchingQuery.isLoading}
      loadError={matchingQuery.isError}
      isSaving={updateMatching.isPending}
      onSave={save}
      onReload={() => { void matchingQuery.refetch(); }}
    />
  );
}

export function MatchingCriteriaPanel({ id, entityType, canWrite }: MatchingCriteriaPanelProps) {
  return entityType === "role"
    ? <RoleMatchingCriteriaPanel id={id} canWrite={canWrite} />
    : <ProgrammeMatchingCriteriaPanel id={id} canWrite={canWrite} />;
}