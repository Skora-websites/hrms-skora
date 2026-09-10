"use client";

import React from "react";
import { BookOpen, Rocket, BarChart3, Zap } from "lucide-react";
import Card3D from "./Card3D";

export default function FeaturesGrid() {
  const featureCards = [
    {
      icon: <BookOpen className="w-7 h-7 text-blue-400" />,
      title: "Proven Strategies",
      description: "150+ tested SEO & AI SEO strategies that work across Google, Bing & AI platforms.",
    },
    {
      icon: <Rocket className="w-7 h-7 text-cyan-400" />,
      title: "Step-by-Step Guides",
      description: "Detailed technical implementation guides, cloud blueprints, and app frameworks to get results faster.",
    },
    {
      icon: <BarChart3 className="w-7 h-7 text-sky-400" />,
      title: "AI & Search Visibility",
      description: "Get cited and featured in ChatGPT, Gemini, Perplexity, Copilot, and legacy search engines.",
    },
    {
      icon: <Zap className="w-7 h-7 text-indigo-400" />,
      title: "Traffic & Revenue Autopilot",
      description: "Automate leads, track sales pipelines with custom PMS & CRM, and scale organic revenues.",
    },
  ];

  return (
    <section className="py-20 relative bg-[#070A12] border-y border-white/5 [perspective:1000px]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <span className="text-base font-semibold text-[#94A3B8] tracking-wide uppercase">
            Everything You Need to
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Grow Traffic & <span className="text-gradient">Revenue Autopilot</span>
          </h2>
        </div>

        {/* 4-Column 3D Tilt Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featureCards.map((card, idx) => (
            <Card3D
              key={idx}
              maxTilt={12}
              className="glass-card rounded-[16px] border border-white/[0.06] bg-[#0B0F19] group"
            >
              <div className="p-8 flex flex-col justify-between h-full [transform-style:preserve-3d]">
                <div className="space-y-5">
                  <div className="w-[56px] h-[56px] rounded-xl bg-gradient-to-br from-blue-600/30 to-blue-900/20 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-110 group-hover:border-blue-400 transition-all duration-300 [transform:translateZ(40px)]">
                    {card.icon}
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors [transform:translateZ(30px)]">
                    {card.title}
                  </h3>

                  <p className="text-sm text-[#94A3B8] leading-relaxed [transform:translateZ(20px)]">
                    {card.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5 flex items-center gap-2 text-xs font-semibold text-blue-400 [transform:translateZ(25px)]">
                  <span>Learn More</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Card3D>
          ))}
        </div>
      </div>
    </section>
  );
}
