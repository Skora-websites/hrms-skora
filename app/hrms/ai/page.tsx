"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sparkles,
  Send,
  Bot,
  User,
  ArrowRight,
  Calendar,
  DollarSign,
  Coffee,
  Receipt,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getInitials } from "@/lib/utils";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  cards?: any[];
  intentDetected?: string;
  createdAt?: string;
}

const QUICK_PROMPTS = [
  "What is my leave balance?",
  "Who is out of office today?",
  "Check my advance salary limit",
  "How do I claim an expense reimbursement?",
  "Send kudos to a teammate",
];

export default function AiAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your Skora HR Assistant. You can ask me about your leave balances, who is out today, request earned wage salary advances, file expense reimbursements, or ask about company policies. How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (promptToSend?: string) => {
    const text = promptToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    if (!promptToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/hrm/v2/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          content: text.trim(),
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const assistantMsg: Message = {
          role: "assistant",
          content: json.data.reply,
          cards: json.data.cards,
          intentDetected: json.data.intentDetected,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I apologize, but I could not process your query right now. Please try again.",
          },
        ]);
      }
    } catch (err) {
      console.error("AI error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error occurred while contacting HR assistant. Please check your connection.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-4">
        <PageHeader
          title="AI HR Assistant"
          subtitle="Real-time conversational HR copilot with live actions for leave balances, salary advances, and benefits"
        />

        {/* Chat Container */}
        <Card className="border border-border/70 shadow-xs flex flex-col h-[650px] overflow-hidden bg-card">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-xs"
                      : "bg-muted/40 border border-border/60 text-foreground rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {/* Render Action Cards */}
                  {m.cards && m.cards.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-border/50">
                      {m.cards.map((c: any, cIdx: number) => (
                        <div
                          key={cIdx}
                          className="p-3 rounded-xl bg-background border border-border/70 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-semibold text-xs text-foreground">{c.title}</p>
                            <p className="text-[11px] text-muted-foreground">{c.summary}</p>
                          </div>
                          {c.actionUrl && (
                            <Link href={c.actionUrl}>
                              <Button size="sm" className="h-7 text-xs gap-1.5 shrink-0 shadow-xs">
                                <span>{c.buttonLabel || "View Details"}</span>
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {m.role === "user" && (
                  <Avatar className="h-8 w-8 border border-border/60 shrink-0 mt-0.5">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                      {getInitials(user?.name || user?.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted/40 border border-border/60 rounded-2xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse delay-150" />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse delay-300" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 border-t border-border/60 bg-muted/20 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-medium text-muted-foreground shrink-0">Try asking:</span>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full border border-border/70 bg-background text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0 disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 sm:p-4 border-t border-border/70 bg-background flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about leaves, payslips, advance wage, or company policies..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              className="flex-1 h-9 px-3.5 rounded-lg border border-border/80 bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <Button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              size="sm"
              className="h-9 px-4 gap-1.5 shadow-xs shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
