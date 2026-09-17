import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { OpportunityInput, OpportunityContentItemInputSection } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpportunityOptionSelect } from "@/components/opportunities/opportunity-option-select";

const opportunitySchema = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase alphanumeric and hyphens only"),
  title: z.string().min(2).max(160),
  publicationLabel: z.string().min(2).max(100),
  department: z.string().min(2).max(100),
  roleType: z.string().min(2).max(100),
  summary: z.string().min(20).max(2000),
  applicationDeadline: z.string().min(2).max(500),
  responseDate: z.string().max(500).optional().nullable(),
  applicationUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  deadline: z.string().optional().nullable(),
  deadlineExtended: z.boolean().default(false),
  featured: z.boolean().default(false),
  urgent: z.boolean().default(false),
  contentItems: z.array(z.object({
    section: z.enum(["responsibility", "essential", "desired"]),
    position: z.number().min(0),
    content: z.string().min(1).max(1000)
  })).min(1),
  details: z.array(z.object({
    position: z.number().min(0),
    label: z.string().min(1).max(80),
    value: z.string().min(1).max(2000)
  })).min(1).max(30),
});

export type OpportunityFormValues = z.infer<typeof opportunitySchema>;

interface OpportunityFormProps {
  initialValues?: Partial<OpportunityFormValues>;
  onSubmit: (data: OpportunityInput) => void;
  isSubmitting?: boolean;
}

