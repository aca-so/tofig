/* tofig.aca.so

   Progressive enhancement only. Every behaviour here is additive: the
   page is complete, readable and navigable with this file removed.

   The one non-obvious piece is X-ray mode. CSS carries the entire
   visual transformation — outlines and node badges are painted by the
   elements themselves, so they travel with the page during scroll at
   zero cost. JS only builds the layers panel, tracks what is on
   screen, and positions the single hover readout. */

(() => {
  "use strict";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── Nav gains a hairline once you leave the top ─────────────── */
  const nav = $("[data-nav]");
  if (nav) {
    const sync = () => nav.classList.toggle("is-stuck", scrollY > 8);
    sync();
    addEventListener("scroll", sync, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════════════
     X-RAY — the page inspects itself
     ═══════════════════════════════════════════════════════════════ */

  const ICON = {
    Frame: "#i-frame", Text: "#i-text", Rect: "#i-rect",
    Ellipse: "#i-ellipse", Vector: "#i-vector",
    Group: "#i-group", Stack: "#i-group",
  };

  const xrayInit = () => {
    /* Two doors into the mode: the nav switch for people who already
       know, the hero invitation for people who don't. */
    const toggles = $$("[data-xray-toggle]");
    const panel  = $("[data-lpanel]");
    const list   = $("[data-lpanel-list]");
    const probe  = $("[data-xprobe]");
    const dim    = $("[data-xprobe-dim]");
    if (!toggles.length || !panel || !list || !probe) return;

    const nodes = $$("[data-xn]");
    if (!nodes.length) return;

    /* Rows mirror document order; depth is real DOM containment, so
       the tree matches what tofig would actually emit. */
    const rows = new Map();
    nodes.forEach((el, i) => {
      el.style.setProperty("--xi", i);

      let lvl = 0;
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (p.hasAttribute("data-xn")) lvl++;
      }

      const [type, name] = (el.dataset.xn || "Frame").split("·").map((s) => s.trim());
      const li  = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.setProperty("--lvl", lvl);

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "lico");
      svg.setAttribute("viewBox", "0 0 12 12");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.2");
      svg.setAttribute("aria-hidden", "true");
      const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttribute("href", ICON[type] || ICON.Frame);
      svg.append(use);

      btn.append(svg, document.createTextNode(name || type));
      btn.addEventListener("click", () => {
        el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      });
      btn.addEventListener("mouseenter", () => showProbe(el));
      btn.addEventListener("focus", () => showProbe(el));
      btn.addEventListener("mouseleave", hideProbe);
      btn.addEventListener("blur", hideProbe);

      li.append(btn);
      list.append(li);
      rows.set(el, li);
    });

    $("[data-lpanel-count]").textContent = String(nodes.length);

    const foot = $(".lpanel__foot");
    if (foot) {
      const total = $("main") ? $("main").getElementsByTagName("*").length : 0;
      foot.innerHTML =
        `<b style="color:var(--v-300)">${total}</b> elements in this page.<br>` +
        `${nodes.length} named for the tree. Hover a row to locate it.`;
    }

    /* Which rows are on screen right now. */
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (es) => es.forEach((e) => rows.get(e.target)?.classList.toggle("is-inview", e.isIntersecting)),
        { rootMargin: "-8% 0px -8% 0px" }
      );
      nodes.forEach((n) => io.observe(n));
    }

    /* One readout, one element, tracked with a single rAF while it is
       live. Cheaper and steadier than recomputing on every scroll. */
    let probed = null, raf = 0;
    const track = () => {
      if (!probed) return;
      const r = probed.getBoundingClientRect();
      probe.style.transform = `translate(${Math.round(r.left)}px, ${Math.round(r.top)}px)`;
      probe.style.width  = `${Math.round(r.width)}px`;
      probe.style.height = `${Math.round(r.height)}px`;
      dim.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
      raf = requestAnimationFrame(track);
    };
    function showProbe(el) {
      if (!document.documentElement.classList.contains("xray")) return;
      probed = el;
      rows.get(el)?.classList.add("is-lit");
      probe.classList.add("is-on");
      cancelAnimationFrame(raf);
      track();
    }
    function hideProbe() {
      if (probed) rows.get(probed)?.classList.remove("is-lit");
      probed = null;
      probe.classList.remove("is-on");
      cancelAnimationFrame(raf);
    }

    document.addEventListener("pointerover", (e) => {
      if (!document.documentElement.classList.contains("xray")) return;
      if (e.target.closest?.(".lpanel")) return;
      const el = e.target.closest?.("[data-xn]");
      if (el && el !== probed) showProbe(el);
      else if (!el) hideProbe();
    });

    const isOn = () => document.documentElement.classList.contains("xray");
    const apply = (on) => {
      document.documentElement.classList.toggle("xray", on);
      toggles.forEach((t) => t.setAttribute("aria-pressed", String(on)));
      panel.setAttribute("aria-hidden", String(!on));
      if (!on) hideProbe();
    };

    toggles.forEach((t) => t.addEventListener("click", () => apply(!isOn())));

    addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        apply(!isOn());
      } else if (e.key === "Escape" && isOn()) {
        apply(false);
      }
    });
  };

  /* ═══════════════════════════════════════════════════════════════
     SIGNATURE — the decomposition

     One custom property, --x, drives everything: the tilt of the
     scene, the lift of each plane, the inspection chrome. CSS owns
     the loop entirely. JS only stops it when nobody is looking.
     ═══════════════════════════════════════════════════════════════ */

  const xplodeInit = () => {
    const root = $("[data-xplode]");
    if (!root || reduced || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      ([e]) => root.classList.toggle("is-paused", !e.isIntersecting),
      { threshold: 0 }
    );
    io.observe(root);

    /* A background tab should not burn frames either. */
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) root.classList.add("is-paused");
      else if (root.getBoundingClientRect().bottom > 0) root.classList.remove("is-paused");
    });
  };

  /* ═══════════════════════════════════════════════════════════════
     GitHub stars — additive. If the API is rate-limited, offline or
     blocked, the number cell never appears and the button stays a
     plain, working link.
     ═══════════════════════════════════════════════════════════════ */

  const starsInit = () => {
    const el = $("[data-ghstar]");
    const out = $("[data-ghstar-n]");
    if (!el || !out) return;

    const fmt = (n) =>
      n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);

    const show = (n) => {
      out.textContent = fmt(n);
      el.dataset.loaded = "true";
      el.setAttribute("aria-label", `Star tofig on GitHub, ${n} stars`);
    };

    let cached = null;
    try { cached = sessionStorage.getItem("tofig:stars"); } catch { /* private mode */ }
    if (cached !== null) { show(Number(cached)); return; }

    fetch("https://api.github.com/repos/aca-so/tofig", {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (typeof d.stargazers_count !== "number") return;
        try { sessionStorage.setItem("tofig:stars", String(d.stargazers_count)); } catch { /* ignore */ }
        show(d.stargazers_count);
      })
      .catch(() => { /* stay a plain link */ });
  };

  /* ── Copy buttons ──────────────────────────────────────────────── */
  $$("[data-copy]").forEach((btn) => {
    const original = btn.textContent;
    btn.addEventListener("click", async () => {
      const target = document.getElementById(btn.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.innerText.trim());
        btn.textContent = btn.dataset.copiedLabel || "Copied";
        btn.dataset.copied = "true";
        setTimeout(() => { btn.textContent = original; delete btn.dataset.copied; }, 1800);
      } catch {
        /* Clipboard blocked. The command is selectable on screen, so
           say nothing and do nothing. */
      }
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     Terminal — retypes content that is already in the document, so
     no-JS and reduced-motion readers get the finished transcript.
     ═══════════════════════════════════════════════════════════════ */

  const termInit = () => {
    const term = $("[data-term]");
    const out  = $("[data-term-out]");
    if (!term || !out) return;

    if (reduced || !("IntersectionObserver" in window)) { term.classList.add("is-done"); return; }

    /* Snapshot the finished transcript, then replay it. */
    const spans = [...out.children].map((s) => ({ cls: s.className, text: s.textContent }));
    if (!spans.length) { term.classList.add("is-done"); return; }

    /* Pin the finished height before emptying the node, or the box
       collapses to one line and grows back as it types — a scroll
       jump precisely where someone is trying to read. */
    const body = term.querySelector(".term__body");
    if (body) body.style.minHeight = `${body.getBoundingClientRect().height}px`;

    let played = false;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || played) return;
      played = true;
      io.disconnect();

      out.textContent = "";
      let i = 0;

      const nextSpan = () => {
        if (i >= spans.length) { term.classList.add("is-done"); return; }
        const { cls, text } = spans[i++];
        const el = document.createElement("span");
        if (cls) el.className = cls;
        out.append(el);

        /* The command types; the output arrives a line at a time. */
        if (i === 1 || cls === "c-fn" || cls === "c-arg") {
          let c = 0;
          const tick = () => {
            el.textContent = text.slice(0, ++c);
            if (c < text.length) setTimeout(tick, 17);
            else setTimeout(nextSpan, 40);
          };
          tick();
        } else {
          el.textContent = text;
          setTimeout(nextSpan, text.trim() ? 260 : 60);
        }
      };
      setTimeout(nextSpan, 240);
    }, { threshold: 0.35 });

    io.observe(term);
  };

  /* ═══════════════════════════════════════════════════════════════
     The survival ledger — six instruments. Each one demonstrates the
     claim above it rather than restating it.
     ═══════════════════════════════════════════════════════════════ */

  const toysInit = () => {
    /* 1 · Text stays text */
    const edit = $("[data-toy-edit]");
    const editOut = $("[data-toy-edit-out]");
    if (edit && editOut) {
      const sync = () => {
        const n = edit.textContent.trim().length;
        editOut.innerHTML = `Text · <b>${n}</b> character${n === 1 ? "" : "s"} · still a text node`;
      };
      sync();
      edit.addEventListener("input", sync);
      /* Keep it a single line of plain text, the way a Figma text node is. */
      edit.addEventListener("paste", (e) => {
        e.preventDefault();
        const t = (e.clipboardData || window.clipboardData).getData("text").replace(/\s+/g, " ");
        document.execCommand("insertText", false, t);
      });
      edit.addEventListener("keydown", (e) => { if (e.key === "Enter") e.preventDefault(); });
    }

    /* 2 · Inline SVG becomes vectors */
    const svg = $("[data-toy-vec]");
    if (svg) {
      const path = $("[data-vpath]", svg);
      const vout = $("[data-toy-vec-out]");
      const pts  = $$("[data-vpt]", svg);
      const hair = $$("[data-vh]", svg);
      const P = pts.map((p) => ({ x: +p.getAttribute("cx"), y: +p.getAttribute("cy") }));

      const draw = () => {
        path.setAttribute("d",
          `M20,74 C${P[0].x.toFixed(1)},${P[0].y.toFixed(1)} ${P[1].x.toFixed(1)},${P[1].y.toFixed(1)} 228,74`);
        pts.forEach((p, i) => {
          p.setAttribute("cx", P[i].x); p.setAttribute("cy", P[i].y);
          p.setAttribute("aria-valuenow", Math.round(P[i].x));
        });
        hair[0].setAttribute("x2", P[0].x); hair[0].setAttribute("y2", P[0].y);
        hair[1].setAttribute("x2", P[1].x); hair[1].setAttribute("y2", P[1].y);
        if (vout) {
          vout.innerHTML = `Vector · 1 path · <b>4</b> control points · ` +
            `c${Math.round(P[0].x)},${Math.round(P[0].y)} ${Math.round(P[1].x)},${Math.round(P[1].y)}`;
        }
      };

      /* Exact viewBox coordinates regardless of how the SVG is scaled. */
      const toLocal = (evt) => {
        const m = svg.getScreenCTM();
        if (!m) return null;
        const pt = svg.createSVGPoint();
        pt.x = evt.clientX; pt.y = evt.clientY;
        return pt.matrixTransform(m.inverse());
      };

      pts.forEach((p, i) => {
        p.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          p.setPointerCapture(e.pointerId);
          const move = (ev) => {
            const l = toLocal(ev);
            if (!l) return;
            P[i].x = clamp(l.x, 4, 244);
            P[i].y = clamp(l.y, 4, 88);
            draw();
          };
          const up = () => {
            p.removeEventListener("pointermove", move);
            p.removeEventListener("pointerup", up);
            p.removeEventListener("pointercancel", up);
          };
          p.addEventListener("pointermove", move);
          p.addEventListener("pointerup", up);
          p.addEventListener("pointercancel", up);
        });

        p.addEventListener("keydown", (e) => {
          const step = e.shiftKey ? 12 : 4;
          const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
          if (!d) return;
          e.preventDefault();
          P[i].x = clamp(P[i].x + d[0], 4, 244);
          P[i].y = clamp(P[i].y + d[1], 4, 88);
          draw();
        });
      });

      draw();
    }

    /* 3 · Fills, strokes, radii */
    const sw = $("[data-toy-swatch]");
    const rIn = $("[data-toy-r]"), sIn = $("[data-toy-s]");
    const pOut = $("[data-toy-paint-out]");
    if (sw && rIn && sIn && pOut) {
      const sync = () => {
        sw.style.setProperty("--r", `${rIn.value}px`);
        sw.style.setProperty("--sw", `${sIn.value}px`);
        pOut.innerHTML = `Rect · radius <b>${rIn.value}</b> · stroke <b>${sIn.value}</b> · linear gradient, 2 stops`;
      };
      sync();
      rIn.addEventListener("input", sync);
      sIn.addEventListener("input", sync);
    }

    /* 4 · Missing fonts are substituted */
    const font = $("[data-toy-font]");
    const fbtn = $("[data-toy-font-btn]");
    const fout = $("[data-toy-font-out]");
    if (font && fbtn && fout) {
      const sync = (sub) => {
        font.classList.toggle("is-sub", sub);
        font.textContent = sub ? "Times New Roman 28" : "Sora Light 28";
        fbtn.setAttribute("aria-pressed", String(sub));
        fbtn.textContent = sub ? "Restore the font" : "Simulate a missing font";
        fout.innerHTML = sub
          ? `Substituted · <b>Sora Light → Times New Roman</b> · 1 layer reported`
          : `Sora Light 28 · available in this document`;
      };
      sync(false);
      fbtn.addEventListener("click", () => sync(fbtn.getAttribute("aria-pressed") !== "true"));
    }

    /* 6 · External URLs are never fetched */
    const nbtn = $("[data-toy-net-btn]");
    const nout = $("[data-toy-net-out]");
    if (nbtn && nout) {
      const idle = `<b>networkAccess: none</b><br>manifest.json`;
      nout.innerHTML = idle;
      nbtn.addEventListener("click", () => {
        nout.innerHTML =
          `GET https://cdn…/hero.png<br>` +
          `<b>blocked</b> · networkAccess: none<br>` +
          `inline it as a data: URL instead`;
        nbtn.disabled = true;
        setTimeout(() => { nout.innerHTML = idle; nbtn.disabled = false; }, 3600);
      });
    }
  };

  /* ── Reveals. The opt-in class is added here, so a headless render,
        a background tab or a failed script still shows a full page. ── */

  const revealInit = () => {
    const items = $$("[data-rise], [data-wipe], [data-stagger]");
    if (!items.length || reduced || !("IntersectionObserver" in window)) return;

    document.documentElement.classList.add("reveal-ready");
    $$("[data-stagger]").forEach((g) =>
      [...g.children].forEach((c, i) => c.style.setProperty("--si", i))
    );

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });

    items.forEach((el) => io.observe(el));
  };

  /* ═══════════════════════════════════════════════════════════════
     Docs
     ═══════════════════════════════════════════════════════════════ */

  /* Every heading becomes linkable. Someone answering a question in a
     thread wants to point at one section, not the whole page. */
  const anchorsInit = () => {
    /* h2s carry hand-written ids because the markup TOC points at
       them. h3s get one derived from their text, so sub-sections are
       linkable too without every heading needing an id by hand. */
    const used = new Set($$("[id]").map((el) => el.id));
    $$(".prose h3:not([id])").forEach((h) => {
      const base = h.textContent.trim().toLowerCase()
        .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 48)
        .replace(/^-|-$/g, "");
      if (!base) return;
      let id = base, n = 2;
      while (used.has(id)) id = `${base}-${n++}`;
      used.add(id);
      h.id = id;
    });

    $$(".prose h2[id], .prose h3[id]").forEach((h) => {
      const a = document.createElement("a");
      a.className = "anchor";
      a.href = `#${h.id}`;
      a.textContent = "#";
      a.setAttribute("aria-label", `Link to “${h.textContent.trim()}”`);
      h.append(a);
    });
  };

  /* The h2 list ships in the markup so a failed script still leaves a
     usable contents. The h3s are read out of the real document, so
     the tree cannot drift from what is actually on the page. */
  const tocInit = () => {
    const toc = $("[data-toc]");
    if (!toc || !("IntersectionObserver" in window)) return;

    $$("a", toc).forEach((link) => {
      const h2 = document.getElementById(link.getAttribute("href").slice(1));
      if (!h2) return;
      const subs = [];
      for (let n = h2.nextElementSibling; n && n.tagName !== "H2"; n = n.nextElementSibling) {
        if (n.tagName === "H3" && n.id) subs.push(n);
      }
      if (subs.length < 2) return;   // one child is noise, not a tree

      const ul = document.createElement("ul");
      ul.className = "toc__sub";
      subs.forEach((h3) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `#${h3.id}`;
        a.textContent = h3.textContent.replace(/#$/, "").trim();
        li.append(a);
        ul.append(li);
      });
      link.parentElement.append(ul);
    });

    const links = $$("a", toc);
    const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const heads = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    if (!heads.length) return;

    /* Track the last heading to cross the top of the reading area,
       rather than whichever happens to intersect — with sub-headings
       in play, several are on screen at once. */
    const seen = new Set();
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      const active = heads.filter((h) => seen.has(h))[0]
        || heads.filter((h) => h.getBoundingClientRect().top < 120).pop();
      if (!active) return;
      links.forEach((a) => a.classList.remove("is-active"));
      byId.get(active.id)?.classList.add("is-active");
    }, { rootMargin: "-80px 0px -60% 0px" });

    heads.forEach((h) => spy.observe(h));
  };

  /* Published version, read from the registry. A hardcoded number on a
     hand-written page drifts the moment anything ships. */
  const versionInit = () => {
    const chip = $("[data-npm-version]");
    const out  = $("[data-npm-version-n]");
    if (!chip || !out) return;

    const show = (v) => { out.textContent = `v${v}`; chip.dataset.loaded = "true"; };
    let cached = null;
    try { cached = sessionStorage.getItem("tofig:version"); } catch { /* private mode */ }
    if (cached) { show(cached); return; }

    fetch("https://registry.npmjs.org/@aca-so/tofig/latest")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (typeof d.version !== "string") return;
        try { sessionStorage.setItem("tofig:version", d.version); } catch { /* ignore */ }
        show(d.version);
      })
      .catch(() => { /* the chip simply never appears */ });
  };

  xrayInit();
  xplodeInit();
  starsInit();
  termInit();
  toysInit();
  revealInit();
  anchorsInit();   /* before tocInit — the sub-tree reads heading text */
  tocInit();
  versionInit();
})();
