import { useState } from "react";
import { useForm, useFieldArray, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  type Opportunity,
  type OpportunityInput,
  type OpportunityContentItemInputSection,
  PRODUCTION_CULTURE,
  PRODUCTION_COMMITMENTS,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, GripVertical, Lock, ExternalLink, AlertCircle } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpportunityOptionSelect } from "@/components/opportunities/opportunity-option-select";
import {
  GuidanceNote,
  INTERVIEW_FORMAT_LABELS,
  PSI_LINK,
  RECRUITMENT_ROUTE_LABELS,
  StringListEditor,
  WORK_ARRANGEMENT_LABELS,
  fieldClasses,
} from "@/components/opportunities/role-profile-fields";

const isCalendarDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const optionalText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);

const opportunitySchema = z
  .object({
    slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase alphanumeric and hyphens only"),
    title: z.string().min(2).max(160),
    publicationLabel: z.string().min(2).max(100),
    department: z.string().min(2).max(100),
    roleType: z.string().min(2).max(100),
    summary: z.string().min(20, "Role purpose needs at least 20 characters").max(2000),
    applicationDeadline: z.string().min(2).max(500),
    responseDate: z.string().max(500).optional().nullable(),
    applicationUrl: z
      .string()
      .trim()
      .max(2000)
      .refine((v) => v === "" || isHttpUrl(v), "Enter a full web address starting with http:// or https://"),
    deadline: z.string().optional().nullable(),
    deadlineExtended: z.boolean().default(false),
    featured: z.boolean().default(false),
    urgent: z.boolean().default(false),
    contentItems: z.array(
      z.object({
        section: z.enum(["responsibility", "essential", "desired"]),
        position: z.number().min(0),
        content: z.string().trim().min(1, "Enter text or remove this item").max(1000),
      }),
    ).max(100),
    details: z.array(
      z.object({
        position: z.number().min(0),
        label: z.string().trim().min(1, "Add a label or remove this row").max(80),
        value: z.string().trim().min(1, "Add a value or remove this row").max(2000),
      }),
    ).max(30),
    // Role profile
    location: optionalText(2000),
    accountableTo: optionalText(500),
    contractDatesHours: optionalText(2000),
    workArrangement: z.enum(["", "in_person", "hybrid", "work_from_home"]),
    worksCloselyWith: z.array(z.object({ value: z.string().trim().min(1, "Enter text or remove this group").max(500) })).max(5, "Up to five groups"),
    additionalInformation: optionalText(4000),
    // How to apply
    applicationEmail: z
      .string()
      .trim()
      .max(320)
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address"),
    applicationClosingDate: z.string().refine((v) => v === "" || isCalendarDate(v), "Enter a real calendar date"),
    applicationClosingTime: z.string().refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Use 24-hour time, e.g. 17:00"),
    applicationInstructions: optionalText(4000),
    trainingApplicationInstructions: optionalText(4000),
    // Internal planning
    recruitmentRoute: z.enum(["", "independent", "production"]),
    shortlistSize: z
      .string()
      .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 5 && Number(v) <= 10), "Choose a whole number from 5 to 10"),
    interviewFormat: z.enum(["", "virtual", "in_person", "phone_screening", "not_applicable"]),
    interviewDates: optionalText(1000),
    technicalQuestions: z.array(z.object({ value: z.string().trim().min(1, "Enter a question or remove it").max(1000) })).max(3, "Up to three questions"),
  })
  .superRefine((v, ctx) => {
    if (v.applicationEmail && v.applicationUrl) {
      const message = "Applications go to either an email address or a platform, not both. Clear one of them.";
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["applicationEmail"], message });
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["applicationUrl"], message });
    }
    if (v.applicationClosingTime && !v.applicationClosingDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["applicationClosingDate"], message: "Add the closing date for this closing time" });
    }
  });

export type OpportunityFormValues = z.infer<typeof opportunitySchema>;

type TabKey = "basics" | "profile" | "content" | "details" | "apply" | "planning";

const TABS: { key: TabKey; label: string }[] = [
  { key: "basics", label: "Basics & Meta" },
  { key: "profile", label: "Role Profile" },
  { key: "content", label: "Lists & Content" },
  { key: "details", label: "Key Details" },
  { key: "apply", label: "How to Apply" },
  { key: "planning", label: "Internal Planning" },
];

