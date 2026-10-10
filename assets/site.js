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
  const safe = (w) => w.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const splitWords = (el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="sw" aria-hidden="true"><span class="sw__in" style="--w:${i}">${safe(w)}</span></span>`).join(" ");
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

  /* ---------- overlay menu ---------- */
  const mb = $(".tb__menu"), ov = $("[data-ov]");
  if (mb && ov) {
    const label = $("[data-menu-label]", mb);
    const set = (open) => {
      mb.setAttribute("aria-expanded", String(open));
      ov.classList.toggle("is-open", open);
      root.style.overflow = open ? "hidden" : "";
      label.textContent = open ? "Fermer" : "Menu";
      if (open) setTimeout(() => $("a", ov)?.focus(), 80);
    };
    mb.addEventListener("click", () => set(mb.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ov.classList.contains("is-open")) { set(false); mb.focus(); } });
  }

  /* ---------- reveals: settle-in, split headings, crew, contact-sheet cells ---------- */
  $$("[data-crew] li, [data-crew] h3").forEach((el, i) => el.style.setProperty("--i", i % 14));
  const sheet = $(".sheet__grid");
  const cells = $$(".cs");
  const placeCells = () => {
    if (!sheet) return;
    const cols = getComputedStyle(sheet).gridTemplateColumns.split(" ").length || 1;
    cells.forEach((c, i) => c.style.setProperty("--c", i % cols));
  };
  placeCells();
  const revealEls = $$("[data-settle], .split, [data-crew], .cs");
  if (io && !reduce) {
    const o = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting || e.boundingClientRect.top <= 0) { e.target.classList.add("is-in"); o.unobserve(e.target); }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    revealEls.forEach((el) => o.observe(el));
    // safety sweep: a fast scroll can jump over an element without the observer ever reporting it
    const sweep = setInterval(() => {
      const left = revealEls.filter((el) => !el.classList.contains("is-in"));
      if (!left.length) return clearInterval(sweep);
      left.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) { el.classList.add("is-in"); o.unobserve(el); } });
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
    const stamp = () => {
      if (reduce) return;
      mono.classList.remove("is-stamp");
      void mono.getBoundingClientRect();
      mono.classList.add("is-stamp");
      sweep();
    };
    const clean = (v) => v.normalize("NFC").replace(/[^\p{L}]/gu, "").toUpperCase().slice(0, 3);
    let last = DEFAULT;
    render(DEFAULT);
    setSheen(34);
    input.addEventListener("input", () => {
      const v = clean(input.value);
      if (input.value !== v) input.value = v;
      const show = v || DEFAULT;
      mono.classList.toggle("is-ghost", !v);
      if (show !== last) { render(show); last = show; stamp(); }
    });
    $$(".finish button").forEach((btn) => btn.addEventListener("click", () => {
      $$(".finish button").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
      mono.dataset.finish = btn.dataset.finish;
      stamp();
    }));
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(stamp, 120));

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
  if (gestes.length && io) {
    const figs = $$(".gestes__media figure");
    let cur = "0";
    const on = (k) => {
      if (k === cur) return;
      figs.forEach((f) => {
        f.classList.toggle("was-on", f.dataset.g === cur);
        f.classList.toggle("is-on", f.dataset.g === k);
      });
      gestes.forEach((g) => g.classList.toggle("is-on", g.dataset.g === k));
      cur = k;
    };
    const o = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) on(e.target.dataset.g); }, { rootMargin: "-45% 0px -45% 0px" });
    gestes.forEach((g) => o.observe(g));
  }

  /* ---------- réalisations: columns, filter in the heading ---------- */
  const grid = $("[data-reals]");
  let colTweens = [];
  const layoutCols = () => {
    if (!grid) return;
    const figs = $$(".rl", grid);
    const n = innerWidth < 768 ? 2 : 3;
    const cols = Array.from({ length: n }, () => { const d = document.createElement("div"); d.className = "reals__col"; return d; });
    const hgt = new Array(n).fill(0);
    figs.forEach((f) => {
      if (f.hidden) { cols[0].appendChild(f); return; }
      const img = $("img", f);
      const r = img ? (+img.getAttribute("height") / +img.getAttribute("width")) || 1 : 1;
      const k = hgt.indexOf(Math.min(...hgt));
      cols[k].appendChild(f); hgt[k] += r + 0.25;
    });
    grid.replaceChildren(...cols);
    grid.classList.add("is-cols");
    colTweens.forEach((t) => t.scrollTrigger?.kill() || t.kill());
    colTweens = [];
    if (G && innerWidth >= 901) {
      const speeds = [-20, -90, -45];
      cols.forEach((col, k) => colTweens.push(G.fromTo(col, { y: 24 }, { y: speeds[k], ease: "none",
        scrollTrigger: { trigger: grid, start: "top bottom", end: "bottom top", scrub: true } })));
    }
    window.ScrollTrigger?.refresh();
  };
  if (grid) {
    layoutCols();
    let w = innerWidth;
    addEventListener("resize", () => { if ((w < 768) !== (innerWidth < 768) || (w < 901) !== (innerWidth < 901)) { w = innerWidth; layoutCols(); } });
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
        layoutCols();
        grid.classList.remove("is-out");
        if (G) G.from($$(".rl:not([hidden])", grid), { y: 70, opacity: 0, scale: 0.96, duration: 1.1, ease: "power3.out", stagger: 0.05, clearProps: "opacity,transform" });
      };
      if (reduce) return swap();
      grid.classList.add("is-out");
      setTimeout(swap, 320);
    }));
  }

  /* ---------- book: tilt toward the pointer ---------- */
  $$("[data-tilt]").forEach((el) => {
    if (reduce || !fine) return;
    const img = $("img", el);
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      img.style.setProperty("--ry", (px * 14).toFixed(2));
      img.style.setProperty("--rx", (-py * 9).toFixed(2));
    });
    el.addEventListener("pointerleave", () => { img.style.removeProperty("--ry"); img.style.removeProperty("--rx"); });
  });

  /* ---------- scroll story (GSAP) ---------- */
  if (G) {
    const ST = window.ScrollTrigger;

    // hero pinned: the monogram withdraws, the agency speaks in three sentences (as in V1)
    const wrap = $("[data-hero-wrap]");
    if (wrap) {
      const tl = G.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: wrap, start: "top top", end: "bottom bottom", scrub: 0.8 } });
      tl.to("[data-controls]", { opacity: 0, y: -30, duration: 0.1 }, 0.03)
        .to("[data-hero-foot]", { opacity: 0, y: 24, duration: 0.1 }, 0.03)
        .to("[data-mono]", { scale: 0.46, yPercent: -62, duration: 0.24, ease: "power2.inOut" }, 0.04)
        .to("[data-veil]", { opacity: 1, duration: 0.26 }, 0.06);
      $$(".band").forEach((band, k) => {
        const words = $$(".sw__in", band);
        const at = 0.16 + k * 0.25;
        tl.set(band, { opacity: 1 }, at - 0.001)
          .fromTo(words, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.0045, duration: 0.08, ease: "power3.out" }, at)
          .to(words, { yPercent: -110, opacity: 0, stagger: 0.002, duration: 0.05, ease: "power2.in" }, at + 0.2)
          .set(band, { opacity: 0 }, at + 0.25);
      });
      tl.to({}, { duration: 0.02 }, 0.98);
    }

    const mm = G.matchMedia();
    mm.add("(min-width: 901px)", () => {
      // deep sections open to full width as they arrive
      $$("[data-open]").forEach((sec) => {
        G.fromTo(sec, { clipPath: "inset(6% 5% 0% 5%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none",
          scrollTrigger: { trigger: sec, start: "top bottom", end: "top 18%", scrub: true } });
      });
    });

    // the gold line follows the techniques
    const line = $("[data-g-line]");
    if (line) G.to(line, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".gestes__listwrap", start: "top 55%", end: "bottom 55%", scrub: true } });

    // logo wall: a diagonal cascade, then the slow gold glint (CSS)
    const wallItems = $$("[data-wall] li");
    if (wallItems.length) G.from(wallItems, { opacity: 0, y: 26, scale: 0.9, duration: 0.9, ease: "power3.out",
      stagger: { grid: [8, 7], from: "start", amount: 1.3 }, scrollTrigger: { trigger: "[data-wall]", start: "top 82%", once: true } });

    // the book turns toward the reader
    const book = $("[data-book3]");
    if (book) G.fromTo(book, { rotateY: -40, rotateX: 10, y: 80 }, { rotateY: -8, rotateX: 0, y: -30, ease: "none",
      scrollTrigger: { trigger: "[data-book3-sec]", start: "top bottom", end: "bottom top", scrub: true } });

    // rubric opening image: settles in, then drifts as the page moves on
    const rh = $("[data-rh]");
    if (rh) {
      const img = $("img", rh);
      G.fromTo(img, { scale: 1.1, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 2.2, ease: "power3.out" });
      G.to(img, { yPercent: 12, ease: "none", scrollTrigger: { trigger: rh, start: "top top", end: "bottom top", scrub: true } });
      G.to($(".rh__title", rh), { yPercent: -60, opacity: 0.15, ease: "none", scrollTrigger: { trigger: rh, start: "top top", end: "bottom top", scrub: true } });
    }

    addEventListener("load", () => { placeCells(); ST.refresh(); });
    document.fonts?.ready.then(() => ST.refresh());
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
      }
      show(items.indexOf(a));
      $(".vw__close", vw).focus();
    };
    const close = (viaHistory = false) => {
      if (!vw.open) return;
      vw.close();
      root.style.overflow = "";
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
