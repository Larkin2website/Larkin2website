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
      publicationLabel: "Opportunities",
      department: "",
      roleType: "Full Time",
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Tabs defaultValue="basics" className="w-full">
          <TabsList className="w-full justify-start border-b border-border rounded-none h-12 bg-transparent p-0 mb-6 space-x-6">
            <TabsTrigger value="basics" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 pb-3 pt-2">
              Basics & Meta
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 pb-3 pt-2">
              Lists & Content
            </TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 pb-3 pt-2">
              Key Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-6 mt-0 focus-visible:outline-none">
            <Card>
              <CardHeader>
                <CardTitle>Core Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Access Coordinator" {...field} onBlur={(e) => {
                            field.onBlur();
                            autoGenerateSlug(e.target.value);
                          }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. access-coordinator" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Camera" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Full Time, Contract" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="publicationLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publication Label (Eyebrow)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Opportunities" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Summary</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description shown on cards and at top of page..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dates & Applications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="applicationDeadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Deadline Text</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Applications close Sunday at 23:59" {...field} />
                        </FormControl>
                        <FormDescription>Shown as plain text</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Response Date Text (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Shortlisted applicants will be contacted by..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Deadline Date (Optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ? field.value.split("T")[0] : ""} />
                        </FormControl>
                        <FormDescription>Used for sorting and "closing soon" calculations</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicationUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>External Application URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badges & Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-8">
                  <FormField
                    control={form.control}
                    name="urgent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Urgent Fill</FormLabel>
                          <FormDescription>Shows urgent badge</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Featured</FormLabel>
                          <FormDescription>Highlights on listing</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadlineExtended"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Deadline Extended</FormLabel>
                          <FormDescription>Shows extension badge</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6 mt-0 focus-visible:outline-none">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Content Lists</CardTitle>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => appendContent({ section: "responsibility", position: contentFields.length, content: "" })}>
                    <Plus className="w-4 h-4 mr-1" /> Add Responsibility
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendContent({ section: "essential", position: contentFields.length, content: "" })}>
                    <Plus className="w-4 h-4 mr-1" /> Add Essential
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendContent({ section: "desired", position: contentFields.length, content: "" })}>
                    <Plus className="w-4 h-4 mr-1" /> Add Desired
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {(["responsibility", "essential", "desired"] as const).map(section => {
                    const sectionFields = contentFields.map((f, i) => ({ ...f, originalIndex: i })).filter(f => f.section === section);
                    if (sectionFields.length === 0) return null;
                    
                    return (
                      <div key={section} className="space-y-3">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                          {section === "responsibility" ? "Responsibilities" : section === "essential" ? "Essential Experience" : "Desired Experience"}
                        </h3>
                        <div className="space-y-2">
                          {sectionFields.map((field, localIndex) => (
                            <div key={field.id} className="flex items-start gap-2">
                              <div className="mt-2 text-muted-foreground cursor-grab">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <FormField
                                  control={form.control}
                                  name={`contentItems.${field.originalIndex}.content`}
                                  render={({ field: inputField }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Textarea {...inputField} className="min-h-[60px]" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="text-destructive mt-1" onClick={() => removeContent(field.originalIndex)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {contentFields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
                      No content items added. Add some responsibilities to begin.
                    </div>
                  )}
                </div>
                {form.formState.errors.contentItems?.message && (
                  <p className="mt-2 text-sm font-medium text-destructive">
                    {form.formState.errors.contentItems.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6 mt-0 focus-visible:outline-none">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Key Details Table</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => appendDetail({ position: detailFields.length, label: "", value: "" })}>
                  <Plus className="w-4 h-4 mr-1" /> Add Detail
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {detailFields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2 bg-muted/10 p-2 rounded-lg border border-border">
                      <div className="mt-2 text-muted-foreground cursor-grab px-1">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FormField
                          control={form.control}
                          name={`details.${index}.label`}
                          render={({ field: inputField }) => (
                            <FormItem className="sm:col-span-1">
                              <FormControl>
                                <Input placeholder="Label (e.g. Location)" {...inputField} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`details.${index}.value`}
                          render={({ field: inputField }) => (
                            <FormItem className="sm:col-span-2">
                              <FormControl>
                                <Input placeholder="Value (e.g. London / Hybrid)" {...inputField} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="text-destructive mt-0.5" onClick={() => removeDetail(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {detailFields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
                      No key details added.
                    </div>
                  )}
                </div>
                {form.formState.errors.details?.message && (
                  <p className="mt-2 text-sm font-medium text-destructive">
                    {form.formState.errors.details.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-4 border-t border-border pt-6 mt-8">
          <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
            {isSubmitting ? "Saving..." : "Save Opportunity"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
