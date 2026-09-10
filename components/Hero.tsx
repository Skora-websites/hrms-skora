"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Calendar,
  Layers,
  Globe,
  Bot,
  Cloud,
  Smartphone,
  BarChart3,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Card3D from "./Card3D";
import gsap from "gsap";

interface HeroProps {
  onOpenConsultation: (service?: string) => void;
}

const backgroundImages = [
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80",
];

const profileCards = [
  { title: "Healthcare IT", role: "Clinical Portals & EHR", img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80", link: "/services/pms" },
  { title: "Custom Software", role: "Enterprise Platforms", img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80", link: "/services/saas-development" },
  { title: "Cloud Infra", role: "AWS & Azure Scaling", img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80", link: "/services/cloud-services" },
  { title: "UI / UX Design", role: "Cinematic Interfaces", img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=400&q=80", link: "/services/website-design" },
  { title: "Mobile Apps", role: "iOS & Android", img: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=400&q=80", link: "/services/mobile-development" },
];

export default function Hero({ onOpenConsultation }: HeroProps) {
  const [bgIndex, setBgIndex] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!heroRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".gsap-hero-title",
        { opacity: 0, y: 40, rotateX: -20 },
        { opacity: 1, y: 0, rotateX: 0, duration: 0.9, stagger: 0.15, ease: "power3.out" }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const trustItems = [
    "150+ Tested Strategies",
    "Full-Stack Web & Mobile",
    "AI & Generative SEO (GEO)",
    "Enterprise Cloud & CRM",
  ];

  const floatingBadges = [
    {
      name: "Google Search",
      sub: "Rank #1 Organic",
      icon: <Globe className="w-5 h-5 text-blue-400" />,
      color: "from-blue-500/20 to-blue-600/10",
      position: "top-4 -left-6 sm:-left-10",
      animation: "animate-float-slow",
    },
    {
      name: "ChatGPT AI",
      sub: "Top Citation",
      icon: <Bot className="w-5 h-5 text-cyan-400" />,
      color: "from-cyan-500/20 to-blue-600/10",
      position: "top-20 -right-6 sm:-right-10",
      animation: "animate-float-reverse",
    },
    {
      name: "AWS Cloud",
      sub: "99.99% Uptime",
      icon: <Cloud className="w-5 h-5 text-sky-400" />,
      color: "from-sky-500/20 to-indigo-600/10",
      position: "bottom-32 -left-8 sm:-left-12",
      animation: "animate-float-reverse",
    },
    {
      name: "iOS & Android",
      sub: "Mobile Apps",
      icon: <Smartphone className="w-5 h-5 text-blue-400" />,
      color: "from-indigo-500/20 to-blue-600/10",
      position: "bottom-10 -right-4 sm:-right-8",
      animation: "animate-float-slow",
    },
  ];

  return (
    <section ref={heroRef} className="relative min-h-[760px] pt-32 pb-20 overflow-hidden border-b border-white/10 [perspective:1200px]">
      {/* Ken Burns Crossfading Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-30">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={bgIndex}
            src={backgroundImages[bgIndex]}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover filter blur-[2px]"
            alt="Enterprise Technology"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070E] via-[#05070E]/90 to-transparent z-10" />
      </div>

      {/* Radial Halo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-radial-halo opacity-70 pointer-events-none blur-3xl"></div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column Copy */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            <div className="gsap-hero-title inline-flex items-center gap-2 px-4 py-2 rounded-full glass-pill text-xs sm:text-sm font-medium border border-blue-500/30 bg-blue-500/10 shadow-lg shadow-blue-500/10">
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>✦ Innovation doesn&apos;t wait. Neither does SKORA ✦</span>
            </div>

            <h1 className="gsap-hero-title text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
              Rank Higher. <br />
              <span className="text-gradient">Get Seen & Scale Everywhere.</span>
            </h1>

            <p className="gsap-hero-title text-lg sm:text-xl text-[#94A3B8] max-w-[580px] leading-relaxed mx-auto lg:mx-0">
              We architect custom enterprise platforms, high-converting digital marketing campaigns, mobile applications, cloud scale, PMS sprint roadmaps & CRM automation.
            </p>

            <div className="gsap-hero-title flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => onOpenConsultation()}
                className="btn-primary text-base px-8 py-4 rounded-xl w-full sm:w-auto shadow-2xl shadow-blue-600/40 hover:scale-105 transition-transform"
              >
                <Calendar className="w-5 h-5" />
                <span>Schedule Consultation</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="glass-card px-4 py-2.5 rounded-xl border border-white/10 flex items-center gap-3 bg-[#0B0F19]/80">
                <div className="text-left">
                  <span className="block text-[11px] text-[#94A3B8] uppercase tracking-wider font-semibold">
                    One-Time Payment
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">$79</span>
                    <span className="text-sm text-[#64748B] line-through">$179</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  SAVE 55%
                </span>
              </div>
            </div>

            {/* Trust Checks */}
            <div className="gsap-hero-title grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5">
              {trustItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-[#94A3B8]">
                  <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-[#CBD5E1] truncate">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column — 3D Interactive Dashboard Artwork */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="absolute inset-0 bg-blue-600/25 rounded-full filter blur-[100px] pointer-events-none animate-pulse-glow"></div>

            <Card3D maxTilt={15} className="w-full max-w-[420px] aspect-[4/5] glass-card border border-blue-500/40 p-6 flex flex-col justify-between overflow-hidden shadow-2xl bg-[#0B0F19]/90">
              <div className="[transform:translateZ(30px)] flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-xs font-mono text-[#60A5FA]">SKORA ENGINE v5.5</span>
              </div>

              <div className="my-auto space-y-4 [transform:translateZ(50px)]">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                    <span>Organic Search & AI Citations</span>
                    <span className="text-emerald-400 font-mono font-semibold">+342.8%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 w-[84%] rounded-full"></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <BarChart3 className="w-5 h-5 text-blue-400 mb-1" />
                    <span className="text-[11px] text-[#94A3B8] block">Lead Conversion</span>
                    <span className="text-lg font-bold text-white">4.85x</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <ShieldCheck className="w-5 h-5 text-cyan-400 mb-1" />
                    <span className="text-[11px] text-[#94A3B8] block">Cloud Uptime</span>
                    <span className="text-lg font-bold text-white">99.99%</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">Automated PMS & CRM</span>
                      <span className="text-[10px] text-[#94A3B8]">Real-time pipeline sync</span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono font-semibold">Active</span>
                </div>
              </div>

              <div className="[transform:translateZ(20px)] pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#94A3B8]">
                <span>7 Core Tech Modules</span>
                <span className="text-blue-400 font-medium hover:underline cursor-pointer" onClick={() => onOpenConsultation()}>Explore All →</span>
              </div>
            </Card3D>

            {/* Floating Glass Badges */}
            {floatingBadges.map((badge, idx) => (
              <div
                key={idx}
                className={`absolute ${badge.position} ${badge.animation} z-20 hidden sm:flex items-center gap-3 p-3 rounded-2xl glass-card border border-white/15 bg-gradient-to-r ${badge.color} backdrop-blur-xl shadow-2xl min-w-[160px] [transform:translateZ(60px)]`}
              >
                <div className="p-2 rounded-xl bg-[#0B0F19] border border-white/10 shrink-0">
                  {badge.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{badge.name}</h4>
                  <p className="text-[10px] text-[#94A3B8]">{badge.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PROFILE CARDS ROW */}
        <div className="mt-14 w-full overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-stretch justify-center gap-3 px-2 lg:min-w-0 lg:flex-wrap">
            {profileCards.map((card, index) => (
              <a href={card.link} key={card.title}>
                <motion.article
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.09 }}
                  whileHover={{ y: -6 }}
                  className="w-[174px] overflow-hidden rounded-xl border border-white/20 bg-white/10 p-2 text-left shadow-[0_14px_32px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:border-sky-200/65 hover:bg-white/15 hover:shadow-[0_20px_40px_rgba(0,0,0,0.24)]"
                >
                  <div className="h-24 overflow-hidden rounded-lg">
                    <img
                      src={card.img}
                      alt={card.title}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                    />
                  </div>
                  <div className="px-1 pb-1 pt-3">
                    <h2 className="text-sm font-bold text-white">{card.title}</h2>
                    <p className="mt-1 text-[11px] font-semibold text-sky-200">{card.role}</p>
                  </div>
                </motion.article>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
