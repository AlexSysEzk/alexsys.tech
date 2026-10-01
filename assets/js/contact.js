/* ==========================================================
   contact.js
   1) Monta email y teléfono en el navegador para que no
      aparezcan en el HTML (los bots básicos no ejecutan JS).
   2) Valida el formulario de contacto antes de enviarlo.
   ========================================================== */
(() => {
  "use strict";

  const reverse = (s) => s.split("").reverse().join("");

  /* ---------- Email ---------- */
  document.querySelectorAll(".js-email").forEach((el) => {
    const email = `${reverse(el.dataset.u)}@${reverse(el.dataset.d)}`;
    el.href = `mailto:${email}`;
    const label = el.querySelector("span");
    if (label) label.textContent = email;
  });

  /* ---------- Teléfono ---------- */
  document.querySelectorAll(".js-phone").forEach((el) => {
    const phone = reverse(el.dataset.p);
    el.href = `tel:${phone.replace(/\s/g, "")}`;
    const label = el.querySelector("span");
    if (label) label.textContent = phone;
  });

  /* ---------- Formulario ---------- */
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const rules = {
    nombre: (v) => (v.trim().length >= 2 ? "" : "Escribe tu nombre."),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Escribe un email válido, por ejemplo nombre@empresa.com."),
    mensaje: (v) => (v.trim().length >= 10 ? "" : "Cuéntame un poco más (mínimo 10 caracteres).")
  };

  const check = (input) => {
    const rule = rules[input.name];
    if (!rule) return true;
    const msg = rule(input.value);
    const field = input.closest(".field");
    const error = field ? field.querySelector(".field__error") : null;
    if (field) field.classList.toggle("has-error", Boolean(msg));
    if (error) error.textContent = msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  };

  form.querySelectorAll("input, textarea").forEach((input) => {
    input.addEventListener("input", () => {
      if (input.closest(".field")?.classList.contains("has-error")) check(input);
    });
    input.addEventListener("blur", () => {
      if (input.value) check(input);
    });
  });

  form.addEventListener("submit", (e) => {
    const inputs = [...form.querySelectorAll("input[name], textarea[name]")];
    const results = inputs.map(check);
    if (results.includes(false)) {
      e.preventDefault();
      const firstBad = inputs[results.indexOf(false)];
      if (firstBad) firstBad.focus();
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Enviando…";
    }
  });
})();
