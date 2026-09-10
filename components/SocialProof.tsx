"use client";

import React from "react";
import { Users, Rocket, TrendingUp, Star, Quote } from "lucide-react";
import Card3D from "./Card3D";

export default function SocialProof() {
  const stats = [
    {
      icon: <Users className="w-6 h-6 text-blue-400" />,
      metric: "2,500+",
      label: "Happy Members & Enterprise Clients",
    },
    {
      icon: <Rocket className="w-6 h-6 text-cyan-400" />,
      metric: "150+",
      label: "Proven Strategies across 7 Tech Modules",
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-sky-400" />,
      metric: "50M+",
      label: "Organic Visits & Lead Conversions Generated",
    },
  ];

  return (
    <section id="testimonials" className="py-24 relative bg-[#05070E] overflow-hidden [perspective:1200px]">
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest">
                SOCIAL PROOF & REPUTATION
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Trusted by SEO Professionals, <br />
                <span className="text-gradient">Marketers & Founders</span>
              </h2>
              <p className="text-base text-[#94A3B8] leading-relaxed">
                Join thousands of businesses leveraging SKORA&apos;s digital playbook, mobile applications, cloud infrastructures, and custom CRM systems to dominate modern search engines and generative AI tools.
              </p>
            </div>

            <div className="space-y-4">
              {stats.map((stat, idx) => (
                <Card3D
                  key={idx}
                  maxTilt={10}
                  className="p-5 rounded-2xl glass-card border border-white/10 bg-[#0B0F19]/90 flex items-center gap-5 hover:border-blue-500/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 [transform:translateZ(30px)]">
                    {stat.icon}
                  </div>
                  <div className="[transform:translateZ(20px)]">
                    <span className="text-2xl font-extrabold text-white block">
                      {stat.metric}
                    </span>
                    <span className="text-xs text-[#94A3B8] block">
                      {stat.label}
                    </span>
                  </div>
                </Card3D>
              ))}
            </div>
          </div>

          {/* Right Column — 3D Featured Testimonial Card */}
          <div className="lg:col-span-6">
            <Card3D maxTilt={12} className="relative rounded-[20px] bg-[#0D1322] border border-white/10 p-8 sm:p-10 space-y-6 shadow-2xl overflow-hidden">
              <Quote className="absolute top-6 right-6 w-20 h-20 text-blue-500/10 pointer-events-none" />

              <div className="flex items-center gap-1.5 text-[#F59E0B] [transform:translateZ(30px)]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
                <span className="text-xs font-bold text-white ml-2">5.0 Rating</span>
              </div>

              <blockquote className="text-base sm:text-lg text-[#F8FAFC] leading-relaxed italic font-normal [transform:translateZ(40px)]">
                &ldquo;SKORA completely changed the way I approach SEO and enterprise tech. The AI strategies helped us get featured inside ChatGPT answers, while their custom Mobile App & CRM integration tripled our monthly revenue pipeline. Truly an incredible execution.&rdquo;
              </blockquote>

              <div className="pt-6 border-t border-white/10 flex items-center gap-4 [transform:translateZ(30px)]">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 p-[2px] shrink-0">
                  <div className="w-full h-full rounded-full bg-[#0B0F19] flex items-center justify-center text-lg font-bold text-white">
                    JR
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-semibold text-white">James R.</h4>
                  <p className="text-xs text-[#94A3B8]">Affiliate Marketer & Founder, Apex Digital</p>
                </div>
              </div>
            </Card3D>
          </div>
        </div>
      </div>
    </section>
  );
}
