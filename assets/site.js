/* Cobalt Création, V3 « Atelier ».
   GSAP + ScrollTrigger (self-hosted) for the scroll story; plain DOM for the rest.
   Reduced motion or no GSAP: the hero is not pinned, the three sentences sit in the page, nothing moves on its own. */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const io = "IntersectionObserver" in window;
  const G = window.gsap && window.ScrollTrigger && !reduce ? window.gsap : null;
  const root = document.documentElement;
  if (G) G.registerPlugin(window.ScrollTrigger);
  else root.classList.add("no-gsap", "no-story");

  /* ---------- smooth scrolling (fine pointers only), on GSAP's clock so scrubbed scenes stay in step ---------- */
  let lenis = null;
  if (G && window.Lenis && fine) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    lenis.on("scroll", window.ScrollTrigger.update);
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  const hold = (on) => { if (lenis) on ? lenis.stop() : lenis.start(); };
  const safe = (w) => w.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const splitWords = (el) => {   // words stay readable by screen readers
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => `<span class="sw"><span class="sw__in" style="--w:${i}">${safe(w)}</span></span>`).join(" ");
  };

  /* ---------- split headings + the hero sentences ---------- */
  $$(".split").forEach(splitWords);
  $$(".band").forEach(splitWords);

  /* ---------- top bar ---------- */
  const tb = $("[data-topbar]");
  if (tb && io) {
    const s = document.createElement("div");
    s.setAttribute("aria-hidden", "true");
    s.style.cssText = "position:absolute;top:40px;left:0;width:1px;height:1px;pointer-events:none";
    document.body.prepend(s);
    new IntersectionObserver(([e]) => tb.classList.toggle("is-solid", !e.isIntersecting && e.boundingClientRect.top < 0)).observe(s);
  }
  // the bar steps aside while reading down and returns on the way up
  let refreshing = false;
  if (G) { window.ScrollTrigger.addEventListener("refreshInit", () => { refreshing = true; }); window.ScrollTrigger.addEventListener("refresh", () => { requestAnimationFrame(() => { refreshing = false; }); }); }
  if (tb && G) {
    window.ScrollTrigger.create({ start: 0, end: "max", onUpdate: (st) => {
      if (refreshing) return;
      tb.classList.toggle("is-hidden", st.direction === 1 && st.scroll() > innerHeight * 0.8 && !root.style.overflow && !tb.contains(document.activeElement));
    } });
    tb.addEventListener("focusin", () => tb.classList.remove("is-hidden"));
  }

  /* ---------- overlay menu ---------- */
  const mb = $(".tb__menu"), ov = $("[data-ov]");
  if (mb && ov) {
    const label = $("[data-menu-label]", mb);
    const set = (open) => {
      mb.setAttribute("aria-expanded", String(open));
      ov.classList.toggle("is-open", open);
      root.style.overflow = open ? "hidden" : "";
      hold(open);
      if (open) tb?.classList.remove("is-hidden");
      label.textContent = open ? "Fermer" : "Menu";
      if (open) setTimeout(() => $("a", ov)?.focus(), 80);
    };
    mb.addEventListener("click", () => set(mb.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ov.classList.contains("is-open")) { set(false); mb.focus(); } });
  }

  /* ---------- reveals: settle-in, split headings, crew, contact-sheet cells ---------- */
  $$("[data-crew] li, [data-crew] h3").forEach((el, i) => el.style.setProperty("--i", i % 14));
  const revealEls = $$("[data-settle], .split, [data-crew], .rl");
  if (io && !reduce) {
    const o = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting || e.boundingClientRect.top <= 0) { e.target.classList.add("is-in"); o.unobserve(e.target); }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    revealEls.forEach((el) => o.observe(el));
    // safety sweep: a fast scroll can jump over an element without the observer ever reporting it
    const sweep = setInterval(() => {
      const left = revealEls.filter((el) => !el.classList.contains("is-in"));
      if (!left.length) return clearInterval(sweep);
      left.forEach((el) => { if (!el.closest("[hidden]") && el.getBoundingClientRect().top < innerHeight) { el.classList.add("is-in"); o.unobserve(el); } });
    }, 500);
  } else revealEls.forEach((el) => el.classList.add("is-in"));

  const boardEl = $("[data-board]");
  if (boardEl) {
    if (io) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { boardEl.classList.add("is-near"); o.disconnect(); } }, { rootMargin: "150% 0px" }).observe(boardEl);
    else boardEl.classList.add("is-near");
  }

  /* ---------- the live monogram (vector SVG: sharp at any size) ---------- */
  const mono = $("[data-mono]");
  if (mono) {
    const hero = $("[data-hero]");
    const input = $(".mono__input", mono);
    const layers = $$(".mono__l", mono);
    const light = $("[data-light]");
    const foil = $("#g-foil"), leaf = $("#g-leaf");
    const NS = "http://www.w3.org/2000/svg";
    const DEFAULT = "CC";
    const render = (txt) => {
      mono.dispatchEvent(new CustomEvent("mono:text", { detail: txt }));
      layers.forEach((t) => {
        t.textContent = "";
        [...txt].forEach((ch, i) => {
          if (i) {
            const d = document.createElementNS(NS, "tspan");
            d.setAttribute("class", "sep"); d.setAttribute("dx", "20"); d.setAttribute("dy", "-92"); d.textContent = "·";
            t.appendChild(d);
          }
          const s = document.createElementNS(NS, "tspan");
          if (i) { s.setAttribute("dx", "20"); s.setAttribute("dy", "92"); }
          s.textContent = ch;
          t.appendChild(s);
        });
      });
    };
    let sheen = 34;
    const setSheen = (v) => {
      sheen = v;
      foil?.setAttribute("gradientTransform", `translate(${((v - 50) * 14).toFixed(1)} 0)`);
      leaf?.setAttribute("patternTransform", `translate(${((v - 50) * 3).toFixed(1)} 0)`);
    };
    let sweeping = false;
    const sweep = () => {
      if (reduce) return;
      sweeping = true;
      const t0 = performance.now(), d = 1600, from = 0, to = 100;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3);
        setSheen(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step); else sweeping = false;
      };
      setTimeout(() => requestAnimationFrame(step), 550);
    };
    const stamp = (soft = false) => {
      if (reduce) return;
      mono.dispatchEvent(new CustomEvent("mono:stamp", { detail: { soft } }));
      mono.classList.toggle("is-typing", soft);
      mono.classList.remove("is-stamp");
      void mono.getBoundingClientRect();
      mono.classList.add("is-stamp");
      sweep();
    };
    const clean = (v) => v.normalize("NFC").replace(/[^\p{L}]/gu, "").toUpperCase().slice(0, 3);
    const slots = $$("[data-slots] i");
    const fill = (n) => slots.forEach((s, i) => { s.classList.toggle("is-full", i < n); s.classList.toggle("is-next", i === Math.min(n, 2) && n < 3); });
    let last = DEFAULT;
    render(DEFAULT);
    fill(0);
    setSheen(34);
    input.addEventListener("input", () => {
      const v = clean(input.value);
      if (input.value !== v) input.value = v;
      const show = v || DEFAULT;
      fill(v.length);
      mono.classList.toggle("is-ghost", !v);
      if (show !== last) { render(show); last = show; stamp(true); }
    });
    $$(".finish button").forEach((btn) => btn.addEventListener("click", () => {
      $$(".finish button").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
      mono.dataset.finish = btn.dataset.finish;
      stamp();
    }));
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => stamp(), 120));

    // light follows a fine pointer, or sweeps slowly on its own, only while the hero is on screen
    if (!reduce && light) {
      let W = 0, H = 0, cx = 0, cy = 0;
      const measure = () => {
        const r = hero.getBoundingClientRect(); W = r.width; H = r.height;
        const m = mono.getBoundingClientRect(); cx = m.left - r.left + m.width / 2; cy = m.top - r.top + m.height / 2;
      };
      measure();
      addEventListener("resize", measure, { passive: true });
      let tx = W * 0.3, ty = H * 0.28, x = tx, y = ty, raf = 0, visible = true, lastMove = -1e9;
      const t0 = performance.now();
      let plx = 0, ply = 0;
      const frame = (now) => {
        raf = 0;
        if (!visible) return;
        if (now - lastMove > 3500) {
          const t = (now - t0) / 1000;
          tx = cx + Math.cos(t * 0.45) * W * 0.32;
          ty = cy + Math.sin(t * 0.31) * H * 0.26 - H * 0.06;
        }
        x += (tx - x) * 0.09; y += (ty - y) * 0.09;
        light.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        const dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / (W * 0.35));
        const lx = (dx / len) * k, ly = (dy / len) * k;
        if (Math.abs(lx - plx) > 0.01 || Math.abs(ly - ply) > 0.01) { mono.style.setProperty("--lx", lx.toFixed(3)); mono.style.setProperty("--ly", ly.toFixed(3)); plx = lx; ply = ly; }
        if (!sweeping) { const sh = 18 + (x / (W || 1)) * 64; if (Math.abs(sh - sheen) > 0.4) setSheen(sh); }
        raf = requestAnimationFrame(frame);
      };
      const start = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
      hero.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch") return;
        const r = hero.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top; lastMove = performance.now();
        start();
      }, { passive: true });
      if (io) new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { measure(); start(); } }, { threshold: 0.05 }).observe(hero);
      start();
    }
  }

  /* ---------- signature techniques: the image wipes in as the text arrives ---------- */
  const gestes = $$(".geste");
  const gx = $("[data-gx]");
  const countEl = $("[data-g-count]"), descEl = $("[data-g-desc]");
  let onGeste = () => {};
  if (gestes.length) {
    const figs = $$(".gestes__media figure");
    let cur = "0";
    onGeste = (k) => {
      if (k === cur) return;
      figs.forEach((f) => {
        f.classList.toggle("was-on", f.dataset.g === cur);
        f.classList.toggle("is-on", f.dataset.g === k);
      });
      gestes.forEach((g) => g.classList.toggle("is-on", g.dataset.g === k));
      if (countEl) countEl.textContent = String(+k + 1).padStart(2, "0");
      if (descEl) {
        const t = $(`.geste[data-g="${k}"] p`)?.textContent || "";
        descEl.classList.add("is-swap");
        clearTimeout(onGeste.t); onGeste.t = setTimeout(() => { descEl.textContent = t; descEl.classList.remove("is-swap"); }, 180);
      }
      cur = k;
    };
    if (io) {
      const o = new IntersectionObserver((es) => {
        if (gx?.classList.contains("is-pinned")) return;
        for (const e of es) if (e.isIntersecting) onGeste(e.target.dataset.g);
      }, { rootMargin: "-45% 0px -45% 0px" });
      gestes.forEach((g) => o.observe(g));
    }
  }

  /* ---------- réalisations: one run per rubric, filter in the heading ---------- */
  const grid = $("[data-reals]");
  if (grid) {
    const tabs = $$(".reals__tabs button");
    const more = $("[data-reals-link]"), moreLabel = $("[data-reals-label]");
    const imgsOf = (f) => $$(`.rl[data-p="${f}"] img`, grid);
    const warm = (f) => imgsOf(f).forEach((i) => { i.loading = "eager"; });   // on intent: hover or focus of a tab
    tabs.forEach((btn) => {
      btn.addEventListener("pointerenter", () => warm(btn.dataset.f), { passive: true });
      btn.addEventListener("focus", () => warm(btn.dataset.f));
      btn.addEventListener("click", async () => {
        if (btn.getAttribute("aria-pressed") === "true") return;
        tabs.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        const f = btn.dataset.f;
        warm(f);
        const ready = Promise.race([Promise.all(imgsOf(f).slice(0, 4).map((i) => i.decode().catch(() => {}))), new Promise((r) => setTimeout(r, 700))]);
        if (!reduce) { grid.classList.add("is-out"); await Promise.all([ready, new Promise((r) => setTimeout(r, 340))]); }
        $$(".rl", grid).forEach((fig) => { fig.hidden = fig.dataset.p !== f; fig.classList.remove("is-in"); });
        more.href = f + "/";
        moreLabel.textContent = btn.textContent;
        grid.classList.remove("is-out");
        requestAnimationFrame(() => $$(".rl:not([hidden])", grid).forEach((fig, k) => setTimeout(() => fig.classList.add("is-in"), 60 + k * 70)));
        window.ScrollTrigger?.refresh();
      });
    });
  }
  // the lamp: a warm light follows the pointer over each photograph
  if (fine && !reduce) document.addEventListener("pointermove", (e) => {
    const a = e.target.closest && e.target.closest(".rl > a");
    if (!a) return;
    const r = a.getBoundingClientRect();
    a.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
    a.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
  }, { passive: true });

  /* ---------- book: tilt toward the pointer ---------- */
  $$("[data-tilt]").forEach((el) => {
    if (reduce || !fine) return;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", (px * 14).toFixed(2));
      el.style.setProperty("--rx", (-py * 9).toFixed(2));
    });
    el.addEventListener("pointerleave", () => { el.style.removeProperty("--ry"); el.style.removeProperty("--rx"); });
  });

  /* ---------- scroll story (GSAP) ---------- */
  if (G) {
    const ST = window.ScrollTrigger;

    // hero pinned: the monogram withdraws, the agency speaks in three sentences (as in V1)
    const wrap = $("[data-hero-wrap]");
    if (wrap) {
      const tl = G.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: wrap, start: "top top", end: "bottom bottom", scrub: 0.8 } });
      const glOn = root.classList.contains("gl-on");   // the WebGL hero tilts the hide itself
      tl.to("[data-controls]", { opacity: 0, y: -30, duration: 0.1 }, 0.03)
        .to("[data-hero-foot]", { opacity: 0, y: 24, duration: 0.1 }, 0.03)
        .to("[data-veil]", { opacity: glOn ? 0.28 : 0.7, duration: 0.26 }, 0.06);   // the hide stays lit
      if (!glOn) tl.to("[data-mono]", { scale: 0.46, yPercent: -62, duration: 0.24, ease: "power2.inOut" }, 0.04);
      $$(".band").forEach((band, k) => {
        const words = $$(".sw__in", band);
        const at = 0.12 + k * 0.24;
        tl.set(band, { opacity: 1 }, at - 0.001)
          .fromTo(words, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.0045, duration: 0.08, ease: "power3.out" }, at)
          .to(words, { yPercent: -110, opacity: 0, stagger: 0.002, duration: 0.05, ease: "power2.in" }, at + 0.2)
          .set(band, { opacity: 0 }, at + 0.25);
      });
      // the hide's lower half dissolves into the page's ground, so nothing marks where the hero ends
      tl.fromTo(".hero", { "--fade": 0 }, { "--fade": 1, duration: 0.16 }, 0.82);
    }

    const mm = G.matchMedia();
    mm.add("(min-width: 901px)", () => {
      // signature techniques: the section holds still and becomes an index. Each technique opens its photograph
      // from the slit; at the end the photograph widens over the whole screen, and as the page moves on it dissolves
      // from the bottom up while the works are already rising underneath (the exit overlaps the next entrance).
      if (gx && gestes.length) {
        gx.classList.add("is-pinned");
        const N = gestes.length, per = 0.3, tail = 0.7, share = (N * per) / (N * per + tail);
        const media = $(".gestes__media", gx), body = $(".gestes__body", gx);
        const pinned = G.timeline({ scrollTrigger: { trigger: body, start: "top top", end: () => "+=" + innerHeight * (N * per + tail), pin: true, scrub: 0.5, invalidateOnRefresh: true,
          onUpdate: (st) => onGeste(String(Math.min(N - 1, Math.floor((st.progress / share) * N)))) } })
          .fromTo(media, { width: "62%" }, { width: "100%", ease: "power2.inOut", duration: 1 - share }, share)
          .fromTo(".gestes__listwrap", { "--lw": 1 }, { "--lw": 0, ease: "power1.in", duration: (1 - share) * 0.6 }, share)   // a variable, not an inline opacity left at 0
          .fromTo("[data-g-veil]", { opacity: 0 }, { opacity: 0.5, ease: "none", duration: 1 - share }, share);
        G.fromTo(body, { "--f": 1 }, { "--f": 0, ease: "none", scrollTrigger: { trigger: body, start: "top bottom", end: "top top", scrub: true } });
        G.fromTo(body, { "--roll": 0 }, { "--roll": 1, ease: "none", scrollTrigger: { trigger: body,
          start: () => pinned.scrollTrigger.end, end: () => pinned.scrollTrigger.end + innerHeight * 0.8, scrub: 0.5, invalidateOnRefresh: true } });
        return () => { gx.classList.remove("is-pinned"); onGeste("0"); };
      }
    });

    // the gold board: the light comes up on the leaf as it arrives (brightness, never a mix of gold and ink)
    const board = $("[data-board]");
    if (board) G.fromTo(board, { "--lit": 0.22 }, { "--lit": 1, ease: "power1.out", scrollTrigger: { trigger: board, start: "top 95%", end: "center 55%", scrub: true } });
    // logo wall: the marks come forward out of depth, scattered, and settle into the grid
    const wallItems = $$("[data-wall] li");
    const deep = innerWidth > 900;   // no z-depth on phones: it reads poorly at 390 px
    if (wallItems.length) G.fromTo(wallItems, { z: () => deep ? -400 - Math.random() * 1400 : 0, y: () => (Math.random() - 0.5) * (deep ? 120 : 60), opacity: 0 },
      { z: 0, y: 0, opacity: 1, ease: "power2.out", stagger: { amount: 0.5, from: "random" },
        scrollTrigger: { trigger: "[data-wall]", start: "top bottom", end: "center 58%", scrub: 0.8 } });

    // the book turns toward the reader while a gold light crosses its cover
    const book = $("[data-book3]");
    if (book) G.fromTo(book, { rotateY: -40, rotateX: 10, y: 80 }, { rotateY: -8, rotateX: 0, y: -30, ease: "none",
      scrollTrigger: { trigger: "[data-book3-sec]", start: "top bottom", end: "bottom top", scrub: true } });
    const sheen = $("[data-sheen]");
    if (sheen) G.fromTo(sheen, { backgroundPosition: "100% 0%" }, { backgroundPosition: "0% 0%", ease: "none",
      scrollTrigger: { trigger: "[data-book3-sec]", start: "top 75%", end: "bottom 25%", scrub: true } });

    // rubric intro: a gold light passes through the first paragraph
    $$("[data-lightp]").forEach((pEl) => {
      pEl.classList.add("is-lightable");
      G.fromTo(pEl, { backgroundPosition: "100% 0%" }, { backgroundPosition: "0% 0%", ease: "none",
        scrollTrigger: { trigger: pEl, start: "top 88%", end: "bottom 42%", scrub: true } });
    });

    // next rubric: the next page's opening frame, opening from an 18 % band as the panel rises (title set from the first pixel)
    const nx = $("[data-nx]");
    if (nx) {
      const media = $("[data-nx-media]", nx), img = $("img", media);
      G.timeline({ scrollTrigger: { trigger: nx, start: "top 96%", end: "top top", scrub: 0.6 } })
        .fromTo(media, { clipPath: "inset(18% 0% 18% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "power2.inOut", duration: 1 }, 0)
        .fromTo(img, { scale: 1.06 }, { scale: 1, ease: "none", duration: 1 }, 0)
        .fromTo($(".next3__t", nx), { y: 40 }, { y: 0, ease: "power2.out", duration: 0.7 }, 0.2);
    }
    // the end panel's call to contact rises with the scroll, like any chapter (no lift-off: no edge crosses its type)
    const endIn = $("[data-end-in]");
    if (endIn) G.fromTo(endIn, { y: 70, opacity: 0.4 }, { y: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: "[data-end]", start: "top bottom", end: "top 35%", scrub: true } });

    // rubric opening image: settles in, then drifts as the page moves on
    const rh = $("[data-rh]");
    if (rh) {
      const img = $("img", rh);
      if (!root.classList.contains("pt-nx")) G.fromTo(img, { scale: 1.06 }, { scale: 1, duration: 2.2, ease: "power3.out", delay: root.classList.contains("pt-in") ? 0.5 : 0 });
      G.to(img, { yPercent: 12, ease: "none", scrollTrigger: { trigger: rh, start: "top top", end: "bottom top", scrub: true } });
      G.to($(".rh__title", rh), { yPercent: -40, opacity: 0.2, ease: "none", scrollTrigger: { trigger: rh, start: "top top", end: "bottom top", scrub: true } });
    }

    // scenes: main's ground flows from ink to deep ink as the sections take over (they have no ground of their own,
    // so no edge ever shows), each section rises in a little behind the scroll and recedes as the next one arrives,
    // and the ground deepens to the end panel's colour before the page lifts off it
    const mainEl = $("main");
    if (mainEl) {
      const RGB = { ground: [2, 55, 79], deep: [1, 38, 56], deeper: [1, 28, 42] };
      const scenes = $$("main > section").map((el) => ({ el, tone: el.classList.contains("sec--deep") ? RGB.deep : RGB.ground, moves: el.classList.contains("sec") }));
      const hasEnd = !!$("[data-end]");
      const mix = (a, b, k) => a.map((v, j) => v + (b[j] - v) * k);
      const clamp = (v) => Math.min(1, Math.max(0, v));
      let geo = [], mainEnd = 0, col = "";
      // positions are measured with the scene transforms removed, after ScrollTrigger has placed its pins
      ST.addEventListener("refreshInit", () => scenes.forEach((s) => { s.el.style.transform = s.el.style.opacity = ""; s.t = s.o = ""; }));
      const measure = () => {
        const y = scrollY;
        geo = scenes.map((s) => { const r = s.el.getBoundingClientRect(); return [r.top + y, r.bottom + y]; });
        mainEnd = mainEl.getBoundingClientRect().bottom + y;
      };
      const paint = () => {
        const vh = innerHeight, y = scrollY;
        let c = scenes[0]?.tone || RGB.ground;
        scenes.forEach((s, i) => {
          const top = geo[i][0] - y, bottom = geo[i][1] - y;
          if (i) c = mix(c, s.tone, clamp((vh * 0.85 - top) / (vh * 0.55)));
          if (!s.moves || s.el.classList.contains("is-pinned")) return;   // a pinned section must keep no transform
          const under = scenes[i - 1]?.el.classList.contains("is-pinned");  // it rises under the pinned exit: no lag
          const enter = under ? 1 : clamp((vh - top) / (vh * 0.7)), leave = clamp((vh * 0.55 - bottom) / (vh * 0.55));
          const t = `translate3d(0,${((1 - enter - leave) * vh * 0.09).toFixed(1)}px,0)`, o = (1 - leave * 0.7).toFixed(3);
          if (s.t !== t) { s.el.style.transform = s.t = t; }
          if (s.o !== o) { s.el.style.opacity = s.o = o; }
        });
        if (hasEnd) c = mix(c, RGB.deeper, clamp((vh * 1.5 - (mainEnd - y)) / (vh * 0.5)));
        const css = `rgb(${c.map(Math.round).join(",")})`;
        if (css !== col) { mainEl.style.backgroundColor = col = css; mainEl.style.setProperty("--g", css); }
      };
      ST.addEventListener("refresh", () => { measure(); paint(); });
      addEventListener("scroll", paint, { passive: true });
      measure(); paint();
    }

    addEventListener("load", () => ST.refresh());
    document.fonts?.ready.then(() => ST.refresh());
  }

  /* ---------- page transition: a gold cut runs across and the page closes onto it; the next page opens (CSS) ---------- */
  if (!reduce) {
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !url.protocol.startsWith("http")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;   // same page: anchors, works
      e.preventDefault();
      if (a.hasAttribute("data-next")) {   // the panel is the next page's first frame: bring it whole, then hand over
        try { sessionStorage.setItem("cc-pt", "nx"); } catch (err) {}
        const off = Math.abs(a.getBoundingClientRect().top);
        if (off > 2) lenis ? lenis.scrollTo(a, { duration: 0.6 }) : a.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => { location.href = url.href; }, off > 2 ? 640 : 60);
        return;
      }
      try { sessionStorage.setItem("cc-pt", "1"); } catch (err) {}
      const pt = document.createElement("div");
      pt.className = "pt"; pt.setAttribute("aria-hidden", "true");
      pt.innerHTML = '<i class="pt__lid"></i><i class="pt__cut"></i>';
      document.body.appendChild(pt);
      setTimeout(() => { location.href = url.href; }, 640);
    });
    // back/forward restores the page from memory with the page still closed
    addEventListener("pageshow", (e) => { if (e.persisted) $$(".pt").forEach((x) => x.remove()); });
  }

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
        root.style.overflow = "hidden";
        hold(true);
      }
      show(items.indexOf(a));
      $(".vw__close", vw).focus();
    };
    const close = (viaHistory = false) => {
      if (!vw.open) return;
      vw.close();
      root.style.overflow = "";
      hold(false);
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