const FIELD_TAB: Record<string, TabKey> = {
  slug: "basics", title: "basics", publicationLabel: "basics", department: "basics", roleType: "basics", summary: "basics",
  applicationDeadline: "basics", responseDate: "basics", deadline: "basics",
  location: "profile", accountableTo: "profile", contractDatesHours: "profile", workArrangement: "profile", worksCloselyWith: "profile", additionalInformation: "profile",
  contentItems: "content",
  details: "details",
  applicationEmail: "apply", applicationUrl: "apply", applicationClosingDate: "apply", applicationClosingTime: "apply", applicationInstructions: "apply", trainingApplicationInstructions: "apply",
  recruitmentRoute: "planning", shortlistSize: "planning", interviewFormat: "planning", interviewDates: "planning", technicalQuestions: "planning",
};

const SECTION_COPY: Record<OpportunityContentItemInputSection, { title: string; prompt: string; add: string; item: string }> = {
  responsibility: {
    title: "Scope of Role",
    prompt: "What are the key responsibilities for someone in this role? Around 5-8 points is a useful guide.",
    add: "Add Responsibility",
    item: "Scope of role item",
  },
  essential: {
    title: "Essential Knowledge, Skills & Experience",
    prompt: "List only what is genuinely needed to do the role effectively. Avoid anything that could be learned on the job or supported through the production (Access, People & Culture, Sustainability or Training).",
    add: "Add Essential",
    item: "Essential requirement",
  },
  desired: {
    title: "Desired (but not essential)",
    prompt: "Helpful extras that will not rule anyone out.",
    add: "Add Desired",
    item: "Desired requirement",
  },
};

const isLocationLabel = (label: string) => label.trim().toLowerCase() === "location";

interface OpportunityFormProps {
  initialValues?: Partial<Opportunity>;
  onSubmit: (data: OpportunityInput) => void;
  isSubmitting?: boolean;
}

function buildDefaults(initial?: Partial<Opportunity>): OpportunityFormValues {
  const details = [...(initial?.details ?? [])]
    .sort((a, b) => a.position - b.position)
    .map(({ position, label, value }) => ({ position, label, value }));
  const locationRow = details.find((d) => isLocationLabel(d.label));
  const sectionOrder = { responsibility: 0, essential: 1, desired: 2 } as const;
  const contentItems = [...(initial?.contentItems ?? [])]
    .sort((a, b) => sectionOrder[a.section] - sectionOrder[b.section] || a.position - b.position)
    .map(({ section, position, content }) => ({ section, position, content }));

  return {
    slug: initial?.slug ?? "",
    title: initial?.title ?? "",
    publicationLabel: initial?.publicationLabel ?? "Roles",
    department: initial?.department ?? "",
    roleType: initial?.roleType ?? "full time",
    summary: initial?.summary ?? "",
    applicationDeadline: initial?.applicationDeadline ?? "",
    responseDate: initial?.responseDate ?? "",
    applicationUrl: initial?.applicationUrl ?? "",
    deadline: initial?.deadline ?? "",
    deadlineExtended: initial?.deadlineExtended ?? false,
    featured: initial?.featured ?? false,
    urgent: initial?.urgent ?? false,
    contentItems,
    details: details.filter((d) => d !== locationRow),
    location: locationRow?.value ?? "",
    accountableTo: initial?.accountableTo ?? "",
    contractDatesHours: initial?.contractDatesHours ?? "",
    workArrangement: initial?.workArrangement ?? "",
    worksCloselyWith: (initial?.worksCloselyWith ?? []).map((value) => ({ value })),
    additionalInformation: initial?.additionalInformation ?? "",
    applicationEmail: initial?.applicationEmail ?? "",
    applicationClosingDate: initial?.applicationClosingDate ?? "",
    applicationClosingTime: initial?.applicationClosingTime ?? "",
    applicationInstructions: initial?.applicationInstructions ?? "",
    trainingApplicationInstructions: initial?.trainingApplicationInstructions ?? "",
    recruitmentRoute: initial?.recruitmentRoute ?? "",
    shortlistSize: initial?.shortlistSize != null ? String(initial.shortlistSize) : "",
    interviewFormat: initial?.interviewFormat ?? "",
    interviewDates: initial?.interviewDates ?? "",
    technicalQuestions: (initial?.technicalQuestions ?? []).map((value) => ({ value })),
  };
}

