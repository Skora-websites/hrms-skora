"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  variant?: "fade-up" | "fade-down" | "fade-left" | "fade-right" | "zoom" | "flip";
  delay?: number; // Delay in ms
  duration?: number; // Duration in ms
  className?: string;
}

export default function ScrollReveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 700,
  className = "",
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, []);

  const getVariantStyles = () => {
    if (!isVisible) {
      switch (variant) {
        case "fade-up":
          return "opacity-0 translate-y-12";
        case "fade-down":
          return "opacity-0 -translate-y-12";
        case "fade-left":
          return "opacity-0 translate-x-12";
        case "fade-right":
          return "opacity-0 -translate-x-12";
        case "zoom":
          return "opacity-0 scale-90";
        case "flip":
          return "opacity-0 [transform:rotateX(-30deg)_scale(0.9)]";
        default:
          return "opacity-0 translate-y-12";
      }
    }
    return "opacity-100 translate-y-0 translate-x-0 scale-100 [transform:rotateX(0deg)_scale(1)]";
  };

  return (
    <div
      ref={elementRef}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={`transition-all duration-700 ease-out will-change-transform ${getVariantStyles()} ${className}`}
    >
      {children}
    </div>
  );
}
