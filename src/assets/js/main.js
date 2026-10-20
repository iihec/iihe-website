(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");

  // Mobile menu
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".site-nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("nav-open");
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
})();
