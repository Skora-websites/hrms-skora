"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Trash2,
  UserPlus,
  User,
  Search,
  Shield,
  UserCog,
  Eye,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/ui/form-select";
import { FormActions } from "@/components/ui/form-actions";
import { useProjects } from "@/hooks/hrm";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ── Types ───────────────────────────────────────────────

interface MemberData {
  id: string;
  projectId: string;
  userId: string;
  role: "manager" | "member" | "viewer";
  allocationPercentage?: number;
  user?: {
    displayName: string;
    email?: string;
    photoURL?: string;
  };
}

interface ProjectOption {
  id: string;
  name: string;
}

// ── Constants ───────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const roleIcons: Record<string, React.ElementType> = {
  manager: UserCog,
  member: User,
  viewer: Eye,
};

const roleColors: Record<string, string> = {
  manager: "text-amber-500 bg-amber-500/10",
  member: "text-primary bg-primary/10",
  viewer: "text-muted bg-gray-100 dark:bg-gray-800",
};

// ── Component ───────────────────────────────────────────

export default function TeamsPage() {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const toast = useToast();

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [newMemberProjectId, setNewMemberProjectId] = useState("");
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    const pid = selectedProject || projects?.[0]?.id;
    if (!pid) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hrm/v2/projects?members=true&projectId=${pid}`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const json = await res.json();
      setMembers(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, projects]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async () => {
    if (!newMemberUserId || !newMemberProjectId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hrm/v2/projects?action=member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: newMemberProjectId,
          userId: newMemberUserId,
          role: newMemberRole,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add member");
      }
      toast.success("Member Added", "Team member has been added to the project.");
      setShowDialog(false);
      setNewMemberUserId("");
      fetchMembers();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemoving(memberId);
    try {
      const res = await fetch(`/api/hrm/v2/projects?type=member&memberId=${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove member");
      toast.success("Member Removed", "Team member has been removed from the project.");
      fetchMembers();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setRemoving(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredMembers = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.user?.displayName || "").toLowerCase().includes(q);
  });

  // Set default project when projects load
  useEffect(() => {
    if (!selectedProject && projects && projects.length > 0) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  return (
    <AppShell title="Project Teams">
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}>
              <Toast variant={t.variant} message={t.message} description={t.description} onClose={() => toast.dismissToast(t.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader title="Project Teams" description="Manage team members across projects.">
        <Button onClick={() => { setNewMemberProjectId(selectedProject || projects?.[0]?.id || ""); setShowDialog(true); }}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </PageHeader>

      {/* Project selector */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-dark dark:text-white appearance-none cursor-pointer focus:border-primary focus:outline-none"
        >
          <option value="">Select a project</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search members..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!selectedProject ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <p className="text-dark dark:text-white font-semibold text-lg">Select a project</p>
          <p className="text-sm text-muted mt-1">Choose a project from the dropdown to view its team members.</p>
        </div>
      ) : error ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-dark dark:text-white font-semibold">Failed to load members</p>
          <p className="text-sm text-muted mt-1">{error}</p>
          <Button className="mt-4" variant="outline" onClick={fetchMembers}>Try Again</Button>
        </div>
      ) : loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <p className="text-dark dark:text-white font-semibold text-lg">
            {search ? "No members match your search" : "No team members yet"}
          </p>
          <p className="text-sm text-muted mt-1">
            {search ? "Try adjusting your search terms." : "Add team members to this project to get started."}
          </p>
          {!search && (
            <Button className="mt-4" onClick={() => setShowDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredMembers.map((member, idx) => {
            const RoleIcon = roleIcons[member.role] || User;
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 ring-2 ring-border">
                      <AvatarImage src={member.user?.photoURL} />
                      <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-primary/70 text-white">
                        {getInitials(member.user?.displayName || "User")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dark dark:text-white truncate">
                        {member.user?.displayName || "Unknown User"}
                      </p>
                      {member.user?.email && (
                        <p className="text-xs text-muted truncate">{member.user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${roleColors[member.role]}`}>
                      <RoleIcon className="h-3 w-3" />
                      {member.role}
                    </span>
                    {member.allocationPercentage && (
                      <span className="text-xs text-muted">{member.allocationPercentage}%</span>
                    )}
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => handleRemoveMember(member.id)}
                      loading={removing === member.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Add Member Dialog ── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) setShowDialog(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-lg shadow-primary/20">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Add a user to the project team with a specific role.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddMember(); }}>
            <div className="space-y-4 py-2">
              <FormSelect
                label="Project"
                icon={<Users className="h-4 w-4" />}
                value={newMemberProjectId}
                onChange={(e) => setNewMemberProjectId(e.target.value)}
                options={projects?.map((p) => ({ value: p.id, label: p.name })) || []}
                required
              />
              <FormSelect
                label="User ID"
                icon={<User className="h-4 w-4" />}
                value={newMemberUserId}
                onChange={(e) => setNewMemberUserId(e.target.value)}
                options={[{ value: "", label: "Enter User ID..." }]}
                required
              />
              <p className="text-xs text-muted -mt-2">
                Enter the User ID or select the employee from the directory.
              </p>
              <FormSelect
                label="Role"
                icon={<Shield className="h-4 w-4" />}
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                options={ROLE_OPTIONS}
              />
            </div>
            <FormActions
              onCancel={() => setShowDialog(false)}
              submitLabel={saving ? "Adding..." : "Add Member"}
              loading={saving}
              error={null}
            />
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
