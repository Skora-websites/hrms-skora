"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  Layout,
  Smartphone,
  Cloud,
  Layers,
  Kanban,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Code2,
} from "lucide-react";
import Card3D from "./Card3D";
import gsap from "gsap";

export interface ServiceDetail {
  id: string;
  title: string;
  category: "marketing" | "web_mobile" | "cloud_saas" | "enterprise";
  tagline: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  techStack: string[];
  metrics: string;
  color: string;
}

interface ServicesGridProps {
  onSelectService: (service: ServiceDetail) => void;
  onOpenConsultation: (serviceTitle?: string) => void;
}

export const SERVICES_DATA: ServiceDetail[] = [
  {
    id: "digital-marketing",
    title: "Digital Marketing & AI SEO",
    category: "marketing",
    tagline: "Organic Dominance & Generative Engine Optimization (GEO)",
    icon: <TrendingUp className="w-6 h-6 text-blue-400" />,
    description:
      "150+ proven SEO and AI SEO strategies helping your brand rank #1 on Google & Bing while getting cited inside ChatGPT, Gemini, Perplexity, and Copilot.",
    features: [
      "Generative Engine Optimization (GEO)",
      "Technical & Schema Markup SEO",
      "High-Intent Content Strategy",
      "Precision PPC & Performance Ads",
    ],
    techStack: ["ChatGPT API", "Google Search Console", "Ahrefs", "Semrush", "Perplexity AI"],
    metrics: "+340% Organic Traffic",
    color: "from-blue-500/20 to-cyan-500/10",
  },
  {
    id: "website-design",
    title: "Website Design & Web Apps",
    category: "web_mobile",
    tagline: "High-Converting UI/UX & High-Performance Frontends",
    icon: <Layout className="w-6 h-6 text-cyan-400" />,
    description:
      "Bespoke, lightning-fast website designs and Next.js / React web applications built with dark cyber aesthetics, glassmorphism, and seamless conversion flows.",
    features: [
      "Custom Next.js & React Architectures",
      "Glassmorphism & Cyberpunk Design",
      "Core Web Vitals 99+ Speed Tuning",
      "Interactive Micro-Animations",
    ],
    techStack: ["Next.js 16", "React 19", "Tailwind CSS", "TypeScript", "GSAP"],
    metrics: "99/100 PageSpeed Score",
    color: "from-cyan-500/20 to-blue-500/10",
  },
  {
    id: "mobile-development",
    title: "Mobile Development",
    category: "web_mobile",
    tagline: "Native iOS & Android + Cross-Platform Apps",
    icon: <Smartphone className="w-6 h-6 text-sky-400" />,
    description:
      "Scalable mobile application development engineered for fluid performance, offline support, push notifications, and App Store Optimization (ASO).",
    features: [
      "iOS (Swift) & Android (Kotlin)",
      "React Native & Flutter Cross-Platform",
      "Biometric Authentication & Security",
      "App Store Optimization (ASO)",
    ],
    techStack: ["React Native", "Flutter", "Swift", "Kotlin", "Firebase"],
    metrics: "4.9★ Store Rating",
    color: "from-sky-500/20 to-indigo-500/10",
  },
  {
    id: "cloud-services",
    title: "Cloud Services & DevOps",
    category: "cloud_saas",
    tagline: "AWS, Azure & GCP Scalable Infrastructure",
    icon: <Cloud className="w-6 h-6 text-indigo-400" />,
    description:
      "Enterprise cloud infrastructure, CI/CD pipeline automation, serverless microservices, zero-trust security compliance, and 99.99% uptime SLA.",
    features: [
      "AWS / GCP Infrastructure as Code",
      "Docker & Kubernetes Containerization",
      "Automated CI/CD Deployment Pipelines",
      "Zero-Trust Cloud Security & Audits",
    ],
    techStack: ["AWS", "Google Cloud", "Docker", "Kubernetes", "Terraform"],
    metrics: "99.99% Guaranteed Uptime",
    color: "from-indigo-500/20 to-purple-500/10",
  },
  {
    id: "saas-development",
    title: "SaaS Platform Development",
    category: "cloud_saas",
    tagline: "Multi-Tenant Cloud Software Solutions",
    icon: <Layers className="w-6 h-6 text-purple-400" />,
    description:
      "End-to-end multi-tenant SaaS engineering with automated Stripe recurring billing, role-based access control (RBAC), and robust public REST/GraphQL APIs.",
    features: [
      "Multi-Tenant Database Architecture",
      "Automated Stripe & PayPal Billing",
      "Role-Based Access Control (RBAC)",
      "Developer API & Webhooks Engine",
    ],
    techStack: ["Next.js", "Node.js", "PostgreSQL", "Stripe", "GraphQL"],
    metrics: "Sub-50ms API Latency",
    color: "from-purple-500/20 to-blue-500/10",
  },
  {
    id: "pms",
    title: "Project Management System (PMS)",
    category: "enterprise",
    tagline: "Agile Sprints, Workflows & Resource Tracker",
    icon: <Kanban className="w-6 h-6 text-emerald-400" />,
    description:
      "Custom PMS built to streamline team collaboration, sprint boards, automated task routing, time tracking, resource allocation, and white-label client portals.",
    features: [
      "Custom Kanban & Gantt Roadmaps",
      "Client Portal & Feedback Tools",
      "Automated Task & Time Tracking",
      "Resource Capacity Planning",
    ],
    techStack: ["React", "WebSockets", "Node.js", "Redis", "Tailwind"],
    metrics: "+45% Team Productivity",
    color: "from-emerald-500/20 to-teal-500/10",
  },
  {
    id: "crm",
    title: "CRM (Customer Relationship)",
    category: "enterprise",
    tagline: "Lead Automation, Sales Pipelines & Analytics",
    icon: <Users className="w-6 h-6 text-amber-400" />,
    description:
      "Omnichannel Customer Relationship Management system integrating lead scoring, automated email/SMS follow-ups, deal tracking, and predictive sales analytics.",
    features: [
      "Automated Sales Pipeline Stages",
      "Omnichannel Lead Capture",
      "AI Predictive Lead Scoring",
      "Custom Analytics & Reports",
    ],
    techStack: ["Node.js", "PostgreSQL", "Twilio", "SendGrid", "Chart.js"],
    metrics: "3.2x Lead Conversion",
    color: "from-amber-500/20 to-orange-500/10",
  },
];

