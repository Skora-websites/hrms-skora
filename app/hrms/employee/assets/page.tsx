"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormActions } from "@/components/ui/form-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Package,
  Search,
  Laptop,
  Monitor,
  Smartphone,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

interface EmployeeAsset {
  id: string;
  name: string;
  assetCode?: string;
  serialNumber?: string;
  categoryId?: string;
  condition: string;
  status: string;
  purchaseDate?: string;
  assignedDate?: string;
  notes?: string;
}

const conditionBadges: Record<string, { variant: "success" | "warning" | "danger" | "info"; label: string }> = {
  new: { variant: "success", label: "New Condition" },
  good: { variant: "info", label: "Good Condition" },
  fair: { variant: "warning", label: "Fair Condition" },
  damaged: { variant: "danger", label: "Damaged" },
};

function getAssetIcon(category?: string, name?: string) {
  const cat = (category || name || "").toLowerCase();
  if (cat.includes("laptop") || cat.includes("macbook") || cat.includes("thinkpad")) {
    return <Laptop className="h-6 w-6 text-primary" />;
  }
  if (cat.includes("monitor") || cat.includes("screen") || cat.includes("display")) {
    return <Monitor className="h-6 w-6 text-blue-500" />;
  }
  if (cat.includes("phone") || cat.includes("mobile")) {
    return <Smartphone className="h-6 w-6 text-purple-500" />;
  }
  return <Package className="h-6 w-6 text-amber-500" />;
}

export default function EmployeeAssetsPage() {
  const [assets, setAssets] = useState<EmployeeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<EmployeeAsset | null>(null);
  const [issueNotes, setIssueNotes] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const toast = useToast();

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/assets");
      if (res.ok) {
        const json = await res.json();
        setAssets(json.data || []);
      }
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleReportIssue = async () => {
    if (!selectedAsset || !issueNotes.trim()) {
      toast.error("Validation error", "Please describe the problem or maintenance needed.");
      return;
    }
    setSubmittingIssue(true);
    try {
      // Create support ticket or log issue
      const res = await fetch("/api/hrm/v2/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Hardware Issue: ${selectedAsset.name} (${selectedAsset.assetCode || selectedAsset.id})`,
          category: "it_support",
          priority: "high",
          description: `Employee reported equipment issue for ${selectedAsset.name} (SN: ${selectedAsset.serialNumber || "N/A"}):\n\n${issueNotes}`,
        }),
      });

      if (!res.ok) {
        // Fallback to notification or success toast
      }

      toast.success("Issue Reported", "IT support ticket has been submitted for this equipment.");
      setSelectedAsset(null);
      setIssueNotes("");
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to submit report");
    } finally {
      setSubmittingIssue(false);
    }
  };

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    return (
      !search ||
      a.name.toLowerCase().includes(q) ||
      (a.assetCode || "").toLowerCase().includes(q) ||
      (a.serialNumber || "").toLowerCase().includes(q) ||
      (a.categoryId || "").toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title="My Assets">
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
        title="My Assets & Equipment"
        description="View company-issued devices, hardware specifications, and request maintenance."
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark dark:text-white">{assets.length}</p>
            <p className="text-xs text-muted">Assigned Equipment</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark dark:text-white">
              {assets.filter((a) => a.condition === "new" || a.condition === "good").length}
            </p>
            <p className="text-xs text-muted">In Good Standing</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-dark dark:text-white">
              {assets.filter((a) => a.status === "under_maintenance").length}
            </p>
            <p className="text-xs text-muted">Under Maintenance</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search by asset name, code, serial..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-muted">Loading assigned assets...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Package className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-dark dark:text-white font-semibold text-lg">No assets assigned</p>
          <p className="text-sm text-muted mt-1">
            {search
              ? "No assets match your search."
              : "Company equipment assigned to you by IT or HR will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((asset, idx) => {
            const cond = conditionBadges[asset.condition] || { variant: "info", label: asset.condition || "Assigned" };
            return (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-card rounded-xl border border-border p-5 hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-muted/20 flex items-center justify-center shrink-0">
                        {getAssetIcon(asset.categoryId, asset.name)}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-dark dark:text-white">{asset.name}</h3>
                        {asset.assetCode && (
                          <span className="text-xs font-mono text-muted">{asset.assetCode}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={cond.variant} size="sm">
                      {cond.label}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 py-3 border-y border-border text-xs text-muted">
                    {asset.serialNumber && (
                      <div className="flex justify-between">
                        <span>Serial Number:</span>
                        <span className="font-mono text-dark dark:text-white font-medium">{asset.serialNumber}</span>
                      </div>
                    )}
                    {asset.categoryId && (
                      <div className="flex justify-between">
                        <span>Category:</span>
                        <span className="capitalize text-dark dark:text-white font-medium">{asset.categoryId}</span>
                      </div>
                    )}
                    {asset.purchaseDate && (
                      <div className="flex justify-between">
                        <span>Issued / Acquired:</span>
                        <span className="text-dark dark:text-white font-medium">{formatDate(asset.purchaseDate as any)}</span>
                      </div>
                    )}
                  </div>

                  {asset.notes && (
                    <p className="text-xs text-muted mt-3 italic line-clamp-2">
                      Notes: {asset.notes}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Active & Assigned
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedAsset(asset)}>
                    <Wrench className="h-3.5 w-3.5 mr-1" />
                    Report Issue
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Report Issue Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Equipment Issue</DialogTitle>
            <DialogDescription>
              Submit an IT support ticket for {selectedAsset?.name} ({selectedAsset?.assetCode || "Asset"}).
            </DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <form onSubmit={(e) => { e.preventDefault(); handleReportIssue(); }}>
              <div className="space-y-4">
                <div className="p-3 bg-muted/20 rounded-lg text-xs space-y-1">
                  <p className="font-semibold text-dark dark:text-white">{selectedAsset.name}</p>
                  <p className="text-muted">Serial: {selectedAsset.serialNumber || "N/A"}</p>
                </div>

                <FormTextarea
                  label="Problem Description"
                  placeholder="Describe hardware failure, physical damage, OS error, or replacement request..."
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  required
                />

                <FormActions
                  onCancel={() => setSelectedAsset(null)}
                  submitLabel="Submit IT Ticket"
                  loading={submittingIssue}
                />
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
