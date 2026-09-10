"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import "./LaptopSlider.css";

const slideData = [
  {
    id: 1,
    title: "Edskora Platform",
    description: "Next-generation multi-user institutional management system.",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
  },
  {
    id: 2,
    title: "Osborn Clinic",
    description: "Cinematic promotional web experience and medical staff recruitment.",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
  },
  {
    id: 3,
    title: "Before You Buy India",
    description: "High-engagement product reviews and affiliate marketing hub.",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
  },
  {
    id: 4,
    title: "Particle Engine",
    description: "Advanced interactive background effects and user experiences.",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
  },
  {
    id: 5,
    title: "Cinematic Transitions",
    description: "Glassmorphism layouts with premium, fluid navigation.",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
  },
  {
    id: 6,
    title: "Vertical Video Studio",
    description: "9:16 aspect ratio content delivery and thumbnail generation.",
    image: "https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=800&q=80",
  },
];

const renderKeyboard = () => {
  const keys = [];
  for (let i = 0; i < 76; i++) {
    keys.push(<div key={i} className={`laptop-key ${i === 72 ? "spacebar" : ""}`}></div>);
  }
  return keys;
};

export default function LaptopSlider() {
  const [rotationCount, setRotationCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const totalSlides = slideData.length;
  const currentIndex = rotationCount % totalSlides;
  const activeSlide = slideData[currentIndex];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.4 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => {
      if (sectionRef.current) observer.disconnect();
    };
  }, []);

  const playRapidSound = () => {
    if (audioRef.current && !isMuted) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => {
        setIsMuted(true);
      });
    }
  };

  useEffect(() => {
    if (isHovered || !isInView) return;
    const timer = setInterval(() => {
      setRotationCount((prev) => prev + 1);
    }, 2400);
    return () => clearInterval(timer);
  }, [isHovered, isInView]);

  useEffect(() => {
    if (rotationCount > 0 && isInView) {
      playRapidSound();
    }
  }, [rotationCount, isInView]);

  return (
    <div className="cred-carousel-section" ref={sectionRef}>
      <audio
        ref={audioRef}
        src="https://actions.google.com/sounds/v1/foley/swoosh.ogg"
        preload="auto"
      />

      <div className="audio-controls">
        <button
          className={`audio-toggle ${!isMuted ? "audio-active" : ""}`}
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span>{isMuted ? "Sound: OFF" : "Sound: ON"}</span>
        </button>
      </div>

      <div className="carousel-layout-wrapper">
        <div
          className="carousel-scene"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className="carousel-spinner"
            style={{ transform: `translateZ(-450px) rotateY(${rotationCount * -60}deg)` }}
          >
            {slideData.map((slide, index) => {
              const angle = index * 60;
              const isActive = index === currentIndex;

              return (
                <div
                  key={slide.id}
                  className={`carousel-item ${isActive ? "item-active" : "item-inactive"}`}
                  style={{ transform: `rotateY(${angle}deg) translateZ(450px)` }}
                >
                  <div className="macbook-3d-rig">
                    <div className="macbook-lid">
                      <div className="dim-overlay"></div>
                      <div className="macbook-screen">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80";
                          }}
                        />
                        <div className="screen-glare"></div>
                      </div>
                    </div>

                    <div className="macbook-base">
                      <div className="dim-overlay"></div>
                      <div className="macbook-keyboard-well">{renderKeyboard()}</div>
                      <div className="macbook-trackpad"></div>
                      <div className="macbook-base-lip"></div>
                    </div>

                    <div className="desk-shadow"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="carousel-text-overlay">
          <div key={rotationCount} className="text-animate-wrapper">
            <h3 className="gradient-text">{activeSlide.title}</h3>
            <p>{activeSlide.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
