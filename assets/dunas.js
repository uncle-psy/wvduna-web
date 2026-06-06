/* DUNAs directory: search, sort, render, Join-with-login-dialog, and profile.
   Draft only — no backend; the member is treated as logged out. */
(function () {
  var DUNAS = window.DUNAS || [];
  // Draft auth state. Set to true to simulate a logged-in member.
  var LOGGED_IN = window.WVDUNA_LOGGED_IN === true;

  /* ---------- themed placeholder graphics (lucide-style line icons) ---------- */
  var ICONS = {
    "Land & Water": '<path d="M3 17 9 7l4 6 3-4 5 8"/><path d="M3 20.5c1.5 0 1.5-1.3 3-1.3s1.5 1.3 3 1.3 1.5-1.3 3-1.3 1.5 1.3 3 1.3 1.5-1.3 3-1.3"/>',
    "Mutual Aid": '<path d="M12 20s-7-4.7-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.3-7 10-7 10Z"/>',
    "Commerce": '<path d="M4 9h16v11H4z"/><path d="M3 9 5 4h14l2 5"/><path d="M9.5 20v-5h5v5"/>',
    "Veterans": '<path d="M12 3l8 3v5c0 5-4 8.5-8 10-4-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
    "Agriculture": '<path d="M12 21v-9"/><path d="M12 12C12 8.5 9 6 5.5 6 5.5 9.5 8.5 12 12 12Z"/><path d="M12 12c0-3.5 3-6 6.5-6 0 3.5-3 6-6.5 6Z"/>',
    "DePIN": '<circle cx="12" cy="11" r="2"/><path d="M12 13v8"/><path d="M7.6 6.6a6 6 0 0 0 0 8.8"/><path d="M16.4 6.6a6 6 0 0 1 0 8.8"/><path d="M5 4a9 9 0 0 0 0 14"/><path d="M19 4a9 9 0 0 1 0 14"/>',
    "Health": '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    "Agents": '<rect x="5" y="9" width="14" height="10" rx="2"/><path d="M12 9V5"/><circle cx="12" cy="4" r="1"/><path d="M9.5 14h.01"/><path d="M14.5 14h.01"/><path d="M2 13v2"/><path d="M22 13v2"/>',
    "Arts": '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.4 1-2 2-2h1.6A4.4 4.4 0 0 0 22 12.4 9 9 0 0 0 12 3Z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="16" cy="11" r="1"/>',
    "Civic": '<circle cx="12" cy="8" r="2"/><circle cx="12" cy="4.6" r="1.6"/><circle cx="8.6" cy="8" r="1.6"/><circle cx="15.4" cy="8" r="1.6"/><circle cx="12" cy="11.4" r="1.6"/><path d="M12 13v8"/>'
  };
  var ICON_FALLBACK = '<path d="M12 3l2.4 6.9H21l-5.3 4 2 6.6L12 16.6 6.3 20.5l2-6.6L3 9.9h6.6z"/>';
  function themeIcon(tag) {
    var inner = ICONS[tag] || ICON_FALLBACK;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }

  /* ---------- formatting ---------- */
  function money(n) {
    if (!n) return "—";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + "M";
    if (n >= 1e3) return "$" + Math.round(n / 1e3) + "k";
    return "$" + n;
  }
  function count(n) { return n.toLocaleString("en-US"); }
  function monthYear(iso) {
    var d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  /* ---------- login / sign-up modal ---------- */
  var modal;
  function buildModal() {
    if (modal) return modal;
    var o = document.createElement("div");
    o.className = "modal-overlay";
    o.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">' +
        '<button class="close" aria-label="Close">&times;</button>' +
        '<div class="tabs"><button data-tab="login" class="active">Log in</button><button data-tab="signup">Sign up</button></div>' +
        '<h3 id="authTitle">Welcome back</h3>' +
        '<p class="sub" data-sub>Log in to join this movement and start participating.</p>' +
        '<form data-demo>' +
          '<div class="field" data-name style="display:none"><label>Full name</label><input type="text" placeholder="Your name"></div>' +
          '<div class="field"><label>Email</label><input type="email" placeholder="you@example.com" required></div>' +
          '<div class="field"><label>Password</label><input type="password" placeholder="••••••••" required></div>' +
          '<button class="btn btn-gold btn-lg" type="submit" style="width:100%" data-submit>Log in &amp; join</button>' +
          '<p class="form-result muted" style="display:none;margin-top:1rem">This is a draft preview, so accounts aren’t wired up yet. In the live site you’d be joined right after signing in.</p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(o);
    modal = o;

    var form = o.querySelector("form");
    var nameField = o.querySelector("[data-name]");
    var sub = o.querySelector("[data-sub]");
    var title = o.querySelector("#authTitle");
    var submit = o.querySelector("[data-submit]");
    var tabs = o.querySelectorAll(".tabs button");

    function setTab(t) {
      tabs.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === t); });
      var signup = t === "signup";
      nameField.style.display = signup ? "" : "none";
      title.textContent = signup ? "Create your account" : "Welcome back";
      submit.textContent = signup ? "Sign up & join" : "Log in & join";
    }
    tabs.forEach(function (b) { b.addEventListener("click", function () { setTab(b.getAttribute("data-tab")); }); });

    o.querySelector(".close").addEventListener("click", closeModal);
    o.addEventListener("click", function (e) { if (e.target === o) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var r = o.querySelector(".form-result");
      if (r) r.style.display = "block";
    });

    o._setTab = setTab;
    o._sub = sub;
    return o;
  }
  function openAuthModal(dunaName, tab) {
    var o = buildModal();
    o._setTab(tab || "login");
    o._sub.textContent = dunaName
      ? "Log in or sign up to join " + dunaName + " and start participating."
      : "Log in to join this movement and start participating.";
    o.classList.add("open");
  }
  function closeModal() { if (modal) modal.classList.remove("open"); }

  function handleJoin(duna) {
    if (!LOGGED_IN) { openAuthModal(duna ? duna.name : null); return; }
    /* logged-in path would call the join API here */
    alert("You've joined " + (duna ? duna.name : "this DUNA") + ".");
  }

  /* ---------- list page ---------- */
  function initList() {
    var grid = document.getElementById("duna-grid");
    if (!grid) return;
    var search = document.getElementById("duna-search-input");
    var countEl = document.getElementById("duna-result-count");
    var sortBtns = Array.prototype.slice.call(document.querySelectorAll(".sort-btn"));

    var defaultDir = { created: "desc", treasury: "desc", members: "desc", mcap: "desc" };
    var state = { q: "", field: "created", dir: "desc" };

    function compare(a, b) {
      var va = a[state.field], vb = b[state.field];
      if (va < vb) return state.dir === "asc" ? -1 : 1;
      if (va > vb) return state.dir === "asc" ? 1 : -1;
      return 0;
    }
    function matches(d) {
      if (!state.q) return true;
      var hay = (d.name + " " + d.by + " " + d.tag + " " + d.coin + " " + d.blurb).toLowerCase();
      return hay.indexOf(state.q) !== -1;
    }
    function card(d) {
      return '<article class="duna-card accent-' + d.accent + '">' +
        '<div class="duna-cover">' +
          '<span class="tag">' + esc(d.tag) + '</span>' +
          '<span class="vis-badge ' + (d.type === "Public" ? "vis-public" : "vis-private") + '">' + d.type + '</span>' +
          '<span class="theme-ico">' + themeIcon(d.tag) + '</span>' +
          '<span class="coin-chip" title="' + esc(d.coin) + ' token">' + esc(d.coin) + '</span>' +
        '</div>' +
        '<div class="duna-body">' +
          '<h3>' + esc(d.name) + '</h3>' +
          '<div class="by">by <b>' + esc(d.by) + '</b> &middot; Registered ' + monthYear(d.created) + '</div>' +
          '<div class="duna-stats">' +
            '<div><span class="v">' + money(d.treasury) + '</span><span class="k">Treasury</span></div>' +
            '<div><span class="v">' + count(d.members) + '</span><span class="k">Members</span></div>' +
            '<div><span class="v">' + money(d.mcap) + '</span><span class="k">Market cap</span></div>' +
          '</div>' +
          '<div class="duna-ctas">' +
            '<button class="btn btn-gold btn-sm join-btn" data-id="' + d.id + '">Join</button>' +
            '<a class="more-link" href="' + d.symbol + '.html">Learn more →</a>' +
          '</div>' +
        '</div>' +
      '</article>';
    }
    function render() {
      var rows = DUNAS.filter(matches).slice().sort(compare);
      grid.innerHTML = rows.length
        ? rows.map(card).join("")
        : '<div class="no-results">No DUNAs match “' + esc(state.q) + '”. Try another search.</div>';
      if (countEl) countEl.textContent = rows.length + (rows.length === 1 ? " DUNA" : " DUNAs");
      grid.querySelectorAll(".join-btn").forEach(function (b) {
        b.addEventListener("click", function () {
          handleJoin(DUNAS.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0]);
        });
      });
    }
    function syncSortUI() {
      sortBtns.forEach(function (b) {
        var active = b.getAttribute("data-sort") === state.field;
        b.classList.toggle("active", active);
        var arrow = b.querySelector(".arrow");
        if (arrow) arrow.textContent = active ? (state.dir === "asc" ? "↑" : "↓") : "";
      });
    }
    sortBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-sort");
        if (state.field === f) { state.dir = state.dir === "asc" ? "desc" : "asc"; }
        else { state.field = f; state.dir = defaultDir[f] || "desc"; }
        syncSortUI(); render();
      });
    });
    if (search) search.addEventListener("input", function () { state.q = search.value.trim().toLowerCase(); render(); });

    syncSortUI();
    render();
  }

  /* ---------- profile page ---------- */
  function initProfile() {
    var mount = document.getElementById("duna-profile");
    if (!mount) return;
    var id = new URLSearchParams(location.search).get("id");
    var d = DUNAS.filter(function (x) { return x.id === id; })[0];
    if (!d) {
      mount.innerHTML = '<div class="no-results">That DUNA wasn’t found. <a href="dunas.html">Back to all DUNAs</a>.</div>';
      return;
    }
    document.title = d.name + " — WV DUNA";
    mount.innerHTML =
      '<div class="profile-head accent-' + d.accent + '">' +
        '<span class="profile-ico">' + themeIcon(d.tag) + '<span class="coin-chip">' + esc(d.coin) + '</span></span>' +
        '<div>' +
          '<div class="eyebrow" style="margin-bottom:8px">' + esc(d.tag) +
            ' <span class="dot">·</span> <span class="' + (d.type === "Public" ? "vis-public" : "vis-private") + '" style="position:static;padding:3px 8px;border-radius:999px;font-size:0.62rem">' + d.type + '</span></div>' +
          '<h1 class="display" style="font-size:clamp(2.2rem,5vw,3.4rem);margin:0">' + esc(d.name) + '</h1>' +
          '<p class="muted" style="margin:6px 0 0">by <b style="color:var(--fg)">' + esc(d.by) + '</b> &middot; Registered ' + monthYear(d.created) + '</p>' +
        '</div>' +
      '</div>' +
      '<p class="lede" style="margin:26px 0">' + esc(d.blurb) + '</p>' +
      '<div class="stats" style="margin-bottom:30px">' +
        '<div class="stat accent-' + d.accent + '"><div class="num">' + money(d.treasury) + '</div><div class="label">Treasury</div></div>' +
        '<div class="stat accent-' + d.accent + '"><div class="num">' + count(d.members) + '</div><div class="label">Members</div></div>' +
        '<div class="stat accent-' + d.accent + '"><div class="num">' + money(d.mcap) + '</div><div class="label">Market cap</div></div>' +
        '<div class="stat accent-' + d.accent + '"><div class="num" style="font-size:1.6rem">' + esc(d.coin) + '</div><div class="label">Token</div></div>' +
      '</div>' +
      '<div class="hero-cta">' +
        '<button class="btn btn-gold btn-lg" id="profile-join">Join ' + esc(d.name) + '</button>' +
        '<a class="btn btn-ghost btn-lg" href="dunas.html">← All DUNAs</a>' +
      '</div>';
    var jb = document.getElementById("profile-join");
    if (jb) jb.addEventListener("click", function () { handleJoin(d); });
  }

  window.WVDUNA = { openAuthModal: openAuthModal };
  document.addEventListener("DOMContentLoaded", function () { initList(); initProfile(); });
})();
