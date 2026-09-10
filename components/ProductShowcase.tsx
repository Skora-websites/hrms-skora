"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  Cloud,
  Kanban,
  Users,
  Activity,
} from "lucide-react";
import Card3D from "./Card3D";

export default function ProductShowcase({
  onOpenConsultation,
}: {
  onOpenConsultation: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"marketing" | "cloud" | "pms" | "crm">("marketing");

  const checklist = [
    "Rank higher on Google, Bing & Generative AI Engines",
    "Get cited in ChatGPT, Gemini, Perplexity & Copilot",
    "Build high-converting Web, Mobile & SaaS solutions",
    "Streamline teams & client pipelines with integrated PMS & CRM",
  ];

  return (
    <section id="showcase" className="py-24 relative bg-[#05070E] overflow-hidden [perspective:1200px]">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column — 3D Dashboard Mockup Presentation */}
          <div className="lg:col-span-7">
            <Card3D maxTilt={10} className="relative rounded-3xl glass-card border border-blue-500/40 bg-[#0B0F19] overflow-hidden shadow-2xl">
              {/* Top Window Bar */}
              <div className="bg-[#0D1322] px-6 py-4 border-b border-white/10 flex items-center justify-between [transform:translateZ(20px)]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-xs font-mono text-[#94A3B8]">
                  https://dashboard.skora.digital/{activeTab}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-blue-400 font-mono">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  <span>LIVE 3D</span>
                </div>
              </div>

              {/* Dashboard Tab Bar Switcher */}
              <div className="bg-[#090D16] px-4 py-2 border-b border-white/5 flex items-center gap-2 overflow-x-auto [transform:translateZ(30px)]">
                <button
                  onClick={() => setActiveTab("marketing")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === "marketing"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>AI SEO & Marketing</span>
                </button>
                <button
                  onClick={() => setActiveTab("cloud")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === "cloud"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Cloud & DevOps</span>
                </button>
                <button
                  onClick={() => setActiveTab("pms")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === "pms"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span>PMS Sprint Tracker</span>
                </button>
                <button
                  onClick={() => setActiveTab("crm")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === "crm"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>CRM Lead Pipeline</span>
                </button>
              </div>

              {/* Dashboard Tab Contents */}
              <div className="p-6 space-y-6 [transform:translateZ(40px)]">
                {activeTab === "marketing" && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <span className="text-[11px] text-[#94A3B8] block">Google Organic Traffic</span>
                        <span className="text-xl font-extrabold text-white">142.8k/mo</span>
                        <span className="text-xs text-emerald-400 block mt-1">+48.2% vs last month</span>
                      </div>
                      <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        <span className="text-[11px] text-[#94A3B8] block">AI Generative Citations</span>
                        <span className="text-xl font-extrabold text-white">18.4k</span>
                        <span className="text-xs text-cyan-400 block mt-1">ChatGPT & Gemini</span>
                      </div>
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-[11px] text-[#94A3B8] block">Avg GEO Rank</span>
                        <span className="text-xl font-extrabold text-white">#1.4 Top</span>
                        <span className="text-xs text-indigo-400 block mt-1">High Intent Snippets</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                      <div className="flex justify-between text-xs text-[#CBD5E1]">
                        <span>Generative Engine Citation Share</span>
                        <span className="text-blue-400 font-mono">88% Dominance</span>
                      </div>
                      <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-500 w-[50%]" title="ChatGPT"></div>
                        <div className="h-full bg-cyan-400 w-[25%]" title="Gemini"></div>
                        <div className="h-full bg-sky-300 w-[15%]" title="Perplexity"></div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "cloud" && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-[11px] text-[#94A3B8] block">AWS Cluster Health</span>
                        <span className="text-xl font-extrabold text-emerald-400">Optimal</span>
                        <span className="text-xs text-[#94A3B8] block mt-1">12 Microservices Active</span>
                      </div>
                      <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
                        <span className="text-[11px] text-[#94A3B8] block">Container Uptime</span>
                        <span className="text-xl font-extrabold text-white">99.99%</span>
                        <span className="text-xs text-sky-400 block mt-1">Zero Downtime Deploy</span>
                      </div>
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <span className="text-[11px] text-[#94A3B8] block">API Latency</span>
                        <span className="text-xl font-extrabold text-white">34ms</span>
                        <span className="text-xs text-blue-400 block mt-1">Global CDN Edge</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "pms" && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                        <span className="text-xs font-semibold text-white">Sprint #24: Mobile App Swift UI Refactor</span>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono">100% Done</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
                        <span className="text-xs font-semibold text-white">Sprint #25: AI GEO Keyword Scraper API</span>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 font-mono">In Progress</span>
                    </div>
                  </div>
                )}

                {activeTab === "crm" && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                        <span className="text-[10px] text-[#94A3B8] block">New Inquiries</span>
                        <span className="text-lg font-bold text-white">412</span>
                      </div>
                      <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                        <span className="text-[10px] text-[#94A3B8] block">Qualified</span>
                        <span className="text-lg font-bold text-white">284</span>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                        <span className="text-[10px] text-[#94A3B8] block">Proposals</span>
                        <span className="text-lg font-bold text-white">98</span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <span className="text-[10px] text-[#94A3B8] block">Won Revenue</span>
                        <span className="text-lg font-bold text-emerald-400">$340k</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card3D>
          </div>

          {/* Right Column — Value Proposition Copy */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-semibold border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Inside SKORA.digital</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Your Playbook for <br />
              <span className="text-gradient">SEO & Enterprise Visibility</span>
            </h2>

            <p className="text-base text-[#94A3B8] leading-relaxed">
              Gain instant access to our unified platform and strategic blueprints. Seamlessly integrate digital marketing campaigns with high-performing Web/Mobile builds, resilient Cloud infrastructure, and custom PMS/CRM pipelines.
            </p>

            <div className="space-y-3.5 pt-2">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-[#F8FAFC]">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5 text-blue-400 shadow-md shadow-blue-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <button
                onClick={onOpenConsultation}
                className="btn-primary text-base px-8 py-4 rounded-xl shadow-xl shadow-blue-600/30 hover:scale-105 transition-transform"
              >
                <span>Explore All Strategies</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
