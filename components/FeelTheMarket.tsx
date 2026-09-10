"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Search,
  Infinity as InfinityIcon,
  ShoppingCart,
  Megaphone,
  MessageSquare,
  Droplets,
} from "lucide-react";

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

const iceCubes = [
  {
    name: "Instagram",
    icon: <svg viewBox="0 0 24 24" className="w-10 h-10 fill-cyan-200 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]">{socialIconsSvg.instagram}</svg>,
    size: "h-28 w-28",
    left: "8%",
    delay: 0,
  },
  {
    name: "Facebook",
    icon: <svg viewBox="0 0 24 24" className="w-12 h-12 fill-cyan-200 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]">{socialIconsSvg.facebook}</svg>,
    size: "h-32 w-32",
    left: "80%",
    delay: 1.5,
  },
  {
    name: "WhatsApp",
    icon: <MessageCircle size={44} color="#38bdf8" strokeWidth={1.5} className="drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]" />,
    size: "h-24 w-24",
    left: "15%",
    delay: 3,
  },
  {
    name: "LinkedIn",
    icon: <svg viewBox="0 0 24 24" className="w-14 h-14 fill-cyan-200 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]">{socialIconsSvg.linkedin}</svg>,
    size: "h-36 w-36",
    left: "25%",
    delay: 0.5,
  },
  {
    name: "Google",
    icon: <Search size={40} color="#38bdf8" strokeWidth={2.5} className="drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]" />,
    size: "h-24 w-24",
    left: "65%",
    delay: 2,
  },
  {
    name: "Meta",
    icon: <InfinityIcon size={56} color="#38bdf8" strokeWidth={1.5} className="drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]" />,
    size: "h-32 w-32",
    left: "72%",
    delay: 3.5,
  },
  {
    name: "Amazon",
    icon: <ShoppingCart size={40} color="#38bdf8" strokeWidth={2} className="drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]" />,
    size: "h-28 w-28",
    left: "35%",
    delay: 1.2,
  },
  {
    name: "Pinterest",
    icon: <span className="text-cyan-200 font-serif text-5xl font-bold drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]">P</span>,
    size: "h-24 w-24",
    left: "88%",
    delay: 0.8,
  },
  {
    name: "WordPress",
    icon: <span className="text-cyan-200 font-serif text-4xl font-bold drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]">W</span>,
    size: "h-20 w-20",
    left: "5%",
    delay: 2.5,
  },
  {
    name: "Workchat",
    icon: <MessageSquare size={36} color="#38bdf8" strokeWidth={1.5} className="drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]" />,
    size: "h-20 w-20",
    left: "55%",
    delay: 4,
  },
  {
    name: "Google Ads",
    icon: <Megaphone size={44} color="#38bdf8" strokeWidth={1.5} className="drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]" />,
    size: "h-28 w-28",
    left: "45%",
    delay: 0.2,
  },
];

export default function FeelTheMarket() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative h-[820px] w-full overflow-hidden bg-gradient-to-b from-[#05070E] via-[#081226] to-[#05070E] flex items-center justify-center border-t border-blue-900/30">
      {/* Radial Blue Light Mesh Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.25)_0%,rgba(5,7,14,1)_80%)] pointer-events-none" />

      {/* 3D RUSTY/FROSTY DROPPING ICE CUBES LOOP WITH MELTING DRIP PARTICLES */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        {mounted &&
          iceCubes.map((cube) => (
            <motion.div
              key={cube.name}
              animate={{
                y: ["-100vh", `${Math.random() * 20 - 10}vh`, `${Math.random() * 30 + 10}vh`, "100vh"],
                rotate: [0, Math.random() * 25 - 12, Math.random() * -25 + 12, Math.random() * 50],
                opacity: [0, 1, 1, 0],
              }}
            transition={{
              duration: 8.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: cube.delay,
              times: [0, 0.15, 0.85, 1],
            }}
            className={`absolute ${cube.size} flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-100/25 via-blue-900/40 to-slate-900/80 border-2 border-cyan-300/50 shadow-[inset_0_4px_25px_rgba(255,255,255,0.45),0_20px_45px_rgba(0,0,0,0.8)] backdrop-blur-xl pointer-events-auto cursor-pointer group`}
            style={{ left: cube.left }}
            whileHover={{ scale: 1.18, zIndex: 50, transition: { duration: 0.2 } }}
          >
            {/* Frost & Rust Crystal Detail */}
            <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3)_0%,transparent_60%)] pointer-events-none" />
            
            {/* Icon Inside Ice Cube */}
            <div className="relative z-10">{cube.icon}</div>

            {/* Melting Water Drip Animation */}
            <motion.div
              animate={{ y: [0, 24, 48], opacity: [1, 0.7, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeIn" }}
              className="absolute -bottom-4 text-cyan-400 flex items-center justify-center"
            >
              <Droplets className="w-3.5 h-3.5 fill-cyan-400 animate-bounce" />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Slogan Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center pointer-events-none">
        <motion.h2
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-[3.5rem] font-extrabold tracking-tight text-white sm:text-7xl md:text-8xl lg:text-[7rem] leading-[0.95]"
        >
          feel the market <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 drop-shadow-[0_0_35px_rgba(56,189,248,0.6)]">
            in your favour.
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-8 max-w-2xl text-lg font-medium leading-relaxed text-[#94A3B8]"
        >
          Dominate every channel. Our engineered digital strategies align your enterprise with the platforms that drive absolute, quantifiable scale.
        </motion.p>
      </div>
    </section>
  );
}