export function OpportunityForm({ initialValues, onSubmit, isSubmitting }: OpportunityFormProps) {
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      slug: "",
      title: "",
      publicationLabel: "Roles",
      department: "",
      roleType: "full time",
      summary: "",
      applicationDeadline: "",
      responseDate: "",
      applicationUrl: "",
      deadline: "",
      deadlineExtended: false,
      featured: false,
      urgent: false,
      contentItems: [
        { section: "responsibility", position: 0, content: "Example responsibility" }
      ],
      details: [
        { position: 0, label: "Location", value: "London" },
        { position: 1, label: "Eligibility", value: "Applicants must be aged 18 or over." }
      ],
      ...initialValues,
    }
  });

  const { fields: contentFields, append: appendContent, remove: removeContent } = useFieldArray({
    control: form.control,
    name: "contentItems"
  });

  const { fields: detailFields, append: appendDetail, remove: removeDetail } = useFieldArray({
    control: form.control,
    name: "details"
  });

  const handleFormSubmit = (data: OpportunityFormValues) => {
    // Strip unknown fields and clean up empty strings
    const parsed = opportunitySchema.parse(data);
    const cleaned: OpportunityInput = {
      ...parsed,
      responseDate: parsed.responseDate || null,
      applicationUrl: parsed.applicationUrl || null,
      deadline: parsed.deadline || null,
    };
    onSubmit(cleaned);
  };

  const autoGenerateSlug = (title: string) => {
    if (form.getValues("slug")) return; // don't override if already set
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    form.setValue("slug", slug, { shouldValidate: true });
  };

  const sharedInputClasses = "bg-[#101315] border-[#2a2f31] rounded-none focus-visible:ring-primary focus-visible:border-primary font-mono text-sm h-11 sm:h-10 min-w-0 break-words";
  const sharedLabelClasses = "font-mono text-[10px] uppercase tracking-[0.1em] text-[#85898a] mb-2 break-words";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8 sm:space-y-12 min-w-0">
        <Tabs defaultValue="basics" className="w-full min-w-0">
          <TabsList className="w-full justify-start border-b border-[#2a2f31] rounded-none h-auto sm:h-14 bg-transparent p-0 mb-6 sm:mb-8 space-x-6 sm:space-x-8 overflow-x-auto flex-nowrap hide-scrollbar whitespace-nowrap shrink-0">
            <TabsTrigger value="basics" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 h-12 sm:h-auto pb-3 sm:pb-4 pt-2 font-mono text-xs uppercase tracking-wider text-[#85898a] data-[state=active]:text-foreground shrink-0">
              Basics & Meta
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 h-12 sm:h-auto pb-3 sm:pb-4 pt-2 font-mono text-xs uppercase tracking-wider text-[#85898a] data-[state=active]:text-foreground shrink-0">
              Lists & Content
            </TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 h-12 sm:h-auto pb-3 sm:pb-4 pt-2 font-mono text-xs uppercase tracking-wider text-[#85898a] data-[state=active]:text-foreground shrink-0">
              Key Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <Card className="bg-[#171b1d] border-[#2a2f31] rounded-none shadow-none min-w-0">
              <CardHeader className="border-b border-[#2a2f31] pb-4 pt-6 px-4 sm:px-8 min-w-0">
                <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">Core Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-8 min-w-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 min-w-0">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Title</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} placeholder="e.g. Access Coordinator" {...field} onBlur={(e) => {
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
                          <Input className={sharedInputClasses} placeholder="e.g. access-coordinator" {...field} />
                        </FormControl>
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
                        <OpportunityOptionSelect
                          kind="department"
                          value={field.value}
                          onChange={field.onChange}
                        />
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
                        <OpportunityOptionSelect
                          kind="role_type"
                          value={field.value}
                          onChange={field.onChange}
                        />
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
                          <Input className={sharedInputClasses} placeholder="e.g. Roles" {...field} />
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
                      <FormLabel className={sharedLabelClasses}>Summary</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description shown on cards and at top of page..." 
                          className={`min-h-[140px] resize-y bg-[#101315] border-[#2a2f31] rounded-none focus-visible:ring-primary focus-visible:border-primary font-mono text-sm min-w-0 break-words`}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="break-words" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="bg-[#171b1d] border-[#2a2f31] rounded-none shadow-none min-w-0">
              <CardHeader className="border-b border-[#2a2f31] pb-4 pt-6 px-4 sm:px-8 min-w-0">
                <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">Dates & Applications</CardTitle>
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
                          <Input className={sharedInputClasses} placeholder="e.g. Applications close Sunday at 23:59" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs text-[#85898a] mt-1 break-words">Shown as plain text</FormDescription>
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
                          <Input className={sharedInputClasses} placeholder="e.g. Shortlisted applicants will be contacted by..." {...field} value={field.value || ""} />
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
                          <Input className={sharedInputClasses} type="date" {...field} value={field.value ? field.value.split("T")[0] : ""} />
                        </FormControl>
                        <FormDescription className="text-xs text-[#85898a] mt-1 break-words">Used for sorting and "closing soon" calculations</FormDescription>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicationUrl"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>External Application URL (Optional)</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} placeholder="https://..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#171b1d] border-[#2a2f31] rounded-none shadow-none min-w-0">
              <CardHeader className="border-b border-[#2a2f31] pb-4 pt-6 px-4 sm:px-8 min-w-0">
                <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">Badges & Flags</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-8 min-w-0">
                <div className="flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-12">
                  <FormField
                    control={form.control}
                    name="urgent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 min-w-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-[#85898a] data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0" />
                        </FormControl>
                        <div className="space-y-1 leading-none min-w-0">
                          <FormLabel className="font-mono text-xs uppercase tracking-wider break-words">Urgent Fill</FormLabel>
                          <FormDescription className="text-[10px] text-[#85898a] break-words">Shows urgent badge</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 min-w-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-[#85898a] data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0" />
                        </FormControl>
                        <div className="space-y-1 leading-none min-w-0">
                          <FormLabel className="font-mono text-xs uppercase tracking-wider break-words">Featured</FormLabel>
                          <FormDescription className="text-[10px] text-[#85898a] break-words">Highlights on listing</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadlineExtended"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 min-w-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-[#85898a] data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0" />
                        </FormControl>
                        <div className="space-y-1 leading-none min-w-0">
                          <FormLabel className="font-mono text-xs uppercase tracking-wider break-words">Deadline Extended</FormLabel>
                          <FormDescription className="text-[10px] text-[#85898a] break-words">Shows extension badge</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <Card className="bg-[#171b1d] border-[#2a2f31] rounded-none shadow-none min-w-0">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2a2f31] pb-4 pt-6 px-4 sm:px-8 gap-4 min-w-0">
                <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">Content Lists</CardTitle>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto shrink-0">
                  <Button type="button" variant="outline" className="w-full sm:w-auto h-11 sm:h-9 rounded-none border-[#2a2f31] font-mono text-[10px] uppercase tracking-widest hover:bg-[#101315] hover:text-foreground shrink-0" onClick={() => appendContent({ section: "responsibility", position: contentFields.length, content: "" })}>
                    <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> Add Responsibility
                  </Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto h-11 sm:h-9 rounded-none border-[#2a2f31] font-mono text-[10px] uppercase tracking-widest hover:bg-[#101315] hover:text-foreground shrink-0" onClick={() => appendContent({ section: "essential", position: contentFields.length, content: "" })}>
                    <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> Add Essential
                  </Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto h-11 sm:h-9 rounded-none border-[#2a2f31] font-mono text-[10px] uppercase tracking-widest hover:bg-[#101315] hover:text-foreground shrink-0" onClick={() => appendContent({ section: "desired", position: contentFields.length, content: "" })}>
                    <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> Add Desired
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-8 min-w-0">
                <div className="space-y-8 sm:space-y-10 min-w-0">
                  {(["responsibility", "essential", "desired"] as const).map(section => {
                    const sectionFields = contentFields.map((f, i) => ({ ...f, originalIndex: i })).filter(f => f.section === section);
                    if (sectionFields.length === 0) return null;
                    
                    return (
                      <div key={section} className="space-y-4 min-w-0">
                        <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary border-b border-[#2a2f31] pb-3 break-words">
                          {section === "responsibility" ? "Responsibilities" : section === "essential" ? "Essential Experience" : "Desired Experience"}
                        </h3>
                        <div className="space-y-4 min-w-0">
                          {sectionFields.map((field) => (
                            <div key={field.id} className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 border border-[#2a2f31] sm:border-transparent p-3 sm:p-0 bg-[#101315] sm:bg-transparent min-w-0">
                              <div className="hidden sm:block mt-3 text-[#2a2f31] cursor-grab hover:text-primary transition-colors shrink-0">
                                <GripVertical className="w-5 h-5 shrink-0" />
                              </div>
                              <div className="w-full flex items-center justify-between sm:hidden mb-1 min-w-0">
                                <div className="text-[#85898a] cursor-grab shrink-0"><GripVertical className="w-4 h-4 shrink-0" /></div>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-[#85898a] hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeContent(field.originalIndex)}>
                                  <Trash2 className="w-4 h-4 shrink-0" />
                                </Button>
                              </div>
                              <div className="flex-1 w-full min-w-0">
                                <FormField
                                  control={form.control}
                                  name={`contentItems.${field.originalIndex}.content`}
                                  render={({ field: inputField }) => (
                                    <FormItem className="min-w-0">
                                      <FormControl>
                                        <Textarea {...inputField} className={`min-h-[80px] resize-y bg-[#101315] border-[#2a2f31] sm:border-[#2a2f31] rounded-none focus-visible:ring-primary focus-visible:border-primary font-mono text-sm min-w-0 break-words`} />
                                      </FormControl>
                                      <FormMessage className="break-words" />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="hidden sm:inline-flex text-[#85898a] hover:text-destructive hover:bg-destructive/10 mt-1 shrink-0" onClick={() => removeContent(field.originalIndex)}>
                                <Trash2 className="w-4 h-4 shrink-0" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {contentFields.length === 0 && (
                    <div className="text-center py-16 text-[#85898a] bg-[#101315] border border-dashed border-[#2a2f31] text-sm break-words px-4">
                      No content items added. Add some responsibilities to begin.
                    </div>
                  )}
                </div>
                {form.formState.errors.contentItems?.message && (
                  <p className="mt-4 text-sm font-medium text-destructive break-words">
                    {form.formState.errors.contentItems.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <Card className="bg-[#171b1d] border-[#2a2f31] rounded-none shadow-none min-w-0">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2a2f31] pb-4 pt-6 px-4 sm:px-8 gap-4 min-w-0">
                <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">Key Details Table</CardTitle>
                <Button type="button" variant="outline" className="w-full sm:w-auto h-11 sm:h-9 rounded-none border-[#2a2f31] font-mono text-[10px] uppercase tracking-widest hover:bg-[#101315] hover:text-foreground shrink-0" onClick={() => appendDetail({ position: detailFields.length, label: "", value: "" })}>
                  <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> Add Detail
                </Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-8 min-w-0">
                <div className="space-y-4 min-w-0">
                  {detailFields.map((field, index) => (
                    <div key={field.id} className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 bg-[#101315] p-3 sm:p-4 border border-[#2a2f31] min-w-0">
                      <div className="hidden sm:block mt-3 text-[#2a2f31] cursor-grab hover:text-primary transition-colors shrink-0">
                        <GripVertical className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="w-full flex items-center justify-between sm:hidden mb-1 min-w-0">
                        <div className="text-[#85898a] cursor-grab shrink-0"><GripVertical className="w-4 h-4 shrink-0" /></div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-[#85898a] hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeDetail(index)}>
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </Button>
                      </div>
                      <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                        <FormField
                          control={form.control}
                          name={`details.${index}.label`}
                          render={({ field: inputField }) => (
                            <FormItem className="md:col-span-1 min-w-0">
                              <FormControl>
                                <Input placeholder="Label (e.g. Location)" {...inputField} className={sharedInputClasses} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`details.${index}.value`}
                          render={({ field: inputField }) => (
                            <FormItem className="md:col-span-2 min-w-0">
                              <FormControl>
                                <Input placeholder="Value (e.g. London / Hybrid)" {...inputField} className={sharedInputClasses} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="hidden sm:inline-flex text-[#85898a] hover:text-destructive hover:bg-destructive/10 mt-1 shrink-0" onClick={() => removeDetail(index)}>
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </Button>
                    </div>
                  ))}
                  {detailFields.length === 0 && (
                    <div className="text-center py-16 text-[#85898a] bg-[#101315] border border-dashed border-[#2a2f31] text-sm break-words px-4">
                      No key details added.
                    </div>
                  )}
                </div>
                {form.formState.errors.details?.message && (
                  <p className="mt-4 text-sm font-medium text-destructive break-words">
                    {form.formState.errors.details.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-[#2a2f31] pt-6 sm:pt-8 mt-8 sm:mt-12 min-w-0">
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto rounded-full h-14 px-10 font-mono text-xs uppercase tracking-wider font-bold shrink-0">
            {isSubmitting ? "Saving..." : "Save Role"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
