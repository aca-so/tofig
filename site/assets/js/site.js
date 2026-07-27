/* tofig.aca.so — progressive enhancement only.
   Every behaviour here is additive: the page is complete without it. */

(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Nav gains a hairline once you leave the top ───────────────── */
  const nav = document.querySelector("[data-nav]");
  if (nav) {
    const sync = () => nav.classList.toggle("is-stuck", window.scrollY > 8);
    sync();
    addEventListener("scroll", sync, { passive: true });
  }

  /* ── Signature: the decomposition ──────────────────────────────────
     Toggles between the rendered specimen and the layer view. Stagger
     indices are assigned here rather than hand-written into the markup,
     so the tree and the outlines stay in step if either list changes. */
  document.querySelectorAll("[data-demo]").forEach((demo) => {
    const btn = demo.querySelector("[data-demo-toggle]");
    const status = demo.querySelector("[data-demo-status]");
    if (!btn) return;

    demo.querySelectorAll("[data-node]").forEach((el, i) => {
      el.style.setProperty("--i", i);
    });
    demo.querySelectorAll(".tree li").forEach((el, i) => {
      el.style.setProperty("--i", i);
    });

    const labels = {
      on:  btn.dataset.labelOn  || "Show HTML",
      off: btn.dataset.labelOff || "Convert",
    };
    const notes = {
      on:  status?.dataset.noteOn  || "",
      off: status?.dataset.noteOff || "",
    };

    const apply = (converted) => {
      demo.classList.toggle("is-converted", converted);
      btn.textContent = converted ? labels.on : labels.off;
      btn.setAttribute("aria-pressed", String(converted));
      if (status) status.textContent = converted ? notes.on : notes.off;
    };

    apply(false);
    btn.addEventListener("click", () => apply(!demo.classList.contains("is-converted")));
  });

  /* ── Copy buttons ──────────────────────────────────────────────── */
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const original = btn.textContent;
    btn.addEventListener("click", async () => {
      const target = document.getElementById(btn.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.innerText.trim());
        btn.textContent = btn.dataset.copiedLabel || "Copied";
        btn.dataset.copied = "true";
        setTimeout(() => {
          btn.textContent = original;
          delete btn.dataset.copied;
        }, 1800);
      } catch {
        /* Clipboard blocked (insecure context, denied permission). The
           command is selectable on screen, so say nothing and do nothing. */
      }
    });
  });

  /* ── Reveal on scroll. Opt-in class is added by JS so the page is
        never blank when this never runs. ─────────────────────────── */
  const revealables = document.querySelectorAll("[data-reveal]");
  if (revealables.length && !reduced && "IntersectionObserver" in window) {
    document.documentElement.classList.add("reveal-ready");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    revealables.forEach((el) => io.observe(el));
  }

  /* ── Docs: highlight the section you're reading ────────────────── */
  const tocLinks = [...document.querySelectorAll("[data-toc] a")];
  if (tocLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(tocLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const heads = [...byId.keys()]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          tocLinks.forEach((a) => a.classList.remove("is-active"));
          byId.get(e.target.id)?.classList.add("is-active");
        });
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );
    heads.forEach((h) => spy.observe(h));
  }
})();
