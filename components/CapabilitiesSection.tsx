"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Code, Activity, Cloud, LayoutTemplate, Smartphone, ArrowRight, CheckCircle2, Zap } from "lucide-react";
import Card3D from "./Card3D";
import gsap from "gsap";

const cards = [
  {
    link: "/services/pms",
    Icon: Activity,
    title: "Healthcare IT Portals",
    badge: "HIPAA EHR",
    description: "HIPAA-compliant clinic systems, patient management portals, telemedicine tools, and secure EHR integrations.",
    iconClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  {
    link: "/services/cloud-services",
    Icon: Cloud,
    title: "Cloud Architecture",
    badge: "AWS & Azure",
    description: "Secure AWS & Azure deployments, automated CI/CD pipelines, database migrations, and 99.99% uptime infrastructure.",
    iconClass: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  },
  {
    link: "/services/website-design",
    Icon: LayoutTemplate,
    title: "Cinematic UI / UX",
    badge: "High Conversion",
    description: "Premium digital design, visual identity precision, glassmorphism UI components, and fluid web experiences.",
    iconClass: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  {
    link: "/services/mobile-development",
    Icon: Smartphone,
    title: "Mobile Applications",
    badge: "iOS & Android",
    description: "High-performance cross-platform mobile apps engineered for speed using Swift, Kotlin, and React Native.",
    iconClass: "bg-sky-50 text-sky-700 border border-sky-200",
  },
];

export default function CapabilitiesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".gsap-cap-card",
        { opacity: 0, y: 40, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.1, ease: "power2.out" }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="capabilities" className="bg-slate-50 py-24 border-t border-slate-200 [perspective:1200px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-mono font-bold uppercase tracking-wider mb-3">
            <Zap size={14} className="text-blue-600" />
            <span>MNC ENTERPRISE CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950">
            What We Build at <span className="text-blue-600">Skora</span>
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
            Empowering global institutions with battle-tested enterprise platforms, cloud infrastructure, and specialized healthcare solutions.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Big Featured Left Card */}
          <a href="/services/saas-development" className="gsap-cap-card lg:row-span-2 block">
            <Card3D
              maxTilt={10}
              className="group relative h-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-md transition duration-500 hover:border-blue-300 hover:shadow-2xl"
            >
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-50 transition duration-700 group-hover:scale-150" />
              <div className="relative flex h-full flex-col justify-between [transform-style:preserve-3d]">
                <div>
                  <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 shadow-sm [transform:translateZ(40px)]">
                    <Code size={28} />
                  </div>
                  <span className="block text-xs font-mono font-bold text-blue-600 uppercase tracking-widest mb-2 [transform:translateZ(25px)]">
                    FEATURED DIVISION
                  </span>
                  <h3 className="text-3xl font-extrabold tracking-tight text-slate-950 [transform:translateZ(35px)]">
                    Custom Enterprise Platforms
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-slate-600 font-medium [transform:translateZ(20px)]">
                    We engineer scalable web applications, SaaS multi-tenant platforms, and multi-user systems tailored to high-volume operational workflows.
                  </p>

                  <div className="mt-8 space-y-3 [transform:translateZ(25px)]">
                    {["Multi-Tenant Systems", "Automated Stripe Billing", "Role-Based Access Controls"].map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CheckCircle2 size={16} className="text-blue-600" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between font-bold text-blue-600 group-hover:text-blue-700 [transform:translateZ(30px)]">
                  <span>Explore Enterprise Solutions</span>
                  <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </Card3D>
          </a>

          {/* 4 Cards Grid */}
          {cards.map(({ link, Icon, title, badge, description, iconClass }) => (
            <a key={title} href={link} className="gsap-cap-card block">
              <Card3D
                maxTilt={10}
                className="group relative h-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-md transition duration-500 hover:border-blue-300 hover:shadow-2xl"
              >
                <div className="[transform-style:preserve-3d]">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass} shadow-sm [transform:translateZ(30px)]`}>
                      <Icon size={24} />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 [transform:translateZ(20px)]">
                      {badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-950 group-hover:text-blue-600 transition-colors [transform:translateZ(25px)]">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 font-medium [transform:translateZ(15px)]">
                    {description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-blue-600 group-hover:text-blue-700 [transform:translateZ(20px)]">
                    <span>Learn More</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </div>
              </Card3D>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
