"use client";

import React from "react";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import Card3D from "./Card3D";

interface BottomCTAProps {
  onOpenConsultation: () => void;
}

export default function BottomCTA({ onOpenConsultation }: BottomCTAProps) {
  return (
    <section className="py-20 relative bg-[#05070E] [perspective:1200px]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <Card3D maxTilt={6} className="relative rounded-[20px] border border-blue-500/40 p-8 sm:p-12 overflow-hidden shadow-2xl bg-gradient-to-b from-[#0B101D] to-[#060912]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left [transform-style:preserve-3d]">
            <div className="space-y-3 max-w-xl [transform:translateZ(30px)]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Limited Time One-Time License</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Get Lifetime Access for a One-Time Payment
              </h3>

              <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
                Pay once, get lifetime access to 150+ SEO & AI strategies, plus enterprise support for Digital Marketing, Web Design, Mobile Apps, Cloud Infrastructure, SaaS, PMS & CRM tools.
              </p>

              <div className="flex items-center justify-center lg:justify-start gap-4 pt-2 text-xs text-[#CBD5E1]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> 30-Day Money-Back Guarantee
                </span>
                <span>• Instant Activation</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 shrink-0 [transform:translateZ(45px)]">
              <div className="text-center sm:text-right">
                <span className="text-[11px] font-semibold text-[#94A3B8] block uppercase tracking-wider">
                  Special Offer Price
                </span>
                <div className="flex items-baseline gap-2 justify-center sm:justify-end">
                  <span className="text-4xl font-extrabold text-white">$79</span>
                  <span className="text-lg text-[#64748B] line-through">$179</span>
                </div>
              </div>

              <button
                onClick={onOpenConsultation}
                className="btn-primary text-base px-8 py-4 rounded-xl shadow-2xl shadow-blue-600/50 hover:scale-105 transition-transform"
              >
                <span>Get Access Now</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </Card3D>
      </div>
    </section>
  );
}
