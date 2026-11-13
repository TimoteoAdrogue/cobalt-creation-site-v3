/* Cobalt Création, V3 « Atelier ».
   GSAP + ScrollTrigger (self-hosted) for the hero's story and the techniques' pin; one scroll loop for the rest.
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
  // the bar steps aside while reading down and returns on the way up
  let refreshing = false;
  if (G) { window.ScrollTrigger.addEventListener("refreshInit", () => { refreshing = true; }); window.ScrollTrigger.addEventListener("refresh", () => { requestAnimationFrame(() => { refreshing = false; }); }); }
  if (tb && G) {
    window.ScrollTrigger.create({ start: 0, end: "max", onUpdate: (st) => {
      if (refreshing) return;
      tb.classList.toggle("is-hidden", !!window.__tqOn || (st.direction === 1 && st.scroll() > innerHeight * 0.8 && !root.style.overflow && !tb.contains(document.activeElement)));
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
      if (open) tb?.classList.remove("is-hidden", "tb--ink-l", "tb--ink-r");
      label.textContent = open ? "Fermer" : "Menu";
      if (open) setTimeout(() => $("a", ov)?.focus(), 80);
    };
    mb.addEventListener("click", () => set(mb.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ov.classList.contains("is-open")) { set(false); mb.focus(); } });
  }

  /* ---------- reveals: settle-in, split headings, crew, contact-sheet cells ---------- */
  $$("[data-crew] li, [data-crew] h3").forEach((el, i) => el.style.setProperty("--i", i % 14));
  const revealEls = $$("[data-settle], .split, [data-crew]");
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
    // after a page transition the stamp waits for the lid to open, so it is seen
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

  /* ---------- réalisations: one run per rubric, filter in the heading ---------- */
  const grid = $("[data-reals]");
  if (grid) {
    const tabs = $$(".reals__tabs button");
    const more = $("[data-reals-link]"), moreLabel = $("[data-reals-label]");
    const imgsOf = (f) => $$(`.sp[data-p="${f}"] img`, grid);
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
        $$(".sp", grid).forEach((row) => { row.hidden = row.dataset.p !== f; });
        more.href = f + "/";
        moreLabel.textContent = btn.textContent;
        grid.classList.remove("is-out");
        window.ScrollTrigger?.refresh();
      });
    });
  }
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

    // rubric intro: a gold light passes through the first paragraph
    $$("[data-lightp]").forEach((pEl) => {
      pEl.classList.add("is-lightable");
      G.fromTo(pEl, { backgroundPosition: "100% 0%" }, { backgroundPosition: "0% 0%", ease: "none",
        scrollTrigger: { trigger: pEl, start: "top 88%", end: "bottom 42%", scrub: true } });
    });

    // the end panel's call to contact rises with the scroll, like any chapter (no lift-off: no edge crosses its type)
    const endIn = $("[data-end-in]");
    if (endIn) G.fromTo(endIn, { y: 70, opacity: 0.4 }, { y: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: "[data-end]", start: "top bottom", end: "top 35%", scrub: true } });

    // the ground deepens from ink to the end panel's colour before the footer, so no edge shows there
    const mainEl = $("main"), endEl = $("[data-end]");
    if (mainEl && endEl) {
      const A = [2, 55, 79], B = [1, 28, 42];
      let col = "";
      const paint = () => {
        const k = Math.min(1, Math.max(0, (innerHeight * 1.5 - endEl.getBoundingClientRect().top) / (innerHeight * 0.5)));
        const css = `rgb(${A.map((v, j) => Math.round(v + (B[j] - v) * k)).join(",")})`;
        if (css !== col) mainEl.style.backgroundColor = col = css;
      };
      addEventListener("scroll", paint, { passive: true });
      ST.addEventListener("refresh", paint);
      paint();
    }

    addEventListener("load", () => ST.refresh());
    document.fonts?.ready.then(() => ST.refresh());
  }

  /* ---------- page transition: cross-document view transitions (CSS); the next-rubric panel's photograph becomes the
     next page's opening. Any other link leaves the opening unnamed, so nothing flies in from off screen. ---------- */
  let viaNext = false;
  document.addEventListener("click", (e) => { viaNext = !!(e.target.closest && e.target.closest("[data-next]")); }, true);
  addEventListener("pageswap", (e) => {
    if (!e.viewTransition) return;
    const own = $(".rh__ph"), nxt = $("[data-next] .next3__media");
    if (own) own.style.viewTransitionName = "none";
    if (nxt && viaNext) nxt.style.viewTransitionName = "rh";
  });
  addEventListener("pageshow", () => { const own = $(".rh__ph"), nxt = $("[data-next] .next3__media"); if (own) own.style.viewTransitionName = ""; if (nxt) nxt.style.viewTransitionName = ""; });

  /* ---------- viewer: the picture opens from its tile, slides in the direction asked, follows the finger ---------- */
  let avif = false;
  const probe = new Image();
  probe.onload = () => { avif = probe.width > 0; };
  probe.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAFwAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAH21kYXQSAAoFGAAGBCAyDBgACiiihAAAsBKamA==";

  const vw = $("[data-viewer]");
  const all = $$("[data-view]");
  if (vw && all.length && typeof vw.showModal === "function") {
    const hashes = document.body.classList.contains("p-rubric");
    const stage = $(".vw__stage", vw), meta = $(".vw__meta", vw);
    const img = $(".vw__stage img", vw), src = $(".vw__stage source", vw);
    const count = $(".vw__count", vw), t = $(".vw__t", vw), s = $(".vw__s", vw), d = $(".vw__d", vw);
    const EASE = "cubic-bezier(.2, .75, .25, 1)";
    const anim = (el, kf, ms, delay = 0) => (reduce || !el.animate ? null : el.animate(kf, { duration: ms, delay, easing: EASE, fill: "backwards" }));
    let items = [], cur = 0, pushed = false, opener = null, busy = 0;
    const visible = () => all.filter((a) => !a.closest("[hidden]"));
    const data = (a) => JSON.parse(a.dataset.view);
    const fileOf = (it) => (avif ? it.avif : it.jpg);
    const preload = (k) => { const it = data(items[(k + items.length) % items.length]); const p = new Image(); p.src = fileOf(it); };
    // the picture shown first: the tile's own file if it is there, else the large one, always decoded before it shows
    const firstOf = (k) => { const ti = $("img", items[k]); return ti && ti.complete && ti.naturalWidth ? ti.currentSrc : fileOf(data(items[k])); };
    const decoded = (url) => { const L = new Image(); L.src = url; return Promise.race([(L.decode ? L.decode() : Promise.resolve()).catch(() => {}), new Promise((r) => setTimeout(r, 900))]); };
    let want = "";
    const fill = (k) => {
      const it = data(items[k]);
      const large = fileOf(it);
      want = large;
      src.srcset = ""; img.src = firstOf(k); img.alt = it.alt;
      decoded(large).then(() => { if (want === large) { src.srcset = it.avif; img.src = it.jpg; } });
      count.textContent = `${k + 1} / ${items.length}`;
      t.textContent = it.t; s.textContent = it.s; d.textContent = it.d;
      t.hidden = !it.t; s.hidden = !it.s; d.hidden = !it.d;
      preload(k + 1); preload(k - 1);
      if (hashes) { const h = `#piece-${it.n}`; if (location.hash !== h) history.replaceState(history.state, "", h); }
    };
    const show = async (k, dir = 0) => {
      const n = (k + items.length) % items.length;
      if (!dir) { cur = n; fill(n); return; }
      const job = ++busy;
      await decoded(firstOf(n));
      if (job !== busy || !vw.open) return;
      // the outgoing picture leaves toward the side it was pushed, the incoming one arrives from the other
      if (!reduce) {
        const r = img.getBoundingClientRect(), sr = stage.getBoundingClientRect();
        const ghost = img.cloneNode();
        ghost.className = "vw__ghost";
        ghost.style.cssText = `left:${r.left - sr.left}px;top:${r.top - sr.top}px;width:${r.width}px;height:${r.height}px;transform:${img.style.transform || "none"}`;
        stage.appendChild(ghost);
        const a = ghost.animate([{ transform: ghost.style.transform, opacity: 1 }, { transform: `translateX(${-dir * 8}%)`, opacity: 0 }], { duration: 420, easing: EASE, fill: "forwards" });
        a.onfinish = () => ghost.remove();
      }
      img.style.transform = "";
      cur = n; fill(n);
      anim(img, [{ transform: `translateX(${dir * 8}%)`, opacity: 0 }, { transform: "none", opacity: 1 }], 420, 60);
      anim(meta, [{ opacity: 0 }, { opacity: 1 }], 360, 120);
    };
    const open = (a, fromHistory = false) => {
      items = visible();
      opener = a;
      const first = !vw.open;
      if (first) {
        if (!fromHistory) { history.pushState({ vw: true }, "", hashes ? `#piece-${data(a).n}` : location.href); pushed = true; }
        vw.showModal();
        root.style.overflow = "hidden";
        hold(true);
      }
      cur = items.indexOf(a);
      fill(cur);
      $(".vw__close", vw).focus({ preventScroll: true });
      if (!first || reduce) return;
      // open from the tile: the picture travels from the tile's place and size to the stage (the tile is hidden meanwhile)
      const from = a.getBoundingClientRect();
      const tileImg = $("img", a);
      if (tileImg) tileImg.style.visibility = "hidden";
      anim(vw, [{ backgroundColor: "rgba(234, 231, 220, 0)" }, { backgroundColor: "rgb(234, 231, 220)" }], 320);
      anim(meta, [{ opacity: 0 }, { opacity: 1 }], 380, 260);
      requestAnimationFrame(() => {
        const to = img.getBoundingClientRect();
        if (to.width && from.width) anim(img, [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})` }, { transform: "none" }], 560);
        setTimeout(() => { if (tileImg) tileImg.style.visibility = ""; }, 600);
      });
    };
    const close = (viaHistory = false) => {
      if (!vw.open) return;
      const done = () => {
        vw.close();
        root.style.overflow = "";
        hold(false);
        (items[cur] || opener)?.focus({ preventScroll: true });
      };
      const a = anim(vw, [{ opacity: 1 }, { opacity: 0 }], 220);
      if (a) { a.effect.updateTiming({ fill: "forwards" }); a.onfinish = () => { done(); a.cancel(); }; } else done();
      if (!viaHistory && pushed) { pushed = false; history.back(); }
      else if (!viaHistory && hashes) history.replaceState(null, "", location.pathname + location.search);
    };
    all.forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); open(a); }));
    $(".vw__prev", vw).addEventListener("click", () => show(cur - 1, -1));
    $(".vw__next", vw).addEventListener("click", () => show(cur + 1, 1));
    $(".vw__close", vw).addEventListener("click", () => close());
    vw.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    vw.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1, 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1, -1); }
    });
    addEventListener("popstate", () => {
      const m = hashes && location.hash.match(/^#piece-(\d+)$/);
      if (m) { const a = all.find((x) => data(x).n === +m[1]); if (a) { open(a, true); return; } }
      if (vw.open) { pushed = false; close(true); }
    });
    // the picture follows the finger, then goes on or springs back
    let sx = 0, sy = 0, sp = null, dx = 0;
    stage.addEventListener("pointerdown", (e) => { sp = e.pointerId; sx = e.clientX; sy = e.clientY; dx = 0; });
    stage.addEventListener("pointermove", (e) => {
      if (e.pointerId !== sp || reduce) return;
      dx = e.clientX - sx;
      if (Math.abs(dx) > Math.abs(e.clientY - sy)) img.style.transform = `translateX(${dx}px)`;
    });
    const release = (e) => {
      if (e.pointerId !== sp) return; sp = null;
      const ddx = e.clientX - sx, ddy = e.clientY - sy;
      if (Math.abs(ddx) > 50 && Math.abs(ddx) > Math.abs(ddy)) show(cur + (ddx < 0 ? 1 : -1), ddx < 0 ? 1 : -1);
      else if (img.style.transform) { anim(img, [{ transform: img.style.transform }, { transform: "none" }], 320); img.style.transform = ""; }
    };
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);
    if (hashes) {
      const m = location.hash.match(/^#piece-(\d+)$/);
      if (m) { const a = all.find((x) => data(x).n === +m[1]); if (a) { history.replaceState(null, "", location.pathname + location.search); open(a); } }
    }
  }

  /* ---------- film cell: muted loop while on screen ---------- */
  $$("video[data-autoplay]").forEach((v) => {
    const fig = v.closest("figure");
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
  /* ======================= round 2 =======================
     One rule for everything below: what the scroll drives is computed from the scroll position only (no CSS
     transition, no class toggle, no timer), so the same offset gives the same frame both ways and a fast scroll only
     plays the same frames faster. */
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const sm = (t) => t * t * (3 - 2 * t);                      // smoothstep: the one curve of the system

  /* ---------- readiness: fetched by distance, decoded before they can be seen ----------
     A section (never the image: an image inside a clipped frame does not intersect) within 1.5 screens turns its
     images eager and decodes them. Nothing that can come on screen is display:none, so nothing waits for layout. */
  const warm = (el) => {
    for (const img of el.querySelectorAll("img")) {
      if (img.closest("[hidden]")) continue;                     // other rubrics: warmed on tab intent
      if (img.loading === "lazy") img.loading = "eager";
      if (!img.dataset.ready && img.decode) img.decode().then(() => { img.dataset.ready = "1"; }, () => {});
    }
    el.querySelectorAll("[data-board]").forEach((b) => b.classList.add("is-near"));   // the 56 marks, as masks
  };
  const warmEls = $$("[data-warm]");
  if (io) {
    const wo = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { warm(e.target); wo.unobserve(e.target); } }), { rootMargin: "150% 0px 150% 0px" });
    const startWarm = () => warmEls.forEach((el) => wo.observe(el));
    // after the page's own first files: the first scene is right under the hero and is warmed on load
    if (document.readyState === "complete") startWarm(); else addEventListener("load", startWarm, { once: true });
  } else warmEls.forEach(warm);
  // the tabs: decode a rubric's spreads on hover/focus, before the click shows them
  $$(".reals__tabs button").forEach((b) => {
    const w = () => $$(`.sp[data-p="${b.dataset.f}"]`).forEach((row) => { const h = row.hidden; row.hidden = false; warm(row); row.hidden = h; });
    b.addEventListener("pointerenter", w, { passive: true }); b.addEventListener("focus", w);
  });

  /* ---------- hand-off out of the hero: the hallmark dissolves in place with the hide's top ---------- */
  const heroWrap = $("[data-hero-wrap]");
  if (G && heroWrap) G.fromTo(".hero", { "--top": 0 }, { "--top": 1, ease: "none", scrollTrigger: { trigger: heroWrap, start: "bottom 132%", end: "bottom 100%", scrub: true } });

  /* ---------- techniques: plates slide over each other on the right, the index lights on the left ---------- */
  const tq = $("[data-tq]");
  const stage = tq && $("[data-tq-stage]", tq);
  const items = tq ? $$(".tq__item", tq) : [];
  const N = items.length;
  const HEAD = 0.35, SEG = 0.42, LAST = 0.25, TAIL = 1.0;        // in screens: heading, each technique, last hold, bridge
  const TOTAL = HEAD + (N - 1) * SEG + LAST + TAIL;
  if (G && stage && N) {
    const ST = window.ScrollTrigger;
    const head = $("[data-tq-head]", tq);
    const figs = items.map((li) => $(".tq__f", li)), imgs = figs.map((f) => $("img", f));
    const names = items.map((li) => $(".tq__n", li)), descs = items.map((li) => $(".tq__d", li));
    const more = $(".tq__more", tq);
    const last = new Map();
    const put = (el, prop, v) => { const k = last.get(el) || {}; if (k[prop] !== v) { k[prop] = v; last.set(el, k); prop.startsWith("--") ? el.style.setProperty(prop, v) : (el.style[prop] = v); } };
    let fh = innerHeight, tqPin = null;
    const render = (prog) => {
      const s = prog * TOTAL;
      const h = sm(clamp01(s / HEAD));
      const s2 = Math.max(0, s - HEAD), k = Math.floor(s2 / SEG), u = s2 / SEG - k;
      const P = Math.min(N - 1, k + sm(clamp01((u - 0.45) / 0.55)));     // holds 45 % of each step, then moves
      const ho = sm(clamp01(2 * h)), li = sm(clamp01(2 * h - 1));     // the heading leaves, then the index arrives
      put(head, "--o", (1 - ho).toFixed(3));                              // a variable, not an inline opacity left at 0
      put(head, "transform", `translate3d(0,${(-90 * ho).toFixed(1)}px,0)`);
      put(stage, "--h", li.toFixed(3));
      for (let i = 0; i < N; i++) {
        const y = clamp01(i - P);                                          // 1 = waiting below, 0 = in place
        put(figs[i], "transform", `translate3d(0,${(y * 100).toFixed(3)}%,0)`);
        const v = clamp01((P - i + 1) / 2);                                // 0 entering, .5 settled, 1 covered
        put(imgs[i], "transform", `translate3d(0,${((0.5 - v) * 0.1 * fh).toFixed(1)}px,0)`);
        put(names[i], "--l", Math.max(0, 1 - Math.abs(P - i)).toFixed(3));
        const o = Math.max(0, 1 - 2 * Math.abs(i - P));
        put(descs[i], "--o", (o * li).toFixed(3));
        put(descs[i], "transform", `translate3d(0,${((i - P) * 36).toFixed(1)}px,0)`);
        put(descs[i], "visibility", o > 0 ? "visible" : "hidden");
      }
      put(more, "--o", li.toFixed(3));
    };
    G.matchMedia().add("(min-width: 901px)", () => {
      tq.classList.add("is-pinned");
      tqPin = ST.create({ trigger: stage, start: "top top", end: () => "+=" + innerHeight * (TOTAL - 1), pin: true, pinSpacing: true,
        invalidateOnRefresh: true, onRefresh: (st) => { fh = stage.offsetHeight; render(st.progress); }, onUpdate: (st) => render(st.progress),
        onToggle: (st) => { window.__tqOn = st.isActive; tb && tb.classList.toggle("is-hidden", st.isActive); } });
      render(0);
      // the index is a control: a name scrolls to its technique
      const go = (i) => { const y = tqPin.start + (HEAD + i * SEG) / TOTAL * (tqPin.end - tqPin.start) + 2; lenis ? lenis.scrollTo(y, { duration: 1.1 }) : scrollTo({ top: y, behavior: "smooth" }); };
      const onClick = (e) => { const b = e.target.closest("[data-tq-go]"); if (b) go(+b.dataset.tqGo); };
      tq.addEventListener("click", onClick);
      return () => { tq.classList.remove("is-pinned"); window.__tqOn = false; tq.removeEventListener("click", onClick); [head, stage, more, ...figs, ...imgs, ...names, ...descs].forEach((el) => el.removeAttribute("style")); last.clear(); };
    });
  }

  /* ---------- the rubric's ink sheet holds once its last line is on screen, so the paper rises over a still sheet ---------- */
  const sheet = $("[data-sheet]");
  if (sheet) {
    const setSt = () => sheet.style.setProperty("--st", Math.min(0, innerHeight - sheet.offsetHeight) + "px");
    setSt();
    if ("ResizeObserver" in window) new ResizeObserver(setSt).observe(sheet);
    addEventListener("resize", setSt, { passive: true });
  }

  /* ---------- drift, offsets, grounds, the bar: one scroll loop, all from the scroll position ---------- */
  const paper = $("[data-paper]");
  const maisons = $("[data-maisons]");
  const wall = $("[data-wall]");
  const bk = $("[data-bk]"), bkPages = $$("[data-bk-p]");
  const hex = (v) => { const m = v.trim().match(/^#?([0-9a-f]{6})$/i); const n = parseInt(m ? m[1] : "EAE7DC", 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const css = getComputedStyle(root);
  const PAPER = hex(css.getPropertyValue("--paper")), GOLD = hex(css.getPropertyValue("--gold-field"));
  // [frame, the picture that moves inside it, amplitude as a share of the frame's height (= the picture's slack)]
  const driftEls = [
    ...$$(".bridge").map((b) => [b, $("img", b), 0.16]),
    ...$$(".rl__a").map((a) => [a, $("img", a), 0.08]),
    ...$$(".next3").map((n) => [n, $(".next3__media", n), 0.1]),
    ...(innerWidth <= 900 ? $$(".tq__f").map((f) => [f, $("img", f), 0.1]) : []),
  ].filter((x) => x[1]);
  const held = $$("[data-drift-hold]");                 // inside a held (sticky) frame: driven by the page's own scroll
  const pairs = $$(".sp--p .rl:nth-child(2), .sp--l figcaption, .sp--r figcaption");
  const toneEls = $$("[data-tone-l]");
  let lastBg = "", inkL = null, inkR = null;
  const toneAt = (x, key) => {
    let t = "dark";
    for (const el of toneEls) { const r = el.getBoundingClientRect(); if (r.top <= 38 && r.bottom > 38 && r.left <= x && r.right > x && !el.closest("[hidden]")) t = el.dataset[key]; }
    return t;
  };
  const loop = () => {
    const vh = innerHeight;
    // the bar takes ink over a light ground or photograph, per side (read before any write in this frame)
    if (tb && !root.style.overflow) {
      const l = toneAt(60, "toneL") === "light", r = toneAt(innerWidth - 100, "toneR") === "light";
      if (l !== inkL) tb.classList.toggle("tb--ink-l", (inkL = l));
      if (r !== inkR) tb.classList.toggle("tb--ink-r", (inkR = r));
    }
    if (!reduce) {
      const boxes = driftEls.map(([box]) => box.getBoundingClientRect());
      const prs = pairs.map((el) => el.closest(".sp").getBoundingClientRect());
      const wr = wall && wall.getBoundingClientRect(), br = bk && bk.getBoundingClientRect();
      driftEls.forEach(([, img, amp], i) => {
        const r = boxes[i];
        if (r.bottom < -vh || r.top > 2 * vh || !r.height) return;
        const k = clamp01((vh - r.top) / (vh + r.height));                 // 0 entering at the bottom, 1 leaving at the top
        img.style.transform = `translate3d(0,${((0.5 - k) * amp * r.height).toFixed(1)}px,0)`;
      });
      pairs.forEach((el, i) => {
        const r = prs[i];
        if (r.bottom < -vh || r.top > 2 * vh) return;
        const k = clamp01((vh - r.top) / (vh + r.height));
        el.style.transform = `translate3d(0,${((0.5 - k) * 90).toFixed(1)}px,0)`;   // the second layer passes at its own rate
      });
      if (wr) { const k = clamp01((vh - wr.top) / (vh + wr.height)); wall.style.transform = `translate3d(0,${((0.5 - k) * 70).toFixed(1)}px,0)`; }
      if (br && bkPages.length) {
        const k = sm(clamp01((vh * 0.95 - br.top) / (vh * 0.75)));            // dealt while the section rises, still from 20 % up
        const w = bkPages[0].offsetWidth + 16;
        bkPages.forEach((p, i) => { p.style.transform = `translate3d(${(-(1 - k) * i * w).toFixed(1)}px,${((1 - k) * (18 + i * 6)).toFixed(1)}px,0) rotate(${((1 - k) * (i % 2 ? 3.2 : -2.4) * (i ? 1 : 0)).toFixed(2)}deg)`; });
      }
      const span = Math.max(1, document.documentElement.scrollHeight - vh);
      held.forEach((el) => {
        const k = el.classList.contains("rh__ph") ? clamp01(scrollY / vh) : clamp01(scrollY / span) - 0.5;   // opening: sinks as the sheet rises
        el.style.transform = `translate3d(0,${(k * 0.05 * el.parentElement.offsetHeight).toFixed(1)}px,0)`;
      });
    }
    // the paper lights to gold under the maisons and back (paper and gold share a hue: no blue on the way)
    if (paper && maisons) {
      const r = maisons.getBoundingClientRect();
      const c = (r.top + r.height / 2 - vh / 2) / vh;
      const k = sm(clamp01(1.35 - Math.abs(c) * 1.5));
      const bg = `rgb(${PAPER.map((v, j) => Math.round(v + (GOLD[j] - v) * k)).join(",")})`;
      if (bg !== lastBg) { paper.style.backgroundColor = lastBg = bg; }
    }
  };
  addEventListener("scroll", loop, { passive: true });
  addEventListener("resize", loop, { passive: true });
  if (G) window.ScrollTrigger.addEventListener("refresh", loop);
  loop();
})();
