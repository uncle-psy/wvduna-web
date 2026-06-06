// WV DUNA — light front-end behavior (no dependencies)
document.addEventListener("DOMContentLoaded", function () {
  // Mobile nav
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
      toggle.textContent = links.classList.contains("open") ? "✕" : "☰";
    });
  }

  // Allies submenu: hover to reveal, click to pin/unpin
  var alliesToggle = document.getElementById("allies-toggle");
  var subnav = document.getElementById("subnav");
  var header = document.querySelector(".site-header");
  if (alliesToggle && subnav && header) {
    var pinned = subnav.classList.contains("pinned");
    function showSub(){ subnav.classList.add("open"); alliesToggle.setAttribute("aria-expanded","true"); }
    function hideSub(){ if(!pinned){ subnav.classList.remove("open"); alliesToggle.setAttribute("aria-expanded","false"); } }
    alliesToggle.addEventListener("mouseenter", showSub);
    subnav.addEventListener("mouseenter", showSub);
    header.addEventListener("mouseleave", hideSub);
    alliesToggle.addEventListener("click", function(e){
      e.preventDefault();
      pinned = !pinned;
      subnav.classList.toggle("pinned", pinned);
      subnav.classList.toggle("open", pinned);
      alliesToggle.setAttribute("aria-expanded", pinned ? "true" : "false");
    });
  }

  // Reveal on scroll
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // Animated stat counters
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var prefix = el.getAttribute("data-prefix") || "";
    var dur = 1400, start = null;
    function fmt(n) {
      if (target >= 1000) return Math.round(n).toLocaleString("en-US");
      if (target % 1 !== 0) return n.toFixed(1);
      return Math.round(n).toString();
    }
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + fmt(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  }

  // Demo forms (DRAFT — no backend)
  document.querySelectorAll("form[data-demo]").forEach(function (f) {
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msg = f.querySelector(".form-result");
      if (msg) { msg.style.display = "block"; }
      f.querySelectorAll("input,select,textarea,button").forEach(function (i) { i.disabled = true; });
    });
  });
});
