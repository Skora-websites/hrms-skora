"use client";

import React from "react";
import { X, CheckCircle2, ArrowRight, Sparkles, Layers, ShieldCheck } from "lucide-react";
import { ServiceDetail } from "./ServicesGrid";

interface ServiceDetailModalProps {
  service: ServiceDetail | null;
  onClose: () => void;
  onBook: (serviceTitle: string) => void;
}

export default function ServiceDetailModal({
  service,
  onClose,
  onBook,
}: ServiceDetailModalProps) {
  if (!service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl glass-card border border-blue-500/30 bg-[#0B0F19] p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
              {service.icon}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-1">
                {service.metrics}
              </div>
              <h2 className="text-2xl font-extrabold text-white">{service.title}</h2>
              <p className="text-xs text-cyan-400 font-semibold">{service.tagline}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            {service.description}
          </p>

          {/* Key Deliverables */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Key Deliverables & Capabilities
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {service.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-[#CBD5E1] p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Engineered Tech Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {service.techStack.map((tech, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg text-xs font-mono bg-blue-500/10 border border-blue-500/20 text-blue-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-[#94A3B8] hover:text-white"
            >
              Close Window
            </button>

            <button
              onClick={() => {
                onClose();
                onBook(service.title);
              }}
              className="btn-primary px-6 py-3 rounded-xl text-xs font-semibold"
            >
              <span>Book {service.title}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
