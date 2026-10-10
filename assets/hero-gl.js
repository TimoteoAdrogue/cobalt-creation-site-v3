/* Cobalt Création, V3 « Atelier » : the hero, rendered live (WebGL2).
   Cobalt leather lit per pixel at the screen's own resolution, the visitor's monogram pressed into it,
   a light that follows the pointer, and a camera that breathes at rest and tilts the hide back as you scroll.
   If WebGL2 is missing or motion is reduced, nothing here runs and the SVG monogram stays. */
(() => {
  "use strict";
  const root = document.documentElement;
  const hero = document.querySelector("[data-hero]");
  const wrap = document.querySelector("[data-hero-wrap]");
  const cv = document.querySelector(".hero__gl");
  const mono = document.querySelector("[data-mono]");
  if (!hero || !cv || !mono || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const gl = cv.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance" });
  if (!gl) return;
  root.classList.add("gl-on");

  const VS = `#version 300 es
  in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const FS = `#version 300 es
  precision highp float;
  uniform vec2 uRes; uniform float uDpr; uniform float uTime;
  uniform vec3 uLight;
  uniform sampler2D uHeight; uniform float uTile;
  uniform sampler2D uMask; uniform sampler2D uBlur; uniform sampler2D uLeaf;
  uniform vec4 uRect; uniform float uFinish; uniform float uPress; uniform float uSheen; uniform float uGhost;
  uniform float uTilt; uniform float uZoom; uniform vec2 uPan;
  out vec4 o;

  vec2 toPlane(vec2 pc) {
    float f = uRes.y / uDpr * 1.35;
    float ca = cos(uTilt), sa = sin(uTilt);
    vec3 d = vec3(pc, f);
    float den = max(pc.y * sa + f * ca, 1e-3);
    vec3 H = d * (f * ca / den);
    return vec2(H.x, H.y * ca - (H.z - f) * sa) / uZoom + uPan;
  }
  float hL(vec2 q) { return texture(uHeight, q / uTile).r; }
  float mA(sampler2D s, vec2 uv) { return (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? 0.0 : texture(s, uv).a; }

  void main() {
    vec2 pc = (gl_FragCoord.xy - uRes * 0.5) / uDpr; pc.y = -pc.y;
    vec2 q = toPlane(pc);
    // leather: per-pixel normal from the height map
    float e = 0.9;
    float hx = hL(q - vec2(e, 0.0)) - hL(q + vec2(e, 0.0));
    float hy = hL(q - vec2(0.0, e)) - hL(q + vec2(0.0, e));
    vec3 nL = normalize(vec3(hx * 2.6, hy * 2.6, 1.0));
    // monogram masks: sharp coverage and a soft one for the bevel
    vec2 muv = (q - uRect.xy) / uRect.zw + 0.5;
    float R = mA(uMask, muv);
    float B = mA(uBlur, muv);
    vec2 du = vec2(1.6 / uRect.z, 0.0), dv = vec2(0.0, 1.6 / uRect.w);
    float bx = mA(uBlur, muv - du) - mA(uBlur, muv + du);
    float by = mA(uBlur, muv - dv) - mA(uBlur, muv + dv);
    vec2 eu = vec2(1.2 / uRect.z, 0.0), ev = vec2(0.0, 1.2 / uRect.w);
    float rx = mA(uMask, muv - eu) - mA(uMask, muv + eu);       // crisp edge, from the sharp letter
    float ry = mA(uMask, muv - ev) - mA(uMask, muv + ev);
    vec3 nUp = normalize(vec3(bx * 9.0, by * 9.0, 1.0));     // raised letter
    vec3 nDn = normalize(vec3(-bx * 9.0, -by * 9.0, 1.0));   // pressed-in letter
    // light: a warm pool that follows the pointer (or wanders)
    vec3 L3 = vec3(uLight.xy - q, uLight.z);
    float dist = length(L3.xy);
    vec3 L = normalize(L3);
    vec3 V = normalize(vec3(0.0, -sin(uTilt) * 0.9, 1.0));
    float pool = 0.42 + 0.58 * exp(-dist * dist / (2.0 * 640.0 * 640.0));
    vec3 ink = vec3(0.008, 0.216, 0.31);
    float p = smoothstep(0.0, 1.0, uPress);
    vec3 n = nL;
    float k = R * p * uGhost;
    if (uFinish > 0.5 && uFinish < 1.5) n = nL;                                                                               // gravure: leather untouched outside the cut
    else if (uFinish > 1.5 && uFinish < 2.5) n = normalize(nL * vec3(0.7, 0.7, 1.0) + vec3(bx * 7.0 + rx * 1.6, by * 7.0 + ry * 1.6, 0.0) * p * uGhost);  // embossage
    else n = normalize(mix(nL, nDn * vec3(0.5, 0.5, 1.0), clamp(B * p, 0.0, 1.0)));                                           // foil, leaf: pressed in
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(n, normalize(L + V)), 0.0), 16.0);
    vec3 col = ink * (0.36 + 0.86 * diff) * pool + vec3(0.62, 0.74, 0.8) * spec * 0.07 * pool;
    // the impression: leather darkens where the press pushed it down
    vec2 sh = normalize(L3.xy + 1e-4) * 0.006;
    float shade = mA(uBlur, muv + sh * vec2(1.0, uRect.z / uRect.w));
    if (uFinish < 0.5 || uFinish > 2.5) col *= 1.0 - 0.38 * shade * (1.0 - R) * p * uGhost;
    if (uFinish > 0.5 && uFinish < 1.5) {   // gravure: a clean dark cut, finely hatched; its far wall catches the light
      float hatch = 0.8 + 0.2 * sin((q.x * 0.766 + q.y * 0.643) * 2.2);
      vec2 g = vec2(rx, ry);
      float rim = clamp(dot(g, normalize(L3.xy + 1e-4)), 0.0, 1.0) * 1.4;          // lit wall, opposite the light
      float wall = clamp(-dot(g, normalize(L3.xy + 1e-4)), 0.0, 1.0);             // shaded wall
      vec3 cut = vec3(0.004, 0.075, 0.11) * (0.75 + 0.35 * pool) * hatch;
      cut += vec3(0.62, 0.76, 0.84) * rim * 0.5 * pool;
      col = mix(col, cut, k);
      col *= 1.0 - 0.45 * wall * p * uGhost;
    }
    if (uFinish > 1.5 && uFinish < 2.5) {   // embossage: same hide, raised, a touch lighter
      col = mix(col, col * 1.18 + vec3(0.6, 0.75, 0.82) * spec * 0.08, k);
    }
    if (uFinish < 0.5) {                    // marquage à chaud: metallic gold foil
      vec3 nf = normalize(mix(nDn * vec3(0.35, 0.35, 1.0), vec3(0.0, 0.0, 1.0), 0.5));
      float fd = max(dot(nf, L), 0.0);
      float fs = pow(max(dot(nf, normalize(L + V)), 0.0), 70.0);
      float brush = 0.93 + 0.07 * sin(muv.x * 220.0 + muv.y * 30.0);
      vec3 gold = mix(vec3(0.50, 0.35, 0.18), vec3(0.88, 0.71, 0.46), 0.3 + 0.7 * fd) * brush;
      float band = exp(-pow((muv.x - uSheen) * 5.0 - (muv.y - 0.5) * 1.4, 2.0));
      vec3 foil = gold * (0.6 + 0.5 * pool) + vec3(0.98, 0.84, 0.58) * (fs * 0.55 + band * 0.24);
      foil = min(foil, vec3(0.98, 0.88, 0.68));
      col = mix(col, foil, k);
    }
    if (uFinish > 2.5) {                    // feuille d'or: crumpled leaf, torn edges
      float torn = R + (hL(q * 0.37) - 0.5) * 0.6 * (1.0 - abs(R * 2.0 - 1.0));
      float Rl = smoothstep(0.42, 0.58, torn) * p * uGhost;
      vec2 lq = q / 300.0;
      vec3 leaf = texture(uLeaf, lq).rgb;
      float lx = dot(texture(uLeaf, lq + vec2(0.002, 0.0)).rgb - texture(uLeaf, lq - vec2(0.002, 0.0)).rgb, vec3(0.33));
      float ly = dot(texture(uLeaf, lq + vec2(0.0, 0.002)).rgb - texture(uLeaf, lq - vec2(0.0, 0.002)).rgb, vec3(0.33));
      vec3 nl = normalize(vec3(-lx * 3.0, -ly * 3.0, 1.0));
      float ls = pow(max(dot(nl, normalize(L + V)), 0.0), 40.0);
      vec3 gl = leaf * (0.45 + 0.75 * max(dot(nl, L), 0.0)) * (0.6 + 0.5 * pool) + vec3(1.0, 0.94, 0.8) * ls * 0.9;
      col = mix(col, gl, Rl);
    }
    // vignette, slightly deeper at the far edge when tilted
    vec2 vv = pc / (uRes / uDpr * 0.5);
    col *= 1.0 - 0.5 * smoothstep(0.45, 1.35, length(vv * vec2(0.85, 1.0))) - 0.12 * smoothstep(0.0, 1.0, -vv.y) * sin(uTilt);
    o = vec4(col, 1.0);
  }`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) { console.warn("hero-gl:", err.message); root.classList.remove("gl-on"); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["uRes", "uDpr", "uTime", "uLight", "uHeight", "uTile", "uMask", "uBlur", "uLeaf", "uRect", "uFinish", "uPress", "uSheen", "uGhost", "uTilt", "uZoom", "uPan"].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  const tex = (unit, repeat) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    const w = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  };
  const upload = (unit, t, src) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D); };
  const tHeight = tex(0, true), tMask = tex(1, false), tBlur = tex(2, false), tLeaf = tex(3, true);
  gl.uniform1i(U.uHeight, 0); gl.uniform1i(U.uMask, 1); gl.uniform1i(U.uBlur, 2); gl.uniform1i(U.uLeaf, 3);
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const base = new URL("media/", document.currentScript ? document.currentScript.src : location.href).href;

  // ---- the monogram, drawn at high resolution into masks (same layout as the SVG) ----
  const maskC = document.createElement("canvas"), blurC = document.createElement("canvas"), smallC = document.createElement("canvas");
  let text = "CC", rect = { x: 0, y: 0, w: 1, h: 1 };
  const drawMask = () => {
    const r = mono.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    if (!r.width) return;
    // padded: the soft copy must fade to nothing well inside the texture, or its edge draws a line
    const PX = 1.3, PY = 1.9;
    rect = { x: r.left - hr.left + r.width / 2 - hr.width / 2, y: r.top - hr.top + r.height / 2 - hr.height / 2, w: r.width * PX, h: r.width * 420 / 1200 * PY };
    const W0 = Math.min(3200, Math.round(r.width * Math.min(devicePixelRatio || 1, 2) * 1.4)), H0 = Math.round(W0 * 420 / 1200), s = W0 / 1200;
    const W = Math.round(W0 * PX), H = Math.round(H0 * PY), ox = (W - W0) / 2, oy = (H - H0) / 2;
    maskC.width = W; maskC.height = H;
    const c = maskC.getContext("2d");
    c.clearRect(0, 0, W, H); c.fillStyle = "#fff"; c.textBaseline = "alphabetic";
    c.translate(ox, oy);
    const big = `500 ${330 * s}px "Bodoni Moda", Didot, serif`, dot = `500 ${112 * s}px "Bodoni Moda", Didot, serif`;
    const chars = [...text];
    c.font = big; const lw = chars.map((ch) => c.measureText(ch).width);
    c.font = dot; const dw = c.measureText("·").width;
    const total = lw.reduce((a, b) => a + b, 0) + (chars.length - 1) * (40 * s + dw);
    let x = W0 / 2 - total / 2;
    chars.forEach((ch, i) => {
      if (i) { x += 20 * s; c.font = dot; c.fillText("·", x, 320 * s - 92 * s); x += dw + 20 * s; }
      c.font = big; c.fillText(ch, x, 320 * s); x += lw[i];
    });
    // soft copy for the bevel: a true Gaussian where the canvas supports filters, else a two-stage resample
    blurC.width = W; blurC.height = H;
    const bc = blurC.getContext("2d"); bc.clearRect(0, 0, W, H);
    const radius = W0 / 150;
    if (typeof bc.filter === "string") { bc.filter = `blur(${radius.toFixed(1)}px)`; bc.drawImage(maskC, 0, 0); bc.filter = "none"; }
    if (typeof bc.filter !== "string" || !bc.getImageData(Math.round(W / 2), Math.round(H / 2), 1, 1).data[3] && text) {
      const mid = document.createElement("canvas");
      const mw = Math.round(W / 4), mh = Math.round(H / 4), sw = Math.round(W / 16), shh = Math.round(H / 16);
      mid.width = mw; mid.height = mh; smallC.width = sw; smallC.height = shh;
      const mc = mid.getContext("2d"), sc = smallC.getContext("2d");
      mc.imageSmoothingQuality = "high"; sc.imageSmoothingQuality = "high";
      mc.drawImage(maskC, 0, 0, mw, mh); sc.drawImage(mid, 0, 0, sw, shh);
      mc.clearRect(0, 0, mw, mh); mc.drawImage(smallC, 0, 0, mw, mh);
      bc.clearRect(0, 0, W, H); bc.imageSmoothingQuality = "high"; bc.drawImage(mid, 0, 0, W, H);
    }
    upload(1, tMask, maskC); upload(2, tBlur, blurC);
  };

  // ---- sizing ----
  let dpr = 1, cw = 0, ch = 0;
  const resize = () => {
    const r = hero.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    if (r.width * r.height * dpr * dpr > 5.2e6) dpr = Math.sqrt(5.2e6 / (r.width * r.height));
    cw = Math.round(r.width * dpr); ch = Math.round(r.height * dpr);
    cv.width = cw; cv.height = ch; gl.viewport(0, 0, cw, ch);
    drawMask();
  };

  // ---- state: pointer light, press, sheen, intro, scroll ----
  const FIN = { foil: 0, gravure: 1, emboss: 2, leaf: 3 };
  let px = 0, py = 0, tx = -260, ty = -160, lastMove = -1e9, press = 0, pressT = -1, sheen = 0.2, sweepT = -1, introT = -1, visible = true, raf = 0;
  const t0 = performance.now();
  const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
  const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const r = hero.getBoundingClientRect();
    tx = e.clientX - r.left - r.width / 2; ty = e.clientY - r.top - r.height / 2; lastMove = performance.now();
  }, { passive: true });
  mono.addEventListener("mono:text", (e) => { text = e.detail || "CC"; drawMask(); });
  mono.addEventListener("mono:stamp", () => { pressT = performance.now(); sweepT = pressT + 500; });

  const frame = (now) => {
    raf = 0;
    if (!visible) return;
    const t = (now - t0) / 1000;
    // scroll: the hide tilts back and the camera pulls away while the agency speaks
    let prog = 0;
    if (wrap) { const wr = wrap.getBoundingClientRect(); const run = wrap.offsetHeight - innerHeight; prog = run > 0 ? Math.min(Math.max(-wr.top / run, 0), 1) : 0; }
    const intro = introT < 0 ? 0 : ease((now - introT) / 2600);
    const sp = smooth(0.0, 0.42, prog);
    const tilt = (1 - intro) * 0.55 + sp * 0.92 + Math.sin(t * 0.32) * 0.025;
    const zoom = (0.82 + 0.18 * intro) * (1 - 0.22 * sp);
    const pan = [Math.sin(t * 0.21) * 14, Math.cos(t * 0.17) * 8 + sp * 40];
    // light: follows the pointer, or wanders slowly; grazes lower as the hide tilts
    if (now - lastMove > 3500) { tx = Math.cos(t * 0.42) * innerWidth * 0.34; ty = Math.sin(t * 0.29) * innerHeight * 0.26 - innerHeight * 0.05; }
    px += (tx - px) * 0.08; py += (ty - py) * 0.08;
    const lz = 560 - 300 * sp;
    // press and sheen
    if (pressT > 0) press = ease((now - pressT) / 900) * (1 + 0.06 * Math.sin(Math.min((now - pressT) / 900, 1) * Math.PI));
    if (sweepT > 0 && now > sweepT) { const k = (now - sweepT) / 1600; sheen = -0.3 + 1.6 * ease(k); if (k >= 1) sweepT = -1; }
    else if (sweepT < 0) sheen += ((px / (innerWidth || 1)) + 0.5 - sheen) * 0.05;
    gl.uniform2f(U.uRes, cw, ch); gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uTime, t);
    gl.uniform3f(U.uLight, px / zoom, py / zoom, lz); gl.uniform1f(U.uTile, 360);
    gl.uniform4f(U.uRect, rect.x, rect.y, rect.w, rect.h);
    gl.uniform1f(U.uFinish, FIN[mono.dataset.finish] ?? 0); gl.uniform1f(U.uPress, Math.min(press, 1.06));
    gl.uniform1f(U.uSheen, sheen); gl.uniform1f(U.uGhost, mono.classList.contains("is-ghost") ? 0.4 : 1);
    gl.uniform1f(U.uTilt, tilt); gl.uniform1f(U.uZoom, zoom); gl.uniform2f(U.uPan, pan[0], pan[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

  Promise.all([load(base + "leather-height.png"), load(base + "goldleaf.jpg"), document.fonts ? document.fonts.load('500 330px "Bodoni Moda"') : null])
    .then(([h, leaf]) => {
      upload(0, tHeight, h); upload(3, tLeaf, leaf);
      resize();
      addEventListener("resize", () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); }, { passive: true });
      if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(hero);
      introT = performance.now(); pressT = introT + 700; sweepT = pressT + 500;
      start();
      requestAnimationFrame(() => root.classList.add("gl-ready"));
    })
    .catch((err) => { console.warn("hero-gl:", err); root.classList.remove("gl-on"); });
  cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); root.classList.remove("gl-on", "gl-ready"); });
})();
