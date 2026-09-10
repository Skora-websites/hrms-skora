"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, Layers, Sparkles, CheckCircle2, Zap } from "lucide-react";
import Card3D from "./Card3D";
import gsap from "gsap";

const socialIconsSvg = {
  facebook: (
    <path d="M22.7 0H1.3C.6 0 0 .6 0 1.3v21.4C0 23.4.6 24 1.3 24h11.5v-9.3H9.7v-3.6h3.1V8.4c0-3.1 1.9-4.8 4.7-4.8 1.3 0 2.5.1 2.8.1V7l-1.9.1c-1.5 0-1.8.7-1.8 1.8v2.3h3.6l-.5 3.6h-3.1V24h6.1c.7 0 1.3-.6 1.3-1.3V1.3C24 .6 23.4 0 22.7 0Z" />
  ),
  instagram: (
    <path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8 0 3.2 0 3.6-.1 4.8-.1 3.3-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1-3.2 0-3.6 0-4.8-.1-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12c0-3.2 0-3.6.1-4.8.1-3.3 1.7-4.8 4.9-4.9 1.2-.1 1.6-.1 4.8-.1ZM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0Zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9Z" />
  ),
  x: (
    <path d="M18.2 2.3h3.3l-7.2 8.3 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.7l7.7-8.8L1.3 2.3H8l4.7 6.2 5.5-6.2Zm-1.2 17.5h1.8L7.1 4.1H5.1L17 19.8Z" />
  ),
  linkedin: (
    <path d="M19 0H5C2.2 0 0 2.2 0 5v14c0 2.8 2.2 5 5 5h14c2.8 0 5-2.2 5-5V5c0-2.8-2.2-5-5-5ZM8 19H5V8h3v11ZM6.5 6.7c-1 0-1.8-.8-1.8-1.8s.8-1.8 1.8-1.8 1.8.8 1.8 1.8-.8 1.8-1.8 1.8ZM20 19h-3v-5.6c0-3.4-4-3.1-4 0V19h-3V8h3v1.8c1.4-2.6 7-2.8 7 2.5V19Z" />
  ),
};

const profileCards = [
  {
    title: "Healthcare IT",
    role: "Clinical Portals & EHR",
    img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80",
    link: "/services/pms",
    badge: "HIPAA Compliant",
    glow: "hover:border-emerald-300/80 shadow-emerald-500/25",
  },
  {
    title: "Custom Software",
    role: "Enterprise Platforms",
    img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
    link: "/services/saas-development",
    badge: "Multi-Tenant SaaS",
    glow: "hover:border-sky-300/80 shadow-sky-500/25",
  },
  {
    title: "Cloud Infra",
    role: "AWS & Azure Scaling",
    img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
    link: "/services/cloud-services",
    badge: "99.99% Uptime",
    glow: "hover:border-indigo-300/80 shadow-indigo-500/25",
  },
  {
    title: "UI / UX Design",
    role: "Cinematic Interfaces",
    img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80",
    link: "/services/website-design",
    badge: "High Conversion",
    glow: "hover:border-purple-300/80 shadow-purple-500/25",
  },
  {
    title: "Mobile Apps",
    role: "iOS & Android Engine",
    img: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80",
    link: "/services/mobile-development",
    badge: "Native Speed",
    glow: "hover:border-cyan-300/80 shadow-cyan-500/25",
  },
];

