"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, Search, Sparkles } from "lucide-react";

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      question: "What is Generative Engine Optimization (GEO) & AI SEO?",
      answer:
        "Generative Engine Optimization (GEO) is the strategy of structuring web content, data schemas, entity relationships, and authority signals so that generative AI platforms (ChatGPT, Gemini, Perplexity, Copilot) directly cite and recommend your brand when users ask questions.",
    },
    {
      question: "What services are included in SKORA's digital & tech stack?",
      answer:
        "SKORA provides end-to-end capabilities across 7 core services: Digital Marketing (SEO/GEO/PPC), Website Design (Next.js/React), Mobile App Development (iOS/Android), Cloud Infrastructure (AWS/DevOps), SaaS Engineering, Project Management Systems (PMS), and Customer Relationship Management (CRM) automation.",
    },
    {
      question: "Is there a recurring monthly subscription or one-time lifetime payment option?",
      answer:
        "We offer flexible engagement options: lifetime playbook access for digital strategy ($79 one-time payment offer), as well as dedicated agency retainer options for enterprise custom web, mobile, cloud, PMS, and CRM builds.",
    },
    {
      question: "How long does it take to implement a custom Web, Mobile, or SaaS build?",
      answer:
        "Typical MVP web applications and high-converting landing sites launch in 1 to 2 weeks. Comprehensive cross-platform mobile apps, cloud migrations, and custom PMS/CRM enterprise systems take 3 to 6 weeks depending on scale.",
    },
    {
      question: "How do custom PMS and CRM systems integrate with our existing workflow?",
      answer:
        "Our custom PMS & CRM platforms feature modular REST/GraphQL APIs, Twilio SMS/email integrations, WebSocket real-time updates, and direct synchronization with Stripe, Slack, and existing ERP tools.",
    },
    {
      question: "What SLA and security guarantees do you provide for Cloud & SaaS services?",
      answer:
        "We provide a guaranteed 99.99% cloud uptime SLA backed by AWS/GCP automated failovers, zero-trust security audits, encrypted database backups, and SOC2 compliant architectures.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="faq" className="py-24 relative bg-[#05070E]">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-semibold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Got Questions? We Have Answers</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>

          <p className="text-base text-[#94A3B8]">
            Everything you need to know about our digital marketing, software engineering, and pricing.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-10 max-w-md mx-auto">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions (e.g. AI SEO, Cloud, CRM, Pricing)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0B0F19] border border-white/10 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="glass-card rounded-2xl border border-white/10 bg-[#0B0F19]/90 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 hover:bg-white/[0.02]"
                >
                  <span className="text-base font-bold text-white">
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 bg-blue-600 text-white" : "text-blue-400"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-[#94A3B8] leading-relaxed border-t border-white/5 pt-4 animate-in fade-in duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
