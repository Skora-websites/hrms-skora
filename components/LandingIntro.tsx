"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface LandingIntroProps {
  onComplete?: () => void;
}

export default function LandingIntro({ onComplete }: LandingIntroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sMonogramRef = useRef<HTMLDivElement>(null);
  const textStageRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const laserBeamRef = useRef<HTMLDivElement>(null);

  const [typedText, setTypedText] = useState("S");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Check if user has seen intro in this session to prevent repeating
    const hasSeenIntro = sessionStorage.getItem("skora_cinematic_intro_v4");
    if (hasSeenIntro) {
      setVisible(false);
      if (onComplete) onComplete();
      return;
    }

    const fullWord = "SKORA.info";

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem("skora_cinematic_intro_v4", "true");
          setVisible(false);
          if (onComplete) onComplete();
        },
      });

      // 1. Electric Blue Laser Horizon Ignition
      tl.fromTo(
        laserBeamRef.current,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.5, ease: "expo.out" }
      );

      // 2. Netflix-Inspired Monogram "S" Prism Zoom Entrance
      tl.fromTo(
        sMonogramRef.current,
        { opacity: 0, scale: 0.3, z: -400, rotateY: 45 },
        {
          opacity: 1,
          scale: 1,
          z: 0,
          rotateY: 0,
          duration: 1.0,
          ease: "expo.out",
        }
      );

      // 3. Typewriter Animation ("S" -> "SK" -> "SKO" -> "SKOR" -> "SKORA" -> "SKORA.digital")
      tl.to(
        {},
        {
          duration: 1.2,
          ease: "none",
          onUpdate: function () {
            const progress = this.progress();
            const charCount = Math.floor(progress * fullWord.length) + 1;
            setTypedText(fullWord.substring(0, Math.min(charCount, fullWord.length)));
          },
        }
      );

      // 4. Fade Monogram S out & Expand Text Stage
      tl.to(sMonogramRef.current, {
        opacity: 0,
        scale: 1.4,
        duration: 0.4,
        ease: "power2.in",
      });

      tl.fromTo(
        textStageRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.4)" },
        "<"
      );

      // 5. Clean Final Dissolve Curtain Reveal (Entire Intro Container Scales Up & Dissolves)
      tl.to(curtainRef.current, {
        opacity: 0,
        scale: 1.08,
        duration: 0.7,
        delay: 0.5,
        ease: "power3.inOut",
      });
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[1000] overflow-hidden pointer-events-none [perspective:1200px]"
    >
      {/* Black & Deep Blue Backdrop Curtain */}
      <div
        ref={curtainRef}
        className="absolute inset-0 bg-[#03050B] z-20 flex flex-col items-center justify-center p-6 text-center"
      >
        {/* Ambient Electric Blue Glowing Bloom Spheres */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-blue-600/30 via-sky-500/20 to-transparent rounded-full blur-[160px] pointer-events-none animate-pulse" />

        {/* Laser Horizon Beam */}
        <div
          ref={laserBeamRef}
          className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent shadow-[0_0_30px_#38bdf8] origin-center -translate-y-1/2 pointer-events-none"
        />

        {/* Phase 1: Netflix-Inspired Holographic Monogram "S" */}
        <div
          ref={sMonogramRef}
          className="relative z-30 flex flex-col items-center justify-center space-y-4 [transform-style:preserve-3d]"
        >
          <div className="relative flex items-center justify-center">
            {/* Holographic Glowing S Ribbon */}
            <span className="text-8xl sm:text-9xl font-black font-serif italic text-transparent bg-clip-text bg-gradient-to-tr from-blue-600 via-sky-400 to-blue-200 tracking-wider drop-shadow-[0_0_40px_rgba(56,189,248,0.8)] select-none">
              S
            </span>

            {/* Radiant Spectrum Beam Lines */}
            <div className="absolute -inset-8 rounded-full border border-sky-400/30 blur-sm animate-ping pointer-events-none" />
          </div>

          <span className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-sky-400">
            ✦ SKORA INFO ✦
          </span>
        </div>

        {/* Phase 2: Typewriter Sequence Stage */}
        <div
          ref={textStageRef}
          className="absolute z-40 flex flex-col items-center justify-center space-y-4 opacity-0 pointer-events-none"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-xs font-mono font-bold text-sky-300 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>ENTERPRISE DIGITAL SOLUTIONS</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_50px_rgba(37,99,235,0.9)] font-sans">
            {typedText}
            <span className="text-sky-400 animate-pulse">|</span>
          </h1>

          <p className="text-xs sm:text-sm font-mono text-slate-400 tracking-widest uppercase">
            DOMINATE SEARCH • ENGINEER SAAS • SCALE CLOUD
          </p>
        </div>
      </div>
    </div>
  );
}
