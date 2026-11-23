"use client";

/* eslint-disable react-hooks/immutability -- Three.js anima geometrías y objetos mediante mutaciones imperativas por cuadro. */

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, MeshTransmissionMaterial } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { useHeroRefraction } from "./use-hero-refraction";

// Profile matched to the reference: a tall, almost straight tumbler, flared
// slightly at the rim, with a rounded thick foot and a clear band above the api.
const glassProfile = [
  [0, -1.4], [.54, -1.4], [.61, -1.398], [.653, -1.38],
  [.679, -1.35], [.69, -1.3], [.697, -1.23],
  [.708, -.86], [.735, -.4], [.756, .1], [.779, .6],
  [.803, 1.1], [.818, 1.35], [.819, 1.384], [.815, 1.402],
  [.804, 1.407], [.791, 1.401], [.785, 1.385], [.783, 1.36],
  [.769, 1.1], [.745, .6], [.722, .1], [.701, -.4],
  [.674, -.86], [.661, -1.12], [.65, -1.17], [.624, -1.19], [0, -1.19],
].map(([radius, height]) => new THREE.Vector2(radius, height));

const liquidRadius = .759;

// Morado oscuro con matices lilas y variación sutil de densidad y grano.
// The texture wraps around the volume; it is never used as a flat mug image.
function makeApiTexture() {
  const size = 256;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const height = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const angle = (x / size) * Math.PI * 2;
      const sample = Math.sin(x * 63.7 + y * 219.3) * 43758.5453;
      const grain = sample - Math.floor(sample) - .5;
      const density = Math.sin(angle * 3 + height * 5) * .025
        + Math.sin(angle * 7 - height * 9) * .015 + grain * .055;
      const shade = 1 + density;
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round((86 + height * 10) * shade);
      pixels[offset + 1] = Math.round((27 - height * 7) * shade);
      pixels[offset + 2] = Math.round((82 - height * 10) * shade);
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// Deterministic microscopic texture: no remote images or repeating large spots.
function makeMicroTexture() {
  const size = 256;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sample = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const grain = sample - Math.floor(sample);
      const value = Math.round(128 + (grain - .5) * 65);
      const offset = (y * size + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function ApiMug({ animate, beverage, compact, cerealTexture }: {
  animate: boolean;
  beverage: "api" | "tojori";
  compact: boolean;
  cerealTexture?: THREE.Texture;
}) {
  const backdrop = useHeroRefraction();
  const framing = useRef<THREE.Group>(null);
  const mug = useRef<THREE.Group>(null);
  const surface = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  const model = useMemo(() => {
    const glass = new THREE.LatheGeometry(glassProfile, 128);
    // Shallow flutes are part of the vessel wall, as in molded drinking glass.
    const wall = glass.getAttribute("position");
    for (let i = 0; i < wall.count; i++) {
      const x = wall.getX(i);
      const z = wall.getZ(i);
      const y = wall.getY(i);
      const angle = Math.atan2(z, x);
      const fade = THREE.MathUtils.smoothstep(y, -1.3, -.95)
        * (1 - THREE.MathUtils.smoothstep(y, .8, 1.08));
      const baseFacet = 1 - THREE.MathUtils.smoothstep(y, -1.05, -.78);
      const flute = 1 + Math.cos(angle * 10) * (.008 * fade + .025 * baseFacet);
      wall.setXYZ(i, x * flute, y, z * flute);
    }
    glass.computeVertexNormals();
    // Compact reference handle: straight upper bridge, rounded corners and a
    // gently inward-sloping outer edge, with a short level lower attachment.
    const handleCurve = new THREE.CurvePath<THREE.Vector3>();
    const handlePoint = (x: number, y: number) => new THREE.Vector3(x, y, 0);
    handleCurve.add(new THREE.LineCurve3(handlePoint(-.775, .78), handlePoint(-1.13, .78)));
    handleCurve.add(new THREE.CubicBezierCurve3(
      handlePoint(-1.13, .78), handlePoint(-1.31, .78),
      handlePoint(-1.4, .68), handlePoint(-1.4, .5),
    ));
    handleCurve.add(new THREE.CubicBezierCurve3(
      handlePoint(-1.4, .5), handlePoint(-1.4, .16),
      handlePoint(-1.31, -.39), handlePoint(-1.23, -.62),
    ));
    handleCurve.add(new THREE.CubicBezierCurve3(
      handlePoint(-1.23, -.62), handlePoint(-1.19, -.735),
      handlePoint(-1.17, -.82), handlePoint(-1.04, -.82),
    ));
    handleCurve.add(new THREE.LineCurve3(handlePoint(-1.04, -.82), handlePoint(-.7, -.82)));
    const handle = new THREE.TubeGeometry(handleCurve, 128, .09, 24, false);
    handle.scale(1, 1, .85);
    // One glass mesh lets both the wall and handle share one refraction pass.
    const vessel = mergeGeometries([glass, handle]);
    glass.dispose();
    handle.dispose();
    // Closed bottom and open top, so a flat cylinder cap cannot hide the waves.
    const liquid = new THREE.LatheGeometry([
      new THREE.Vector2(0, -1.085),
      new THREE.Vector2(.63, -1.085),
      new THREE.Vector2(liquidRadius, 1.085),
    ], 128);
    const microTexture = makeMicroTexture();
    const apiTexture = cerealTexture ? cerealTexture.clone() : makeApiTexture();
    if (cerealTexture) {
      apiTexture.colorSpace = THREE.SRGBColorSpace;
      apiTexture.wrapS = apiTexture.wrapT = THREE.RepeatWrapping;
      apiTexture.repeat.set(2, 2.2);
      apiTexture.anisotropy = 4;
      apiTexture.needsUpdate = true;
    }

    // Polar grid: every ring can deform, rather than moving a flat disc.
    const rings = 28;
    const segments = 96;
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let ring = 0; ring <= rings; ring++) {
      const radius = (ring / rings) * liquidRadius;
      for (let segment = 0; segment <= segments; segment++) {
        const angle = (segment / segments) * Math.PI * 2;
        vertices.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        uvs.push(.5 + Math.cos(angle) * radius / (liquidRadius * 2), .5 + Math.sin(angle) * radius / (liquidRadius * 2));
        if (ring < rings && segment < segments) {
          const a = ring * (segments + 1) + segment;
          const b = a + segments + 1;
          indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
    const top = new THREE.BufferGeometry();
    top.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage));
    top.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    top.setIndex(indices);
    top.computeVertexNormals();
    const bubbleGeometry = new THREE.SphereGeometry(1, 10, 6);
    const bubbleMaterial = new THREE.MeshPhysicalMaterial({
      color: beverage === "tojori" ? "#e0d5b2" : "#b19aa8", roughness: .43, metalness: 0, ior: 1.34,
      transmission: .12, thickness: .006, specularIntensity: .45,
    });
    const bubbles = new THREE.InstancedMesh(bubbleGeometry, bubbleMaterial, 110);
    const bubbleTransform = new THREE.Object3D();
    for (let i = 0; i < bubbles.count; i++) {
      const angle = (i / bubbles.count) * Math.PI * 2;
      const radius = liquidRadius - .01 - (Math.sin(i * 19.3) * .5 + .5) * .018;
      bubbleTransform.position.set(Math.cos(angle) * radius, 1.034, Math.sin(angle) * radius);
      const size = .004 + (Math.sin(i * 37.7) * .5 + .5) * .009;
      bubbleTransform.scale.set(size, size * .4, size);
      bubbleTransform.updateMatrix();
      bubbles.setMatrixAt(i, bubbleTransform.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;
    const grainGeometry = new THREE.SphereGeometry(1, 12, 8);
    const grainMaterial = new THREE.MeshStandardMaterial({ color: "#d6cca2", roughness: .6 });
    const grains = new THREE.InstancedMesh(grainGeometry, grainMaterial, beverage === "tojori" ? 48 : 0);
    for (let i = 0; i < grains.count; i++) {
      const angle = (Math.sin(i * 73.7) * .5 + .5) * Math.PI * 2;
      const radius = Math.sqrt(Math.sin(i * 31.1 + 7) * .5 + .5) * .69;
      bubbleTransform.position.set(Math.cos(angle) * radius, 1.031, Math.sin(angle) * radius);
      const size = .009 + (Math.sin(i * 19.7) * .5 + .5) * .009;
      bubbleTransform.scale.set(size, size * .3, size * .65);
      bubbleTransform.rotation.y = angle;
      bubbleTransform.updateMatrix();
      grains.setMatrixAt(i, bubbleTransform.matrix);
    }
    grains.instanceMatrix.needsUpdate = true;
    return { vessel, liquid, top, microTexture, apiTexture, bubbles, bubbleGeometry, bubbleMaterial, grains, grainGeometry, grainMaterial };
  }, [beverage, cerealTexture]);

  useEffect(() => () => {
    model.vessel.dispose();
    model.liquid.dispose();
    model.top.dispose();
    model.microTexture.dispose();
    model.apiTexture.dispose();
    model.bubbles.dispose();
    model.bubbleGeometry.dispose();
    model.bubbleMaterial.dispose();
    model.grains.dispose();
    model.grainGeometry.dispose();
    model.grainMaterial.dispose();
  }, [model]);

  useFrame((_, delta) => {
    if (!animate || !mug.current || !surface.current) return;
    const step = Math.min(delta, .05);
    elapsed.current += step;
    const time = elapsed.current;
    mug.current.rotation.y += step * .29;
    if (compact && framing.current) {
      const side = Math.cos(mug.current.rotation.y - Math.atan2(1.05, 7.1));
      framing.current.position.x = Math.sign(side) * Math.max(0, 1.49 * Math.abs(side) - .82) / 2;
    }
    model.bubbles.rotation.y -= step * .035;
    model.grains.rotation.y -= step * .035;

    const position = model.top.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const radius = Math.min(1, Math.hypot(x, z) / liquidRadius);
      const angle = Math.atan2(z, x);
      // Keep the meniscus at the wall fixed; waves remain inside the vessel.
      const wave = Math.sin(radius * 9 - time * 1.65) * .006
        + Math.sin(angle * 2 - time * .9) * radius * .009;
      const vortex = -.009 * (1 - radius * radius);
      const meniscus = .009 * Math.pow(radius, 12);
      position.setY(i, meniscus + (wave + vortex) * (1 - radius * radius));
    }
    position.needsUpdate = true;
    model.top.computeVertexNormals();
  });

  return (
    <group ref={framing} position={[compact ? .33 : 0, 0, 0]}>
    <group ref={mug} rotation={[0, .12, 0]}>
      <mesh geometry={model.liquid} position={[0, -.055, 0]}>
        <meshPhysicalMaterial color="#ffffff" map={model.apiTexture} roughness={beverage === "tojori" ? .43 : .34} metalness={0} ior={1.34} specularIntensity={.32} bumpMap={beverage === "tojori" ? model.apiTexture : model.microTexture} bumpScale={beverage === "tojori" ? .002 : .0015} />
      </mesh>
      <mesh ref={surface} geometry={model.top} position={[0, 1.03, 0]}>
        <meshPhysicalMaterial color={beverage === "tojori" ? "#ffffff" : "#702b67"} map={beverage === "tojori" ? model.apiTexture : null} roughness={beverage === "tojori" ? .38 : .3} metalness={0} ior={1.34} specularIntensity={beverage === "tojori" ? .32 : .48} bumpMap={beverage === "tojori" ? model.apiTexture : model.microTexture} bumpScale={.001} side={THREE.DoubleSide} />
      </mesh>
      <primitive object={model.bubbles} />
      {beverage === "tojori" && <primitive object={model.grains} />}
      <mesh geometry={model.vessel}>
        <MeshTransmissionMaterial
          background={backdrop}
          transmission={1}
          thickness={.1}
          backside
          backsideThickness={.2}
          backsideEnvMapIntensity={.65}
          resolution={compact ? 256 : 512}
          backsideResolution={compact ? 128 : 256}
          samples={compact ? 3 : 4}
          color="#fdfbff"
          ior={1.52}
          roughness={.018}
          metalness={0}
          envMapIntensity={.7}
          chromaticAberration={.0015}
          anisotropicBlur={0}
          distortion={0}
          temporalDistortion={0}
          attenuationColor="#ebe7f1"
          attenuationDistance={10}
          bumpMap={model.microTexture}
          bumpScale={.0004}
        />
      </mesh>
    </group>
    </group>
  );
}

function TojoriMug({ animate, compact }: { animate: boolean; compact: boolean }) {
  const texture = useLoader(THREE.TextureLoader, "/tojori-textura-realista.png");
  return <ApiMug animate={animate} compact={compact} beverage="tojori" cerealTexture={texture} />;
}

export default function GlassScene({ animate, beverage = "api", size = "hero" }: {
  animate: boolean;
  beverage?: "api" | "tojori";
  size?: "hero" | "card";
}) {
  const compact = size === "card";
  return (
    <Canvas
      camera={{ position: compact ? [1.05, 1, 7.1] : [1.05, .9, 8.1], fov: 30 }}
      dpr={[1, compact ? 1.5 : 2]}
      frameloop={animate ? "always" : "demand"}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      fallback={<span className="api-glass-3d__fallback">{beverage === "tojori" ? "Tojorí" : "Api tradicional"}</span>}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <Environment files="/api-studio-1k.hdr" background={false} environmentIntensity={.9} environmentRotation={[0, .65, 0]} />
        {beverage === "tojori"
          ? <TojoriMug animate={animate} compact={compact} />
          : <ApiMug animate={animate} beverage="api" compact={compact} />}
      </Suspense>
    </Canvas>
  );
}
