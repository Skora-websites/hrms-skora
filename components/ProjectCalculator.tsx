"use client";

import React, { useState } from "react";
import { Calculator, ArrowRight, Check, Sparkles, TrendingUp } from "lucide-react";
import Card3D from "./Card3D";

interface ProjectCalculatorProps {
  onOpenConsultation: (details?: string) => void;
}

export default function ProjectCalculator({ onOpenConsultation }: ProjectCalculatorProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "digital-marketing",
    "website-design",
  ]);
  const [projectScale, setProjectScale] = useState<"startup" | "growth" | "enterprise">("growth");
  const [timeline, setTimeline] = useState<"fast" | "standard" | "extended">("standard");

  const servicesList = [
    { id: "digital-marketing", name: "Digital Marketing & AI SEO", basePrice: 1500 },
    { id: "website-design", name: "Website Design & Web App", basePrice: 2500 },
    { id: "mobile-dev", name: "Mobile Development (iOS/Android)", basePrice: 3500 },
    { id: "cloud-devops", name: "Cloud Infrastructure & DevOps", basePrice: 2000 },
    { id: "saas-dev", name: "SaaS Multi-Tenant Platform", basePrice: 4000 },
    { id: "pms-system", name: "Custom Project Management (PMS)", basePrice: 2800 },
    { id: "crm-system", name: "Customer Relationship (CRM)", basePrice: 2600 },
  ];

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((s) => s !== id));
      }
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const rawBaseSum = servicesList
    .filter((s) => selectedServices.includes(s.id))
    .reduce((acc, curr) => acc + curr.basePrice, 0);

  const scaleMultiplier = projectScale === "startup" ? 0.8 : projectScale === "growth" ? 1.0 : 1.6;
  const timelineMultiplier = timeline === "fast" ? 1.2 : timeline === "standard" ? 1.0 : 0.9;

  const estimatedCost = Math.round(rawBaseSum * scaleMultiplier * timelineMultiplier);
  const estimatedROI = (2.5 + selectedServices.length * 0.4).toFixed(1);
  const estimatedTrafficBoost = `${120 + selectedServices.length * 45}%`;

  const handleBookEstimate = () => {
    const summary = `Selected Services: ${selectedServices.join(", ")}, Scale: ${projectScale}, Estimated Budget: $${estimatedCost.toLocaleString()}`;
    onOpenConsultation(summary);
  };

  return (
    <section id="estimator" className="py-24 relative bg-[#070A12] border-t border-white/5 [perspective:1200px]">
      <div className="absolute top-1/2 right-10 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-semibold uppercase tracking-wider">
            <Calculator className="w-3.5 h-3.5 text-blue-400" />
            <span>Interactive ROI & Cost Estimator</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Calculate Your Custom <span className="text-gradient">Project & Growth Plan</span>
          </h2>

          <p className="text-base sm:text-lg text-[#94A3B8]">
            Select your required tech & marketing modules to estimate project investment and expected ROI returns.
          </p>
        </div>

        {/* 3D Interactive Estimator Card */}
        <Card3D maxTilt={8} className="glass-card rounded-3xl p-6 sm:p-10 border border-blue-500/30 bg-[#0B0F19]/90 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 [transform-style:preserve-3d]">
            {/* Left Options Selector (7 Cols) */}
            <div className="lg:col-span-7 space-y-8 [transform:translateZ(30px)]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                  Select Required Services
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {servicesList.map((service) => {
                    const isSelected = selectedServices.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? "bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                            : "bg-white/[0.02] border-white/10 text-[#94A3B8] hover:border-white/20"
                        }`}
                      >
                        <span className="text-xs font-semibold truncate pr-2">{service.name}</span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "border-white/20"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                  Select Business Scale
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "startup", title: "Startup / SME", sub: "Core MVP & Launch" },
                    { id: "growth", title: "Growth Brand", sub: "Scale & Optimize" },
                    { id: "enterprise", title: "Enterprise", sub: "Dedicated Team & SLA" },
                  ].map((scale) => (
                    <button
                      key={scale.id}
                      onClick={() => setProjectScale(scale.id as any)}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        projectScale === scale.id
                          ? "bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                          : "bg-white/[0.02] border-white/10 text-[#94A3B8] hover:border-white/20"
                      }`}
                    >
                      <span className="text-xs font-bold block text-white">{scale.title}</span>
                      <span className="text-[10px] text-[#94A3B8] block mt-1">{scale.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Result Dashboard (5 Cols) */}
            <div className="lg:col-span-5 rounded-2xl bg-[#070A12] border border-white/10 p-6 flex flex-col justify-between space-y-6 [transform:translateZ(45px)]">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <span className="text-xs font-mono text-[#94A3B8]">ESTIMATION SUMMARY</span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    {selectedServices.length} Module(s) Active
                  </span>
                </div>

                <div>
                  <span className="text-xs font-medium text-[#94A3B8] block mb-1">
                    Estimated Project Investment Range
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white">
                      ${estimatedCost.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#94A3B8]">/ estimate</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                      <span>Est. ROI Impact</span>
                    </div>
                    <span className="text-xl font-bold text-white">{estimatedROI}x</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Traffic Boost</span>
                    </div>
                    <span className="text-xl font-bold text-cyan-400">{estimatedTrafficBoost}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-[#94A3B8] space-y-1">
                  <div className="flex justify-between">
                    <span>Guaranteed SLA:</span>
                    <span className="text-white font-medium">99.99% Cloud Uptime</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Includes:</span>
                    <span className="text-white font-medium">Full IP Ownership & Support</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBookEstimate}
                className="w-full btn-primary justify-center py-4 rounded-xl text-sm shadow-xl shadow-blue-600/30 hover:scale-105 transition-transform"
              >
                <span>Lock In This Estimate & Session</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card3D>
      </div>
    </section>
  );
}
