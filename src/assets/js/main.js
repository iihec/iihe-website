(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");

  // Mobile menu
  if (toggle) {
    toggle.addEventListener("click", function () {
      setHeaderHeight();
      var open = header.classList.toggle("nav-open");
      document.body.style.overflow = open ? "hidden" : "";
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".site-nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("nav-open");
        document.body.style.overflow = "";
        document.body.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Programmes dropdown (tap on mobile, click/keyboard on desktop; hover handled in CSS)
  document.querySelectorAll(".nav-parent").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".nav-item");
      var open = item.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", function (e) {
    document.querySelectorAll(".nav-item.is-open").forEach(function (item) {
      if (!item.contains(e.target)) {
        item.classList.remove("is-open");
        item.querySelector(".nav-parent").setAttribute("aria-expanded", "false");
      }
    });
  });

  // "Message admissions" panel
  var panel = document.getElementById("msg-panel");
  var triggers = document.querySelectorAll(".js-message");
  function setPanel(open) {
    if (!panel) return;
    panel.hidden = !open;
    triggers.forEach(function (t) { t.setAttribute("aria-expanded", String(open)); });
    if (open) {
      var first = panel.querySelector("a, button");
      if (first) first.focus();
    }
  }
  triggers.forEach(function (t) {
    t.addEventListener("click", function (e) {
      e.stopPropagation();
      setPanel(panel.hidden);
    });
  });
  document.querySelectorAll(".js-message-close").forEach(function (b) {
    b.addEventListener("click", function () { setPanel(false); });
  });
  document.addEventListener("click", function (e) {
    if (panel && !panel.hidden && !panel.contains(e.target)) setPanel(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      setPanel(false);
      if (header) header.classList.remove("nav-open");
    }
  });

  // Pre-select consultation form options from links like ?meeting=campus or ?programme=Business%20Management
  var params = new URLSearchParams(location.search);
  var pre = { meeting: params.get("meeting") === "campus" ? "IIHE Cambodia campus" : params.get("meeting"), programme: params.get("programme") };
  Object.keys(pre).forEach(function (name) {
    if (!pre[name]) return;
    var input = document.querySelector('.form input[name="' + name + '"][value="' + pre[name].replace(/"/g, "") + '"]');
    if (input) input.checked = true;
  });

  document.querySelectorAll(".js-year").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Mobile menu panel starts under the header
  function setHeaderHeight() {
    if (header) document.documentElement.style.setProperty("--header-h", header.getBoundingClientRect().bottom + "px");
  }
  setHeaderHeight();
  window.addEventListener("resize", setHeaderHeight);

  // Scroll reveal: each section rises and fades in once
  var sections = document.querySelectorAll("main > section:not(:first-child), main > article");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    sections.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) return; // already on screen: show at rest
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  // Tagline: words light up one by one as the section scrolls through the viewport
  var tagline = document.querySelector(".tagline-text");
  if (tagline) {
    var words = tagline.querySelectorAll(".w");
    var ticking = false;
    function paint() {
      ticking = false;
      var r = tagline.getBoundingClientRect();
      var vh = window.innerHeight;
      var progress = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
      var lit = Math.round(Math.max(0, Math.min(1, progress)) * words.length);
      words.forEach(function (w, i) { w.classList.toggle("on", i < lit); });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  // Consultation form: inline validation instead of browser pop-ups
  document.querySelectorAll("form.form").forEach(function (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", function (e) {
      var ok = true;
      form.querySelectorAll("[data-validate]").forEach(function (input) {
        var msg = "";
        var v = input.value.trim();
        if (!v) msg = input.dataset.required;
        else if (input.type === "tel" && v.replace(/[^0-9]/g, "").length < 8 && v.charAt(0) !== "@") msg = input.dataset.invalid;
        var err = document.getElementById(input.id + "-error");
        if (err) { err.textContent = msg; err.hidden = !msg; }
        input.setAttribute("aria-invalid", msg ? "true" : "false");
        if (msg && ok) { ok = false; input.focus(); }
      });
      if (!ok) e.preventDefault();
    });
  });
})();
