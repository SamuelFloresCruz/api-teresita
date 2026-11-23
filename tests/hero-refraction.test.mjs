import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as THREE from "three";

const source = readFileSync(new URL("../src/components/use-hero-refraction.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

// Run the real hook with a controlled browser surface; no WebGL is needed to
// reproduce the original CanvasGradient failure during its layout effect.
function renderBackdrop(colors, mobile = false, card = false) {
  const radialStops = [];
  const linearStops = [];
  const cleanups = [];
  const deferred = [];
  const gradient = (stops = []) => ({
    addColorStop(offset, color) {
      if (!color || color.includes("var(") || color === "invalid-color") {
        throw new SyntaxError("Color cannot be parsed");
      }
      stops.push([offset, color]);
    },
  });
  const context = {
    createRadialGradient: () => {
      const stops = [];
      radialStops.push(stops);
      return gradient(stops);
    },
    createLinearGradient: () => {
      const stops = [];
      linearStops.push(stops);
      return gradient(stops);
    },
    setTransform() {}, clearRect() {}, scale() {}, translate() {}, fillRect() {},
    beginPath() {}, arc() {}, stroke() {},
  };
  const hero = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 900 }),
    querySelector: () => null,
  };
  const gl = { domElement: {
    closest: (selector) => selector === ".product-card__visual" ? (card ? hero : null) : selector === ".hero" ? hero : null,
    getBoundingClientRect: () => ({ left: 650, top: 200, width: 400, height: 400 }),
  } };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === "three") return THREE;
      if (name === "@react-three/fiber") return { useThree: (select) => select({ gl, invalidate() {} }) };
      if (name === "react") return {
        useMemo: (create) => create(),
        useLayoutEffect: (effect) => cleanups.push(effect()),
        useEffect: (effect) => cleanups.push(effect()),
      };
      throw new Error(`Unexpected module: ${name}`);
    },
    document: { createElement: () => ({ getContext: () => context }) },
    getComputedStyle: () => ({ getPropertyValue: (name) => colors[name] ?? "" }),
    window: {
      matchMedia: () => ({ matches: mobile }),
      requestAnimationFrame: (callback) => deferred.push(callback),
      cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {},
    },
    ResizeObserver: class { observe() {} disconnect() {} },
  });
  const texture = exports.useHeroRefraction();
  return {
    radialStops, linearStops, deferred,
    dispose() { cleanups.forEach((cleanup) => cleanup?.()); texture.dispose(); },
  };
}

test("empty CSS values render safely with the desktop palette", () => {
  const result = renderBackdrop({});
  assert.deepEqual(result.radialStops[0], [
    [0, "#f0dfcf"], [.37, "#f8f0e7"], [.7, "#fffdf9"], [1, "#fffdf9"],
  ]);
  result.dispose();
});

test("invalid and unresolved CSS colors never reach the drawing gradient", () => {
  const result = renderBackdrop({
    "--hero-backdrop-core": "invalid-color",
    "--hero-backdrop-middle": "var(--missing-color)",
    "--hero-backdrop-edge": "  ",
    "--white": "#fefcf8",
  });
  assert.deepEqual(result.radialStops[0].map(([, color]) => color), [
    "#f0dfcf", "#f8f0e7", "#fefcf8", "#fefcf8",
  ]);
  result.dispose();
});

test("deferred drawing picks up CSS colors after styles become available", () => {
  const colors = {};
  const result = renderBackdrop(colors);
  Object.assign(colors, {
    "--hero-backdrop-core": "#e1d2c3",
    "--hero-backdrop-middle": "#f1e2d3",
    "--hero-backdrop-edge": "rgb(255, 253, 249)",
  });
  result.deferred[0]();
  assert.equal(result.radialStops[1][0][1], "#e1d2c3");
  assert.equal(result.radialStops[1][2][1], "rgb(255, 253, 249)");
  result.dispose();
});

test("mobile uses its own palette when CSS colors are missing", () => {
  const result = renderBackdrop({}, true);
  assert.deepEqual(result.radialStops[0], [
    [0, "#ead5c4"], [.64, "#fffdf9"], [1, "#fffdf9"],
  ]);
  result.dispose();
});

test("product cards safely render without hero CSS variables", () => {
  const result = renderBackdrop({}, false, true);
  assert.equal(result.radialStops.length, 0);
  assert.deepEqual(result.linearStops.find((stops) => stops.length === 2), [
    [0, "#f2e6da"], [1, "#f2e6da"],
  ]);
  result.dispose();
});

test("glass in a product card uses that card's own gradient", () => {
  const result = renderBackdrop({
    "--product-backdrop-start": "#f8edd5",
    "--product-backdrop-end": "#ead5a8",
  }, false, true);
  assert.deepEqual(result.linearStops.find((stops) => stops.length === 2), [
    [0, "#f8edd5"], [1, "#ead5a8"],
  ]);
  result.dispose();
});