export const EnterpriseBackground = () => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-[#071a42]" aria-hidden="true">
    <motion.div animate={{ opacity: [0.12, 0.94, 0.12], scale: [0.96, 1.1, 0.96] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} className="absolute -inset-28 bg-[radial-gradient(ellipse_at_50%_40%,rgba(82,145,239,.82)_0%,rgba(28,82,171,.72)_31%,rgba(7,26,66,0)_70%)] blur-[42px]" />
    <motion.div animate={{ x: ["-32%", "32%", "-32%"], opacity: [0.04, 0.48, 0.04] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-[35%] -left-[42%] h-[145%] w-[118%] rotate-[14deg] bg-gradient-to-r from-transparent via-sky-300/45 to-transparent blur-[48px]" />
    <motion.div animate={{ opacity: [0.6, 0.14, 0.6], x: [0, -28, 0], y: [0, 20, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-64 -left-48 h-[40rem] w-[40rem] rounded-full bg-[#0b3578] blur-[145px]" />
    <motion.div animate={{ opacity: [0.04, 0.46, 0.04] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(147,197,253,.42)_0%,rgba(7,26,66,0)_58%)]" />

    <motion.svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" animate={{ x: [0, -24, 0], y: [0, 12, 0], opacity: [0.08, 0.32, 0.08], filter: ["blur(4px)", "blur(1.4px)", "blur(4px)"] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} className="absolute -inset-[8%] h-[116%] w-[116%]">
      <defs>
        <pattern id="socialPlatformPattern" width="248" height="158" patternUnits="userSpaceOnUse">
          <g fill="#dbeafe" stroke="#dbeafe" strokeLinecap="round" strokeLinejoin="round">
            <g transform="translate(18 16) scale(.78)">{socialIconsSvg.facebook}</g>
            <g transform="translate(103 13) scale(.82)">{socialIconsSvg.instagram}</g>
            <g transform="translate(189 16) scale(.78)">{socialIconsSvg.linkedin}</g>
            <g transform="translate(36 89)"><circle cx="12" cy="12" r="10" fill="none" strokeWidth="2" /><path d="M7 21l-3 4 5-2" fill="none" strokeWidth="2" /><path d="M9 8c1 4 3 6 7 7l2-2" fill="none" strokeWidth="2" /></g>
            <g transform="translate(104 86)"><circle cx="12" cy="12" r="11" fill="none" strokeWidth="2" /><text x="12" y="17" textAnchor="middle" stroke="none" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700">P</text></g>
            <g transform="translate(159 86)"><circle cx="14" cy="12" r="12" fill="none" strokeWidth="2" /><text x="14" y="17" textAnchor="middle" stroke="none" fontFamily="Georgia, serif" fontSize="16" fontWeight="700">W</text></g>
            <g transform="translate(207 87) scale(.7)">{socialIconsSvg.x}</g>
            <g transform="translate(63 127)"><rect x="0" y="0" width="37" height="21" rx="8" fill="none" strokeWidth="2" /><path d="M10 21l-4 5 9-5" fill="none" strokeWidth="2" /><text x="18.5" y="15" textAnchor="middle" stroke="none" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700">AI</text></g>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#socialPlatformPattern)" />
    </motion.svg>
  </div>
);

interface EnterpriseHeroProps {
  onOpenConsultation: (topic?: string) => void;
}

export default function EnterpriseHero({ onOpenConsultation }: EnterpriseHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heroRef.current) return;

    const ctx = gsap.context(() => {
      // Kinetic Title entrance
      gsap.fromTo(
        ".gsap-hero-title",
        { opacity: 0, y: 45, rotateX: -25 },
        { opacity: 1, y: 0, rotateX: 0, duration: 1.0, stagger: 0.12, ease: "power3.out" }
      );

      // Buttons animation
      gsap.fromTo(
        ".gsap-hero-btn",
        { opacity: 0, scale: 0.88, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.8, stagger: 0.1, delay: 0.3, ease: "back.out(1.5)" }
      );

      // Service Showcase Cards Stagger Zoom
      gsap.fromTo(
        ".gsap-card-item",
        { opacity: 0, y: 40, scale: 0.88 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.08, delay: 0.45, ease: "back.out(1.3)" }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-[720px] overflow-hidden border-b border-white/10 pt-20 lg:pt-24 pb-12 [perspective:1200px]"
    >
      {/* SVG Social & Tech Icon Pattern Background */}
      <EnterpriseBackground />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 text-center">

        {/* Kinetic Hero Title (Top pill badge removed per user request) */}
        <h1 className="gsap-hero-title mx-auto max-w-5xl text-5xl font-semibold leading-[1.03] tracking-[-0.05em] text-white sm:text-6xl lg:text-[5.4rem] drop-shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
          Innovation doesn&apos;t wait.<br />
          Neither does <span className="text-sky-300 drop-shadow-[0_0_30px_rgba(125,211,252,0.6)]">Skora.</span>
        </h1>

        {/* Subtitle */}
        <div className="gsap-hero-title mx-auto mt-5 max-w-2xl text-base sm:text-lg lg:text-xl font-medium leading-relaxed text-slate-200">
          We architect custom enterprise platforms, dedicated healthcare IT solutions, high-converting digital marketing, and scalable cloud architectures.
        </div>

        {/* Animated Premium Re-Designed Buttons */}
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {/* Schedule Consultation Button */}
          <button
            onClick={() => onOpenConsultation()}
            className="gsap-hero-btn group relative inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-white via-sky-100 to-white px-7 py-4 text-base font-extrabold text-[#071a42] shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_45px_rgba(255,255,255,0.7)] hover:bg-sky-200 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-sky-400/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Calendar size={18} className="relative z-10 text-[#071a42] group-hover:rotate-12 transition-transform duration-300" />
            <span className="relative z-10">Schedule Consultation</span>
            <ArrowRight size={17} className="relative z-10 text-[#071a42] group-hover:translate-x-1.5 transition-transform duration-300" />
          </button>

          {/* Explore Capabilities Button */}
          <a
            href="#capabilities"
            className="gsap-hero-btn group inline-flex items-center gap-3 rounded-xl border border-white/40 bg-white/10 px-7 py-4 text-base font-bold text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white hover:bg-white/20 cursor-pointer"
          >
            <Layers size={18} className="text-sky-300 group-hover:scale-110 transition-transform" />
            <span>Explore Capabilities</span>
          </a>
        </div>

        {/* 5 SERVICE SHOWCASE CARDS — VISIBLE ABOVE THE FOLD AT INITIAL LANDING VIEW */}
        <div className="mt-10 w-full overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-stretch justify-center gap-3 px-2 lg:min-w-0 lg:flex-wrap">
            {profileCards.map((card, index) => (
              <a href={card.link} key={card.title} className="gsap-card-item block">
                <Card3D
                  maxTilt={14}
                  className={`w-[178px] overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-2.5 text-left shadow-[0_14px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl transition duration-300 hover:border-sky-200/80 hover:bg-white/15 ${card.glow}`}
                >
                  <div className="h-26 overflow-hidden rounded-xl relative">
                    <img
                      src={card.img}
                      alt={card.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80";
                      }}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                    <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#071a42]/90 border border-white/30 text-sky-200 backdrop-blur-md">
                      {card.badge}
                    </span>
                  </div>
                  <div className="px-1 pb-1 pt-3">
                    <h2 className="text-sm font-bold text-white truncate">{card.title}</h2>
                    <p className="mt-1 text-[11px] font-semibold text-sky-200 truncate">{card.role}</p>
                  </div>
                </Card3D>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
