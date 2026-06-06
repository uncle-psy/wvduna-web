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

  // Directory pages: client-side search + sort over profile cards
  var dirGrid = document.getElementById("dir-grid");
  if (dirGrid) {
    var dirSearch = document.getElementById("dir-search");
    var dirCount = document.getElementById("dir-count");
    var sortWrap = document.getElementById("dir-sort");
    var cards = Array.prototype.slice.call(dirGrid.children);
    var LISTLABELS = ["joined", "founded", "projects", "initiatives", "sponsoring"];
    function nameOf(c) { var h = c.querySelector("h3"); return h ? h.textContent.trim().toLowerCase() : ""; }
    function roleOf(c) { var r = c.querySelector(".founder-role, .kicker"); return r ? r.textContent.trim().toLowerCase() : ""; }
    function countOf(c) {
      var rows = c.querySelectorAll(".founder-links > div, .sponsor-links");
      for (var i = 0; i < rows.length; i++) {
        var k = rows[i].querySelector(".k");
        if (k && LISTLABELS.indexOf(k.textContent.trim().toLowerCase()) >= 0) {
          return rows[i].querySelectorAll("a").length;
        }
      }
      return 0;
    }
    var sortKey = "name", sortDir = 1;
    function applyDir() {
      var q = (dirSearch && dirSearch.value || "").trim().toLowerCase();
      var visible = cards.filter(function (c) {
        var show = !q || c.textContent.toLowerCase().indexOf(q) >= 0;
        c.style.display = show ? "" : "none";
        return show;
      });
      visible.sort(function (a, b) {
        var r;
        if (sortKey === "count") r = countOf(a) - countOf(b);
        else if (sortKey === "role") r = roleOf(a) < roleOf(b) ? -1 : roleOf(a) > roleOf(b) ? 1 : 0;
        else r = nameOf(a) < nameOf(b) ? -1 : nameOf(a) > nameOf(b) ? 1 : 0;
        return r * sortDir;
      });
      visible.forEach(function (c) { dirGrid.appendChild(c); });
      if (dirCount) dirCount.textContent = q || sortKey !== "name"
        ? "Showing " + visible.length + " of " + cards.length
        : cards.length + (cards.length === 1 ? " profile" : " profiles");
    }
    if (dirSearch) dirSearch.addEventListener("input", applyDir);
    if (sortWrap) {
      sortWrap.querySelectorAll(".sort-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var k = btn.getAttribute("data-sort");
          if (sortKey === k) sortDir = -sortDir;
          else { sortKey = k; sortDir = (k === "count") ? -1 : 1; }
          sortWrap.querySelectorAll(".sort-btn").forEach(function (b) {
            var on = b === btn;
            b.classList.toggle("active", on);
            var ar = b.querySelector(".arrow");
            if (ar) ar.textContent = on ? (sortDir > 0 ? "\u2191" : "\u2193") : "";
          });
          applyDir();
        });
      });
      var def = sortWrap.querySelector('[data-sort="name"]');
      if (def) { def.classList.add("active"); var a0 = def.querySelector(".arrow"); if (a0) a0.textContent = "\u2191"; }
    }
    applyDir();
  }

  // Launchpad: status filter + search + sort
  var launchGrid = document.getElementById("launch-grid");
  if (launchGrid) {
    var lSearch = document.getElementById("launch-search");
    var lCount = document.getElementById("launch-count");
    var filterWrap = document.getElementById("launch-filter");
    var lsortWrap = document.getElementById("launch-sort");
    var lcards = Array.prototype.slice.call(launchGrid.children);
    var curFilter = "all", lsortKey = null, lsortDir = 1;
    function num(c, a) { return parseFloat(c.getAttribute(a)) || 0; }
    function applyLaunch() {
      var q = (lSearch && lSearch.value || "").trim().toLowerCase();
      var visible = lcards.filter(function (c) {
        var okF = curFilter === "all" || c.getAttribute("data-status") === curFilter;
        var okQ = !q || c.textContent.toLowerCase().indexOf(q) >= 0;
        var show = okF && okQ;
        c.style.display = show ? "" : "none";
        return show;
      });
      if (lsortKey) {
        visible.sort(function (a, b) {
          var r;
          if (lsortKey === "ending") r = num(a, "data-days") - num(b, "data-days");
          else if (lsortKey === "committed") r = num(a, "data-committed") - num(b, "data-committed");
          else if (lsortKey === "progress") r = num(a, "data-progress") - num(b, "data-progress");
          else r = num(a, "data-goal") - num(b, "data-goal");
          return r * lsortDir;
        });
        visible.forEach(function (c) { launchGrid.appendChild(c); });
      }
      if (lCount) lCount.textContent = "Showing " + visible.length + " of " + lcards.length + " launches";
    }
    if (lSearch) lSearch.addEventListener("input", applyLaunch);
    if (filterWrap) filterWrap.querySelectorAll(".sort-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        curFilter = btn.getAttribute("data-filter");
        filterWrap.querySelectorAll(".sort-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
        applyLaunch();
      });
    });
    if (lsortWrap) lsortWrap.querySelectorAll(".sort-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var k = btn.getAttribute("data-lsort");
        if (lsortKey === k) lsortDir = -lsortDir;
        else { lsortKey = k; lsortDir = (k === "ending") ? 1 : -1; }
        lsortWrap.querySelectorAll(".sort-btn").forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("active", on);
          var ar = b.querySelector(".arrow");
          if (ar) ar.textContent = on ? (lsortDir > 0 ? "\u2191" : "\u2193") : "";
        });
        applyLaunch();
      });
    });
    applyLaunch();
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
