/* =========================================================================
   WV DUNA — Integrated App prototype engine
   Vanilla JS. Nothing is wired to a backend; this demonstrates the
   experience: login -> first-run Host's Ally chat -> Active/Builder modes,
   level-adaptive UI, responsive + install/reader-app behavior.
   ========================================================================= */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- Levels ---------------------------------------------------------- */
  var LEVELS = [
    { id: "guest",    name: "Guest",    hold: "Free",        allot: "Starter" },
    { id: "member",   name: "Member",   hold: "$10",         allot: "Monthly" },
    { id: "founder",  name: "Founder",  hold: "$100",        allot: "Larger" },
    { id: "builder",  name: "Builder",  hold: "$1,000",      allot: "High runtime" },
    { id: "sponsor",  name: "Sponsor",  hold: "$10,000",     allot: "At scale" },
    { id: "catalyst", name: "Catalyst", hold: "$100,000",    allot: "Enterprise" },
    { id: "luminary", name: "Luminary", hold: "$1,000,000",  allot: "Planetary" }
  ];
  function levelIndex(id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return i; return 0; }

  var OS_LABELS = { mac: "macOS", windows: "Windows", chromeos: "ChromeOS", ios: "iOS", android: "Android", linux: "Linux" };

  var state = {
    mode: "active",
    level: "member",
    view: "chat",
    env: "web",          // web | installed
    os: "mac",
    firstRun: true,
    loggedIn: false,
    allyCreated: false
  };

  var app = $("#app");

  /* ---- Mode ------------------------------------------------------------ */
  var MODE_DEFAULT = { active: "chat", builder: "agents" };
  function setMode(mode, opts) {
    state.mode = mode;
    app.setAttribute("data-mode", mode);
    $$("[data-setmode]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-setmode") === mode); });
    $("#rail-active").hidden = mode !== "active";
    $("#rail-builder").hidden = mode !== "builder";
    $("#bottom-nav").hidden = mode !== "active";
    if (!opts || opts.go !== false) go(MODE_DEFAULT[mode]);
  }

  /* ---- View routing ---------------------------------------------------- */
  var VIEW_MODE = {}; // view -> mode (built from nav)
  function indexViews() {
    $$("#rail-active [data-go]").forEach(function (n) { VIEW_MODE[n.getAttribute("data-go")] = "active"; });
    $$("#rail-builder [data-go]").forEach(function (n) { VIEW_MODE[n.getAttribute("data-go")] = "builder"; });
    VIEW_MODE["chat"] = "active"; VIEW_MODE["setup"] = "builder";
  }
  function go(view) {
    var m = VIEW_MODE[view];
    if (m && m !== state.mode) setMode(m, { go: false });
    state.view = view;
    $$(".view").forEach(function (v) { v.classList.toggle("is-active", v.getAttribute("data-view") === view); });
    $$("[data-go]").forEach(function (n) { n.classList.toggle("active", n.getAttribute("data-go") === view); });
    var sc = $(".main-scroll"); if (sc) sc.scrollTop = 0;
    closeDrawer();
    closeAllSheets();
    // mobile chat: reset to list when entering chat
    var cl = $(".chat-layout"); if (cl && view === "chat") cl.classList.remove("show-thread");
  }

  /* ---- Level / capability --------------------------------------------- */
  function applyLevel() {
    var idx = levelIndex(state.level);
    app.setAttribute("data-level", state.level);
    var L = LEVELS[idx];
    // badge pips (appbar + profile)
    $$(".level-badge .pips").forEach(function (pips) {
      pips.innerHTML = "";
      for (var i = 0; i < 7; i++) { var d = document.createElement("i"); if (i <= idx) d.className = "on"; pips.appendChild(d); }
    });
    if ($("#level-name")) $("#level-name").textContent = L.name;
    // lock anything above this level
    $$("[data-minlevel]").forEach(function (el) {
      var locked = idx < parseInt(el.getAttribute("data-minlevel"), 10);
      el.classList.toggle("is-locked", locked);
      if (el.classList.contains("upgrade-note")) el.hidden = !locked;
      if (el.tagName === "BUTTON" && el.hasAttribute("data-lockbtn")) el.disabled = locked;
    });
    // level meter nodes
    $$("#level-meter .level-node").forEach(function (node, i) {
      node.classList.toggle("done", i < idx);
      node.classList.toggle("current", i === idx);
    });
    // allotment + holding figures
    $$("[data-allotment]").forEach(function (e) { e.textContent = L.allot; });
    $$("[data-holding]").forEach(function (e) { e.textContent = L.hold; });
    $$("[data-levelname]").forEach(function (e) { e.textContent = L.name; });
    // next-level upsell text
    var next = LEVELS[Math.min(idx + 1, 6)];
    $$("[data-nextlevel]").forEach(function (e) { e.textContent = next.name; });
    $$("[data-nexthold]").forEach(function (e) { e.textContent = next.hold; });
  }

  /* ---- Platform / install / reader-app -------------------------------- */
  function detectOS() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    if (/Android/i.test(ua)) return "android";
    if (/CrOS/i.test(ua)) return "chromeos";
    if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
    if (/Windows/i.test(ua)) return "windows";
    if (/Linux/i.test(ua)) return "linux";
    return "mac";
  }
  function applyPlatform() {
    app.setAttribute("data-env", state.env);
    app.setAttribute("data-os", state.os);
    var osName = OS_LABELS[state.os] || "your device";
    var mobile = (state.os === "ios" || state.os === "android");
    // Install banner (only on web)
    var banner = $("#install-banner");
    if (banner) {
      banner.hidden = state.env !== "web";
      var t = $("#install-text");
      if (t) {
        if (mobile) t.innerHTML = "You're on the web app. <b>Get the WVDUNA app</b> for " + osName + " — faster, with notifications.";
        else t.innerHTML = "You're on the web app. <b>Install WVDUNA for " + osName + "</b> for a faster, native experience.";
      }
      var cta = $("#install-cta");
      if (cta) cta.textContent = mobile ? "Open in App Store" : "Download for " + osName;
    }
    // Reader-app messaging on the login screen (installed apps can't create accounts)
    if ($("#reader-note")) $("#reader-note").hidden = state.env !== "installed";
    if ($("#reader-note-2")) $("#reader-note-2").hidden = state.env !== "installed";
    if ($("#web-signup")) $("#web-signup").hidden = state.env === "installed";
    $$("[data-osname]").forEach(function (e) { e.textContent = osName; });
  }

  /* ---- Auth ------------------------------------------------------------ */
  // Session persistence (prototype): remember login across reloads.
  function saveSession() {
    try { localStorage.setItem("wvduna_session", JSON.stringify({ loggedIn: true, level: state.level })); } catch (e) {}
  }
  function clearSession() { try { localStorage.removeItem("wvduna_session"); } catch (e) {} }
  function readSession() {
    try { return JSON.parse(localStorage.getItem("wvduna_session") || "null"); } catch (e) { return null; }
  }

  function login(opts) {
    state.loggedIn = true;
    if (!opts || opts.persist !== false) saveSession();
    $("#auth").hidden = true;
    app.hidden = false;
    applyLevel(); applyPlatform();
    setMode("active", { go: false });
    go("chat");
    openChat(state.firstRun ? "host" : "alchemist");
  }
  function logout() {
    state.loggedIn = false;
    clearSession();
    app.hidden = true;
    $("#auth").hidden = false;
    closeAllSheets();
  }

  /* ---- Chat ------------------------------------------------------------ */
  var CHATS = {
    host: {
      name: "The Big Kiduna", tag: "Your Host's Ally · WV DUNA", ava: "K", cls: "host",
      greeting: "Welcome to the DUNAVERSE. I'm the Big Kiduna — the ally your host left running for you. Ask me anything, or tell me what you're here to do. You don't have to set anything up to start."
    },
    concierge: {
      name: "Your Concierge", tag: "Personal Ally", ava: "C", cls: "",
      greeting: "Hi — I'm your Concierge. I can keep track of what matters to you across WV DUNA. Want to teach me something, or just talk?"
    },
    alchemist: {
      name: "The Alchemist", tag: "Personal · Published", ava: "A", cls: "violet",
      greeting: "The Alchemist is really you. The work is to initiate you into the mysteries of your own soul. Where shall we begin?"
    }
  };
  var REPLIES = [
    "Here's how I'd approach that. The short version: you already have everything you need to begin, and we can deepen it whenever you want.",
    "Good question. In WV DUNA terms, that lives under your DUNA's treasury and governance — I can walk you through it, or just handle the first step for you.",
    "I can do that. Want me to draft it now, or set it up as a standing skill so it happens on its own?",
    "Done in spirit — in the live app I'd carry that out and report back. For now, here's what it would look like."
  ];
  var replyTick = 0;

  function openChat(id) {
    var c = CHATS[id]; if (!c) return;
    $$(".chat-item").forEach(function (it) { it.classList.toggle("active", it.getAttribute("data-chat") === id); });
    $("#thread-name").textContent = c.name;
    $("#thread-tag").textContent = c.tag;
    var av = $("#thread-ava"); av.textContent = c.ava; av.className = "t-ava " + (c.cls || "");
    var box = $("#thread-msgs");
    box.innerHTML = "";
    addMsg("ally", c.ava, c.greeting, c.cls);
    if (id === "host") {
      var chips = document.createElement("div");
      chips.className = "chips-inline";
      ["What can I do here?", "Set up my profile & Ally", "Show me what's happening", "Just exploring"].forEach(function (q) {
        var b = document.createElement("button"); b.textContent = q; b.setAttribute("data-quickmsg", q); chips.appendChild(b);
      });
      $("#thread-msgs > .msg:last-child .bubble").appendChild(chips);
    }
    var cl = $(".chat-layout"); if (cl) cl.classList.add("show-thread");
  }
  function addMsg(who, ava, text, cls) {
    var box = $("#thread-msgs");
    var m = document.createElement("div"); m.className = "msg " + who;
    var a = document.createElement("div"); a.className = "m-ava " + (cls || ""); a.textContent = who === "me" ? "You" : ava;
    if (who === "me") a.textContent = "Y";
    var b = document.createElement("div"); b.className = "bubble"; b.textContent = text;
    m.appendChild(a); m.appendChild(b); box.appendChild(m);
    var sc = $("#thread-scroll"); if (sc) sc.scrollTop = sc.scrollHeight;
    return b;
  }
  function send(text) {
    text = (text || "").trim(); if (!text) return;
    addMsg("me", "Y", text);
    var ti = $("#composer-input"); if (ti) { ti.value = ""; ti.style.height = "auto"; }
    if (/set ?up|profile|create.*(ally|agent)/i.test(text)) {
      setTimeout(function () {
        addMsg("ally", "K", "Let's build your personal Ally — it takes four short steps: Inform, Instruct, Empower, Align. You can stop anytime and just chat.", "host");
        var last = $("#thread-msgs > .msg:last-child .bubble");
        var chips = document.createElement("div"); chips.className = "chips-inline";
        var b = document.createElement("button"); b.textContent = "Start setup →"; b.onclick = function () { go("setup"); wizGo(1); }; chips.appendChild(b);
        last.appendChild(chips);
      }, 420);
      return;
    }
    setTimeout(function () { addMsg("ally", "K", REPLIES[replyTick % REPLIES.length], "host"); replyTick++; }, 420);
  }

  /* ---- Setup wizard (Inform / Instruct / Empower / Align) -------------- */
  var wizStep = 1;
  function wizGo(n) {
    wizStep = Math.max(1, Math.min(4, n));
    $$("[data-wizstep]").forEach(function (p) { p.hidden = parseInt(p.getAttribute("data-wizstep"), 10) !== wizStep; });
    $$(".wiz-step").forEach(function (s, i) {
      s.classList.toggle("done", i < wizStep - 1);
      s.classList.toggle("current", i === wizStep - 1);
    });
    $("#wiz-back").style.visibility = wizStep === 1 ? "hidden" : "visible";
    $("#wiz-next").textContent = wizStep === 4 ? "Create my Ally ✦" : "Continue →";
  }
  function wizFinish() {
    state.allyCreated = true;
    go("chat");
    // add concierge chat to list if not present
    var list = $("#chatlist");
    if (list && !$('.chat-item[data-chat="concierge"]')) {
      var btn = document.createElement("button");
      btn.className = "chat-item"; btn.setAttribute("data-chat", "concierge");
      btn.innerHTML = '<span class="chat-ava">C</span><span class="lr-main"><span class="ci-name">Your Concierge</span><span class="ci-snip">Personal Ally · just now</span></span><span class="ci-time">now</span>';
      btn.addEventListener("click", function () { openChat("concierge"); });
      list.insertBefore(btn, list.firstChild);
    }
    openChat("concierge");
    toast("Your personal Ally is live ✦");
  }

  /* ---- Sheets / menus -------------------------------------------------- */
  function openSheet(id, anchor) {
    closeAllSheets();
    var sh = document.getElementById(id); if (!sh) return;
    sh.classList.add("open"); $("#scrim").classList.add("open");
    if (anchor) {
      var r = anchor.getBoundingClientRect();
      var top = r.bottom + 8, right = window.innerWidth - r.right;
      sh.style.top = top + "px"; sh.style.right = right + "px"; sh.style.left = "auto"; sh.style.bottom = "auto";
    }
  }
  function closeAllSheets() { $$(".sheet").forEach(function (s) { s.classList.remove("open"); }); var sc = $("#scrim"); if (sc) sc.classList.remove("open"); }

  /* ---- Mobile drawer (builder nav) ------------------------------------ */
  function openDrawer() { app.classList.add("drawer-open"); $("#rail-builder").hidden = false; $("#rail-builder").classList.add("as-drawer"); $("#scrim").classList.add("open"); }
  function closeDrawer() { app.classList.remove("drawer-open"); var r = $("#rail-builder"); if (r) r.classList.remove("as-drawer"); }

  /* ---- Toast ----------------------------------------------------------- */
  function toast(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:var(--accent);color:var(--on-accent);font-weight:700;padding:11px 18px;border-radius:999px;z-index:400;box-shadow:var(--shadow-lg);font-size:.9rem";
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = "opacity .4s"; t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 400); }, 1900);
  }

  /* ---- Prototype panel ------------------------------------------------- */
  function applyDevice(d) {
    document.body.classList.remove("sim-tablet", "sim-phone");
    if (d === "tablet") document.body.classList.add("sim-tablet");
    if (d === "phone") document.body.classList.add("sim-phone");
  }

  /* ---- Wire up --------------------------------------------------------- */
  function bind() {
    indexViews();

    // Auth
    $("#login-btn") && $("#login-btn").addEventListener("click", function (e) { e.preventDefault(); login(); });
    $("#logout") && $("#logout").addEventListener("click", function () { logout(); });
    $("#logout-2") && $("#logout-2").addEventListener("click", function () { logout(); });
    $("#install-cta-2") && $("#install-cta-2").addEventListener("click", function () { toast("Prototype: this would open the download / store listing."); });

    // Install banner
    $("#install-x") && $("#install-x").addEventListener("click", function () { $("#install-banner").hidden = true; });
    $("#install-cta") && $("#install-cta").addEventListener("click", function () { toast("Prototype: this would open the download / store listing."); });

    // Mode toggle
    $$("[data-setmode]").forEach(function (b) { b.addEventListener("click", function () { setMode(b.getAttribute("data-setmode")); }); });

    // Nav (rails + bottom nav + any data-go)
    document.addEventListener("click", function (e) {
      var n = e.target.closest("[data-go]");
      if (n) { e.preventDefault(); go(n.getAttribute("data-go")); }
      var ch = e.target.closest("[data-chat]");
      if (ch) { openChat(ch.getAttribute("data-chat")); }
      var qm = e.target.closest("[data-quickmsg]");
      if (qm) {
        var q = qm.getAttribute("data-quickmsg");
        if (/set up my profile/i.test(q)) { send(q); }
        else if (/just exploring/i.test(q)) { addMsg("me", "Y", q); setTimeout(function(){ addMsg("ally","K","Perfect — wander as long as you like. I'll be right here, and you'll see your standing and tools fill in as you go.","host"); }, 380); }
        else send(q);
      }
      var so = e.target.closest("[data-sheet-open]");
      if (so) { openSheet(so.getAttribute("data-sheet-open"), so); }
    });

    // Chat composer
    var ci = $("#composer-input");
    if (ci) {
      ci.addEventListener("input", function () { ci.style.height = "auto"; ci.style.height = Math.min(ci.scrollHeight, 140) + "px"; });
      ci.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(ci.value); } });
    }
    $("#composer-send") && $("#composer-send").addEventListener("click", function () { send($("#composer-input").value); });
    $("#thread-back") && $("#thread-back").addEventListener("click", function () { var cl = $(".chat-layout"); if (cl) cl.classList.remove("show-thread"); });

    // First-run
    $("#fr-setup") && $("#fr-setup").addEventListener("click", function () { go("setup"); wizGo(1); $("#firstrun").hidden = true; });
    $("#fr-dismiss") && $("#fr-dismiss").addEventListener("click", function () { $("#firstrun").hidden = true; });

    // Wizard
    $("#wiz-next") && $("#wiz-next").addEventListener("click", function () { if (wizStep === 4) wizFinish(); else wizGo(wizStep + 1); });
    $("#wiz-back") && $("#wiz-back").addEventListener("click", function () { wizGo(wizStep - 1); });
    $("#wiz-skip") && $("#wiz-skip").addEventListener("click", function () { go("chat"); openChat("host"); });
    $$(".opt-card").forEach(function (o) { o.addEventListener("click", function () { var sibs = o.parentElement.querySelectorAll(".opt-card"); Array.prototype.forEach.call(sibs, function (s) { s.classList.remove("sel"); }); o.classList.add("sel"); }); });

    // Toggles (Empower integrations etc.)
    document.addEventListener("click", function (e) { var t = e.target.closest(".toggle"); if (t) t.classList.toggle("on"); });

    // Profile / avatar menu
    $("#avatar-btn") && $("#avatar-btn").addEventListener("click", function () { openSheet("profile-sheet", $("#avatar-btn")); });
    $("#level-badge") && $("#level-badge").addEventListener("click", function () { go("earn"); });

    // Hamburger (mobile builder drawer)
    $("#hamburger") && $("#hamburger").addEventListener("click", function () { if (state.mode === "builder") openDrawer(); else openSheet("profile-sheet", $("#hamburger")); });

    // Scrim closes sheets + drawer
    $("#scrim") && $("#scrim").addEventListener("click", function () { closeAllSheets(); closeDrawer(); });

    // Model picker (chat)
    $("#model-pill") && $("#model-pill").addEventListener("click", function () { openSheet("model-sheet", $("#model-pill")); });
    $$("[data-model]").forEach(function (m) { m.addEventListener("click", function () { $("#model-name").textContent = m.getAttribute("data-model"); closeAllSheets(); }); });

    // Prototype panel
    $("#proto-fab") && $("#proto-fab").addEventListener("click", function () { $("#proto-panel").classList.toggle("open"); });
    $$("[data-proto-level]").forEach(function (b) { b.addEventListener("click", function () {
      state.level = b.getAttribute("data-proto-level"); applyLevel();
      segSelect("[data-proto-level]", b);
    }); });
    $$("[data-proto-env]").forEach(function (b) { b.addEventListener("click", function () { state.env = b.getAttribute("data-proto-env"); applyPlatform(); segSelect("[data-proto-env]", b); }); });
    $$("[data-proto-os]").forEach(function (b) { b.addEventListener("click", function () { state.os = b.getAttribute("data-proto-os"); applyPlatform(); segSelect("[data-proto-os]", b); }); });
    $$("[data-proto-mode]").forEach(function (b) { b.addEventListener("click", function () { setMode(b.getAttribute("data-proto-mode")); segSelect("[data-proto-mode]", b); }); });
    $$("[data-proto-device]").forEach(function (b) { b.addEventListener("click", function () { applyDevice(b.getAttribute("data-proto-device")); segSelect("[data-proto-device]", b); }); });
    $("#proto-firstrun") && $("#proto-firstrun").addEventListener("click", function () {
      state.firstRun = !state.firstRun; this.classList.toggle("on", state.firstRun); this.textContent = state.firstRun ? "First-run: ON" : "First-run: OFF";
    });
    $("#proto-relogin") && $("#proto-relogin").addEventListener("click", function () { logout(); });

    // Keyboard: Esc closes overlays
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeAllSheets(); closeDrawer(); $("#proto-panel").classList.remove("open"); } });
  }
  function segSelect(sel, btn) { $$(sel).forEach(function (b) { b.classList.toggle("active", b === btn); }); }

  /* ---- Init ------------------------------------------------------------ */
  function init() {
    state.os = detectOS();
    bind();
    // reflect detected OS in proto panel
    var osb = $('[data-proto-os="' + state.os + '"]'); if (osb) segSelect("[data-proto-os]", osb);
    applyPlatform();
    applyLevel();
    // Start on auth screen unless ?skip
    var params = new URLSearchParams(location.search);
    if (params.get("level")) { state.level = params.get("level"); applyLevel(); var lb = $('[data-proto-level="' + state.level + '"]'); if (lb) segSelect("[data-proto-level]", lb); }
    var saved = readSession();
    if (params.get("skiplogin") === "1") { login(); }
    else if (saved && saved.loggedIn) {
      if (saved.level && !params.get("level")) { state.level = saved.level; applyLevel(); var slb = $('[data-proto-level="' + state.level + '"]'); if (slb) segSelect("[data-proto-level]", slb); }
      login();
    }
    else { app.hidden = true; $("#auth").hidden = false; }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
