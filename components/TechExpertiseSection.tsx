"use client";

import React from "react";
import { motion } from "framer-motion";

const expertiseRow1 = [
  { name: "HTML5", category: "Frontend", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original.svg" },
  { name: "CSS3", category: "Styling", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original.svg" },
  { name: "JavaScript", category: "Language", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" },
  { name: "TypeScript", category: "Language", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" },
  { name: "React", category: "Frontend", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" },
  { name: "Node.js", category: "Backend", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg" },
  { name: "Python", category: "Language", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" },
  { name: "PHP", category: "Backend", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/php/php-original.svg" },
  { name: "Laravel", category: "Backend", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/laravel/laravel-original.svg" },
  { name: "Angular", category: "Frontend", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/angularjs/angularjs-original.svg" },
  { name: "Vue.js", category: "Frontend", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/vuejs/vuejs-original.svg" },
  { name: "WordPress", category: "CMS", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/wordpress/wordpress-original.svg" },
  { name: "Bootstrap", category: "Styling", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/bootstrap/bootstrap-original.svg" },
  { name: "Tailwind CSS", category: "Styling", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/tailwindcss/tailwindcss-original.svg" },
];

const expertiseRow2 = [
  { name: "AWS", category: "Cloud", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/amazonwebservices/amazonwebservices-original-wordmark.svg" },
  { name: "Docker", category: "DevOps", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original.svg" },
  { name: "Figma", category: "Design", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/figma/figma-original.svg" },
  { name: "GitHub", category: "DevOps", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/github/github-original.svg" },
  { name: "Facebook", category: "Social Media", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/facebook/facebook-original.svg" },
  { name: "Instagram", category: "Social Media", icon: "https://cdn.simpleicons.org/instagram/E4405F" },
  { name: "LinkedIn", category: "Social Media", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/linkedin/linkedin-original.svg" },
  { name: "X", category: "Social Media", icon: "https://cdn.simpleicons.org/x/000000" },
  { name: "Pinterest", category: "Social Media", icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/pinterest/pinterest-original.svg" },
  { name: "Meta", category: "Platform", icon: "https://cdn.simpleicons.org/meta/0467DF" },
  { name: "Google Ads", category: "Marketing", icon: "https://cdn.simpleicons.org/googleads/4285F4" },
  { name: "Google Maps", category: "API & Service", icon: "https://cdn.simpleicons.org/googlemaps/4285F4" },
  { name: "Canva", category: "Design", icon: "https://cdn.simpleicons.org/canva/00C4CC" },
];

export default function TechExpertiseSection() {
  return (
    <section className="relative overflow-hidden bg-white py-20 border-t border-slate-200">
      <style>{`
        @keyframes marqueeLeft { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes marqueeRight { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .animate-marquee-left { display: flex; width: max-content; animation: marqueeLeft 38s linear infinite; }
        .animate-marquee-right { display: flex; width: max-content; animation: marqueeRight 38s linear infinite; }
        .marquee-container:hover .animate-marquee-left,
        .marquee-container:hover .animate-marquee-right { animation-play-state: paused; }
      `}</style>

      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{ backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />

      <div className="relative mx-auto mb-10 max-w-4xl px-4 text-center">
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-950">
          Our <span className="text-blue-600">Tech &amp; Media Expertise</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg font-medium text-slate-600">
          Empowering scalable digital ecosystems with industry-standard development frameworks, cloud solutions, and media platforms.
        </p>
      </div>

      {/* Marquee Row 1 - Left */}
      <div className="marquee-container relative flex overflow-hidden py-3">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent md:w-48" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent md:w-48" />

        <div className="animate-marquee-left flex gap-5 px-4 py-2">
          {[...expertiseRow1, ...expertiseRow1, ...expertiseRow1].map((item, index) => (
            <motion.div
              key={`row1-${item.name}-${index}`}
              whileHover={{ y: -5, scale: 1.04 }}
              className="group flex h-[130px] w-[140px] shrink-0 cursor-pointer flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur transition-all duration-300 hover:border-blue-400 hover:shadow-xl"
            >
              <div className="flex h-14 w-full items-center justify-center p-1">
                <img
                  src={item.icon}
                  alt={item.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg";
                  }}
                  className="max-h-11 max-w-11 object-contain transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="w-full text-center">
                <h3 className="text-xs font-bold text-slate-800 transition-colors group-hover:text-blue-600 truncate">
                  {item.name}
                </h3>
                <span className="mt-0.5 block text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
                  {item.category}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Marquee Row 2 - Right */}
      <div className="marquee-container relative flex overflow-hidden py-3 mt-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent md:w-48" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent md:w-48" />

        <div className="animate-marquee-right flex gap-5 px-4 py-2">
          {[...expertiseRow2, ...expertiseRow2, ...expertiseRow2].map((item, index) => (
            <motion.div
              key={`row2-${item.name}-${index}`}
              whileHover={{ y: -5, scale: 1.04 }}
              className="group flex h-[130px] w-[140px] shrink-0 cursor-pointer flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur transition-all duration-300 hover:border-cyan-400 hover:shadow-xl"
            >
              <div className="flex h-14 w-full items-center justify-center p-1">
                <img
                  src={item.icon}
                  alt={item.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://raw.githubusercontent.com/devicons/devicon/master/icons/github/github-original.svg";
                  }}
                  className="max-h-11 max-w-11 object-contain transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="w-full text-center">
                <h3 className="text-xs font-bold text-slate-800 transition-colors group-hover:text-cyan-600 truncate">
                  {item.name}
                </h3>
                <span className="mt-0.5 block text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
                  {item.category}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
