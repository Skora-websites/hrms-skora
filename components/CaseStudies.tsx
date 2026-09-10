"use client";

import React from "react";
import { Sparkles, ArrowRight, TrendingUp, Cpu, Smartphone } from "lucide-react";
import Card3D from "./Card3D";

interface CaseStudiesProps {
  onOpenConsultation: (topic?: string) => void;
}

export default function CaseStudies({ onOpenConsultation }: CaseStudiesProps) {
  const caseStudies = [
    {
      client: "FinTech Scaleup",
      title: "Generative Engine SEO & ChatGPT Citation Dominance",
      service: "Digital Marketing & AI SEO",
      metrics: "+340% Traffic",
      highlight: "#1 Cited Brand in ChatGPT & Perplexity",
      description: "Implemented schema markup, entity-based AI SEO, and high-intent topical authority clusters to capture 18,000+ generative AI search citations.",
      icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
      color: "from-blue-500/20 to-cyan-500/10",
    },
    {
      client: "Global E-Commerce SaaS",
      title: "Next.js Web Redesign & Cloud Microservices Migration",
      service: "Website Design & Cloud Services",
      metrics: "99/100 Speed",
      highlight: "3.8x Sales Conversion Boost",
      description: "Re-engineered frontend with Next.js App Router and containerized microservices on AWS, achieving sub-100ms load times globally.",
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      color: "from-cyan-500/20 to-indigo-500/10",
    },
    {
      client: "Logistics Enterprise",
      title: "Cross-Platform Mobile App, PMS & Custom CRM Engine",
      service: "Mobile Dev, PMS & CRM",
      metrics: "+45% Efficiency",
      highlight: "$1.2M New Annual Revenue Pipeline",
      description: "Deployed Swift/Kotlin mobile apps with real-time WebSocket PMS sprint trackers and an automated CRM sales pipeline.",
      icon: <Smartphone className="w-5 h-5 text-indigo-400" />,
      color: "from-indigo-500/20 to-purple-500/10",
    },
  ];

  return (
    <section id="case-studies" className="py-24 relative bg-[#070A12] border-t border-white/5 [perspective:1200px]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Proven Enterprise Case Studies</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Real Transformations, <span className="text-gradient">Measurable Impact</span>
          </h2>

          <p className="text-base sm:text-lg text-[#94A3B8]">
            Discover how SKORA delivers market dominance through AI SEO, web applications, cloud scale, and custom enterprise tools.
          </p>
        </div>

        {/* 3D Case Studies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {caseStudies.map((study, idx) => (
            <Card3D
              key={idx}
              maxTilt={14}
              className="glass-card rounded-2xl border border-white/10 bg-[#0B0F19]/90 group h-full"
            >
              <div className="p-7 flex flex-col justify-between h-full [transform-style:preserve-3d]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between [transform:translateZ(30px)]">
                    <span className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider">
                      {study.client}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                      {study.metrics}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors leading-snug [transform:translateZ(40px)]">
                    {study.title}
                  </h3>

                  <p className="text-xs text-cyan-400 font-semibold [transform:translateZ(25px)]">
                    ✦ {study.highlight}
                  </p>

                  <p className="text-xs text-[#94A3B8] leading-relaxed [transform:translateZ(20px)]">
                    {study.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between [transform:translateZ(30px)]">
                  <span className="text-[11px] font-mono text-[#64748B]">{study.service}</span>
                  <button
                    onClick={() => onOpenConsultation(study.title)}
                    className="text-xs font-semibold text-blue-400 hover:text-white flex items-center gap-1 group/btn"
                  >
                    <span>Read Story</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </Card3D>
          ))}
        </div>
      </div>
    </section>
  );
}
