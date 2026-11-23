"use client";

/* eslint-disable react-hooks/immutability -- CanvasTexture se actualiza de manera imperativa para la refracción del vidrio. */

import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

// Rebuild only the decorative CSS backdrop for the glass's offscreen refraction
// pass. The visible WebGL canvas stays transparent; no backdrop plane is shown.
export function useHeroRefraction() {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const backdrop = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return { canvas, texture };
  }, []);

  useLayoutEffect(() => {
    const card = gl.domElement.closest<HTMLElement>(".product-card__visual");
    const hero = card ?? gl.domElement.closest<HTMLElement>(".hero");
    if (!hero) return;
    const draw = () => {
      const context = backdrop.canvas.getContext("2d");
      const heroRect = hero.getBoundingClientRect();
      const viewRect = gl.domElement.getBoundingClientRect();
      if (!context || !viewRect.width || !viewRect.height) return;
      const style = getComputedStyle(hero);
      const mobile = window.matchMedia("(max-width: 768px)").matches;
      const readColor = (property: string, fallback: string) => {
        const value = style.getPropertyValue(property).trim();
        if (!value) return fallback;
        // Validate with the same Canvas API that will consume the color.
        // CSS.supports alone can accept unresolved var() expressions.
        try {
          const probe = context.createLinearGradient(0, 0, 1, 0);
          probe.addColorStop(0, value);
          return value;
        } catch {
          return fallback;
        }
      };
      const core = readColor("--hero-backdrop-core", mobile ? "#ead5c4" : "#f0dfcf");
      const middle = readColor("--hero-backdrop-middle", "#f8f0e7");
      const edge = readColor("--hero-backdrop-edge", readColor("--white", "#fffdf9"));
      const centerX = heroRect.width * (mobile ? .5 : .75);
      const centerY = heroRect.height * (mobile ? .68 : .5);
      const radius = Math.hypot(
        Math.max(centerX, heroRect.width - centerX),
        Math.max(centerY, heroRect.height - centerY),
      );
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, 512, 512);
      context.scale(512 / viewRect.width, 512 / viewRect.height);
      context.translate(heroRect.left - viewRect.left, heroRect.top - viewRect.top);
      if (card) {
        const angle = 145 * Math.PI / 180;
        const dx = Math.sin(angle);
        const dy = -Math.cos(angle);
        const extent = (Math.abs(heroRect.width * dx) + Math.abs(heroRect.height * dy)) / 2;
        const x = heroRect.width / 2;
        const y = heroRect.height / 2;
        const gradient = context.createLinearGradient(x - dx * extent, y - dy * extent, x + dx * extent, y + dy * extent);
        gradient.addColorStop(0, readColor("--product-backdrop-start", "#f2e6da"));
        gradient.addColorStop(1, readColor("--product-backdrop-end", "#f2e6da"));
        context.fillStyle = gradient;
        context.fillRect(0, 0, heroRect.width, heroRect.height);
        context.strokeStyle = "rgba(81,46,30,.1)";
        context.lineWidth = 1;
        context.beginPath();
        context.arc(x, y, heroRect.width * .38, 0, Math.PI * 2);
        context.stroke();
        backdrop.texture.needsUpdate = true;
        invalidate();
        return;
      }
      const radial = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      radial.addColorStop(0, core);
      if (!mobile) radial.addColorStop(.37, middle);
      radial.addColorStop(mobile ? .64 : .7, edge);
      radial.addColorStop(1, edge);
      context.fillStyle = radial;
      context.fillRect(0, 0, heroRect.width, heroRect.height);
      if (!mobile) {
        const wash = context.createLinearGradient(0, 0, heroRect.width * .55, 0);
        wash.addColorStop(0, "rgba(255,255,255,.76)");
        wash.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = wash;
        context.fillRect(0, 0, heroRect.width, heroRect.height);
      }

      // Include the subtle decorative rings, so clear glass bends their lines.
      const ornament = hero.querySelector<HTMLElement>(".hero__glow");
      if (ornament) {
        const rect = ornament.getBoundingClientRect();
        const x = rect.left - heroRect.left + rect.width / 2;
        const y = rect.top - heroRect.top + rect.height / 2;
        context.strokeStyle = "rgba(99,64,47,.1)";
        context.lineWidth = 1;
        for (const inset of [0, .11, .24]) {
          context.setLineDash(inset === .11 ? [3, 3] : []);
          context.beginPath();
          context.ellipse(x, y, rect.width * (.5 - inset), rect.height * (.5 - inset), 0, 0, Math.PI * 2);
          context.stroke();
        }
        context.setLineDash([]);
      }
      backdrop.texture.needsUpdate = true;
      invalidate();
    };
    draw();
    // Recheck after layout/styles settle; fallbacks already allow the first draw.
    const redraw = window.requestAnimationFrame(draw);
    const observer = new ResizeObserver(draw);
    observer.observe(hero);
    observer.observe(gl.domElement);
    window.addEventListener("resize", draw);
    return () => {
      window.cancelAnimationFrame(redraw);
      observer.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [backdrop, gl, invalidate]);

  useEffect(() => () => backdrop.texture.dispose(), [backdrop]);
  return backdrop.texture;
}
