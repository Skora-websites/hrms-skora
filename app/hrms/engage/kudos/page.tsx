"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Heart,
  Trophy,
  Award,
  Send,
  Plus,
  Users,
  Flame,
  CheckCircle2,
  AlertCircle,
  Hash,
  ThumbsUp,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getInitials } from "@/lib/utils";

interface Kudos {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverEmail: string;
  receiverAvatar?: string;
  department?: string;
  points: number;
  badge: string;
  coreValue: string;
  message: string;
  likesCount: number;
  createdAt: string;
}

interface LeaderboardUser {
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  department: string;
  kudosCount: number;
  totalPoints: number;
}

const BADGES = [
  { label: "Team Player", icon: "🤝" },
  { label: "Rockstar", icon: "⭐" },
  { label: "Innovator", icon: "💡" },
  { label: "Problem Solver", icon: "🎯" },
  { label: "Customer Champion", icon: "🏆" },
  { label: "Above & Beyond", icon: "🚀" },
];

const CORE_VALUES = ["#Teamwork", "#Excellence", "#Innovation", "#CustomerFirst", "#Integrity"];

export default function KudosWallPage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<Kudos[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [allowance, setAllowance] = useState({ monthlyBudget: 100, pointsGiven: 0, remainingPoints: 100 });
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState("all");

  // Colleague directory for modal
  const [colleagues, setColleagues] = useState<any[]>([]);

  // Send Kudos Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    receiverId: "",
    points: 20,
    badge: "Team Player",
    coreValue: "#Teamwork",
    message: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [feedRes, leaderRes, usersRes] = await Promise.all([
        fetch("/api/hrm/v2/engage/kudos"),
        fetch("/api/hrm/v2/engage/kudos?leaderboard=true"),
        fetch("/api/hrm/v2/employees?limit=100"),
      ]);

      const feedData = await feedRes.json();
      const leaderData = await leaderRes.json();
      const usersData = await usersRes.json();

      if (feedData.success && Array.isArray(feedData.data)) {
        setFeed(feedData.data);
      }
      if (feedData.allowance) {
        setAllowance(feedData.allowance);
      }
      if (leaderData.success && Array.isArray(leaderData.data)) {
        setLeaderboard(leaderData.data);
      }
      if (usersData.data && Array.isArray(usersData.data)) {
        setColleagues(usersData.data.filter((u: any) => u.id !== user?.id));
      }
    } catch (err) {
      console.error("Failed to load kudos feed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLike = async (kudosId: string) => {
    try {
      const res = await fetch("/api/hrm/v2/engage/kudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", kudosId }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setFeed((prev) =>
          prev.map((k) =>
            k.id === kudosId ? { ...k, likesCount: json.data.likesCount } : k
          )
        );
      }
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleSendKudos = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.receiverId) {
      setErrorMsg("Please select a colleague to recognize");
      return;
    }
    if (!formData.message.trim()) {
      setErrorMsg("Please write a personalized recognition message");
      return;
    }
    if (formData.points > allowance.remainingPoints) {
      setErrorMsg(`You only have ${allowance.remainingPoints} points remaining this month`);
      return;
    }

    const selectedColleague = colleagues.find((c) => c.id === formData.receiverId);

    setSubmitting(true);
    try {
      const res = await fetch("/api/hrm/v2/engage/kudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: formData.receiverId,
          receiverName: selectedColleague?.displayName || selectedColleague?.firstName || "Colleague",
          receiverEmail: selectedColleague?.email || "",
          receiverAvatar: selectedColleague?.avatar || "",
          department: selectedColleague?.department || "General",
          points: formData.points,
          badge: formData.badge,
          coreValue: formData.coreValue,
          message: formData.message.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to send kudos");
      }

      setModalOpen(false);
      setFormData({
        receiverId: "",
        points: 20,
        badge: "Team Player",
        coreValue: "#Teamwork",
        message: "",
      });
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send kudos");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFeed = feed.filter((k) => {
    if (selectedTag === "all") return true;
    return k.coreValue === selectedTag;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Peer Kudos & Recognition Wall"
          subtitle="Celebrate team achievements, reward colleagues with monthly point allowances, and elevate company core values"
          action={
            <Button
              onClick={() => setModalOpen(true)}
              disabled={allowance.remainingPoints <= 0}
              className="gap-2 shadow-xs"
            >
              <Sparkles className="h-4 w-4" /> Give Kudos
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Monthly Budget Allowance Banner */}
            <Card className="border border-border/70 shadow-xs bg-card">
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    <Flame className="h-4 w-4 text-amber-500" />
                    <span>Monthly Kudos Budget</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">
                    {allowance.remainingPoints} <span className="text-sm font-normal text-muted-foreground">/ {allowance.monthlyBudget} points remaining</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Allowance resets automatically on the 1st of every calendar month.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  disabled={allowance.remainingPoints <= 0}
                  className="gap-1.5 text-xs shrink-0 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" /> Give Points
                </Button>
              </CardContent>
            </Card>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <Button
                variant={selectedTag === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag("all")}
                className="text-xs rounded-full"
              >
                All Posts
              </Button>
              {CORE_VALUES.map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                  className="text-xs rounded-full font-medium"
                >
                  {tag}
                </Button>
              ))}
            </div>

            {/* Kudos Feed Cards */}
            <div className="space-y-3">
              {loading ? (
                <p className="text-center py-10 text-sm text-muted-foreground">Loading Kudos Wall...</p>
              ) : filteredFeed.length === 0 ? (
                <Card className="border border-border/70 p-10 text-center text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary/40" />
                  <p className="font-semibold text-foreground text-sm">No kudos shared yet</p>
                  <p className="text-xs mt-1">Be the first to recognize a colleague's great work today.</p>
                </Card>
              ) : (
                filteredFeed.map((k) => (
                  <Card key={k.id} className="border border-border/70 shadow-xs hover:border-border transition-colors">
                    <CardContent className="p-5 space-y-3.5">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border/60">
                            <AvatarImage src={k.receiverAvatar} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {getInitials(k.receiverName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-foreground text-sm">{k.receiverName}</span>
                              <span className="text-xs text-muted-foreground">from</span>
                              <span className="font-medium text-xs text-foreground">{k.senderName}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {new Date(k.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Points Pill */}
                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-semibold shrink-0">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          +{k.points} pts
                        </div>
                      </div>

                      {/* Badge & Core Value Tags */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs font-medium">
                          {k.badge}
                        </Badge>
                        <Badge variant="subtle" className="text-xs font-medium">
                          {k.coreValue}
                        </Badge>
                      </div>

                      {/* Personal Praise Note */}
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        "{k.message}"
                      </p>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(k.id)}
                          className="h-8 text-xs gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                          <span>{k.likesCount || 0}</span>
                        </Button>
                        <span className="text-xs text-muted-foreground font-medium">
                          {k.department || "General"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar: Leaderboard & Values */}
          <div className="space-y-4">
            {/* Monthly Leaderboard */}
            <Card className="border border-border/70 shadow-xs">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" /> Monthly Leaderboard
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">Top Recognized</Badge>
                </div>

                <div className="space-y-2.5">
                  {leaderboard.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No points awarded this month yet.</p>
                  ) : (
                    leaderboard.slice(0, 5).map((u, idx) => (
                      <div key={u.receiverId} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-xs w-4 text-center text-muted-foreground">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                          </span>
                          <Avatar className="h-7 w-7 border border-border/60">
                            <AvatarImage src={u.receiverAvatar} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {getInitials(u.receiverName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-xs text-foreground truncate">{u.receiverName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{u.department}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-xs text-amber-600 dark:text-amber-400">
                            {u.totalPoints} pts
                          </span>
                          <p className="text-[10px] text-muted-foreground">{u.kudosCount} kudos</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Core Values Guide Card */}
            <Card className="border border-border/70 shadow-xs">
              <CardContent className="p-5 space-y-3">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Company Core Values</h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                    <p className="font-semibold text-primary">#Innovation</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">Pushing boundaries, experimenting, finding better solutions.</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                    <p className="font-semibold text-primary">#Teamwork</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">Collaboration, active support, collective mission success.</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                    <p className="font-semibold text-primary">#CustomerFirst</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">Delivering extraordinary customer care and value.</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                    <p className="font-semibold text-primary">#Excellence</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">High craftsmanship, meticulous attention to detail.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Give Kudos Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> Give Kudos to Colleague
              </DialogTitle>
              <DialogDescription>
                Reward a teammate with points from your monthly allowance ({allowance.remainingPoints} pts remaining).
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSendKudos} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Select Colleague *</label>
                <select
                  value={formData.receiverId}
                  onChange={(e) => setFormData({ ...formData, receiverId: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">Choose someone to recognize...</option>
                  {colleagues.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email} ({c.department || "General"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Badge Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Award Badge</label>
                <div className="grid grid-cols-3 gap-2">
                  {BADGES.map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, badge: b.label })}
                      className={`p-2 rounded-lg border text-xs text-center transition-all ${
                        formData.badge === b.label
                          ? "border-primary bg-primary/10 font-bold text-primary"
                          : "border-border/70 hover:bg-muted/40"
                      }`}
                    >
                      <span className="text-sm block mb-0.5">{b.icon}</span>
                      <span className="truncate block text-[11px]">{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Value Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Core Value</label>
                <select
                  value={formData.coreValue}
                  onChange={(e) => setFormData({ ...formData, coreValue: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CORE_VALUES.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {/* Points Allocation */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>Points to Award</span>
                  <span className="text-amber-600 font-bold">+{formData.points} Points</span>
                </div>
                <div className="flex gap-2">
                  {[10, 20, 25, 50].map((pts) => (
                    <Button
                      key={pts}
                      type="button"
                      variant={formData.points === pts ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData({ ...formData, points: pts })}
                      disabled={pts > allowance.remainingPoints}
                      className="flex-1 text-xs"
                    >
                      +{pts}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Personal Recognition Note *</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border/80 bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Share what they did that made a real difference..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Sending..." : "Publish Kudos"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
