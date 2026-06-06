/* Site-wide search for the homepage. Merges the static SITE_INDEX with the
   DUNA directory (dunas-data.js) and filters live into a results dropdown. */
(function () {
  var input = document.getElementById("site-search-input");
  var panel = document.getElementById("site-search-results");
  if (!input || !panel) return;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  // Build the combined corpus once.
  var corpus = (window.SITE_INDEX || []).slice();
  (window.DUNAS || []).forEach(function (d) {
    corpus.push({
      title: d.name,
      type: "DUNA",
      url: d.symbol + ".html",
      text: d.by + " · " + d.tag + " · " + d.type + " · " + d.coin + " · " + d.blurb
    });
  });

  function snippet(text, q) {
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return text.slice(0, 90) + (text.length > 90 ? "…" : "");
    var start = Math.max(0, i - 30);
    var end = Math.min(text.length, i + q.length + 60);
    return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  }

  var active = -1, current = [];

  function render(q) {
    current = [];
    if (q) {
      var ql = q.toLowerCase();
      corpus.forEach(function (e) {
        var hay = (e.title + " " + e.type + " " + e.text).toLowerCase();
        var idx = hay.indexOf(ql);
        if (idx > -1) {
          // rank: title hits first, then earlier matches
          var titleHit = e.title.toLowerCase().indexOf(ql) > -1 ? 0 : 1;
          current.push({ e: e, rank: titleHit * 1000 + idx });
        }
      });
      current.sort(function (a, b) { return a.rank - b.rank; });
      current = current.slice(0, 8).map(function (x) { return x.e; });
    }
    active = -1;
    if (!q) { panel.hidden = true; panel.innerHTML = ""; return; }
    if (!current.length) {
      panel.hidden = false;
      panel.innerHTML = '<div class="search-empty">No matches for &ldquo;' + esc(q) + '&rdquo;.</div>';
      return;
    }
    panel.hidden = false;
    panel.innerHTML = current.map(function (e, i) {
      return '<a class="search-result" href="' + e.url + '" data-i="' + i + '">' +
        '<span class="sr-type">' + esc(e.type) + '</span>' +
        '<span class="sr-title">' + esc(e.title) + '</span>' +
        '<span class="sr-snip">' + esc(snippet(e.text, q.toLowerCase())) + '</span>' +
        '</a>';
    }).join("");
  }

  function setActive(n) {
    var items = panel.querySelectorAll(".search-result");
    if (!items.length) return;
    active = (n + items.length) % items.length;
    items.forEach(function (el, i) { el.classList.toggle("is-active", i === active); });
    items[active].scrollIntoView({ block: "nearest" });
  }

  input.addEventListener("input", function () { render(input.value.trim()); });
  input.addEventListener("focus", function () { if (input.value.trim()) render(input.value.trim()); });
  input.addEventListener("keydown", function (e) {
    var items = panel.querySelectorAll(".search-result");
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") {
      if (active > -1 && items[active]) { location.href = items[active].getAttribute("href"); }
      else if (current[0]) { location.href = current[0].url; }
    } else if (e.key === "Escape") { panel.hidden = true; input.blur(); }
  });
  document.addEventListener("click", function (e) {
    if (!panel.contains(e.target) && e.target !== input) { panel.hidden = true; }
  });
})();
