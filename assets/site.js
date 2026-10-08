/* Cobalt Création, V3 « Atelier ». No dependencies. */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const io = "IntersectionObserver" in window;

  /* ---------- top bar turns solid once the page moves ---------- */
  const tb = $("[data-topbar]");
  if (tb && io) {
    const s = document.createElement("div");
    s.setAttribute("aria-hidden", "true");
    s.style.cssText = "position:absolute;top:40px;left:0;width:1px;height:1px;pointer-events:none";
    document.body.prepend(s);
    new IntersectionObserver(([e]) => tb.classList.toggle("is-solid", !e.isIntersecting && e.boundingClientRect.top < 0)).observe(s);
  }

  /* ---------- overlay menu, born from the top ---------- */
  const mb = $(".tb__menu"), ov = $("[data-ov]");
  if (mb && ov) {
    const label = $("[data-menu-label]", mb);
    const set = (open) => {
      mb.setAttribute("aria-expanded", String(open));
      ov.classList.toggle("is-open", open);
      document.documentElement.style.overflow = open ? "hidden" : "";
      label.textContent = open ? "Fermer" : "Menu";
      tb.classList.toggle("is-open", open);
      if (open) setTimeout(() => $("a", ov)?.focus(), 80);
    };
    mb.addEventListener("click", () => set(mb.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ov.classList.contains("is-open")) { set(false); mb.focus(); } });
  }

  /* ---------- settle-in reveal ---------- */
  const settle = $$("[data-settle]");
  if (settle.length && io && !reduce) {
    const o = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting || e.boundingClientRect.top <= 0) { e.target.classList.add("is-in"); o.unobserve(e.target); }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    settle.forEach((el) => o.observe(el));
  } else settle.forEach((el) => el.classList.add("is-in"));

  /* ---------- the run: the leather turns out to be a piece; the camera pulls back onto the atelier table ---------- */
  const R = { p: 0 }; // progress through the run
  const run = $("[data-run]");
  // html.has-run is set in the head (motion allowed, overflow: clip supported), so the first paint is already the pinned layout
  if (run && document.documentElement.classList.contains("has-run")) {
    const hero = $("[data-hero]", run), piece = $("[data-piece]", run), inner = $("[data-piece-in]", run), shade = $("[data-shadow]", run);
    const svg = $("[data-stitch]", run), atlas = $("[data-atlas]", run), stage = $(".hero__stage", run), monoEl = $("[data-mono]", run);
    const tiles = $$(".atlas__t", run), fades = $$("[data-fade]", run);
    const sews = $$(".sew", svg), threads = $$(".stitch", svg), rim = $(".rim", svg);
    // grid offsets, clockwise from the top left, so the tab order walks round the piece
    const RING = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
    const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const f4 = (v) => v.toFixed(4);
    // s: the piece's final width over the screen's; aspect: its final height over the screen height at that scale;
    // fy: how far the monogram sits from the centre, so the trimmed piece is centred on it
    let s = 0.42, aspect = 1, fy = 0, D = 1, top0 = 0, ring = [], sewL = [], last = -1, raf = 0;
    const par = { x: 0, y: 0, tx: 0, ty: 0 }; // the table answers the hand once it is laid out

    const layout = () => {
      const W = piece.offsetWidth, H = piece.offsetHeight;
      const phone = W < 768;
      s = phone ? 0.6 : W < 1100 ? 0.48 : 0.42;
      const cw = W * s, ch = phone ? Math.min(cw * 1.28, H * 0.5) : H * s; // a 4:5 card on a phone, the screen's own shape elsewhere
      aspect = ch / (H * s);
      fy = stage.offsetTop + monoEl.offsetTop + monoEl.offsetHeight / 2 - H / 2;
      const g = phone ? 12 : 26, fit = phone ? 0.9 : 0.84, rh = Math.min(ch, cw / 1.42), cx = W / 2, cy = H / 2;
      ring = tiles.map((t, i) => {
        const [c, r] = RING[i % RING.length];
        const cellH = r === 0 ? ch : rh, x = cx + c * (cw + g), y = r === 0 ? cy : cy + r * (ch / 2 + g + rh / 2);
        const w = cw * fit, h = cellH * fit;
        Object.assign(t.style, { left: `${x - w / 2}px`, top: `${y - h / 2}px`, width: `${w}px`, height: `${h}px` });
        return { dx: x - cx, dy: y - cy, d: Math.abs(c) + Math.abs(r), i };
      });
      // the lowest row hangs below the pinned screen: keep it off the next section
      run.style.setProperty("--bleed", `${Math.max(0, Math.ceil(cy + ch / 2 + g + rh - hero.offsetHeight))}px`);
      hero.style.setProperty("--s", s);
      // the seam and the dyed edge, in the piece's own pixels around the trimmed shape (centred on the monogram),
      // so they shrink with it; the seam sits about 12 px in from the edge once the piece is laid down
      const hh = ch / s / 2, top = H / 2 + fy - hh, bot = H / 2 + fy + hh;
      const n = 12 / s, rad = 8 / s, x0 = n, y0 = top + n, x1 = W - n, y1 = bot - n, mx = W / 2;
      const X = (d) => (d > 0 ? x1 : x0), Xi = (d) => (d > 0 ? x1 - rad : x0 + rad);
      const side = (d) => `M${mx} ${y0}H${Xi(d)}Q${X(d)} ${y0} ${X(d)} ${y0 + rad}V${y1 - rad}Q${X(d)} ${y1} ${Xi(d)} ${y1}H${mx}`;
      const loop = `${side(1)}H${x0 + rad}Q${x0} ${y1} ${x0} ${y1 - rad}V${y0 + rad}Q${x0} ${y0} ${x0 + rad} ${y0}Z`;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      rim.setAttribute("d", `M0 ${top}H${W}V${bot}H0Z`);
      rim.setAttribute("stroke-width", (3.2 / s).toFixed(2));
      threads.forEach((t, k) => {
        t.setAttribute("d", loop);
        t.setAttribute("stroke-width", ((k ? 1.15 : 1.6) / s).toFixed(2));
        t.setAttribute("stroke-dasharray", `${(4.2 / s).toFixed(2)} ${(3.4 / s).toFixed(2)}`);
        if (!k) t.setAttribute("transform", `translate(0 ${(0.9 / s).toFixed(2)})`);
      });
      sewL = sews.map((m, k) => {
        m.setAttribute("d", side(k ? -1 : 1));
        m.setAttribute("stroke-width", (9 / s).toFixed(1));
        const L = m.getTotalLength();
        m.setAttribute("stroke-dasharray", `${L} ${L}`);
        return L;
      });
      D = Math.max(1, run.offsetHeight - hero.offsetHeight);
      top0 = run.getBoundingClientRect().top + scrollY;
      last = -1;
      update();
    };

    const update = () => {
      raf = 0;
      const p = clamp((scrollY - top0) / D);
      par.x += (par.tx - par.x) * 0.08; par.y += (par.ty - par.y) * 0.08;
      const moving = Math.abs(par.tx - par.x) + Math.abs(par.ty - par.y) > 0.05;
      if (p === last && !moving) return;
      last = p; R.p = p;
      const e = ease(seg(p, 0.02, 0.76)), c = ease(seg(p, 0.02, 0.48));
      const Z = Math.pow(1 / s, 1 - e); // the camera, from the leather filling the screen to the whole table, even in log-space
      const k = s * Z;                   // the leather's scale on screen
      const m = 1 + (aspect - 1) * c;    // how much of its height is kept: the piece is trimmed to its shape
      const frame = `translate3d(${(par.x * 0.4).toFixed(2)}px,${(par.y * 0.4).toFixed(2)}px,0) scale(${f4(k)},${f4(k * m)})`;
      piece.style.transform = frame; shade.style.transform = frame;
      inner.style.transform = `scale(1,${f4(1 / m)}) translate3d(0,${(-fy * c).toFixed(2)}px,0)`;
      shade.style.opacity = ease(seg(p, 0.04, 0.42)).toFixed(3);
      rim.style.opacity = seg(p, 0.36, 0.5).toFixed(3);
      const q = ease(seg(p, 0.36, 0.8));
      sews.forEach((el, i) => el.setAttribute("stroke-dashoffset", (sewL[i] * (1 - q)).toFixed(1)));
      const f = 1 - seg(p, 0, 0.09);
      fades.forEach((el) => {
        el.style.opacity = f.toFixed(3);
        el.style.transform = f < 1 ? `translate3d(0,${((1 - f) * 14).toFixed(1)}px,0)` : "";
        el.style.visibility = f === 0 ? "hidden" : "";
      });
      ring.forEach((r) => {
        const t = tiles[r.i], o = seg(e, 0.06 + r.d * 0.04 + r.i * 0.01, 0.26 + r.d * 0.04 + r.i * 0.01);
        const depth = 0.6 + r.d * 0.45;
        t.style.opacity = o.toFixed(3);
        t.style.visibility = o === 0 ? "hidden" : "visible";
        t.style.setProperty("--veil", (0.9 * (1 - seg(e, 0.3 + r.d * 0.05, 0.92))).toFixed(3));
        t.style.transform = `translate3d(${(r.dx * (Z - 1) + par.x * depth).toFixed(1)}px,${(r.dy * (Z - 1) + par.y * depth).toFixed(1)}px,0) scale(${f4(Z)})`;
      });
      atlas.style.setProperty("--lab", seg(p, 0.64, 0.84).toFixed(3));
      if (moving) raf = requestAnimationFrame(update);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener("scroll", kick, { passive: true });
    addEventListener("resize", layout, { passive: true });
    if (fine) hero.addEventListener("pointermove", (e) => {
      const w = seg(R.p, 0.6, 0.85);
      par.tx = (0.5 - e.clientX / innerWidth) * 18 * w;
      par.ty = (0.5 - e.clientY / innerHeight) * 12 * w;
      kick();
    }, { passive: true });
    hero.addEventListener("pointerleave", () => { par.tx = 0; par.ty = 0; kick(); });
    // a tile takes you to its technique
    tiles.forEach((t) => t.addEventListener("click", (e) => {
      const li = document.getElementById(t.hash.slice(1));
      if (!li) return;
      e.preventDefault();
      li.scrollIntoView({ behavior: "smooth", block: "center" });
      li.focus({ preventScroll: true });
    }));
    // the ring starts off screen: fetch it once the page is in, so no tile arrives empty
    addEventListener("load", () => tiles.forEach((t) => { const img = $("img", t); if (img) img.loading = "eager"; }), { once: true });
    layout();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(layout);
  }

  /* ---------- the live monogram ---------- */
  const mono = $("[data-mono]");
  if (mono) {
    const hero = $("[data-hero]");
    const host = $("[data-piece-in]") || hero; // the light lives in the leather, which may be scaled
    const input = $(".mono__input", mono);
    const layers = $$(".mono__l", mono);
    const light = $("[data-light]");
    const DEFAULT = "CC";
    const render = (txt) => {
      const html = [...txt].map((ch) => `<span class="ch">${ch}</span>`).join('<span class="sep">·</span>');
      layers.forEach((l) => { l.innerHTML = html; });
    };
    const stamp = () => {
      if (reduce) return;
      mono.classList.remove("is-stamp");
      void mono.offsetWidth;
      mono.classList.add("is-stamp");
    };
    const clean = (v) => v.normalize("NFC").replace(/[^\p{L}]/gu, "").toUpperCase().slice(0, 3);
    let last = DEFAULT;
    render(DEFAULT);
    mono.classList.remove("is-ghost");
    input.addEventListener("input", () => {
      const v = clean(input.value);
      if (input.value !== v) input.value = v;
      const show = v || DEFAULT;
      mono.classList.toggle("is-ghost", !v);
      if (show !== last) { render(show); last = show; stamp(); }
    });
    // the finish chosen here is outlined in the ring of techniques below
    const match = (f) => $$(".atlas__t").forEach((t) => t.classList.toggle("is-match", (t.dataset.match || "").split(" ").includes(f)));
    $$(".finish button").forEach((btn) => btn.addEventListener("click", () => {
      $$(".finish button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      mono.dataset.finish = btn.dataset.finish;
      match(btn.dataset.finish);
      stamp();
    }));
    match(mono.dataset.finish);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(stamp, 120));

    // light: follows a fine pointer, or sweeps slowly on its own; only while the hero is on screen
    if (!reduce && light) {
      let W = 0, H = 0, cx = 0, cy = 0;
      const scale = (r) => r.width / (host.offsetWidth || 1);
      const measure = () => {
        const r = host.getBoundingClientRect(), k = scale(r); W = host.offsetWidth; H = host.offsetHeight;
        const m = mono.getBoundingClientRect(); cx = (m.left - r.left + m.width / 2) / k; cy = (m.top - r.top + m.height / 2) / k;
      };
      measure();
      addEventListener("resize", measure, { passive: true });
      let tx = W * 0.3, ty = H * 0.28, x = tx, y = ty, raf = 0, visible = true, lastMove = -1e9, t0 = performance.now();
      let plx = 0, ply = 0, psh = 0;
      const frame = (now) => {
        raf = 0;
        if (!visible) return;
        if (R.p > 0.002 && now - lastMove > 600) { // scrolling: the light rakes across the gold as the piece is lifted
          const k = Math.min(1, R.p * 2.2);
          tx = W * (0.14 + 0.72 * k);
          ty = cy - H * (0.22 - 0.12 * k);
        } else if (now - lastMove > 3500) { // idle sweep, slow ellipse around the monogram
          const t = (now - t0) / 1000;
          tx = cx + Math.cos(t * 0.45) * W * 0.32;
          ty = cy + Math.sin(t * 0.31) * H * 0.26 - H * 0.06;
        }
        x += (tx - x) * 0.09; y += (ty - y) * 0.09;
        light.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        const dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / (W * 0.35));
        const lx = (dx / len) * k, ly = (dy / len) * k, sh = 18 + (x / (W || 1)) * 64;
        if (Math.abs(lx - plx) > 0.01 || Math.abs(ly - ply) > 0.01) { mono.style.setProperty("--lx", lx.toFixed(3)); mono.style.setProperty("--ly", ly.toFixed(3)); plx = lx; ply = ly; }
        if (Math.abs(sh - psh) > 0.4) { mono.style.setProperty("--sheen", sh.toFixed(1) + "%"); psh = sh; }
        raf = requestAnimationFrame(frame);
      };
      const start = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
      hero.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch") return;
        const r = host.getBoundingClientRect(), k = scale(r);
        tx = (e.clientX - r.left) / k; ty = (e.clientY - r.top) / k; lastMove = performance.now();
        start();
      }, { passive: true });
      if (io) new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { measure(); start(); } }, { threshold: 0.05 }).observe(hero);
      start();
    }
  }

  /* ---------- signature techniques: pinned image follows the text ---------- */
  const gestes = $$(".geste");
  if (gestes.length && io) {
    const figs = $$(".gestes__media figure");
    const on = (k) => {
      gestes.forEach((g) => g.classList.toggle("is-on", g.dataset.g === k));
      figs.forEach((f) => f.classList.toggle("is-on", f.dataset.g === k));
    };
    const o = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) on(e.target.dataset.g); }, { rootMargin: "-45% 0px -45% 0px" });
    gestes.forEach((g) => o.observe(g));
  }

  /* ---------- réalisations: filter folded into the heading ---------- */
  const grid = $("[data-reals]");
  if (grid) {
    const tabs = $$(".reals__tabs button");
    const more = $("[data-reals-link]"), moreLabel = $("[data-reals-label]");
    tabs.forEach((btn) => btn.addEventListener("click", () => {
      if (btn.getAttribute("aria-pressed") === "true") return;
      tabs.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      const f = btn.dataset.f;
      const swap = () => {
        $$(".rl", grid).forEach((fig) => { fig.hidden = fig.dataset.p !== f; });
        more.href = f + "/";
        moreLabel.textContent = btn.textContent;
        grid.classList.remove("is-out");
      };
      if (reduce) return swap();
      grid.classList.add("is-out");
      setTimeout(swap, 300);
    }));
  }

  /* ---------- book tilts toward the pointer ---------- */
  $$("[data-tilt]").forEach((el) => {
    if (reduce || !fine) return;
    const img = $("img", el);
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      img.style.setProperty("--ry", (px * 16 - 4).toFixed(2));
      img.style.setProperty("--rx", (-py * 10).toFixed(2));
    });
    el.addEventListener("pointerleave", () => { img.style.removeProperty("--ry"); img.style.removeProperty("--rx"); });
  });

  /* ---------- viewer ---------- */
  let avif = false;
  const probe = new Image();
  probe.onload = () => { avif = probe.width > 0; };
  probe.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAFwAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAH21kYXQSAAoFGAAGBCAyDBgACiiihAAAsBKamA==";

  const vw = $("[data-viewer]");
  const all = $$("[data-view]");
  if (vw && all.length && typeof vw.showModal === "function") {
    const hashes = document.body.classList.contains("p-rubric");
    const img = $(".vw__stage img", vw), src = $(".vw__stage source", vw);
    const count = $(".vw__count", vw), t = $(".vw__t", vw), s = $(".vw__s", vw), d = $(".vw__d", vw);
    let items = [], cur = 0, pushed = false, opener = null;
    const visible = () => all.filter((a) => !a.closest("[hidden]"));
    const data = (a) => JSON.parse(a.dataset.view);
    const preload = (k) => { const it = data(items[(k + items.length) % items.length]); const p = new Image(); p.src = avif ? it.avif : it.jpg; };
    const show = (k) => {
      cur = (k + items.length) % items.length;
      const it = data(items[cur]);
      img.classList.add("is-loading");
      src.srcset = it.avif; img.src = it.jpg; img.alt = it.alt;
      count.textContent = `${cur + 1} / ${items.length}`;
      t.textContent = it.t; s.textContent = it.s; d.textContent = it.d;
      t.hidden = !it.t; s.hidden = !it.s; d.hidden = !it.d;
      preload(cur + 1); preload(cur - 1);
      if (hashes) { const h = `#piece-${it.n}`; if (location.hash !== h) history.replaceState(history.state, "", h); }
    };
    img.addEventListener("load", () => img.classList.remove("is-loading"));
    const open = (a, fromHistory = false) => {
      items = visible();
      opener = a;
      if (!vw.open) {
        if (!fromHistory) { history.pushState({ vw: true }, "", hashes ? `#piece-${data(a).n}` : location.href); pushed = true; }
        vw.showModal();
        document.documentElement.style.overflow = "hidden";
      }
      show(items.indexOf(a));
      $(".vw__close", vw).focus();
    };
    const close = (viaHistory = false) => {
      if (!vw.open) return;
      vw.close();
      document.documentElement.style.overflow = "";
      if (!viaHistory && pushed) { pushed = false; history.back(); }
      else if (!viaHistory && hashes) history.replaceState(null, "", location.pathname + location.search);
      (items[cur] || opener)?.focus({ preventScroll: true });
    };
    all.forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); open(a); }));
    $(".vw__prev", vw).addEventListener("click", () => show(cur - 1));
    $(".vw__next", vw).addEventListener("click", () => show(cur + 1));
    $(".vw__close", vw).addEventListener("click", () => close());
    vw.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    vw.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1); }
    });
    addEventListener("popstate", () => {
      const m = hashes && location.hash.match(/^#piece-(\d+)$/);
      if (m) { const a = all.find((x) => data(x).n === +m[1]); if (a) { open(a, true); return; } }
      if (vw.open) { pushed = false; close(true); }
    });
    const stage = $(".vw__stage", vw);
    let sx = 0, sy = 0, sp = null;
    stage.addEventListener("pointerdown", (e) => { sp = e.pointerId; sx = e.clientX; sy = e.clientY; });
    stage.addEventListener("pointerup", (e) => {
      if (e.pointerId !== sp) return; sp = null;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
    });
    if (hashes) {
      const m = location.hash.match(/^#piece-(\d+)$/);
      if (m) { const a = all.find((x) => data(x).n === +m[1]); if (a) { history.replaceState(null, "", location.pathname + location.search); open(a); } }
    }
  }

  /* ---------- film cell: muted loop while on screen ---------- */
  $$("video[data-autoplay]").forEach((v) => {
    const fig = v.closest(".cs");
    const manual = () => {
      fig.classList.add("is-manual");
      $(".cs__play", fig)?.addEventListener("click", (e) => { e.currentTarget.remove(); fig.classList.remove("is-manual"); v.controls = true; v.play().catch(() => {}); }, { once: true });
    };
    if (reduce || !io) { manual(); return; }
    new IntersectionObserver(([e]) => { if (e.isIntersecting) { v.preload = "auto"; v.play().catch((err) => { if (err && err.name === "NotAllowedError") manual(); }); } else v.pause(); }, { threshold: 0.2 }).observe(v);
  });

  /* ---------- YouTube facade ---------- */
  $$("[data-film]").forEach((f) => {
    $("button", f).addEventListener("click", () => {
      const ifr = document.createElement("iframe");
      ifr.src = `https://www.youtube-nocookie.com/embed/${f.dataset.film}?autoplay=1&rel=0&modestbranding=1`;
      ifr.title = f.dataset.title;
      ifr.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      ifr.allowFullscreen = true;
      f.replaceChildren(ifr);
      ifr.focus();
    }, { once: true });
  });

  /* ---------- map facade ---------- */
  $$("[data-map]").forEach((m) => {
    $("[data-map-load]", m)?.addEventListener("click", () => {
      const ifr = document.createElement("iframe");
      ifr.src = m.dataset.map;
      ifr.title = "Plan d’accès : 35, Boulevard Berthier, 75017 Paris";
      ifr.loading = "lazy";
      ifr.referrerPolicy = "no-referrer-when-downgrade";
      m.replaceChildren(ifr);
    }, { once: true });
  });

  /* ---------- contact form ---------- */
  $$("form[data-mailto]").forEach((form) => {
    const f = { nom: $("#f-nom", form), prenom: $("#f-prenom", form), email: $("#f-email", form), message: $("#f-msg", form) };
    const err = (input, msg) => {
      const field = input.closest(".f3__field");
      field.classList.toggle("is-invalid", !!msg);
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      $(".f3__err", field).textContent = msg || "";
    };
    const check = () => {
      let ok = true;
      const em = f.email.value.trim();
      if (!em) { err(f.email, "Merci d’indiquer votre adresse email."); ok = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { err(f.email, "Cette adresse email ne semble pas complète."); ok = false; }
      else err(f.email, "");
      if (!f.message.value.trim()) { err(f.message, "Merci d’écrire votre message."); ok = false; } else err(f.message, "");
      return ok;
    };
    Object.values(f).forEach((x) => x.addEventListener("blur", () => { if (x.closest(".f3__field").classList.contains("is-invalid")) check(); }));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!check()) { $("[aria-invalid='true']", form)?.focus(); return; }
      const who = [f.prenom.value.trim(), f.nom.value.trim()].filter(Boolean).join(" ");
      const subject = "Demande de contact" + (who ? " - " + who : "");
      const body = `${f.message.value.trim()}\n\n${who}\n${f.email.value.trim()}`;
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const note = $(".f3__note", form);
      if (note) note.textContent = `Votre messagerie vient de s’ouvrir avec votre message. Si rien ne s’est passé, écrivez-nous directement à ${form.dataset.mailto}.`;
    });
  });
})();
