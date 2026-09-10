"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [mounted, setMounted] = useState(false);
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  // Return false during SSR and first client render to match the server.
  // After mount, return the actual media query match.
  return mounted && matches;
}

export function useBreakpoint() {
  const isXs = useMediaQuery("(max-width: 575px)");
  const isSm = useMediaQuery("(min-width: 576px) and (max-width: 767px)");
  const isMd = useMediaQuery("(min-width: 768px) and (max-width: 991px)");
  const isLg = useMediaQuery("(min-width: 992px) and (max-width: 1199px)");
  const isXl = useMediaQuery("(min-width: 1200px)");

  return {
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isMobile: isXs || isSm,
    isTablet: isMd,
    isDesktop: isLg || isXl,
  };
}
