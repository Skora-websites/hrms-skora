"use client";

import React, { useState, useEffect } from "react";

export default function ScrollProgressBar() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(currentProgress);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[100] bg-transparent pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-sky-300 transition-all duration-150 ease-out shadow-[0_0_12px_rgba(59,130,246,0.8)]"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
}
