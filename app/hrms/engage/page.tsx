"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormSection } from "@/components/ui/form-section";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormActions } from "@/components/ui/form-actions";
import {
  MessageSquare,
  Search,
  Heart,
  MessageCircle,
  Send,
  ThumbsUp,
  MoreHorizontal,
  Image,
  Trash2,
  Pencil,
  Edit3,
} from "lucide-react";
import { usePosts } from "@/hooks/hrm/use-engage";
import { useMutation } from "@/hooks/use-mutation";
import { getTimeAgo } from "@/lib/utils";

export default function EngagePage() {
  const [search, setSearch] = useState("");
  const [newPost, setNewPost] = useState("");
  const { data: posts, loading, error, refetch } = usePosts();
  const mutation = useMutation();

  const [editingPost, setEditingPost] = useState<any>(null);
  const [editContent, setEditContent] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deletePost, setDeletePost] = useState<any>(null);

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;
    const result = await mutation.createRecord("/api/hrm/v2/engage/posts", {
      content: newPost.trim(),
      userId: "current_user",
    });
    if (result) {
      setNewPost("");
      refetch();
    }
  };

  const handleEdit = async () => {
    if (!editingPost) return;
    const result = await mutation.updateRecord(
      `/api/hrm/v2/engage/posts?id=${editingPost.id}`,
      { content: editContent }
    );
    if (result) {
      setShowEditDialog(false);
      setEditingPost(null);
      refetch();
    }
  };

  const handleDelete = async () => {
    if (!deletePost) return;
    const result = await mutation.deleteRecord(
      `/api/hrm/v2/engage/posts?id=${deletePost.id}`
    );
    if (result) {
      setDeletePost(null);
      refetch();
    }
  };

  const safePosts = posts || [];
  const filtered = safePosts.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.content?.toLowerCase().includes(q) || p.userId?.toLowerCase().includes(q);
  });

  return (
    <AppShell title="Engage">
      <PageHeader
        title="Engage"
        description="Company feed — share updates, celebrate wins, and connect with your team."
      />

      {/* Create Post */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm mb-6">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold shrink-0">U</div>
          <div className="flex-1">
            <textarea
              placeholder="What's on your mind?"
              className="w-full bg-transparent border-0 outline-none resize-none text-sm text-dark dark:text-white placeholder:text-muted/60 min-h-[80px]"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
            <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
              <Button variant="ghost" size="sm" className="text-muted"><Image className="h-4 w-4 mr-1" />Photo</Button>
              <Button size="sm" disabled={!newPost.trim()} onClick={handleCreatePost} loading={mutation.loading}>
                <Send className="h-4 w-4 mr-1" />Post
              </Button>
            </div>
            {mutation.error && <p className="text-xs text-danger mt-2">{mutation.error}</p>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="space-y-2 flex-1"><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /><div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></div>
              </div>
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" /><div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center"><MessageSquare className="h-12 w-12 text-danger mx-auto mb-4" /><p className="text-dark dark:text-white font-semibold">Failed to load feed</p><p className="text-sm text-muted mt-1">{error}</p></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center"><MessageSquare className="h-12 w-12 text-muted mx-auto mb-4" /><p className="text-dark dark:text-white font-semibold">{search ? "No posts match your search" : "No posts yet"}</p><p className="text-sm text-muted mt-1">{search ? "Try adjusting your search." : "Be the first to share something with your team!"}</p></div>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => (
            <div key={post.id} className="bg-card rounded-xl border border-border shadow-sm">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold">{post.userId?.charAt(0) || "?"}</div>
                    <div>
                      <p className="text-sm font-semibold text-dark dark:text-white">{post.userId || "Unknown"}</p>
                      <p className="text-xs text-muted">{post.createdAt ? getTimeAgo(post.createdAt as any) : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingPost(post); setEditContent(post.content || ""); setShowEditDialog(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-danger hover:text-danger" onClick={() => setDeletePost(post)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-dark dark:text-white whitespace-pre-wrap">{post.content}</p>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                  <button className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors">
                    <ThumbsUp className="h-4 w-4" /><span>{post.likes || 0}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors">
                    <MessageCircle className="h-4 w-4" /><span>{post.comments || 0}</span>
                  </button>
                </div>
                {(post.comments ?? 0) > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted">{post.comments} comment{post.comments !== 1 ? "s" : ""}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Edit3 className="h-4 w-4 text-primary" />
              </div>
              Edit Post
            </DialogTitle>
            <DialogDescription>Update your post content.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="space-y-6">
            <FormSection title="Post Content" icon={<MessageSquare className="h-4 w-4" />}>
              <FormTextarea
                label="Content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="What would you like to say?"
              />
            </FormSection>
            {mutation.error && (
              <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>
            )}
            <FormActions
              onCancel={() => setShowEditDialog(false)}
              submitLabel="Save Changes"
              loading={mutation.loading}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deletePost} onOpenChange={() => setDeletePost(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
                <Trash2 className="h-4 w-4 text-danger" />
              </div>
              Delete Post
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete this post? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDeletePost(null)} disabled={mutation.loading}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={mutation.loading}>
              <Trash2 className="h-4 w-4 mr-1.5" />Delete Post
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
