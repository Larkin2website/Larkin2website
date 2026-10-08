import { useRef } from "react";
import { ProgrammeContent, toggleProgrammeBullets } from "@workspace/programme-content";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormDescription } from "@/components/ui/form";

interface SectionContentEditorProps {
  value: string;
  name: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  inputRef: (node: HTMLTextAreaElement | null) => void;
}

export function SectionContentEditor({ inputRef, ...field }: SectionContentEditorProps) {
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const selection = useRef({ start: 0, end: 0 });
  function toggleBullets() {
    const next = toggleProgrammeBullets(field.value, selection.current.start, selection.current.end);
    field.onChange(next.value);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(next.start, next.end);
      selection.current = { start: next.start, end: next.end };
    });
  }
  return (
    <>
      <Button type="button" variant="outline" onClick={toggleBullets} className="rounded-none h-11">
        Toggle bullet list
      </Button>
      <FormControl>
        <Textarea
          {...field}
          onChange={(event) => field.onChange(event.target.value)}
          ref={(node) => { textarea.current = node; inputRef(node); }}
          onSelect={(event) => { selection.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; }}
          className="min-h-[180px] resize-y bg-[#171b1d] border-[#2a2f31] rounded-none focus-visible:ring-primary font-sans text-sm min-w-0"
        />
      </FormControl>
      <FormDescription>Select lines and choose Toggle bullet list, or start each item with “• ”, “- ” or “* ”. Separate paragraphs with a blank line. Other Markdown and HTML are shown as plain text.</FormDescription>
      <details className="border border-[#2a2f31] p-4 min-w-0">
        <summary className="cursor-pointer text-sm font-medium">Public preview</summary>
        <div className="mt-4 space-y-3 break-words [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1 [&_a]:underline">
          {field.value.trim() ? <ProgrammeContent content={field.value} /> : <p>No content to preview yet.</p>}
        </div>
      </details>
    </>
  );
}
