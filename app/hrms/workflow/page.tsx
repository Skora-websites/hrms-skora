"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Zap,
  Play,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Layers,
  ArrowRight,
  ListFilter,
  Check,
  Send,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";

interface WorkflowRule {
  id: string;
  name: string;
  description?: string;
  eventName: string;
  isActive: boolean;
  priority: number;
  conditions: any[];
  actions: { actionType: string; params: Record<string, any> }[];
  createdAt?: string;
}

interface ExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  eventName: string;
  status: "success" | "failed" | "skipped";
  actionsExecuted: number;
  errorMessage?: string;
  createdAt?: string;
}

const EVENT_OPTIONS = [
  { value: "employee.created", label: "New Joiner (employee.created)" },
  { value: "leave.submitted", label: "Leave Applied (leave.submitted)" },
  { value: "resignation.submitted", label: "Resignation Submitted (resignation.submitted)" },
  { value: "attendance.missed_punch", label: "Missing Punch (attendance.missed_punch)" },
  { value: "probation.milestone", label: "Probation Milestone (probation.milestone)" },
  { value: "document.expiring", label: "Document Expiry (document.expiring)" },
];

export default function WorkflowAutomationPage() {
  const [activeTab, setActiveTab] = useState<"rules" | "logs">("rules");
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  // New Rule Dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    eventName: "employee.created",
    actionType: "create_task" as "create_task" | "send_notification" | "send_email",
    actionTitle: "",
    actionMessage: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Test Trigger Dialog
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEvent, setTestEvent] = useState("employee.created");
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        employeeName: "Aarav Mehta",
        employeeEmail: "aarav@company.com",
        department: "Engineering",
        designation: "Frontend Engineer",
      },
      null,
      2
    )
  );
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/hrm/v2/workflow");
      if (res.ok) {
        const json = await res.json();
        setRules(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/hrm/v2/workflow?logs=true&limit=50");
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRules(), fetchLogs()]);
    setLoading(false);
  }, [fetchRules, fetchLogs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleRule = async (rule: WorkflowRule) => {
    try {
      const nextState = !rule.isActive;
      const res = await fetch("/api/hrm/v2/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id: rule.id, isActive: nextState }),
      });
      if (res.ok) {
        setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: nextState } : r)));
        toast.success(
          nextState ? "Workflow Rule Enabled" : "Workflow Rule Disabled",
          `"${rule.name}" is now ${nextState ? "active" : "paused"}.`
        );
      }
    } catch {
      toast.error("Error", "Failed to update rule state.");
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name.trim()) return;

    setIsSaving(true);
    try {
      const actions = [
        {
          actionType: newRule.actionType,
          params: {
            title: newRule.actionTitle || newRule.name,
            description: newRule.actionMessage || newRule.description,
            message: newRule.actionMessage,
            type: "system",
          },
        },
      ];

      const res = await fetch("/api/hrm/v2/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRule.name,
          description: newRule.description,
          eventName: newRule.eventName,
          actions,
          isActive: true,
        }),
      });

      if (res.ok) {
        toast.success("Workflow Rule Created", `Rule "${newRule.name}" created successfully.`);
        setShowAddDialog(false);
        setNewRule({
          name: "",
          description: "",
          eventName: "employee.created",
          actionType: "create_task",
          actionTitle: "",
          actionMessage: "",
        });
        fetchRules();
      } else {
        toast.error("Failed to create rule", "Server returned an error.");
      }
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to create rule.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTrigger = async () => {
    setIsTriggering(true);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(testPayload);
      } catch {
        toast.error("Invalid JSON", "Please format the test payload as valid JSON.");
        setIsTriggering(false);
        return;
      }

      const res = await fetch("/api/hrm/v2/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trigger",
          eventName: testEvent,
          payload: parsed,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(
          "Event Triggered Successfully",
          `Evaluated matching rules. ${json.data?.triggeredCount || 0} rule(s) fired.`
        );
        setShowTestDialog(false);
        fetchLogs();
      } else {
        toast.error("Trigger Failed", json.error || "Execution failed.");
      }
    } catch (err: any) {
      toast.error("Trigger Error", err.message);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <AppShell title="Workflow & Automation">
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <Toast
              key={t.id}
              variant={t.variant}
              message={t.message}
              description={t.description}
              onClose={() => toast.dismissToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader
        title="Workflow & Automation Engine"
        description="Configure event-driven triggers, auto-provisioning checklists, and clearance chains."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              setIsRefreshing(true);
              await loadData();
              setIsRefreshing(false);
            }}
            disabled={isRefreshing}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowTestDialog(true)}>
            <Play className="mr-1.5 h-4 w-4 text-primary" />
            Simulate Event
          </Button>

          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Rule
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">Active Rules</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {rules.filter((r) => r.isActive).length} / {rules.length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Zap className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">Executions Logged</p>
              <p className="text-2xl font-bold text-foreground mt-1">{logs.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">Engine Status</p>
              <p className="text-base font-bold text-success mt-1 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-success motion-safe:animate-pulse motion-reduce:animate-none" />
                Live on MySQL
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center text-info">
              <Layers className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "rules"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-dark dark:hover:text-white"
          }`}
        >
          Automated Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-dark dark:hover:text-white"
          }`}
        >
          Execution History ({logs.length})
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div className="space-y-3">
          {rules.map((rule) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    rule.isActive ? "bg-primary/10 text-primary" : "bg-muted/10 text-muted"
                  }`}
                >
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-foreground">{rule.name}</h4>
                    <Badge variant={rule.isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0.5">
                      {rule.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted mt-0.5 max-w-xl">{rule.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                    <span className="font-mono bg-muted/10 px-2 py-0.5 rounded text-[11px] text-primary">
                      Event: {rule.eventName}
                    </span>
                    <span className="text-muted">
                      Actions: <strong>{rule.actions?.length || 0}</strong> (
                      {rule.actions?.map((a) => a.actionType.replace("_", " ")).join(", ")})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  variant={rule.isActive ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleRule(rule)}
                >
                  {rule.isActive ? "Disable" : "Enable"}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No workflow executions recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    {log.status === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-danger shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{log.ruleName}</p>
                      <p className="text-xs text-muted mt-0.5 font-mono">
                        Event: {log.eventName} • Actions Executed: {log.actionsExecuted}
                      </p>
                      {log.errorMessage && <p className="text-xs text-danger mt-1">{log.errorMessage}</p>}
                    </div>
                  </div>
                  <Badge variant={log.status === "success" ? "default" : "danger"} className="capitalize text-xs">
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Rule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Workflow Rule</DialogTitle>
            <DialogDescription>Define an event trigger and an automated action.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRule} className="space-y-4 my-2">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Rule Name</label>
              <Input
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="e.g. Notify Manager on Leave Submission"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Trigger Event</label>
              <select
                value={newRule.eventName}
                onChange={(e) => setNewRule({ ...newRule, eventName: e.target.value })}
                className="w-full text-sm h-9 rounded-md border border-input bg-background px-3"
              >
                {EVENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Action Type</label>
              <select
                value={newRule.actionType}
                onChange={(e: any) => setNewRule({ ...newRule, actionType: e.target.value })}
                className="w-full text-sm h-9 rounded-md border border-input bg-background px-3"
              >
                <option value="create_task">Create HRM Task</option>
                <option value="send_notification">Send In-App Notification</option>
                <option value="send_email">Send Email Alert</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Task / Alert Title</label>
              <Input
                value={newRule.actionTitle}
                onChange={(e) => setNewRule({ ...newRule, actionTitle: e.target.value })}
                placeholder="e.g. Review onboarding checklist for {{employeeName}}"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Description / Message</label>
              <Input
                value={newRule.actionMessage}
                onChange={(e) => setNewRule({ ...newRule, actionMessage: e.target.value })}
                placeholder="Supports placeholders: {{employeeName}}, {{department}}, {{days}}"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !newRule.name}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Save Rule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Test Trigger Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Simulate Event Trigger</DialogTitle>
            <DialogDescription>Simulate an HRMS event to test automated rules execution.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Select Event</label>
              <select
                value={testEvent}
                onChange={(e) => setTestEvent(e.target.value)}
                className="w-full text-sm h-9 rounded-md border border-input bg-background px-3 font-mono"
              >
                {EVENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Mock Payload (JSON)</label>
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={6}
                className="w-full text-xs font-mono p-3 rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" onClick={() => setShowTestDialog(false)} disabled={isTriggering}>
              Cancel
            </Button>
            <Button onClick={handleTestTrigger} disabled={isTriggering}>
              {isTriggering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Dispatch Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
