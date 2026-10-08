import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgrammeInput, ProgrammeSectionInputSection } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { SectionContentEditor } from "./section-content-editor";
import { validRegistrationDate } from "@workspace/programme-content/registration";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const programmeSchema = z.object({
  category: z.enum(["programme", "training"]).default("programme"),
  registrationState: z.enum(["open", "closed", "unconfirmed"]).optional().nullable(),
  registrationClosesOn: z.string().refine(value => !value || validRegistrationDate(value), "Use a valid date").optional().nullable(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase alphanumeric and hyphens only"),
  num: z.string().min(1).max(10),
  cardTitle: z.string().min(2).max(160),
  cardCopy: z.string().min(1).max(2000),
  cardCta: z.string().min(1).max(100).default("Apply Now"),
  // Preserve legacy values when editing, without requiring or displaying imagery.
  image: z.string().max(500).optional().default(""),
  title: z.string().min(2).max(160),
  shortDescription: z.string().min(1).max(4000),
  applicationStatus: z.string().min(1).max(100).default("Open"),
  applicationDeadline: z.string().max(500).optional().nullable(),
  deadline: z.string().optional().nullable(),
  location: z.string().min(1).max(500),
  applicationUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  featured: z.boolean().default(false),
  displayOrder: z.coerce.number().min(0).default(0),
  sections: z.array(z.object({
    section: z.enum(["about", "placement", "training", "eligibility", "timeline", "application_guidance"]),
    position: z.number().min(0),
    content: z.string().min(1).max(5000)
  })).default([]),
});

export type ProgrammeFormValues = z.infer<typeof programmeSchema>;

interface ProgrammeFormProps {
  initialValues?: Partial<ProgrammeFormValues>;
  onSubmit: (data: ProgrammeInput) => void;
  isSubmitting?: boolean;
}

export function ProgrammeForm({ initialValues, onSubmit, isSubmitting }: ProgrammeFormProps) {
  const form = useForm<ProgrammeFormValues>({
    resolver: zodResolver(programmeSchema),
    defaultValues: {
      category: "programme",
      registrationState: null,
      registrationClosesOn: "",
      slug: "",
      num: "",
      cardTitle: "",
      cardCopy: "",
      cardCta: "Apply Now",
      image: "",
      title: "",
      shortDescription: "",
      applicationStatus: "Open",
      applicationDeadline: "",
      deadline: "",
      location: "",
      applicationUrl: "",
      featured: false,
      displayOrder: 0,
      sections: [],
      ...initialValues,
    }
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control: form.control,
    name: "sections"
  });

  const handleFormSubmit = (data: ProgrammeFormValues) => {
    const parsed = programmeSchema.parse(data);
    const cleaned: ProgrammeInput = {
      ...parsed,
      applicationUrl: parsed.applicationUrl || null,
      registrationState: parsed.category === "training" ? parsed.registrationState ?? "unconfirmed" : null,
      registrationClosesOn: parsed.category === "training" ? parsed.registrationClosesOn || null : null,
      applicationDeadline: parsed.applicationDeadline || null,
      deadline: parsed.deadline ? new Date(parsed.deadline).toISOString() : null,
      sections: parsed.sections.map((s, i) => ({ ...s, position: i }))
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
              Basics & Core
            </TabsTrigger>
            <TabsTrigger value="card" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 h-12 sm:h-auto pb-3 sm:pb-4 pt-2 font-mono text-xs uppercase tracking-wider text-[#85898a] data-[state=active]:text-foreground shrink-0">
              Card Display
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 h-12 sm:h-auto pb-3 sm:pb-4 pt-2 font-mono text-xs uppercase tracking-wider text-[#85898a] data-[state=active]:text-foreground shrink-0">
              Page Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <Card className="bg-[#171b1d] border-[#2a2f31] rounded-none shadow-none min-w-0">
              <CardHeader className="border-b border-[#2a2f31] pb-4 pt-6 px-4 sm:px-8 min-w-0">
                <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">Core Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-8 min-w-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 min-w-0">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel className={sharedLabelClasses}>Listing category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className={sharedInputClasses}><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="programme">Programme</SelectItem><SelectItem value="training">Training course</SelectItem></SelectContent>
                      </Select><FormDescription>Training courses appear on the public Training Courses page. This does not change audience matching criteria.</FormDescription>
                    </FormItem>
                  )} />
                  {form.watch("category") === "training" && <>
                    <FormField control={form.control} name="registrationState" render={({ field }) => (
                      <FormItem><FormLabel className={sharedLabelClasses}>Verified registration status</FormLabel>
                        <Select value={field.value ?? "unconfirmed"} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger className={sharedInputClasses}><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="unconfirmed">Unconfirmed — no Apply link</SelectItem><SelectItem value="open">Open — verified</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                        </Select><FormDescription>Publishing makes a course visible, not open for registration. Only select Open after checking the provider.</FormDescription>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="registrationClosesOn" render={({ field }) => (
                      <FormItem><FormLabel className={sharedLabelClasses}>Registration deadline date (no timezone)</FormLabel>
                        <FormControl><Input type="date" className={sharedInputClasses} {...field} value={field.value ?? ""} /></FormControl>
                        <FormDescription>For a source that provides only a date. Apply is disabled throughout the uncertain deadline window. Use System Deadline only for a confirmed exact timestamp.</FormDescription><FormMessage />
                      </FormItem>
                    )} />
                  </>}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Full Page Title</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} placeholder="e.g. Early Careers Training Programme" {...field} onBlur={(e) => {
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
                          <Input className={sharedInputClasses} placeholder="e.g. early-careers-2025" {...field} />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="num"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Display Number</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} placeholder="e.g. 1" {...field} />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Location</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} placeholder="e.g. London & Hybrid" {...field} />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicationStatus"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Application Status Display</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} placeholder="e.g. Applications open soon" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs text-[#85898a] mt-1 break-words">Text shown to applicants</FormDescription>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicationDeadline"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Application Deadline Text</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} placeholder="e.g. Applications close Sunday at 23:59" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription className="text-xs text-[#85898a] mt-1 break-words">Shown as plain text on the page</FormDescription>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>System Deadline (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            className={sharedInputClasses}
                            type="datetime-local"
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-[#85898a] mt-1 break-words">Used for automated sorting</FormDescription>
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

                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel className={sharedLabelClasses}>Hero Introduction</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description shown at top of the page..." 
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
                <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">List & Badges</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-8 min-w-0 space-y-6 sm:space-y-8">
                <div className="flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-12">
                  <FormField
                    control={form.control}
                    name="featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 min-w-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-[#85898a] data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0" />
                        </FormControl>
                        <div className="space-y-1 leading-none min-w-0">
                          <FormLabel className="font-mono text-xs uppercase tracking-wider break-words">Featured Opportunity</FormLabel>
                          <FormDescription className="text-[10px] text-[#85898a] break-words">Highlights on main listings</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="max-w-xs">
                  <FormField
                    control={form.control}
                    name="displayOrder"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Display Order</FormLabel>
                        <FormControl>
                          <Input type="number" className={sharedInputClasses} {...field} />
                        </FormControl>
                        <FormDescription className="text-xs text-[#85898a] mt-1 break-words">Lower numbers appear first</FormDescription>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="card" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <Card className="bg-[#171b1d] border-[#2a2f31] rounded-none shadow-none min-w-0">
              <CardHeader className="border-b border-[#2a2f31] pb-4 pt-6 px-4 sm:px-8 min-w-0">
                <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">Opportunity Card</CardTitle>
                <CardDescription className="text-xs text-[#85898a]">How this opportunity is shown on the index grids</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-8 min-w-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 min-w-0">
                  <FormField
                    control={form.control}
                    name="cardTitle"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Card Title</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} placeholder="e.g. Early Careers" {...field} />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cardCta"
                    render={({ field }) => (
                      <FormItem className="min-w-0">
                        <FormLabel className={sharedLabelClasses}>Card CTA Label</FormLabel>
                        <FormControl>
                          <Input className={sharedInputClasses} placeholder="e.g. Apply Now" {...field} />
                        </FormControl>
                        <FormMessage className="break-words" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cardCopy"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel className={sharedLabelClasses}>Card Summary Copy</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description for the card preview..." 
                          className={`min-h-[100px] resize-y bg-[#101315] border-[#2a2f31] rounded-none focus-visible:ring-primary focus-visible:border-primary font-mono text-sm min-w-0 break-words`}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="break-words" />
                    </FormItem>
                  )}
                />

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6 sm:space-y-8 mt-0 focus-visible:outline-none min-w-0">
            <Card className="bg-[#171b1d] border-[#2a2f31] rounded-none shadow-none min-w-0">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2a2f31] pb-4 pt-6 px-4 sm:px-8 gap-4 min-w-0">
                <CardTitle className="font-mono text-sm uppercase tracking-widest font-medium break-words">Opportunity Sections</CardTitle>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto shrink-0">
                  <Button type="button" variant="outline" className="w-full sm:w-auto h-11 sm:h-9 rounded-none border-[#2a2f31] font-mono text-[10px] uppercase tracking-widest hover:bg-[#101315] hover:text-foreground shrink-0" onClick={() => appendSection({ section: "about", position: sectionFields.length, content: "" })}>
                    <Plus className="w-3.5 h-3.5 mr-1 shrink-0" /> Add Section
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-8 min-w-0">
                <div className="space-y-8 min-w-0">
                  {sectionFields.map((field, index) => (
                    <div key={field.id} className="flex flex-col gap-4 border border-[#2a2f31] p-4 sm:p-5 bg-[#101315] min-w-0">
                      <div className="flex items-center justify-between min-w-0">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-5 h-5 text-[#85898a] cursor-grab shrink-0" />
                          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Section {index + 1}</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-[#85898a] hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeSection(index)}>
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`sections.${index}.section`}
                          render={({ field: selectField }) => (
                            <FormItem className="min-w-0 max-w-xs">
                              <FormLabel className={sharedLabelClasses}>Section Type</FormLabel>
                              <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-[#171b1d] border-[#2a2f31] rounded-none focus:ring-primary focus:border-primary font-mono text-sm h-11 sm:h-10 min-w-0">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-[#171b1d] border-[#2a2f31] rounded-none">
                                  <SelectItem value="about" className="font-mono text-xs uppercase focus:bg-primary/10 focus:text-primary">About</SelectItem>
                                  <SelectItem value="placement" className="font-mono text-xs uppercase focus:bg-primary/10 focus:text-primary">Placement</SelectItem>
                                  <SelectItem value="training" className="font-mono text-xs uppercase focus:bg-primary/10 focus:text-primary">Training</SelectItem>
                                  <SelectItem value="eligibility" className="font-mono text-xs uppercase focus:bg-primary/10 focus:text-primary">Eligibility</SelectItem>
                                  <SelectItem value="timeline" className="font-mono text-xs uppercase focus:bg-primary/10 focus:text-primary">Timeline</SelectItem>
                                  <SelectItem value="application_guidance" className="font-mono text-xs uppercase focus:bg-primary/10 focus:text-primary">Application Guidance</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage className="break-words" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`sections.${index}.content`}
                          render={({ field: inputField }) => (
                            <FormItem className="min-w-0">
                              <FormLabel className={sharedLabelClasses}>Content</FormLabel>
                              <SectionContentEditor value={inputField.value} name={inputField.name} onChange={inputField.onChange} onBlur={inputField.onBlur} inputRef={inputField.ref} />
                              <FormMessage className="break-words" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                  {sectionFields.length === 0 && (
                    <div className="text-center py-16 text-[#85898a] bg-[#101315] border border-dashed border-[#2a2f31] text-sm break-words px-4">
                      No content sections added. Add sections to build the page content.
                    </div>
                  )}
                </div>
                {form.formState.errors.sections?.message && (
                  <p className="mt-4 text-sm font-medium text-destructive break-words">
                    {form.formState.errors.sections.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-[#2a2f31] pt-6 sm:pt-8 mt-8 sm:mt-12 min-w-0">
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto rounded-full h-14 px-10 font-mono text-xs uppercase tracking-wider font-bold shrink-0">
            {isSubmitting ? "Saving..." : "Save Opportunity"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
