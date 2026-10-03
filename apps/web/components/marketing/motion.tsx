"use client";

import { useEffect } from "react";

/**
 * The page's motion, in one place so every section stays a server component:
 * - the nav turns to glass once the page scrolls;
 * - [data-depth] layers move at their own rate on scroll (parallax) and, with a mouse, lean toward the pointer;
 * - [data-reveal] blocks below the fold fade and slide in when they arrive (staggered by --i).
 * Content starts visible: nothing is hidden unless this runs and motion is allowed, so reduced-motion visitors
 * and anyone without JavaScript see the whole page as it is.
 */
export function MarketingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-mkt]");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nav = root.querySelector<HTMLElement>("[data-mkt-nav]");
    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]"));
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let queued = false;
    let raf = 0;

    const update = () => {
      queued = false;
      const y = window.scrollY;
      nav?.toggleAttribute("data-scrolled", y > 12);
      if (reduce.matches) return;
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;
      // The hero is the only place with layers; past it there is nothing to move.
      if (y < window.innerHeight * 1.6) {
        // Phones scroll the hero further relative to its height: a gentler rate keeps the cards near the phone.
        const scale = window.innerWidth < 1024 ? 0.35 : 1;
        for (const el of layers) {
          const depth = (Number(el.dataset.depth) || 0) * (el.classList.contains("mkt-hero-bg") ? 1 : scale);
          const lean = Number(el.dataset.lean) || 0;
          el.style.transform = `translate3d(${(pointer.x * lean).toFixed(2)}px, ${(y * depth + pointer.y * lean).toFixed(2)}px, 0)`;
        }
      }
      // Keep easing toward the pointer until it settles.
      if (Math.abs(pointer.tx - pointer.x) > 0.05 || Math.abs(pointer.ty - pointer.y) > 0.05) schedule();
    };
    const schedule = () => { if (!queued) { queued = true; raf = requestAnimationFrame(update); } };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || reduce.matches) return;
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      schedule();
    };
    const onReduce = () => {
      if (reduce.matches) for (const el of layers) el.style.transform = "";
      schedule();
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    reduce.addEventListener("change", onReduce);
    update();

    // Reveals: only blocks that start below the fold are hidden, and only when motion is allowed.
    let io: IntersectionObserver | null = null;
    if (!reduce.matches && "IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("mkt-in");
          io?.unobserve(e.target);
        }
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
      for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"))) {
        if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
          el.classList.add("mkt-will");
          io.observe(el);
        }
      }
    }

    // The phone menu closes when one of its links is used.
    const menu = root.querySelector<HTMLDetailsElement>("details[data-mkt-menu]");
    const onMenuClick = (e: Event) => { if ((e.target as HTMLElement).closest("a")) menu?.removeAttribute("open"); };
    menu?.addEventListener("click", onMenuClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointer);
      reduce.removeEventListener("change", onReduce);
      menu?.removeEventListener("click", onMenuClick);
      io?.disconnect();
    };
  }, []);

  return null;
}
