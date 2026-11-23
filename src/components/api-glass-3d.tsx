"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const GlassScene = dynamic(() => import("./api-glass-scene"), { ssr: false });
export function ApiGlass3D() {
  const container = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const motion = window.matchMedia("(min-width: 769px) and (prefers-reduced-motion: no-preference)");
    let visible = false;
    const update = () => setAnimate(visible && motion.matches && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div ref={container} className="api-glass-3d" aria-hidden="true">
      <GlassScene animate={animate} beverage="api" size="hero" />
    </div>
  );
}