export function OpportunityForm({ initialValues, onSubmit, isSubmitting }: OpportunityFormProps) {
  const [tab, setTab] = useState<TabKey>("basics");
  const [initialLocationIndex] = useState(() => {
    const sorted = [...(initialValues?.details ?? [])].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((d) => isLocationLabel(d.label));
    return idx === -1 ? null : idx;
  });
  const [errorTabs, setErrorTabs] = useState<TabKey[]>([]);

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: buildDefaults(initialValues),
    shouldFocusError: false,
  });

  const { fields: contentFields, append: appendContent, remove: removeContent } = useFieldArray({
    control: form.control,
    name: "contentItems",
  });

  const { fields: detailFields, append: appendDetail, remove: removeDetail } = useFieldArray({
    control: form.control,
    name: "details",
  });

  const recruitmentRoute = form.watch("recruitmentRoute");
  const errors = form.formState.errors;

  const handleFormSubmit = (data: OpportunityFormValues) => {
    setErrorTabs([]);
    const counters: Record<string, number> = { responsibility: 0, essential: 0, desired: 0 };
    const contentItems = data.contentItems.map((item) => ({
      section: item.section,
      content: item.content.trim(),
      position: counters[item.section]++,
    }));

    const rows = data.details.map(({ label, value }) => ({ label: label.trim(), value: value.trim() }));
    const location = data.location.trim();
    if (location) {
      const at = initialLocationIndex === null ? rows.length : Math.min(initialLocationIndex, rows.length);
      rows.splice(at, 0, { label: "Location", value: location });
    }
    const details = rows.map((row, position) => ({ ...row, position }));
    const orNull = (v: string) => (v.trim() ? v.trim() : null);

    const cleaned: OpportunityInput = {
      slug: data.slug,
      title: data.title,
      publicationLabel: data.publicationLabel,
      department: data.department,
      roleType: data.roleType,
      summary: data.summary,
      applicationDeadline: data.applicationDeadline,
      responseDate: data.responseDate || null,
      applicationUrl: orNull(data.applicationUrl),
      deadline: data.deadline || null,
      deadlineExtended: data.deadlineExtended,
      featured: data.featured,
      urgent: data.urgent,
      contentItems,
      details,
      accountableTo: orNull(data.accountableTo),
      contractDatesHours: orNull(data.contractDatesHours),
      workArrangement: data.workArrangement || null,
      worksCloselyWith: data.worksCloselyWith.map((w) => w.value.trim()),
      additionalInformation: orNull(data.additionalInformation),
      applicationEmail: orNull(data.applicationEmail),
      applicationClosingDate: data.applicationClosingDate || null,
      applicationClosingTime: data.applicationClosingTime || null,
      applicationInstructions: orNull(data.applicationInstructions),
      trainingApplicationInstructions: orNull(data.trainingApplicationInstructions),
      recruitmentRoute: data.recruitmentRoute || null,
      shortlistSize: data.shortlistSize ? Number(data.shortlistSize) : null,
      interviewFormat: data.interviewFormat || null,
      interviewDates: orNull(data.interviewDates),
      technicalQuestions: data.technicalQuestions.map((q) => q.value.trim()),
    };
    onSubmit(cleaned);
  };

  const handleInvalid = (formErrors: FieldErrors<OpportunityFormValues>) => {
    const keys = Object.keys(formErrors);
    const tabs = TABS.map((t) => t.key).filter((key) => keys.some((k) => FIELD_TAB[k] === key));
    setErrorTabs(tabs);
    if (tabs.length) setTab(tabs[0]);
    const first = keys.find((k) => FIELD_TAB[k] === tabs[0]);
    if (first) {
      window.setTimeout(() => {
        try {
          form.setFocus(first as keyof OpportunityFormValues);
        } catch {
          /* list fields focus via their own rows */
        }
      }, 60);
    }
  };

  const autoGenerateSlug = (title: string) => {
    if (form.getValues("slug")) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    form.setValue("slug", slug, { shouldValidate: true });
  };

  const sharedInputClasses = `${fieldClasses} h-11 sm:h-10`;
  const sharedLabelClasses = "font-mono text-[10px] uppercase tracking-[0.1em] text-[#85898a] mb-2 break-words";
  const textareaClasses = `${fieldClasses} min-h-[120px] resize-y`;
  const cardClasses = "bg-[#171b1d] border-[#2a2f31] rounded-none shadow-none min-w-0";
  const headerClasses = "border-b border-[#2a2f31] pb-4 pt-6 px-4 sm:px-8 min-w-0";
  const titleClasses = "font-mono text-sm uppercase tracking-widest font-medium break-words";
  const outlineBtn = "w-full sm:w-auto h-11 sm:h-9 rounded-none border-[#2a2f31] font-mono text-[10px] uppercase tracking-widest hover:bg-[#101315] hover:text-foreground shrink-0";
  const radioRow = "flex items-start gap-3 border border-[#2a2f31] bg-[#101315] px-3 py-3 cursor-pointer has-[button[data-state=checked]]:border-primary min-w-0";
  const hasTabError = (key: TabKey) => errorTabs.includes(key) && Object.keys(errors).some((k) => FIELD_TAB[k] === key);

  const renderRadioField = (
    name: "workArrangement" | "recruitmentRoute" | "interviewFormat",
    label: string,
    options: Record<string, string>,
    description?: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-0">
          <FormLabel className={sharedLabelClasses}>{label}</FormLabel>
          {description && <FormDescription className="text-xs text-[#85898a] break-words">{description}</FormDescription>}
          <FormControl>
            <RadioGroup
              value={field.value || "none"}
              onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0"
              aria-label={label}
            >
              {Object.entries(options).map(([value, text]) => (
                <label key={value} className={radioRow}>
                  <RadioGroupItem value={value} className="mt-0.5 shrink-0" data-testid={`radio-${name}-${value}`} />
                  <span className="text-sm break-words min-w-0">{text}</span>
                </label>
              ))}
              <label className={radioRow}>
                <RadioGroupItem value="none" className="mt-0.5 shrink-0" data-testid={`radio-${name}-none`} />
                <span className="text-sm text-[#85898a]">Not set</span>
              </label>
            </RadioGroup>
          </FormControl>
          <FormMessage className="break-words" />
        </FormItem>
      )}
    />
  );

  const textField = (
    name: "accountableTo" | "contractDatesHours" | "location" | "additionalInformation" | "applicationInstructions" | "trainingApplicationInstructions" | "interviewDates",
    label: string,
    opts: { placeholder?: string; description?: string; multiline?: boolean } = {},
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-0">
          <FormLabel className={sharedLabelClasses}>{label}</FormLabel>
          <FormControl>
            {opts.multiline ? (
              <Textarea className={textareaClasses} placeholder={opts.placeholder} {...field} data-testid={`input-${name}`} />
            ) : (
              <Input className={sharedInputClasses} placeholder={opts.placeholder} {...field} data-testid={`input-${name}`} />
            )}
          </FormControl>
          {opts.description && <FormDescription className="text-xs text-[#85898a] mt-1 break-words">{opts.description}</FormDescription>}
          <FormMessage className="break-words" />
        </FormItem>
      )}
    />
  );

  const errorCount = Object.keys(errors).length;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit, handleInvalid)} className="space-y-8 sm:space-y-12 min-w-0" noValidate>
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full min-w-0">
          <TabsList className="w-full justify-start border-b border-[#2a2f31] rounded-none h-auto sm:h-14 bg-transparent p-0 mb-6 sm:mb-8 space-x-6 sm:space-x-8 overflow-x-auto flex-nowrap hide-scrollbar whitespace-nowrap shrink-0">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                data-testid={`tab-${t.key}`}
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 h-12 sm:h-auto pb-3 sm:pb-4 pt-2 font-mono text-xs uppercase tracking-wider text-[#85898a] data-[state=active]:text-foreground shrink-0 gap-1.5"
              >
                {t.key === "planning" && <Lock className="w-3 h-3" aria-hidden="true" />}
                {t.label}
                {hasTabError(t.key) && (
                  <>
                    <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
                    <span className="sr-only">(has errors)</span>
                  </>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="basics" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <Card className={cardClasses}>
              <CardHeader className={headerClasses}>
                <CardTitle className={titleClasses}>Core Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-8 min-w-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 min-w-0">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Role Title</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} {...field} data-testid="input-title" onBlur={(e) => {
                            field.onBlur();
                            autoGenerateSlug(e.target.value);
                          }} />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>URL Slug</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} {...field} data-testid="input-slug" />
                        </FormControl>
                        <FormDescription className="text-xs text-[#85898a] mt-1">Generated from the title. Lowercase letters, numbers and hyphens.</FormDescription>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Department</FormLabel>
                        <OpportunityOptionSelect kind="department" value={field.value} onChange={field.onChange} />
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roleType"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Role Type</FormLabel>
                        <OpportunityOptionSelect kind="role_type" value={field.value} onChange={field.onChange} />
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="publicationLabel"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Publication Label (Eyebrow)</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} {...field} data-testid="input-publication-label" />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel className={sharedLabelClasses}>Role Purpose (Summary)</FormLabel>
                      <FormControl>
                        <Textarea className={`${fieldClasses} min-h-[140px] resize-y`} {...field} data-testid="input-summary" />
                      </FormControl>
                      <FormDescription className="text-xs text-[#85898a] mt-1 break-words">
                        What is the core purpose of this role on the production? What does it exist to support or deliver? One or two sentences is enough. Shown on cards and at the top of the public page.
                      </FormDescription>
                      <FormMessage className="break-words" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className={cardClasses}>
              <CardHeader className={headerClasses}>
                <CardTitle className={titleClasses}>Listing Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-8 min-w-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 min-w-0">
                  <FormField
                    control={form.control}
                    name="applicationDeadline"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Application Deadline Text</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} {...field} data-testid="input-application-deadline" />
                        </FormControl>
                        <FormDescription className="text-xs text-[#85898a] mt-1 break-words">Shown as plain text in the status panel</FormDescription>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responseDate"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Response Date Text (Optional)</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} {...field} value={field.value || ""} data-testid="input-response-date" />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>System Deadline Date (Optional)</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} type="date" {...field} value={field.value ? field.value.split("T")[0] : ""} data-testid="input-deadline" />
                        </FormControl>
                        <FormDescription className="text-xs text-[#85898a] mt-1 break-words">Used for sorting and "closing soon" calculations</FormDescription>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-[#85898a] break-words">The closing date, time and destination from the role profile live under How to Apply.</p>
              </CardContent>
            </Card>

            <Card className={cardClasses}>
              <CardHeader className={headerClasses}>
                <CardTitle className={titleClasses}>Badges & Flags</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-8 min-w-0">
                <div className="flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-12">
                  {([
                    ["urgent", "Urgent Fill", "Shows urgent badge"],
                    ["featured", "Featured", "Highlights on listing"],
                    ["deadlineExtended", "Deadline Extended", "Shows extension badge"],
                  ] as const).map(([name, label, desc]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 min-w-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid={`checkbox-${name}`} className="border-[#85898a] data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0" />
                          </FormControl>
                          <div className="space-y-1 leading-none min-w-0">
                            <FormLabel className="font-mono text-xs uppercase tracking-wider break-words">{label}</FormLabel>
                            <FormDescription className="text-[10px] text-[#85898a] break-words">{desc}</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <Card className={cardClasses}>
              <CardHeader className={headerClasses}>
                <CardTitle className={titleClasses}>Role Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-8 min-w-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 min-w-0">
                  {textField("accountableTo", "Accountable To", { description: "The role this position reports to." })}
                  {textField("location", "Location", { description: "Saved as the Location row in Key Details." })}
                </div>
                {textField("contractDatesHours", "Contract Dates / Hours", {
                  multiline: true,
                  description: "Inclusive of planned production hiatuses and shutdown periods.",
                })}
                {renderRadioField("workArrangement", "Work Arrangement", WORK_ARRANGEMENT_LABELS)}
                <div className="space-y-3 min-w-0">
                  <p className={sharedLabelClasses}>Works Closely With</p>
                  <p className="text-xs text-[#85898a] break-words">
                    The main teams, roles or groups this role works with day to day. Not a full list - just enough to picture the working relationships. Four or five groups at most, in production-friendly language.
                  </p>
                  <StringListEditor
                    control={form.control}
                    name="worksCloselyWith"
                    max={5}
                    itemLabel="Works closely with group"
                    addLabel="Add Group"
                    emptyText="No groups listed yet."
                    errors={errors}
                  />
                </div>
                {textField("additionalInformation", "Additional Information", {
                  multiline: true,
                  description: "Anything else you would like from applicants, such as a portfolio or links to their work.",
                })}
              </CardContent>
            </Card>

            <Card className={cardClasses}>
              <CardHeader className={`${headerClasses} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                <CardTitle className={titleClasses}>Our Production Culture</CardTitle>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#85898a] flex items-center gap-1.5"><Lock className="w-3 h-3" /> Standard text, shown on every role</span>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-8 text-sm leading-relaxed text-[#4e504e] min-w-0">
                {PRODUCTION_CULTURE.map((p) => <p key={p} className="break-words">{p}</p>)}
                <a href={PSI_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary underline underline-offset-4 break-words">
                  More information on this Production Support led approach can be found here <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <p className="font-mono font-medium text-foreground pt-2">What does this mean for you?</p>
                <p>This means, we ask everyone working on the production to:</p>
                <ol className="list-decimal pl-5 space-y-2 marker:text-primary">
                  {PRODUCTION_COMMITMENTS.map((c) => <li key={c} className="break-words">{c}</li>)}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <GuidanceNote title="Inclusive recruitment - challenge common assumptions">
              <p><strong>Driving licence / car:</strong> only require a licence if driving is intrinsic to the role. Otherwise consider hire cars for specific days, taxis or couriers, unit transport, or set pick-up points.</p>
              <p><strong>Physical / manual handling:</strong> specify the task (e.g. lifting up to X kg) and plan workarounds - team lifts, trolleys, closer storage, redistributed tasks.</p>
              <p><strong>Kit ownership:</strong> avoid "must own full kit" unless essential. Consider provided equipment, hire or shared department kit.</p>
              <p><strong>Total flexibility:</strong> define genuinely immovable moments rather than habitual "always on" availability. Use notice, rotas and clear escalation.</p>
              <p className="text-xs">Under the Equality Act 2010, unnecessary criteria can create indirect discrimination risk. Use objective, role-related criteria.</p>
            </GuidanceNote>
            {(["responsibility", "essential", "desired"] as const).map((section) => {
              const copy = SECTION_COPY[section];
              const sectionFields = contentFields.map((f, i) => ({ ...f, originalIndex: i })).filter((f) => f.section === section);
              return (
                <Card key={section} className={cardClasses}>
                  <CardHeader className={`${headerClasses} flex flex-col sm:flex-row sm:items-start justify-between gap-4`}>
                    <div className="min-w-0 space-y-1.5">
                      <CardTitle className={titleClasses}>{copy.title}</CardTitle>
                      <p className="text-xs text-[#85898a] leading-relaxed break-words">{copy.prompt}</p>
                    </div>
                    <Button type="button" variant="outline" className={outlineBtn} data-testid={`button-add-${section}`} onClick={() => appendContent({ section, position: sectionFields.length, content: "" })}>
                      <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> {copy.add}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-8 min-w-0">
                    {sectionFields.length === 0 ? (
                      <p className="text-center py-8 text-[#85898a] bg-[#101315] border border-dashed border-[#2a2f31] text-sm px-4">No items yet. This section is hidden on the public page while empty.</p>
                    ) : (
                      <ol className="space-y-4 min-w-0">
                        {sectionFields.map((field, n) => (
                          <li key={field.id} className="flex items-start gap-3 sm:gap-4 min-w-0">
                            <div className="hidden sm:flex mt-3 items-center gap-1 text-[#85898a] shrink-0" aria-hidden="true">
                              <GripVertical className="w-4 h-4" />
                              <span className="font-mono text-[11px] w-5 text-primary">{n + 1}.</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <FormField
                                control={form.control}
                                name={`contentItems.${field.originalIndex}.content`}
                                render={({ field: inputField }) => (
                                  <FormItem className="min-w-0">
                                    <FormControl>
                                      <Textarea {...inputField} aria-label={`${copy.item} ${n + 1}`} data-testid={`input-${section}-${n}`} className={`${fieldClasses} min-h-[80px] resize-y`} />
                                    </FormControl>
                                    <FormMessage className="break-words" />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${copy.item.toLowerCase()} ${n + 1}`} data-testid={`button-remove-${section}-${n}`} className="text-[#85898a] hover:text-destructive hover:bg-destructive/10 mt-1 shrink-0" onClick={() => removeContent(field.originalIndex)}>
                              <Trash2 className="w-4 h-4 shrink-0" />
                            </Button>
                          </li>
                        ))}
                      </ol>
                    )}
                    {section === "responsibility" && sectionFields.length > 0 && (sectionFields.length < 5 || sectionFields.length > 8) && (
                      <p className="mt-4 text-xs text-[#85898a]">Guide: 5-8 points usually reads best. You have {sectionFields.length}.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {errors.contentItems?.message && (
              <p className="text-sm font-medium text-destructive break-words">{errors.contentItems.message}</p>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <Card className={cardClasses}>
              <CardHeader className={`${headerClasses} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                <CardTitle className={titleClasses}>Key Details Table</CardTitle>
                <Button type="button" variant="outline" className={outlineBtn} data-testid="button-add-detail" onClick={() => appendDetail({ position: detailFields.length, label: "", value: "" })}>
                  <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> Add Detail
                </Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-8 space-y-4 min-w-0">
                <p className="text-xs text-[#85898a] break-words">
                  Location, Accountable To, Contract Dates / Hours and Work Arrangement are edited in Role Profile - add them there rather than as custom rows here.
                </p>
                {detailFields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-3 sm:gap-4 bg-[#101315] p-3 sm:p-4 border border-[#2a2f31] min-w-0">
                    <div className="hidden sm:block mt-3 text-[#85898a] shrink-0" aria-hidden="true"><GripVertical className="w-4 h-4" /></div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                      <FormField
                        control={form.control}
                        name={`details.${index}.label`}
                        render={({ field: inputField }) => (
                          <FormItem className="md:col-span-1 min-w-0">
                            <FormControl>
                              <Input placeholder="Label" aria-label={`Detail ${index + 1} label`} data-testid={`input-detail-label-${index}`} {...inputField} className={sharedInputClasses} />
                            </FormControl>
                            <FormMessage className="break-words" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`details.${index}.value`}
                        render={({ field: inputField }) => (
                          <FormItem className="md:col-span-2 min-w-0">
                            <FormControl>
                              <Input placeholder="Value" aria-label={`Detail ${index + 1} value`} data-testid={`input-detail-value-${index}`} {...inputField} className={sharedInputClasses} />
                            </FormControl>
                            <FormMessage className="break-words" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove detail ${index + 1}`} data-testid={`button-remove-detail-${index}`} className="text-[#85898a] hover:text-destructive hover:bg-destructive/10 mt-0.5 shrink-0" onClick={() => removeDetail(index)}>
                      <Trash2 className="w-4 h-4 shrink-0" />
                    </Button>
                  </div>
                ))}
                {detailFields.length === 0 && (
                  <div className="text-center py-12 text-[#85898a] bg-[#101315] border border-dashed border-[#2a2f31] text-sm break-words px-4">
                    No custom details. Eligibility, start date or similar can be added here.
                  </div>
                )}
                {errors.details?.message && (
                  <p className="text-sm font-medium text-destructive break-words">{errors.details.message}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apply" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <Card className={cardClasses}>
              <CardHeader className={headerClasses}>
                <CardTitle className={titleClasses}>Closing Date & Destination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-8 min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 min-w-0">
                  <FormField
                    control={form.control}
                    name="applicationClosingDate"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Closing Date</FormLabel>
                        <FormControl>
                          <Input type="date" className={sharedInputClasses} {...field} data-testid="input-closing-date" />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="applicationClosingTime"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Closing Time (UK)</FormLabel>
                        <FormControl>
                          <Input type="time" className={sharedInputClasses} {...field} data-testid="input-closing-time" />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-[#85898a] break-words">Separate from the deadline text and system deadline on Basics, which keep their current behaviour.</p>
                <GuidanceNote title="Apply via - one destination only">
                  <p>Use the recruiter's own agreed email address or platform. The Training & Development inbox should only be used where recruitment has been formally agreed and is managed by that team.</p>
                </GuidanceNote>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 min-w-0">
                  <FormField
                    control={form.control}
                    name="applicationEmail"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Application Email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="off" className={sharedInputClasses} {...field} data-testid="input-application-email" />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="applicationUrl"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Application Platform URL</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://" className={sharedInputClasses} {...field} data-testid="input-application-url" />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className={cardClasses}>
              <CardHeader className={headerClasses}>
                <CardTitle className={titleClasses}>Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-8 min-w-0">
                {textField("applicationInstructions", "How to Apply (Department)", { multiline: true, description: "Shown publicly under How to apply." })}
                {textField("trainingApplicationInstructions", "How to Apply (Training & Development Team)", { multiline: true, description: "Completed by the Training & Development team. Shown publicly alongside the department instructions." })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <div className="flex items-start gap-3 border border-[#2a2f31] bg-[#101315] p-4 text-sm min-w-0">
              <Lock className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <p className="break-words">Internal only. Nothing on this tab is shown on the public site or sent to an external provider.</p>
            </div>
            <Card className={cardClasses}>
              <CardHeader className={headerClasses}>
                <CardTitle className={titleClasses}>Recruitment Route</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-8 min-w-0">
                {renderRadioField("recruitmentRoute", "Who is recruiting?", RECRUITMENT_ROUTE_LABELS, "Independent: the department recruits and distributes the advert. Production: Training & Development recruits on the department's behalf.")}
              </CardContent>
            </Card>
            {recruitmentRoute === "production" || ["shortlistSize", "interviewFormat", "interviewDates", "technicalQuestions"].some((k) => k in errors) ? (
              <Card className={cardClasses}>
                <CardHeader className={headerClasses}>
                  <CardTitle className={titleClasses}>Production Recruitment Planning</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-8 min-w-0">
                  <FormField
                    control={form.control}
                    name="shortlistSize"
                    render={({ field }) => (
                      <FormItem className="min-w-0 max-w-xs">
                        <FormLabel className={sharedLabelClasses}>Number of Applications to Shortlist</FormLabel>
                        <FormControl>
                          <Input type="number" inputMode="numeric" min={5} max={10} step={1} className={sharedInputClasses} {...field} data-testid="input-shortlist-size" />
                        </FormControl>
                        <FormDescription className="text-xs text-[#85898a] mt-1">Minimum 5, maximum 10.</FormDescription>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                  {renderRadioField("interviewFormat", "Interview Format", INTERVIEW_FORMAT_LABELS)}
                  {textField("interviewDates", "Interview Dates", { description: "Approximate dates, or 'unknown', or 'N/A' if no interviews will take place." })}
                  <div className="space-y-3 min-w-0">
                    <p className={sharedLabelClasses}>Role-Specific Technical Questions</p>
                    <GuidanceNote title="Accessible questions">
                      <p>Up to three questions on tools, software, processes or qualifications genuinely required. Avoid excluding people on experience that could be learned on the job.</p>
                      <p>Keep questions clear rather than open-ended: "What 3 qualities are most essential for a wardrobe assistant?" works better than "What makes a good wardrobe assistant?"</p>
                      <p>Focus on what they could bring: "How would you handle prioritising multiple requests?" rather than "Are you good under pressure?"</p>
                    </GuidanceNote>
                    <StringListEditor
                      control={form.control}
                      name="technicalQuestions"
                      max={3}
                      itemLabel="Technical question"
                      addLabel="Add Question"
                      emptyText="No technical questions. All applicants still complete the standard form."
                      multiline
                      errors={errors}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="border border-dashed border-[#2a2f31] bg-[#101315] px-4 py-6 text-sm text-[#85898a] break-words">
                Shortlist size, interview plans and technical questions appear when Production recruitment is selected. Anything already entered is kept.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4 border-t border-[#2a2f31] pt-6 sm:pt-8 mt-8 sm:mt-12 min-w-0">
          {errorCount > 0 && errorTabs.length > 0 && (
            <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive sm:mr-auto min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Check:</span>
              {errorTabs.map((key) => (
                <button key={key} type="button" className="underline underline-offset-4 font-medium" onClick={() => setTab(key)}>
                  {TABS.find((t) => t.key === key)?.label}
                </button>
              ))}
            </div>
          )}
          <Button type="submit" disabled={isSubmitting} data-testid="button-save-role" className="w-full sm:w-auto rounded-full h-14 px-10 font-mono text-xs uppercase tracking-wider font-bold shrink-0">
            {isSubmitting ? "Saving..." : "Save Role"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
