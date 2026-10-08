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

  /* ---------- the live monogram ---------- */
  const mono = $("[data-mono]");
  if (mono) {
    const hero = $("[data-hero]");
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
    $$(".finish button").forEach((btn) => btn.addEventListener("click", () => {
      $$(".finish button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      mono.dataset.finish = btn.dataset.finish;
      stamp();
    }));
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(stamp, 120));

    // light: follows a fine pointer, or sweeps slowly on its own; only while the hero is on screen
    if (!reduce && light) {
      let W = 0, H = 0, cx = 0, cy = 0;
      const measure = () => {
        const r = hero.getBoundingClientRect(); W = r.width; H = r.height;
        const m = mono.getBoundingClientRect(); cx = m.left - r.left + m.width / 2; cy = m.top - r.top + m.height / 2;
      };
      measure();
      addEventListener("resize", measure, { passive: true });
      let tx = W * 0.3, ty = H * 0.28, x = tx, y = ty, raf = 0, visible = true, lastMove = -1e9, t0 = performance.now();
      let plx = 0, ply = 0, psh = 0;
      const frame = (now) => {
        raf = 0;
        if (!visible) return;
        if (now - lastMove > 3500) { // idle sweep, slow ellipse around the monogram
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
        const r = hero.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top; lastMove = performance.now();
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
