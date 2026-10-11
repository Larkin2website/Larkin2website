import type { ReactNode } from "react";
import { useFieldArray, type Control, type FieldErrors } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

export const PSI_LINK = "https://www.pact.co.uk/resource/production-support-initiative-updated-and-now-online.html";

export const WORK_ARRANGEMENT_LABELS = {
  in_person: "In person",
  hybrid: "Hybrid",
  work_from_home: "Work from home",
} as const;

export const RECRUITMENT_ROUTE_LABELS = {
  independent: "Independent recruitment",
  production: "Production recruitment (Training & Development)",
} as const;

export const INTERVIEW_FORMAT_LABELS = {
  virtual: "Virtual interviews",
  in_person: "In-person interviews",
  phone_screening: "Phone screenings",
  not_applicable: "N/A - no interviews",
} as const;

export const fieldClasses =
  "bg-[#101315] border-[#2a2f31] rounded-none focus-visible:ring-primary focus-visible:border-primary font-mono text-sm min-w-0 break-words";

type StringListName = "worksCloselyWith" | "technicalQuestions";

interface StringListEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  name: StringListName;
  max: number;
  itemLabel: string;
  addLabel: string;
  emptyText: string;
  multiline?: boolean;
  placeholder?: string;
  errors?: FieldErrors;
}

/** Plain-string list stored as { value } rows so react-hook-form can track keys. */
export function StringListEditor({ control, name, max, itemLabel, addLabel, emptyText, multiline, placeholder, errors }: StringListEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name });
  const rootError = (errors?.[name] as { message?: string; root?: { message?: string } } | undefined);
  const rootMessage = rootError?.message ?? rootError?.root?.message;

  return (
    <div className="space-y-3 min-w-0">
      {fields.length === 0 && (
        <p className="border border-dashed border-[#2a2f31] bg-[#101315] px-4 py-5 text-sm text-[#85898a]">{emptyText}</p>
      )}
      <ol className="space-y-3 min-w-0">
        {fields.map((f, index) => (
          <li key={f.id} className="flex items-start gap-3 min-w-0">
            <span aria-hidden="true" className="mt-3 w-5 shrink-0 text-right font-mono text-[11px] text-primary">{index + 1}.</span>
            <FormField
              control={control}
              name={`${name}.${index}.value`}
              render={({ field }) => (
                <FormItem className="flex-1 min-w-0">
                  <FormControl>
                    {multiline ? (
                      <Textarea {...field} aria-label={`${itemLabel} ${index + 1}`} placeholder={placeholder} className={`${fieldClasses} min-h-[72px] resize-y`} data-testid={`input-${name}-${index}`} />
                    ) : (
                      <Input {...field} aria-label={`${itemLabel} ${index + 1}`} placeholder={placeholder} className={`${fieldClasses} h-11 sm:h-10`} data-testid={`input-${name}-${index}`} />
                    )}
                  </FormControl>
                  <FormMessage className="break-words" />
                </FormItem>
              )}
            />
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`} className="mt-0.5 shrink-0 text-[#85898a] hover:text-destructive hover:bg-destructive/10" onClick={() => remove(index)} data-testid={`button-remove-${name}-${index}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={fields.length >= max} className="h-10 rounded-none border-[#2a2f31] font-mono text-[10px] uppercase tracking-widest hover:bg-[#101315] hover:text-foreground" onClick={() => append({ value: "" })} data-testid={`button-add-${name}`}>
          <Plus className="w-3.5 h-3.5 mr-1" /> {addLabel}
        </Button>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#85898a]">{fields.length} / {max}</span>
      </div>
      {rootMessage && <p className="text-sm font-medium text-destructive break-words">{rootMessage}</p>}
    </div>
  );
}

export function GuidanceNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm leading-relaxed text-[#4e504e] min-w-0">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">{title}</p>
      <div className="space-y-2 break-words">{children}</div>
    </div>
  );
}
