/* DUNAs directory: search, sort, render, Join-with-login-dialog, and profile.
   Draft only — no backend; the member is treated as logged out. */
(function () {
  var DUNAS = window.DUNAS || [];
  // Draft auth state. Set to true to simulate a logged-in member.
  var LOGGED_IN = window.WVDUNA_LOGGED_IN === true;

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
      var va, vb;
      if (state.field === "created") { va = a.created; vb = b.created; }
      else { va = a[state.field]; vb = b[state.field]; }
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
          '<span class="coin" title="' + esc(d.coin) + ' token">' + esc(d.coin) + '</span>' +
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
            '<button class="btn btn-gold join-btn" data-id="' + d.id + '">Join</button>' +
            '<a class="btn btn-ghost" href="duna.html?id=' + d.id + '">Learn more</a>' +
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
        '<span class="coin coin-lg" title="' + esc(d.coin) + ' token">' + esc(d.coin) + '</span>' +
        '<div>' +
          '<div class="eyebrow" style="margin-bottom:8px">' + esc(d.tag) +
            ' <span class="dot">·</span> <span class="' + (d.type === "Public" ? "vis-public" : "vis-private") + '" style="padding:3px 8px;border-radius:999px;font-size:0.62rem">' + d.type + '</span></div>' +
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
