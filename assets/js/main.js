/* ==========================================================
   main.js — interacción general de la página
   ========================================================== */
(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const progress = document.querySelector(".progress");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Menú móvil ---------- */
  if (nav && toggle) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    };

    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));

    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target)) setOpen(false);
    });
  }

  /* ---------- Barra de progreso y sombra del menú ---------- */
  let ticking = false;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    if (progress) progress.style.setProperty("--progress", ratio.toFixed(4));
    if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 20);
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* ---------- Sección activa en el menú ---------- */
  const links = [...document.querySelectorAll('.nav__link[href^="#"]')];
  const sections = links
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => {
          l.classList.toggle("is-active", l.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Barras de idiomas ---------- */
  const fillBar = (bar) => bar.style.setProperty("--w", `${bar.dataset.level}%`);

  /* ---------- Aparición escalonada al hacer scroll ---------- */
  const reveals = [...document.querySelectorAll(".reveal")];

  // Escalonar elementos hermanos dentro de la misma rejilla
  reveals.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    el.style.setProperty("--i", siblings.indexOf(el));
  });

  const show = (el) => {
    el.classList.add("is-visible");
    el.querySelectorAll(".lang__fill").forEach(fillBar);
  };

  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(show);
    document.querySelectorAll(".lang__fill").forEach(fillBar);
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        show(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Año del pie ---------- */
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
