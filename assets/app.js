/* Field Notes — app.js
   - JS-generated TOC
   - Scroll-linked section highlighting (scrollspy)
   - Reading time + progress bar
   - Inline footnotes popover
   - Keyboard navigation (Alt+J / Alt+K)
   - Insights page filter + sort
*/

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---- Reading time + progress ---------------------------------------------
  function initReadingMeta() {
    const article = document.querySelector("[data-article]");
    if (!article) return;

    const text = article.innerText || "";
    const words = (text.trim().match(/\S+/g) || []).length;
    const mins = Math.max(1, Math.round(words / 220)); // 220 wpm, conservative
    const target = document.querySelector("[data-readingtime]");
    if (target) target.textContent = `${mins} min read`;

    // Progress bar (based on article viewport progress)
    const bar = document.querySelector(".progress > i");
    if (!bar) return;

    function onScroll() {
      const rect = article.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const total = rect.height - vh;
      if (total <= 0) {
        bar.style.width = "100%";
        return;
      }
      const progressed = Math.min(Math.max(-rect.top, 0), total);
      const pct = (progressed / total) * 100;
      bar.style.width = `${pct.toFixed(2)}%`;
    }

    document.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  // ---- TOC + Scrollspy ------------------------------------------------------
  function slugify(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function initTOC() {
    const article = document.querySelector("[data-article]");
    const toc = document.querySelector("[data-toc]");
    if (!article || !toc) return;

    const headings = $$("h2, h3", article).filter(h => !h.closest("[data-no-toc]"));
    if (!headings.length) {
      toc.closest(".card")?.remove();
      return;
    }

    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Table of contents");
    nav.tabIndex = 0; // keyboard focus area

    headings.forEach((h, idx) => {
      if (!h.id) {
        const base = slugify(h.textContent || `section-${idx + 1}`);
        // ensure unique
        let id = base;
        let n = 2;
        while (document.getElementById(id)) {
          id = `${base}-${n++}`;
        }
        h.id = id;
      }

      // add a subtle section jump link icon on headings
      if (!h.querySelector(".sec-link")) {
        const a = document.createElement("a");
        a.className = "sec-link";
        a.href = `#${h.id}`;
        a.setAttribute("aria-label", "Copy or jump to this section");
        a.textContent = " #";
        a.style.color = "var(--faint)";
        a.style.fontWeight = "500";
        a.style.textDecoration = "none";
        a.style.marginLeft = "6px";
        a.addEventListener("click", (e) => {
          // allow default jump, but also update hash
          // nothing else needed
        });
        h.appendChild(a);
      }

      const link = document.createElement("a");
      link.href = `#${h.id}`;
      link.dataset.tocLink = "1";
      link.dataset.targetId = h.id;
      link.className = `depth-${h.tagName === "H3" ? "3" : "2"}`;
      link.textContent = h.textContent?.replace(/\s+#\s*$/, "") || `Section ${idx + 1}`;
      nav.appendChild(link);
    });

    // Clear and mount
    toc.innerHTML = "";
    toc.appendChild(nav);

    // Smooth scrolling
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      const id = a.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - (getHeaderOffset() + 10);
      window.scrollTo({ top: y, behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    });

    // Scrollspy via IntersectionObserver
    const links = $$("a[data-toc-link]", nav);
    const idToLink = new Map(links.map(l => [l.dataset.targetId, l]));
    const activeClass = "is-active";

    let currentId = null;
    const observer = new IntersectionObserver(
      (entries) => {
        // pick the entry that is closest to top and intersecting
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a,b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));

        if (!visible.length) return;
        const id = visible[0].target.id;
        if (id && id !== currentId) {
          currentId = id;
          links.forEach(l => l.classList.remove(activeClass));
          const active = idToLink.get(id);
          if (active) {
            active.classList.add(activeClass);
            // keep active visible in sticky rail
            active.scrollIntoView({ block: "nearest" });
          }
        }
      },
      { rootMargin: `-${getHeaderOffset() + 20}px 0px -70% 0px`, threshold: [0.1, 0.25, 0.6] }
    );

    headings.forEach(h => observer.observe(h));

    // Keyboard navigation inside TOC (ArrowUp/ArrowDown/Enter)
    nav.addEventListener("keydown", (e) => {
      const focusables = links;
      const focused = document.activeElement;
      const idx = focusables.indexOf(focused);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        (focusables[Math.min(idx + 1, focusables.length - 1)] || focusables[0]).focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        (focusables[Math.max(idx - 1, 0)] || focusables[focusables.length - 1]).focus();
      } else if (e.key === "Enter" && focused && focused.matches("a")) {
        focused.click();
      }
    });

    // Global keyboard: Alt+J / Alt+K to move to next/prev section
    document.addEventListener("keydown", (e) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key.toLowerCase() !== "j" && e.key.toLowerCase() !== "k") return;
      if (!headings.length) return;

      // find current section by closest heading above viewport
      const scrollY = window.scrollY;
      const positions = headings.map(h => ({ id: h.id, top: h.getBoundingClientRect().top + scrollY }));
      const currentIndex = positions.reduce((acc, p, i) => (p.top <= scrollY + getHeaderOffset() + 18 ? i : acc), 0);

      const nextIndex = e.key.toLowerCase() === "j"
        ? Math.min(currentIndex + 1, headings.length - 1)
        : Math.max(currentIndex - 1, 0);

      const target = headings[nextIndex];
      const y = target.getBoundingClientRect().top + window.scrollY - (getHeaderOffset() + 10);
      window.scrollTo({ top: y, behavior: "smooth" });
      history.replaceState(null, "", `#${target.id}`);
      e.preventDefault();
    });
  }

  function getHeaderOffset() {
    const header = document.querySelector(".site-header");
    const h = header ? header.getBoundingClientRect().height : 0;
    return Math.round(h || 0);
  }

  // ---- Footnotes popover ----------------------------------------------------
  function initFootnotes() {
    const article = document.querySelector("[data-article]");
    if (!article) return;

    const refs = $$("a.fn-ref", article);
    if (!refs.length) return;

    let pop = null;

    function closePop() {
      if (pop) {
        pop.remove();
        pop = null;
      }
      refs.forEach(r => r.setAttribute("aria-expanded", "false"));
    }

    function openPop(ref) {
      const id = ref.getAttribute("href")?.slice(1);
      if (!id) return;
      const note = document.getElementById(id);
      if (!note) return;

      closePop();

      pop = document.createElement("div");
      pop.className = "fn-pop";
      pop.setAttribute("role", "dialog");
      pop.setAttribute("aria-label", "Footnote");
      const head = document.createElement("div");
      head.className = "fn-head";
      head.innerHTML = `<span>Footnote</span>`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Close";
      btn.addEventListener("click", closePop);
      head.appendChild(btn);

      const body = document.createElement("div");
      // Clone without backref
      const clone = note.cloneNode(true);
      clone.querySelectorAll(".fn-back").forEach(n => n.remove());
      body.innerHTML = clone.innerHTML;

      pop.appendChild(head);
      pop.appendChild(body);
      document.body.appendChild(pop);

      // Position near ref
      const r = ref.getBoundingClientRect();
      const pr = pop.getBoundingClientRect();
      const pad = 10;
      let top = r.bottom + pad;
      let left = Math.min(Math.max(r.left, 12), window.innerWidth - pr.width - 12);

      if (top + pr.height + 12 > window.innerHeight) {
        top = r.top - pr.height - pad;
      }
      if (top < 12) top = 12;

      pop.style.top = `${top}px`;
      pop.style.left = `${left}px`;

      ref.setAttribute("aria-expanded", "true");
      btn.focus();
    }

    refs.forEach(ref => {
      ref.setAttribute("role", "button");
      ref.setAttribute("aria-expanded", "false");
      ref.addEventListener("click", (e) => {
        e.preventDefault();
        if (pop) {
          closePop();
        } else {
          openPop(ref);
        }
      });
      ref.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (pop) closePop();
          else openPop(ref);
        }
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePop();
    });
    document.addEventListener("click", (e) => {
      if (!pop) return;
      if (e.target.closest(".fn-pop")) return;
      if (e.target.closest("a.fn-ref")) return;
      closePop();
    });
  }

  // ---- Insights filter/sort -------------------------------------------------
  function initInsights() {
    const list = document.querySelector("[data-insights-list]");
    if (!list) return;

    const items = $$("[data-insight]", list);
    const search = document.querySelector("[data-insights-search]");
    const sort = document.querySelector("[data-insights-sort]");
    const pills = $$("[data-topic-pill]");
    const count = document.querySelector("[data-insights-count]");

    let activeTopic = "all";

    function parseDate(el) {
      const iso = el.dataset.date || "";
      const d = new Date(iso);
      return isNaN(d) ? new Date(0) : d;
    }

    function compare(a, b, mode) {
      const da = parseDate(a), db = parseDate(b);
      const la = Number(a.dataset.length || 0);
      const lb = Number(b.dataset.length || 0);
      const depthA = Number(a.dataset.depth || 0);
      const depthB = Number(b.dataset.depth || 0);

      switch (mode) {
        case "new":
          return db - da;
        case "old":
          return da - db;
        case "length":
          return lb - la;
        case "depth":
          return depthB - depthA;
        default:
          return db - da;
      }
    }

    function matches(el) {
      const q = (search?.value || "").trim().toLowerCase();
      const topic = el.dataset.topic || "general";
      const title = (el.querySelector("h3")?.textContent || "").toLowerCase();
      const desc = (el.querySelector("p")?.textContent || "").toLowerCase();

      const topicOk = activeTopic === "all" ? true : topic === activeTopic;
      const qOk = !q ? true : (title.includes(q) || desc.includes(q));
      return topicOk && qOk;
    }

    function apply() {
      const mode = sort?.value || "new";

      // Sort by detaching and reattaching
      const sorted = items.slice().sort((a,b) => compare(a,b,mode));
      sorted.forEach(el => list.appendChild(el));

      let shown = 0;
      sorted.forEach(el => {
        const ok = matches(el);
        el.style.display = ok ? "" : "none";
        if (ok) shown++;
      });

      if (count) count.textContent = `${shown} shown`;
    }

    pills.forEach(btn => {
      btn.addEventListener("click", () => {
        pills.forEach(b => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        activeTopic = btn.dataset.topic || "all";
        apply();
      });
    });

    search?.addEventListener("input", apply);
    sort?.addEventListener("change", apply);

    apply();
  }

  // ---- Init -----------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    initReadingMeta();
    initTOC();
    initFootnotes();
    initInsights();
  });
})();
