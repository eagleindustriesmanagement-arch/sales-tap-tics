"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's light: slow gold and bronze reflections flowing over black, like showroom light moving across paint.
 * Plain WebGL, one full-screen triangle and a fragment shader. The CSS gradient underneath (.mkt-hero-fallback)
 * shows whenever WebGL is missing or the context is lost.
 * Cost: the light is soft, so it renders at half resolution (device pixel ratio capped at 1.5 first) and the
 * browser scales it up; the loop runs at 30 frames a second, pauses off screen and in a hidden tab. Reduced
 * motion, and a software renderer (no GPU), get one still frame instead of a loop.
 */
const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_pointer;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 0.045;

  // Domain-warped flow: the depth of colour in the "paint" under the light.
  vec2 q = vec2(fbm(uv * 1.25 + vec2(0.0, t)), fbm(uv * 1.25 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(uv * 1.1 + 2.2 * q + vec2(1.7, 9.2) + 0.6 * t), fbm(uv * 1.1 + 2.2 * q + vec2(8.3, 2.8) - 0.5 * t));
  float f = fbm(uv * 1.2 + 2.4 * r);

  // Paint reflections: long, smooth arcs across the frame, as if over the curve of a hood. The bend comes from
  // low-frequency noise only, so the light stays glossy instead of smoky.
  float bend = noise(uv * 0.8 + vec2(t * 0.7, -t * 0.4)) + 0.5 * noise(uv * 1.6 - vec2(t * 0.5, 0.0));
  float y1 = uv.y + 0.22 * sin(uv.x * 1.4 + t * 1.6) + (bend - 0.75) * 0.45 - uv.x * 0.25;
  float streak = pow(0.5 + 0.5 * sin(y1 * 6.0 - t * 2.6), 30.0);
  float streak2 = pow(0.5 + 0.5 * sin(y1 * 10.5 + t * 1.8 + 2.0), 60.0);
  float sheen = pow(0.5 + 0.5 * sin(y1 * 3.0 - t * 1.3 + 1.1), 5.0);
  // The light lives up and to the right, away from the headline.
  float env = smoothstep(-0.8, 0.5, uv.x) * smoothstep(1.4, 0.1, length(uv - vec2(0.45, 0.1)));

  vec3 ink = vec3(0.039, 0.039, 0.043);
  vec3 bronze = vec3(0.40, 0.26, 0.11);
  vec3 gold = vec3(0.84, 0.70, 0.48);
  vec3 cream = vec3(1.0, 0.88, 0.66);

  vec3 col = ink;
  col += bronze * (0.2 + 0.8 * smoothstep(0.3, 0.85, f)) * (0.3 + 0.7 * env) * 0.42;
  col += gold * sheen * env * 0.28;
  col += cream * streak * env * 0.85;
  col += gold * streak2 * env * 0.5;

  // A key light leaning toward the pointer.
  vec2 lp = vec2(0.55, 0.3) + u_pointer * 0.18;
  col += gold * exp(-2.2 * length(uv - lp)) * 0.22;

  // Vignette, and grain so the gradients never band.
  col *= smoothstep(1.45, 0.15, length(uv * vec2(0.8, 1.0)));
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.02;
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
  return s;
}

export function HeroShader() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power", preserveDrawingBuffer: false });
    } catch { gl = null; }
    if (!gl) return; // the CSS gradient underneath stays

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uPointer = gl.getUniformLocation(prog, "u_pointer");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    // No GPU: a software rasteriser would spend the main thread on every frame. Paint once and stop.
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
    let raf = 0;
    let running = false;
    let onScreen = true;
    let lost = false;
    let elapsed = 60; // start mid-flow so the first frame already has light in it
    let last = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl!.viewport(0, 0, w, h);
    };

    const draw = () => {
      if (lost) return;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      gl!.uniform2f(uRes, canvas.width, canvas.height);
      gl!.uniform1f(uTime, elapsed);
      gl!.uniform2f(uPointer, pointer.x, pointer.y);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      if (!canvas.hasAttribute("data-ready")) canvas.setAttribute("data-ready", "");
    };

    const frame = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 32) return; // 30 frames a second is plenty for light this slow
      elapsed += Math.min(0.1, (now - last) / 1000);
      last = now;
      draw();
    };

    const sync = () => {
      const should = onScreen && !document.hidden && !reduce.matches && !lost && !software;
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); }
      if (!running) draw(); // one still frame (reduced motion, or on a resize while paused)
    };

    resize();
    draw();
    sync();

    const ro = new ResizeObserver(() => { resize(); if (!running) draw(); });
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => { onScreen = entries.at(-1)?.isIntersecting ?? onScreen; sync(); });
    io.observe(canvas);
    const onVis = () => sync();
    document.addEventListener("visibilitychange", onVis);
    reduce.addEventListener("change", onVis);
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    const onLost = (e: Event) => { e.preventDefault(); lost = true; running = false; cancelAnimationFrame(raf); canvas.removeAttribute("data-ready"); };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      reduce.removeEventListener("change", onVis);
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onLost);
    };
  }, []);

  return <canvas ref={ref} className="mkt-hero-canvas" aria-hidden="true" />;
}