export default function ServicesGrid({
  onSelectService,
  onOpenConsultation,
}: ServicesGridProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const gridRef = useRef<HTMLDivElement>(null);

  const filterTabs = [
    { id: "all", label: "All 7 Core Services" },
    { id: "marketing", label: "Digital Marketing" },
    { id: "web_mobile", label: "Web & Mobile" },
    { id: "cloud_saas", label: "Cloud & SaaS" },
    { id: "enterprise", label: "PMS & CRM Enterprise" },
  ];

  const filteredServices =
    activeFilter === "all"
      ? SERVICES_DATA
      : SERVICES_DATA.filter((s) => s.category === activeFilter);

  useEffect(() => {
    if (!gridRef.current) return;
    gsap.fromTo(
      ".gsap-service-card",
      { opacity: 0, y: 30, rotateY: -10 },
      { opacity: 1, y: 0, rotateY: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
    );
  }, [activeFilter]);

  return (
    <section id="services" className="py-24 relative bg-[#05070E] [perspective:1000px]">
      {/* Background Halos */}
      <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Complete Enterprise Capabilities</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Our 7 Core <span className="text-gradient">Tech & Marketing Services</span>
          </h2>

          <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed">
            From search dominance and mobile apps to scalable cloud architecture and custom PMS & CRM solutions — engineered for hyper-growth.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center justify-center flex-wrap gap-2.5 mb-12">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border ${
                activeFilter === tab.id
                  ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30"
                  : "bg-[#0B0F19] text-[#94A3B8] border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Services Cards Grid with 3D Tilt */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card3D
              key={service.id}
              maxTilt={14}
              className="gsap-service-card glass-card rounded-2xl border border-white/10 bg-[#0B0F19]/80 group relative overflow-hidden h-full"
            >
              <div className="p-7 flex flex-col justify-between h-full [transform-style:preserve-3d]">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                ></div>

                <div className="relative z-10 space-y-5">
                  {/* Header Icon + Metric Badge */}
                  <div className="flex items-center justify-between [transform:translateZ(30px)]">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform duration-300">
                      {service.icon}
                    </div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {service.metrics}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <div className="[transform:translateZ(40px)]">
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-xs font-medium text-cyan-400 mt-1">
                      {service.tagline}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[#94A3B8] leading-relaxed line-clamp-3 [transform:translateZ(20px)]">
                    {service.description}
                  </p>

                  {/* Checklist Features */}
                  <div className="space-y-2 pt-2 border-t border-white/5 [transform:translateZ(30px)]">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#CBD5E1]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tech Stack Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-2 [transform:translateZ(20px)]">
                    {service.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md text-[10px] font-mono bg-white/[0.04] border border-white/10 text-[#94A3B8]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between [transform:translateZ(35px)]">
                  <button
                    onClick={() => onSelectService(service)}
                    className="text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1"
                  >
                    <span>View Specs</span>
                    <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  </button>

                  <button
                    onClick={() => onOpenConsultation(service.title)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition-all flex items-center gap-1.5 group/btn"
                  >
                    <span>Book Service</span>
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
