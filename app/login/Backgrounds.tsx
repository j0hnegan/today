"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function Starfield() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // Star geometry — more stars, brighter, distributed in a deep volume
    const starCount = 4000;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);
    const speeds = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 200 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = Math.random() * 3 + 1.0;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute("speed", new THREE.BufferAttribute(speeds, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: window.devicePixelRatio } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float size;
        attribute float phase;
        attribute float speed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vTwinkle;
        void main() {
          // Drift each star slowly along its own trajectory for parallax
          vec3 pos = position;
          pos.z += uTime * speed * 8.0;
          // Wrap stars that drift past the camera back to the far shell
          float maxR = 1000.0;
          pos.z = mod(pos.z + maxR, maxR * 2.0) - maxR;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vTwinkle = 0.5 + 0.5 * sin(uTime * 1.5 + phase);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z) * (0.5 + vTwinkle * 0.8);
        }
      `,
      fragmentShader: `
        varying float vTwinkle;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d) * (0.5 + vTwinkle * 0.5);
          gl_FragColor = vec4(1.0, 1.0, 1.0, a);
        }
      `,
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    let animId: number;
    const animate = (time: number) => {
      material.uniforms.uTime.value = time / 1000;
      stars.rotation.y = time / 180000;
      stars.rotation.x = time / 300000;
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[0] pointer-events-none"
    />
  );
}

// ─── Tuning parameters ─────────────────────────────────────────────────────
// 3D synthwave crucifix: a Christian cross built from two box beams (vertical +
// horizontal), with wireframe grid lines rendered on every visible face.
// The camera orbits/pans past it at a slight angle so you can see depth.

// Cross dimensions (vertical beam + horizontal crossbeam)
// All dimensions are multiples of GRID_SPACING * 2 (1.2) so edges align to grid lines
const BEAM_THICKNESS = 4.8;        // depth/thickness of each beam
const VERT_HEIGHT = 40.8;          // height of vertical beam
const HORIZ_WIDTH = 24;            // width of horizontal crossbeam
const CROSSBAR_Y = 9.6;            // how far above center the crossbar sits

// Cross orientation (diagonal BL → TR in screen space)
const CROSS_TILT_DEG = -45;        // roll around view axis
const CROSS_YAW_DEG = -22;         // turn around beam axis so right side faces camera

// Grid look
const GRID_SPACING = 0.6;          // world units between grid lines
const LINE_WIDTH = 0.008;
const FADE_IN_SECONDS = 2.0;
const RAINBOW_SPATIAL_FREQ = 0.04; // how tightly the rainbow wraps across the cross
const RAINBOW_TIME_FREQ = 0.08;    // rainbow hue scroll speed

// Camera / motion — cross translates along its own axis from upper-right
// to lower-left, looping smoothly.
const CAM_DISTANCE = 12;           // camera distance from cross
const CROSS_SPACING = 48;          // diagonal distance between cross instances
const SWOOP_PERIOD = 90;           // seconds per full swoop cycle
const SWOOP_START_FRACTION = 0.1;  // starting phase offset

// Fog
const FOG_NEAR = 10.0;
const FOG_FAR = 50.0;
const BG_COLOR = 0x000000;
const CAM_FOV = 50;
// ───────────────────────────────────────────────────────────────────────────

function GridCross() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(BG_COLOR, FOG_NEAR, FOG_FAR);

    const camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 200);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const uniforms = {
      uGridSize: { value: GRID_SPACING },
      uLineWidth: { value: LINE_WIDTH },
      uFogNear: { value: FOG_NEAR },
      uFogFar: { value: FOG_FAR },
      uFade: { value: 0.0 },
      uTime: { value: 0.0 },
      uSpatialFreq: { value: RAINBOW_SPATIAL_FREQ },
      uTimeFreq: { value: RAINBOW_TIME_FREQ },
    };

    // Grid shader: picks two axes per face based on the face normal, so the
    // grid lines wrap around the box consistently on every side.
    const rainbowChunk = `
      vec3 hueToRgb(float h) {
        return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: false,
      side: THREE.FrontSide,
      depthWrite: true,
      vertexShader: `
        varying vec3 vLocal;
        varying vec3 vNormal;
        varying float vFogDepth;
        void main() {
          vLocal = position;
          vNormal = normal;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vFogDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uGridSize;
        uniform float uLineWidth;
        uniform float uFogNear;
        uniform float uFogFar;
        uniform float uFade;
        uniform float uTime;
        uniform float uSpatialFreq;
        uniform float uTimeFreq;
        varying vec3 vLocal;
        varying vec3 vNormal;
        varying float vFogDepth;

        ${rainbowChunk}

        void main() {
          // Choose the 2 axes tangent to this face based on dominant normal axis
          vec3 an = abs(vNormal);
          vec2 coord;
          if (an.x > an.y && an.x > an.z) coord = vLocal.yz;
          else if (an.y > an.z)            coord = vLocal.xz;
          else                             coord = vLocal.xy;

          coord /= uGridSize;
          vec2 fw = fwidth(coord);
          vec2 g = abs(fract(coord - 0.5) - 0.5);
          float lwHalf = uLineWidth * 0.5 / uGridSize;

          float lineX = 1.0 - smoothstep(lwHalf, lwHalf + fw.x, g.x);
          float lineY = 1.0 - smoothstep(lwHalf, lwHalf + fw.y, g.y);
          float line = max(lineX, lineY);

          float glowWidth = uLineWidth * 2.0 / uGridSize;
          float glow = max(
            1.0 - smoothstep(0.0, glowWidth, g.x),
            1.0 - smoothstep(0.0, glowWidth, g.y)
          ) * 0.15;

          float fog = 1.0 - smoothstep(uFogNear, uFogFar, vFogDepth);
          float intensity = (line + glow) * fog * uFade;

          float hue = (vLocal.x + vLocal.y + vLocal.z) * uSpatialFreq + uTime * uTimeFreq;
          vec3 rainbow = hueToRgb(fract(hue));
          gl_FragColor = vec4(rainbow * intensity, 1.0);
        }
      `,
      // @ts-expect-error — Three.js runtime supports derivatives but @types/three dropped it
      extensions: { derivatives: true },
    });

    // Rainbow shader for edge outlines (replaces LineBasicMaterial)
    const edgeUniforms = {
      uFade: { value: 0.0 },
      uTime: { value: 0.0 },
      uSpatialFreq: { value: RAINBOW_SPATIAL_FREQ },
      uTimeFreq: { value: RAINBOW_TIME_FREQ },
    };
    const makeEdgeMaterial = () => new THREE.ShaderMaterial({
      uniforms: edgeUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec3 vLocal;
        void main() {
          vLocal = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uFade;
        uniform float uTime;
        uniform float uSpatialFreq;
        uniform float uTimeFreq;
        varying vec3 vLocal;

        ${rainbowChunk}

        void main() {
          float hue = (vLocal.x + vLocal.y + vLocal.z) * uSpatialFreq + uTime * uTimeFreq;
          vec3 rainbow = hueToRgb(fract(hue));
          gl_FragColor = vec4(rainbow, uFade * 0.9);
        }
      `,
    });

    // Shared geometry for both cross instances
    const vertGeo = new THREE.BoxGeometry(BEAM_THICKNESS, VERT_HEIGHT, BEAM_THICKNESS);
    const horizGeo = new THREE.BoxGeometry(HORIZ_WIDTH, BEAM_THICKNESS, BEAM_THICKNESS);
    const vertEdgeGeo = new THREE.EdgesGeometry(vertGeo);
    const horizEdgeGeo = new THREE.EdgesGeometry(horizGeo);

    // Horizontal beam material — polygon offset avoids z-fighting at the intersection
    const horizMaterial = material.clone();
    horizMaterial.polygonOffset = true;
    horizMaterial.polygonOffsetFactor = -1;
    horizMaterial.polygonOffsetUnits = -1;

    const buildCross = () => {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(vertGeo, material));
      const hm = new THREE.Mesh(horizGeo, horizMaterial);
      hm.position.y = CROSSBAR_Y;
      group.add(hm);
      const ve = new THREE.LineSegments(vertEdgeGeo, makeEdgeMaterial());
      group.add(ve);
      const he = new THREE.LineSegments(horizEdgeGeo, makeEdgeMaterial());
      he.position.y = CROSSBAR_Y;
      group.add(he);
      group.rotation.y = (CROSS_YAW_DEG * Math.PI) / 180;
      group.rotation.z = (CROSS_TILT_DEG * Math.PI) / 180;
      return group;
    };

    const crosses = [buildCross(), buildCross(), buildCross()];
    crosses.forEach(c => scene.add(c));

    // Diagonal axis in screen space pointing from lower-left to upper-right
    const diagAxis = new THREE.Vector3(
      Math.sin((-CROSS_TILT_DEG * Math.PI) / 180),
      Math.cos((-CROSS_TILT_DEG * Math.PI) / 180),
      0
    ).normalize();

    camera.position.set(0, 0, CAM_DISTANCE);
    camera.lookAt(0, 0, 0);

    let animId: number;
    let startTime: number | null = null;
    const animate = (time: number) => {
      if (startTime === null) startTime = time;
      const elapsed = (time - startTime) / 1000;
      const fade = Math.min(1, elapsed / FADE_IN_SECONDS);

      const t = time / 1000;
      // Linear traversal: 3 crosses spaced evenly, cycling seamlessly.
      const halfRange = CROSS_SPACING / 2;
      const cyclePhase = ((t / SWOOP_PERIOD + SWOOP_START_FRACTION) % 1 + 1) % 1;
      const baseTravel = halfRange - cyclePhase * CROSS_SPACING;

      const offsets = [0, CROSS_SPACING, -CROSS_SPACING];
      crosses.forEach((group, i) => {
        const travel = baseTravel + offsets[i];
        group.position.set(diagAxis.x * travel, diagAxis.y * travel, 0);
      });

      material.uniforms.uFade.value = fade;
      material.uniforms.uTime.value = t;
      horizMaterial.uniforms.uFade.value = fade;
      horizMaterial.uniforms.uTime.value = t;
      edgeUniforms.uFade.value = fade;
      edgeUniforms.uTime.value = t;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      vertGeo.dispose();
      horizGeo.dispose();
      vertEdgeGeo.dispose();
      horizEdgeGeo.dispose();
      material.dispose();
      horizMaterial.dispose();
      crosses.forEach(g => g.traverse(obj => {
        if ((obj as THREE.LineSegments).isLineSegments) {
          ((obj as THREE.LineSegments).material as THREE.Material).dispose();
        }
      }));
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[1] pointer-events-none"
    />
  );
}

export default function Backgrounds() {
  return (
    <>
      <Starfield />
      <GridCross />
    </>
  );
}
