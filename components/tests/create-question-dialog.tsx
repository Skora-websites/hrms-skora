"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface CreateQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateQuestionDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateQuestionDialogProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<"MCQ" | "DESCRIPTIVE">("MCQ");
  const [topic, setTopic] = useState("General");
  const [maxMarks, setMaxMarks] = useState(2);
  const [text, setText] = useState("");
  const [options, setOptions] = useState([
    { id: "opt_1", text: "" },
    { id: "opt_2", text: "" },
    { id: "opt_3", text: "" },
    { id: "opt_4", text: "" },
  ]);
  const [correctOptionId, setCorrectOptionId] = useState("opt_1");
  const [referenceAnswer, setReferenceAnswer] = useState("");

  const resetForm = () => {
    setType("MCQ");
    setTopic("General");
    setMaxMarks(2);
    setText("");
    setOptions([
      { id: "opt_1", text: "" },
      { id: "opt_2", text: "" },
      { id: "opt_3", text: "" },
      { id: "opt_4", text: "" },
    ]);
    setCorrectOptionId("opt_1");
    setReferenceAnswer("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("Please enter question text");
      return;
    }

    if (type === "MCQ") {
      const emptyOpts = options.some((o) => !o.text.trim());
      if (emptyOpts) {
        toast.error("Please fill in all 4 MCQ options");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        type,
        topic: topic.trim() || "General",
        maxMarks: Number(maxMarks) || 2,
        text,
        options: type === "MCQ" ? options : undefined,
        correctOptions: type === "MCQ" ? [correctOptionId] : undefined,
        referenceAnswer: type === "DESCRIPTIVE" ? referenceAnswer : undefined,
      };

      const res = await fetch("/api/hrm/v2/tests/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Question added to Question Bank");
        resetForm();
        onOpenChange(false);
        onCreated();
      } else {
        toast.error(data.error || "Failed to create question");
      }
    } catch {
      toast.error("Network error while creating question");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Add Question to Bank
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Create reusable single/multiple-choice or open-ended descriptive test questions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Question Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "MCQ" | "DESCRIPTIVE")}
                className="w-full h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <option value="MCQ">MCQ</option>
                <option value="DESCRIPTIVE">Descriptive</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Topic / Domain</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. React, SQL, Logic"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Marks</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Question Prompt <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Enter the full question text or problem statement..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 leading-relaxed"
            />
          </div>

          {type === "MCQ" ? (
            <div className="space-y-2.5 rounded-xl border border-border/80 bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Answer Options & Correct Key:
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Select radio to mark correct option
                </span>
              </div>

              <div className="space-y-2">
                {options.map((opt, i) => {
                  const isChecked = correctOptionId === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors ${
                        isChecked
                          ? "bg-primary/5 border-primary/40"
                          : "border-border/60 bg-background"
                      }`}
                    >
                      <input
                        type="radio"
                        id={opt.id}
                        name="correctOpt"
                        checked={isChecked}
                        onChange={() => setCorrectOptionId(opt.id)}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <input
                        type="text"
                        placeholder={`Option ${i + 1}`}
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...options];
                          updated[i].text = e.target.value;
                          setOptions(updated);
                        }}
                        className="flex-1 h-8 px-2.5 rounded-md border border-border/70 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 rounded-xl border border-border/80 bg-muted/30 p-4">
              <label className="text-xs font-bold text-foreground">
                Model Solution / Grading Rubric
              </label>
              <textarea
                rows={3}
                placeholder="Key concepts, terms, or acceptable solutions for evaluators..."
                value={referenceAnswer}
                onChange={(e) => setReferenceAnswer(e.target.value)}
                className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Question"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
