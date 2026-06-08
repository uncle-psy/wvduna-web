/* =========================================================================
   WV DUNA — Integrated App prototype engine (v2)
   Adds: 3 DUNAs with themes + Coin economics, persistence (localStorage),
   Coins (not tokens), Buy-Coins / Load-Wallet, contextual DUNA-Ally chat
   dock, Directory, Codes/Claims, selector Home logic, level-from-balance.
   Prototype only — no backend.
   ========================================================================= */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- Levels (USDC thresholds, multiplied per DUNA) ------------------- */
  var LEVELS = [
    { id: "guest",    name: "Guest",    base: 0,       allot: "Starter" },
    { id: "member",   name: "Member",   base: 10,      allot: "Monthly" },
    { id: "founder",  name: "Founder",  base: 100,     allot: "Larger" },
    { id: "builder",  name: "Builder",  base: 1000,    allot: "High runtime" },
    { id: "sponsor",  name: "Sponsor",  base: 10000,   allot: "At scale" },
    { id: "catalyst", name: "Catalyst", base: 100000,  allot: "Enterprise" },
    { id: "luminary", name: "Luminary", base: 1000000, allot: "Planetary" }
  ];

  /* ---- DUNAs ----------------------------------------------------------- */
  var DUNAS = {
    wv:   { id:"wv",   name:"WV DUNA",          short:"WV", tag:"Genesis", sym:"WVDUNA", coinPrice:0.10,   mult:1,   theme:"wv",   coinClass:"duna-wv",
            ally:"WV DUNA Ally",        bonus:0.10, blurb:"The genesis DUNA. Legal standing for you and your agents; the on-ramp to the DUNAVERSE." },
    mesh: { id:"mesh", name:"Mountain Mesh",    short:"MM", tag:"",        sym:"MESH",   coinPrice:0.0333, mult:0.5, theme:"mesh", coinClass:"duna-mesh",
            ally:"Mountain Mesh Ally",  bonus:0.15, blurb:"Community wireless across rural West Virginia. Coins are 1/3 the value of WVDUNA; joining costs half." },
    cc:   { id:"cc",   name:"WV Commerce Club", short:"CC", tag:"",        sym:"CCLUB",  coinPrice:0.0667, mult:2,   theme:"cc",   coinClass:"duna-cc",
            ally:"Commerce Club Ally",  bonus:0.05, blurb:"Appalachian businesses pooling reach and capital. Coins are 2/3 the value of WVDUNA; joining costs double." }
  };

  /* ---- Persistent state ------------------------------------------------ */
  var KEY = "wvduna_proto_v2";
  var DEFAULTS = {
    coins: { wv: 150, mesh: 200, cc: 3500 },   // holdings -> levels: WV Member, Mesh Member, CC Founder
    home: "wv", current: "wv",
    firstBuyDone: true, allyCreated: false,
    dockOpen: null, model: "Auto",
    mode: "active", view: "chat", env: "web", os: "mac", firstRun: true, loggedIn: false
  };
  var state = load();
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.coins) return Object.assign({}, DEFAULTS, s); } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  var app = $("#app");

  /* ---- Coin / level math ----------------------------------------------- */
  function duna() { return DUNAS[state.current]; }
  function usdOf(id) { return state.coins[id] * DUNAS[id].coinPrice; }
  function thresholdsFor(id) { return LEVELS.map(function (L) { return L.base * DUNAS[id].mult; }); }
  function levelIdxOf(id) {
    var usd = usdOf(id), th = thresholdsFor(id), idx = 0;
    for (var i = 0; i < th.length; i++) if (usd + 1e-9 >= th[i]) idx = i;
    return idx;
  }
  function levelIdx() { return levelIdxOf(state.current); }
  function fmtUSD(n) { return "$" + (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
  function fmtCoins(n) { return Math.round(n).toLocaleString(); }

  /* ---- Mode ------------------------------------------------------------ */
  var MODE_DEFAULT = { active: "chat", builder: "agents" };
  function setMode(mode, opts) {
    state.mode = mode; app.setAttribute("data-mode", mode);
    $$("[data-setmode]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-setmode") === mode); });
    $$("[data-proto-mode]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-proto-mode") === mode); });
    $("#rail-active").hidden = mode !== "active";
    $("#rail-builder").hidden = mode !== "builder";
    $("#bottom-nav").hidden = mode !== "active";
    if (!opts || opts.go !== false) go(MODE_DEFAULT[mode]);
    save();
  }

  /* ---- View routing ---------------------------------------------------- */
  var VIEW_MODE = {};
  function indexViews() {
    $$("#rail-active [data-go]").forEach(function (n) { VIEW_MODE[n.getAttribute("data-go")] = "active"; });
    $$("#rail-builder [data-go]").forEach(function (n) { VIEW_MODE[n.getAttribute("data-go")] = "builder"; });
    VIEW_MODE["chat"] = "active"; VIEW_MODE["setup"] = "builder";
  }
  function go(view) {
    if (view === "newduna") { toast("Prototype: New-DUNA flow includes name, mission, Coin price, and a theme step in Builder."); return; }
    if (view === "account") beforeAccount();
    if (view === "directory") renderDirectory(curDirTab);
    var m = VIEW_MODE[view];
    if (m && m !== state.mode) setMode(m, { go: false });
    state.view = view; save();
    $$(".view").forEach(function (v) { v.classList.toggle("is-active", v.getAttribute("data-view") === view); });
    $$("[data-go]").forEach(function (n) { n.classList.toggle("active", n.getAttribute("data-go") === view); });
    var sc = $(".main-scroll"); if (sc) sc.scrollTop = 0;
    closeDrawer(); closeAllSheets();
    var cl = $(".chat-layout"); if (cl && view === "chat") cl.classList.remove("show-thread");
    renderDock(view);
  }

  /* ---- DUNA apply (theme, selector, dock, coin tokens) ----------------- */
  function switchDuna(id) {
    if (!DUNAS[id]) return;
    state.current = id; save();
    applyDuna(); applyLevel();
    // re-open the DUNA's host ally chat context
    renderDock(state.view);
    toast("Now in " + DUNAS[id].name);
  }
  function applyDuna() {
    var d = duna();
    app.setAttribute("data-duna", d.theme);
    // selector
    var coin = $("#ws-coin"); if (coin) { coin.textContent = d.short; coin.className = "ws-coin " + d.coinClass; }
    if ($("#ws-name")) $("#ws-name").textContent = d.name;
    var tag = $("#ws-tag");
    if (tag) { tag.textContent = d.tag; tag.style.display = d.tag ? "" : "none"; }
    // home controls
    var atHome = state.current === state.home;
    if ($("#home-pill")) $("#home-pill").hidden = !atHome;
    if ($("#set-home-btn")) $("#set-home-btn").hidden = atHome;
    // dock ally
    if ($("#dock-name")) $("#dock-name").textContent = d.ally;
    if ($("#dock-ava")) { $("#dock-ava").textContent = d.short; }
    if ($("#dock-tab-name")) $("#dock-tab-name").textContent = d.name;
    // coin-name tokens
    $$("[data-coinname]").forEach(function (e) { e.textContent = d.sym; });
    $$("[data-coinsym]").forEach(function (e) { e.textContent = d.sym; });
    // earn balance
    var usdEl = $('[data-view="earn"] .balance-hero .amt');
    var coinsEl = $('[data-view="earn"] .balance-hero .sub');
    if (usdEl) usdEl.textContent = fmtUSD(usdOf(state.current));
    if (coinsEl) coinsEl.textContent = "≈ " + fmtCoins(state.coins[state.current]) + " " + d.sym + " · held in your personal wallet";
    var reload = $('[data-view="earn"] .pg-head button');
    if (reload) { reload.textContent = "＋ Load Wallet"; reload.onclick = function () { go("account"); }; }
  }

  /* ---- Level / capability --------------------------------------------- */
  function applyLevel() {
    var idx = levelIdx(); var L = LEVELS[idx];
    app.setAttribute("data-level", L.id);
    $$(".level-badge .pips").forEach(function (pips) {
      pips.innerHTML = "";
      for (var i = 0; i < 7; i++) { var dt = document.createElement("i"); if (i <= idx) dt.className = "on"; pips.appendChild(dt); }
    });
    if ($("#level-name")) $("#level-name").textContent = L.name;
    $$("[data-minlevel]").forEach(function (el) {
      var locked = idx < parseInt(el.getAttribute("data-minlevel"), 10);
      el.classList.toggle("is-locked", locked);
      if (el.classList.contains("upgrade-note")) el.hidden = !locked;
      if (el.tagName === "BUTTON" && el.hasAttribute("data-lockbtn")) el.disabled = locked;
    });
    $$(".allygate").forEach(function (el) {
      var locked = idx < parseInt(el.getAttribute("data-minally"), 10);
      el.style.opacity = locked ? "0.45" : "1";
      el.style.pointerEvents = locked ? "none" : "auto";
    });
    $$("#level-meter .level-node").forEach(function (node, i) {
      node.classList.toggle("done", i < idx); node.classList.toggle("current", i === idx);
    });
    $$("[data-allotment]").forEach(function (e) { e.textContent = L.allot; });
    $$("[data-levelname]").forEach(function (e) { e.textContent = L.name; });
    var th = thresholdsFor(state.current);
    $$("[data-holding]").forEach(function (e) { e.textContent = fmtUSD(th[idx]); });
    var nextI = Math.min(idx + 1, 6);
    $$("[data-nextlevel]").forEach(function (e) { e.textContent = LEVELS[nextI].name; });
    $$("[data-nexthold]").forEach(function (e) { e.textContent = fmtUSD(th[nextI]); });
    if (state.view === "account") { renderTiers(); }
  }

  /* ---- Platform / install --------------------------------------------- */
  var OS_LABELS = { mac:"macOS", windows:"Windows", chromeos:"ChromeOS", ios:"iOS", android:"Android", linux:"Linux" };
  function detectOS() { var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios"; if (/Android/i.test(ua)) return "android";
    if (/CrOS/i.test(ua)) return "chromeos"; if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
    if (/Windows/i.test(ua)) return "windows"; if (/Linux/i.test(ua)) return "linux"; return "mac"; }
  function applyPlatform() {
    app.setAttribute("data-env", state.env); app.setAttribute("data-os", state.os);
    var osName = OS_LABELS[state.os] || "your device", mobile = (state.os === "ios" || state.os === "android");
    var banner = $("#install-banner");
    if (banner) { banner.hidden = state.env !== "web";
      var t = $("#install-text");
      if (t) t.innerHTML = mobile ? "You're on the web app. <b>Get the WVDUNA app</b> for " + osName + "." : "You're on the web app. <b>Install WVDUNA for " + osName + "</b> for a faster, native experience.";
      var cta = $("#install-cta"); if (cta) cta.textContent = mobile ? "Open in App Store" : "Download for " + osName;
    }
    if ($("#reader-note")) $("#reader-note").hidden = state.env !== "installed";
    if ($("#reader-note-2")) $("#reader-note-2").hidden = state.env !== "installed";
    if ($("#web-signup")) $("#web-signup").hidden = state.env === "installed";
    $$("[data-osname]").forEach(function (e) { e.textContent = osName; });
    if (state.view === "account") renderPayArea();
  }

  /* ---- Auth ------------------------------------------------------------ */
  function login() {
    state.loggedIn = true; $("#auth").hidden = true; app.hidden = false;
    applyDuna(); applyLevel(); applyPlatform();
    setMode("active", { go: false });
    // dock default: open on wide screens
    if (state.dockOpen === null) state.dockOpen = window.innerWidth > 1100;
    app.classList.toggle("dock-open", !!state.dockOpen);
    if (!state.firstBuyDone) { go("account"); return; }   // post-onboarding -> buy coins
    go("chat"); openChat(state.firstRun ? "host" : "alchemist");
  }
  function logout() { state.loggedIn = false; app.hidden = true; $("#auth").hidden = false; closeAllSheets(); save(); }

  /* ---- Chat (main) ----------------------------------------------------- */
  var CHATS = {
    host: { name:"The Big Kiduna", tag:"Your Host's Ally · WV DUNA", ava:"K", cls:"host",
      greeting:"Welcome to the DUNAVERSE. I'm the Big Kiduna — the ally your host left running for you. Ask me anything, or tell me what you're here to do. You don't have to set anything up to start." },
    concierge: { name:"Your Concierge", tag:"Personal Ally", ava:"C", cls:"",
      greeting:"Hi — I'm your Concierge. I can keep track of what matters to you across the DUNAVERSE. Want to teach me something, or just talk?" },
    alchemist: { name:"The Alchemist", tag:"Personal · Published", ava:"A", cls:"violet",
      greeting:"The Alchemist is really you. The work is to initiate you into the mysteries of your own soul. Where shall we begin?" }
  };
  var REPLIES = [
    "Here's how I'd approach that. The short version: you already have everything you need to begin, and we can deepen it whenever you want.",
    "Good question. In DUNA terms that lives under your treasury and governance — I can walk you through it, or just handle the first step for you.",
    "I can do that. Want me to draft it now, or set it up as a standing Program so it happens on its own?",
    "Done in spirit — in the live app I'd carry that out and report back. For now, here's what it would look like."
  ];
  var replyTick = 0;
  function openChat(id) {
    var c = CHATS[id]; if (!c) return;
    $$(".chat-item").forEach(function (it) { it.classList.toggle("active", it.getAttribute("data-chat") === id); });
    $("#thread-name").textContent = c.name; $("#thread-tag").textContent = c.tag;
    var av = $("#thread-ava"); av.textContent = c.ava; av.className = "t-ava " + (c.cls || "");
    var box = $("#thread-msgs"); box.innerHTML = "";
    addMsg("ally", c.ava, c.greeting, c.cls);
    if (id === "host") {
      var chips = document.createElement("div"); chips.className = "chips-inline";
      ["What can I do here?", "Set up my profile & Ally", "Show me what's happening", "Just exploring"].forEach(function (q) {
        var b = document.createElement("button"); b.textContent = q; b.setAttribute("data-quickmsg", q); chips.appendChild(b);
      });
      $("#thread-msgs > .msg:last-child .bubble").appendChild(chips);
    }
    var cl = $(".chat-layout"); if (cl) cl.classList.add("show-thread");
  }
  function addMsg(who, ava, text, cls) {
    var box = $("#thread-msgs"); var m = document.createElement("div"); m.className = "msg " + who;
    var a = document.createElement("div"); a.className = "m-ava " + (cls || ""); a.textContent = who === "me" ? "Y" : ava;
    var b = document.createElement("div"); b.className = "bubble"; b.textContent = text;
    m.appendChild(a); m.appendChild(b); box.appendChild(m);
    var sc = $("#thread-scroll"); if (sc) sc.scrollTop = sc.scrollHeight; return b;
  }
  function send(text) {
    text = (text || "").trim(); if (!text) return;
    addMsg("me", "Y", text);
    var ti = $("#composer-input"); if (ti) { ti.value = ""; ti.style.height = "auto"; }
    if (/set ?up|profile|create.*(ally|agent)/i.test(text)) {
      setTimeout(function () {
        addMsg("ally", "K", "Let's build your personal Ally — four short steps: Inform, Instruct, Empower, Enact. Stop anytime and just chat.", "host");
        var last = $("#thread-msgs > .msg:last-child .bubble");
        var chips = document.createElement("div"); chips.className = "chips-inline";
        var b = document.createElement("button"); b.textContent = "Start setup →"; b.onclick = function () { go("setup"); wizGo(1); }; chips.appendChild(b);
        last.appendChild(chips);
      }, 420); return;
    }
    setTimeout(function () { addMsg("ally", "K", REPLIES[replyTick % REPLIES.length], "host"); replyTick++; }, 420);
  }

  /* ---- Contextual DUNA-Ally dock --------------------------------------- */
  var DOCK_CTX = {
    codes: { intro: "Codes are how trust travels in the DUNAVERSE. Want to make one, or understand the Claims?",
      chips: [ {t:"What's a Claim?", a:"A Claim is one field inside a Code — issuer, role, scope, splash, benefits, and so on. Together they define who the Code acts for and what it unlocks."},
               {t:"Create a Code", nav:"codenew"}, {t:"See my Code metrics", a:"Open the Metrics tab above to see joins and earnings per Code."}, {t:"Who is my Host?", nav:"host"} ] },
    account: { intro: "Your role here is set by how many Coins you hold. I can explain the tiers or help you load your wallet.",
      chips: [ {t:"How do Coins set my role?", a:"Each role has a Coin threshold in USDC. Hold enough of this DUNA's Coin and you're at that role — no subscription."},
               {t:"Why only up to Sponsor?", a:"Card purchases (Stripe) cap around $25,000. Catalyst and Luminary are acquired inside by loading your wallet directly."},
               {t:"Load my wallet", a:"Scroll to Load Wallet — connect an external wallet, send USDC to your address, or use an on-ramp."} ] },
    directory: { intro: "This is the network — DUNAs, Members, Alliances, and Programs. Open any card to meet its Ally.",
      chips: [ {t:"Show me DUNAs", a:"Use the DUNAs tab. Each card opens that DUNA's Ally in chat."}, {t:"What's an Alliance?", a:"An Alliance is a container inside a DUNA where allies collaborate. It has no legal standing of its own."} ] },
    agents: { intro: "Allies represent people, DUNAs, Alliances, Programs, and Sponsors. I can explain the types or states.",
      chips: [ {t:"What types can I make?", a:"Members make Personal Allies and Alliances. Founders add DUNA Allies. Builders add Programs. Sponsors add offering allies."},
               {t:"Draft vs Testing vs Published?", a:"Draft is private and unfinished. Testing is shareable to people you invite. Published is live on the app."}, {t:"Create a new Ally", nav:"setup"} ] },
    approve: { intro: "I'm your Actions ally. Tell me what to prioritize, hide, or escalate and I'll keep this inbox tidy.",
      chips: [ {t:"Only show urgent", a:"Filtering to Urgent — I'll keep approvals and time-sensitive items on top."}, {t:"Hide FYI items", a:"Hiding FYI. You can bring them back anytime."} ] },
    align: { intro: "Enact turns intention into action. A Program bundles Skills; each Skill is a line in a Skill.md file.",
      chips: [ {t:"What's a Skill.md?", a:"It's the editable file behind a Program — plain lines of 'when this, do that' the agent follows."}, {t:"New Program", a:"Tap New Program to start. I'll suggest Skills based on your tools."} ] }
  };
  function dockChip(t, fn) { var b = document.createElement("button"); b.textContent = t; b.onclick = fn; return b; }
  function renderDock(view) {
    var box = $("#dock-scroll"); if (!box) return;
    box.innerHTML = "";
    var d = duna();
    var ctx = DOCK_CTX[view];
    var intro = ctx ? ctx.intro : ("I'm the " + d.ally + ". Ask me anything about " + d.name + " or this page.");
    var m = document.createElement("div"); m.className = "dock-msg ally"; m.textContent = intro; box.appendChild(m);
    var chipsWrap = document.createElement("div"); chipsWrap.className = "dock-chips";
    var chips = (ctx && ctx.chips) || [ {t:"What can I do here?"}, {t:"Take me to the Directory", nav:"directory"}, {t:"Open my wallet", nav:"account"} ];
    chips.forEach(function (c) {
      chipsWrap.appendChild(dockChip(c.t, function () {
        var me = document.createElement("div"); me.className = "dock-msg me"; me.textContent = c.t; box.appendChild(me);
        if (c.nav) { setTimeout(function () { go(c.nav); }, 250); }
        else { setTimeout(function () { var r = document.createElement("div"); r.className = "dock-msg ally"; r.textContent = c.a || "Here's what I'd do…"; box.appendChild(r); box.scrollTop = box.scrollHeight; }, 300); }
        box.scrollTop = box.scrollHeight;
      }));
    });
    box.appendChild(chipsWrap);
  }
  function dockSend(text) {
    text = (text || "").trim(); if (!text) return;
    var box = $("#dock-scroll");
    var me = document.createElement("div"); me.className = "dock-msg me"; me.textContent = text; box.appendChild(me);
    var ti = $("#dock-input"); if (ti) { ti.value = ""; ti.style.height = "auto"; }
    setTimeout(function () { var r = document.createElement("div"); r.className = "dock-msg ally"; r.textContent = "In the live app the " + duna().ally + " answers from this DUNA's knowledge and can take you where you need to go."; box.appendChild(r); box.scrollTop = box.scrollHeight; }, 320);
    box.scrollTop = box.scrollHeight;
  }
  function toggleDock(open) { state.dockOpen = (open === undefined) ? !state.dockOpen : open; app.classList.toggle("dock-open", state.dockOpen); save(); }

  /* ---- Account / Buy Coins / Load Wallet ------------------------------- */
  var selTier = null;
  function beforeAccount() {
    var first = !state.firstBuyDone;
    $("#acct-eyebrow").textContent = first ? "Welcome — one more step" : "Your account";
    $("#acct-title").textContent = first ? "Set your role" : "Manage your role";
    $("#acct-duna").textContent = duna().name;
    selTier = first ? Math.max(1, levelIdx()) : levelIdx();
    renderTiers(); renderPayArea();
  }
  function renderTiers() {
    var grid = $("#tier-grid"); if (!grid) return;
    var d = duna(), th = thresholdsFor(state.current), cur = levelIdx();
    if (selTier === null) selTier = cur;
    grid.innerHTML = "";
    for (var i = 0; i <= 4; i++) {  // Guest..Sponsor
      var L = LEVELS[i], priceUsd = th[i];
      var coins = priceUsd / d.coinPrice, bonus = coins * d.bonus, total = coins + bonus;
      var box = document.createElement("div");
      box.className = "tierbox" + (i === selTier ? " sel" : "");
      box.setAttribute("data-tier", i);
      var ribbon = (i === cur) ? '<span class="tb-ribbon">Current</span>' : (i === 1 && cur === 0 ? '<span class="tb-ribbon">Start here</span>' : '');
      box.innerHTML = ribbon + '<span class="tb-check"></span>' +
        '<span class="tb-name">' + L.name + '</span>' +
        '<span class="tb-price">' + (priceUsd === 0 ? "Free" : fmtUSD(priceUsd)) + '<small>' + (priceUsd === 0 ? "no Coins required" : "in " + d.sym + " (USDC)") + '</small></span>' +
        '<div class="tb-line"><span>Coins</span><b>' + (priceUsd === 0 ? "0" : fmtCoins(coins)) + '</b></div>' +
        '<div class="tb-line"><span>Bonus (Code)</span><b>+' + fmtCoins(bonus) + '</b></div>' +
        '<div class="tb-line tb-total"><span>Total ' + d.sym + '</span><b>' + fmtCoins(total) + '</b></div>';
      grid.appendChild(box);
    }
  }
  function renderPayArea() {
    var area = $("#pay-area"); if (!area) return;
    var d = duna(), th = thresholdsFor(state.current), price = th[selTier || 0];
    var coins = price / d.coinPrice, total = coins * (1 + d.bonus);
    if (!state.firstBuyDone) {
      area.innerHTML =
        '<div class="pay-summary"><div><div class="pg-eyebrow">You\'re buying</div>' +
        '<div class="ps-fig">' + (price === 0 ? "Guest (Free)" : fmtUSD(price) + " · " + fmtCoins(total) + " " + d.sym) + '</div>' +
        '<div class="stripe-row">Secure card payment via <b>Stripe</b></div></div>' +
        '<button class="btn btn-gold btn-lg" id="pay-go">' + (price === 0 ? "Continue as Guest →" : "Pay & enter the DUNAVERSE →") + '</button></div>' +
        '<p class="fineprint">Initial Coin purchases <b>can\'t be traded for 30 days</b>. Once inside, there are more ways to fill your wallet (external wallet, USDC transfer, on-ramps). Stripe purchases are capped near $25,000 — <b>Catalyst</b> and <b>Luminary</b> are acquired inside.</p>' +
        '<p class="fineprint" id="reader-pay" hidden>On iOS and Android this is a <b>reader app</b>: purchases happen on <b>wvduna.com</b>, then you sign in here. (Prototype assumes web.)</p>';
      $("#pay-go").onclick = function () { purchase(selTier, true); };
    } else {
      var need = Math.max(0, th[(selTier || 0)] - usdOf(state.current));
      area.innerHTML =
        '<h3 style="font-family:var(--font-display);font-weight:400;margin:26px 0 4px;font-size:1.5rem">Load Wallet</h3>' +
        '<p class="muted" style="font-size:.9rem;margin:0 0 14px">Add <b>USDC</b> to reach <b>' + LEVELS[selTier || 0].name + '</b>. We\'ll move in at least ' + fmtUSD(need || th[selTier||0]) + ' (enough to cross the level); set a higher amount if you like.</p>' +
        '<div class="grid g3" style="margin-bottom:14px">' +
          ramp("Stripe", "On-ramp · card → USDC") + ramp("Onramper", "Aggregator · best rate") + ramp("Sphere", "Bank / wire → USDC") +
        '</div>' +
        '<div class="grid g2" style="gap:14px;align-items:start">' +
          '<div class="card"><div class="pg-eyebrow">Connect an external wallet</div><p class="muted" style="font-size:.86rem;margin:.4rem 0 .8rem">Phantom, Solflare, or any Solana wallet.</p><button class="btn btn-soft btn-block" id="connect-wallet">Connect wallet</button></div>' +
          '<div class="card"><div class="pg-eyebrow">Or send USDC to your address</div><div class="addr-box" style="margin-top:.5rem">RzyXWinbVMbS21YNEpVw7n7SjU3UsyVAYjFHYcWJgcX4 <button class="btn btn-soft btn-sm" id="copy-addr">Copy</button></div><p class="fineprint">USDC only. Funds appear here once confirmed.</p></div>' +
        '</div>' +
        '<div class="pay-summary"><div><div class="pg-eyebrow">Move in</div><div class="ps-fig" id="topup-fig">' + fmtUSD(need || th[selTier||0]) + ' USDC</div></div><button class="btn btn-gold btn-lg" id="pay-go">Confirm &amp; update role</button></div>' +
        '<p class="fineprint" id="reader-pay" hidden>On iOS and Android this is a <b>reader app</b>: balance top-ups and purchases happen on <b>wvduna.com</b>. (Prototype assumes web.)</p>';
      $("#pay-go").onclick = function () { purchase(selTier, false); };
      var cw = $("#connect-wallet"); if (cw) cw.onclick = function () { toast("Prototype: wallet connect dialog (Phantom / Solflare)."); };
      var ca = $("#copy-addr"); if (ca) ca.onclick = function () { toast("Address copied."); };
    }
    if ($("#reader-pay")) $("#reader-pay").hidden = state.env !== "installed";
  }
  function ramp(name, sub) {
    return '<div class="ramp" onclick="">' + '<span class="r-logo">' + name.charAt(0) + '</span><div><div style="font-weight:700">' + name + '</div><div class="lr-sub">' + sub + '</div></div></div>';
  }
  function purchase(tierIdx, first) {
    var d = duna(), th = thresholdsFor(state.current);
    var targetUsd = th[tierIdx];
    state.coins[state.current] = (targetUsd / d.coinPrice) * (1 + d.bonus);
    if (first) { state.firstBuyDone = true; save(); applyDuna(); applyLevel();
      toast("Welcome! You're now " + LEVELS[tierIdx].name + " in " + d.name);
      go("chat"); openChat("host"); return;
    }
    save(); applyDuna(); applyLevel(); renderTiers(); renderPayArea();
    toast("Updated — you're now " + LEVELS[tierIdx].name + " in " + d.name);
  }

  /* ---- Directory ------------------------------------------------------- */
  var DIR = [
    { type:"duna", name:"WV DUNA", sub:"Genesis · 312,000 members", badge:"WV", cls:"duna-wv", to:"host" },
    { type:"duna", name:"Mountain Mesh", sub:"Community wireless · 1,420 members", badge:"MM", cls:"duna-mesh" },
    { type:"duna", name:"WV Commerce Club", sub:"Business alliance · 4,180 members", badge:"CC", cls:"duna-cc" },
    { type:"member", name:"Ada Whitfield", sub:"@ada · Member · genesis", badge:"A", cls:"duna-wv" },
    { type:"member", name:"Rue", sub:"@rue · Founder · Coalfield Mutual", badge:"R", cls:"duna-mesh" },
    { type:"member", name:"Jules", sub:"@jules · Builder · 3 DUNAs", badge:"J", cls:"duna-cc" },
    { type:"alliance", name:"Coalfield ↔ Mesh", sub:"Alliance · rooted in Mountain Mesh", badge:"⌘", cls:"duna-mesh" },
    { type:"alliance", name:"Main Street Co-op", sub:"Alliance · rooted in WV Commerce Club", badge:"⌘", cls:"duna-cc" },
    { type:"program", name:"Inbox Concierge", sub:"Program · email triage & replies", badge:"▦", cls:"duna-wv" },
    { type:"program", name:"Treasury Guard", sub:"Program · monthly treasury review", badge:"▦", cls:"duna-mesh" }
  ];
  var curDirTab = "all";
  function renderDirectory(tab) {
    curDirTab = tab || "all";
    $$("#dir-tabs [data-dirtab]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-dirtab") === curDirTab); });
    var grid = $("#dir-grid"); if (!grid) return; grid.innerHTML = "";
    DIR.filter(function (x) { return curDirTab === "all" || x.type === curDirTab; }).forEach(function (x) {
      var card = document.createElement("article"); card.className = "dir-card";
      card.innerHTML =
        '<div class="dir-cover"><span class="dir-badge ws-coin ' + x.cls + '">' + x.badge + '</span></div>' +
        '<div class="dir-body"><span class="dir-type">' + x.type + '</span><h3>' + x.name + '</h3><p>' + x.sub + '</p>' +
        '<div class="dir-foot"><button class="btn btn-gold btn-sm" data-go="chat">Meet the Ally</button>' + (x.to ? '<button class="btn btn-soft btn-sm" data-go="' + x.to + '">Open</button>' : '<button class="btn btn-soft btn-sm">Open</button>') + '</div></div>';
      grid.appendChild(card);
    });
  }

  /* ---- Setup wizard ---------------------------------------------------- */
  var wizStep = 1;
  function wizGo(n) {
    wizStep = Math.max(1, Math.min(4, n));
    $$("[data-wizstep]").forEach(function (p) { p.hidden = parseInt(p.getAttribute("data-wizstep"), 10) !== wizStep; });
    $$(".wiz-step").forEach(function (s, i) { s.classList.toggle("done", i < wizStep - 1); s.classList.toggle("current", i === wizStep - 1); });
    $("#wiz-back").style.visibility = wizStep === 1 ? "hidden" : "visible";
    $("#wiz-next").textContent = wizStep === 4 ? "Create my Ally ✦" : "Continue →";
  }
  function wizFinish() {
    state.allyCreated = true; save(); go("chat");
    var list = $("#chatlist");
    if (list && !$('.chat-item[data-chat="concierge"]')) {
      var btn = document.createElement("button"); btn.className = "chat-item"; btn.setAttribute("data-chat", "concierge");
      btn.innerHTML = '<span class="chat-ava">C</span><span class="lr-main"><span class="ci-name">Your Concierge</span><span class="ci-snip">Personal Ally · just now</span></span><span class="ci-time">now</span>';
      list.insertBefore(btn, list.firstChild);
    }
    openChat("concierge"); toast("Your personal Ally is live ✦");
  }

  /* ---- Sheets / drawer / toast ----------------------------------------- */
  function openSheet(id, anchor) {
    closeAllSheets(); var sh = document.getElementById(id); if (!sh) return;
    sh.classList.add("open"); $("#scrim").classList.add("open");
    if (anchor) { var r = anchor.getBoundingClientRect(); sh.style.top = (r.bottom + 8) + "px"; sh.style.right = (window.innerWidth - r.right) + "px"; sh.style.left = "auto"; sh.style.bottom = "auto"; }
  }
  function closeAllSheets() { $$(".sheet").forEach(function (s) { s.classList.remove("open"); }); var sc = $("#scrim"); if (sc) sc.classList.remove("open"); }
  function openDrawer() { app.classList.add("drawer-open"); var r = $("#rail-builder"); r.hidden = false; r.classList.add("as-drawer"); $("#scrim").classList.add("open"); }
  function closeDrawer() { app.classList.remove("drawer-open"); var r = $("#rail-builder"); if (r) r.classList.remove("as-drawer"); }
  function toast(msg) {
    var t = document.createElement("div"); t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:var(--accent);color:var(--on-accent);font-weight:700;padding:11px 18px;border-radius:999px;z-index:400;box-shadow:var(--shadow-lg);font-size:.9rem;max-width:90vw;text-align:center";
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = "opacity .4s"; t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 400); }, 2000);
  }
  function applyDevice(d) { document.body.classList.remove("sim-tablet", "sim-phone"); if (d === "tablet") document.body.classList.add("sim-tablet"); if (d === "phone") document.body.classList.add("sim-phone"); }
  function segSelect(sel, btn) { $$(sel).forEach(function (b) { b.classList.toggle("active", b === btn); }); }

  /* ---- Bind ------------------------------------------------------------ */
  function bind() {
    indexViews();
    $("#login-btn") && $("#login-btn").addEventListener("click", function (e) { e.preventDefault(); login(); });
    $("#logout") && $("#logout").addEventListener("click", logout);
    $("#logout-2") && $("#logout-2").addEventListener("click", logout);
    $("#install-x") && $("#install-x").addEventListener("click", function () { $("#install-banner").hidden = true; });
    $("#install-cta") && $("#install-cta").addEventListener("click", function () { toast("Prototype: opens the download / store listing."); });
    $("#install-cta-2") && $("#install-cta-2").addEventListener("click", function () { toast("Prototype: opens the download / store listing."); });

    $$("[data-setmode]").forEach(function (b) { b.addEventListener("click", function () { setMode(b.getAttribute("data-setmode")); }); });

    document.addEventListener("click", function (e) {
      var n = e.target.closest("[data-go]"); if (n) { e.preventDefault(); go(n.getAttribute("data-go")); }
      var sd = e.target.closest("[data-switchduna]"); if (sd) { switchDuna(sd.getAttribute("data-switchduna")); }
      var ch = e.target.closest("[data-chat]"); if (ch) openChat(ch.getAttribute("data-chat"));
      var qm = e.target.closest("[data-quickmsg]");
      if (qm) { var q = qm.getAttribute("data-quickmsg");
        if (/set up my profile/i.test(q)) send(q);
        else if (/just exploring/i.test(q)) { addMsg("me","Y",q); setTimeout(function(){ addMsg("ally","K","Perfect — wander as long as you like. Your standing and tools fill in as you go.","host"); }, 360); }
        else send(q); }
      var so = e.target.closest("[data-sheet-open]"); if (so) openSheet(so.getAttribute("data-sheet-open"), so);
      var tb = e.target.closest(".tierbox"); if (tb) { selTier = parseInt(tb.getAttribute("data-tier"), 10); renderTiers(); renderPayArea(); }
      var dt = e.target.closest("[data-dirtab]"); if (dt) renderDirectory(dt.getAttribute("data-dirtab"));
      var ct = e.target.closest("[data-codetab]"); if (ct) codeTab(ct.getAttribute("data-codetab"));
      var ctg = e.target.closest("[data-codetab-go]"); if (ctg) codeTab(ctg.getAttribute("data-codetab-go"));
      var tg = e.target.closest(".toggle"); if (tg) tg.classList.toggle("on");
    });

    // claims expand
    $("#claims-toggle") && $("#claims-toggle").addEventListener("click", function () { this.classList.toggle("open"); $("#claims-panel").classList.toggle("open"); });

    // main chat composer
    var ci = $("#composer-input");
    if (ci) { ci.addEventListener("input", function () { ci.style.height = "auto"; ci.style.height = Math.min(ci.scrollHeight, 140) + "px"; });
      ci.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(ci.value); } }); }
    $("#composer-send") && $("#composer-send").addEventListener("click", function () { send($("#composer-input").value); });
    $("#thread-back") && $("#thread-back").addEventListener("click", function () { var cl = $(".chat-layout"); if (cl) cl.classList.remove("show-thread"); });

    // dock
    $("#dock-tab") && $("#dock-tab").addEventListener("click", function () { toggleDock(true); });
    $("#dock-x") && $("#dock-x").addEventListener("click", function () { toggleDock(false); });
    var di = $("#dock-input");
    if (di) { di.addEventListener("input", function () { di.style.height = "auto"; di.style.height = Math.min(di.scrollHeight, 100) + "px"; });
      di.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); dockSend(di.value); } }); }
    $("#dock-send") && $("#dock-send").addEventListener("click", function () { dockSend($("#dock-input").value); });

    // selector home
    $("#set-home-btn") && $("#set-home-btn").addEventListener("click", function () { state.home = state.current; save(); applyDuna(); toast(duna().name + " is now your Home DUNA"); });
    $(".brand-lockup[data-go]") && $(".brand-lockup[data-go]").addEventListener("click", function (e) { e.preventDefault(); if (state.current !== state.home) switchDuna(state.home); go("chat"); });

    // wizard
    $("#wiz-next") && $("#wiz-next").addEventListener("click", function () { if (wizStep === 4) wizFinish(); else wizGo(wizStep + 1); });
    $("#wiz-back") && $("#wiz-back").addEventListener("click", function () { wizGo(wizStep - 1); });
    $("#wiz-skip") && $("#wiz-skip").addEventListener("click", function () { go("chat"); openChat("host"); });
    $$(".opt-card").forEach(function (o) { o.addEventListener("click", function () { var sibs = o.parentElement.querySelectorAll(".opt-card"); Array.prototype.forEach.call(sibs, function (s) { s.classList.remove("sel"); }); o.classList.add("sel"); }); });

    // menus
    $("#avatar-btn") && $("#avatar-btn").addEventListener("click", function () { openSheet("profile-sheet", $("#avatar-btn")); });
    $("#level-badge") && $("#level-badge").addEventListener("click", function () { go("account"); });
    $("#hamburger") && $("#hamburger").addEventListener("click", function () { if (state.mode === "builder") openDrawer(); else openSheet("profile-sheet", $("#hamburger")); });
    $("#scrim") && $("#scrim").addEventListener("click", function () { closeAllSheets(); closeDrawer(); });
    $("#model-pill") && $("#model-pill").addEventListener("click", function () { openSheet("model-sheet", $("#model-pill")); });
    $$("[data-model]").forEach(function (m) { m.addEventListener("click", function () { $("#model-name").textContent = m.getAttribute("data-model"); state.model = m.getAttribute("data-model"); save(); closeAllSheets(); }); });

    // proto panel
    $("#proto-fab") && $("#proto-fab").addEventListener("click", function () { $("#proto-panel").classList.toggle("open"); });
    $$("[data-proto-level]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.getAttribute("data-proto-level"), idx = LEVELS.map(function (L) { return L.id; }).indexOf(id);
      var th = thresholdsFor(state.current); state.coins[state.current] = idx === 0 ? 0 : (th[idx] * 1.1) / duna().coinPrice;
      save(); applyLevel(); applyDuna(); segSelect("[data-proto-level]", b); }); });
    $$("[data-proto-env]").forEach(function (b) { b.addEventListener("click", function () { state.env = b.getAttribute("data-proto-env"); save(); applyPlatform(); segSelect("[data-proto-env]", b); }); });
    $$("[data-proto-os]").forEach(function (b) { b.addEventListener("click", function () { state.os = b.getAttribute("data-proto-os"); save(); applyPlatform(); segSelect("[data-proto-os]", b); }); });
    $$("[data-proto-mode]").forEach(function (b) { b.addEventListener("click", function () { setMode(b.getAttribute("data-proto-mode")); }); });
    $$("[data-proto-duna]").forEach(function (b) { b.addEventListener("click", function () { switchDuna(b.getAttribute("data-proto-duna")); segSelect("[data-proto-duna]", b); }); });
    $$("[data-proto-device]").forEach(function (b) { b.addEventListener("click", function () { applyDevice(b.getAttribute("data-proto-device")); segSelect("[data-proto-device]", b); }); });
    $("#proto-firstrun") && $("#proto-firstrun").addEventListener("click", function () { state.firstRun = !state.firstRun; this.classList.toggle("on", state.firstRun); this.textContent = state.firstRun ? "First-run: ON" : "First-run: OFF"; save(); });
    $("#proto-relogin") && $("#proto-relogin").addEventListener("click", logout);
    $("#proto-reset") && $("#proto-reset").addEventListener("click", function () { localStorage.removeItem(KEY); state = JSON.parse(JSON.stringify(DEFAULTS)); state.os = detectOS(); save(); location.reload(); });

    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeAllSheets(); closeDrawer(); $("#proto-panel").classList.remove("open"); } });
  }
  function codeTab(t) {
    $$("[data-codetab]").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-codetab") === t); });
    $$("[data-codepane]").forEach(function (p) { p.hidden = p.getAttribute("data-codepane") !== t; });
  }

  /* ---- Init ------------------------------------------------------------ */
  function init() {
    if (!state.os) state.os = detectOS();
    state.os = detectOS();  // reflect actual environment each load
    bind();
    var params = new URLSearchParams(location.search);
    if (params.get("reset") === "1") { localStorage.removeItem(KEY); state = JSON.parse(JSON.stringify(DEFAULTS)); state.os = detectOS(); }
    if (params.get("level")) { var idx = LEVELS.map(function (L) { return L.id; }).indexOf(params.get("level"));
      if (idx >= 0) { var th = thresholdsFor(state.current); state.coins[state.current] = idx === 0 ? 0 : (th[idx] * 1.1) / duna().coinPrice; } }
    if (params.get("onboarded") === "1") { state.firstBuyDone = false; }
    save();
    var osb = $('[data-proto-os="' + state.os + '"]'); if (osb) segSelect("[data-proto-os]", osb);
    var lvlb = $('[data-proto-level="' + LEVELS[levelIdx()].id + '"]'); if (lvlb) segSelect("[data-proto-level]", lvlb);
    applyDuna(); applyLevel(); applyPlatform();
    if (params.get("skiplogin") === "1") {
      login();
      if (params.get("duna") && DUNAS[params.get("duna")]) switchDuna(params.get("duna"));
      if (params.get("mode")) setMode(params.get("mode"), { go: false });
      if (params.get("view")) go(params.get("view"));
    } else { app.hidden = true; $("#auth").hidden = false; }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
