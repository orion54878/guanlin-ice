/* 冠霖冰行 ─ 網站互動（LINE 串接、近期動態、詢問表單） */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var site = window.GL_SITE || {};
  var lineCfg = site.line || {};
  var officialId = String(lineCfg.officialId || "").trim();
  if (officialId && officialId.charAt(0) !== "@") officialId = "@" + officialId;

  var personalId = String(lineCfg.personalId || "").trim().replace(/^@/, "");

  var addUrl = String(lineCfg.addFriendUrl || "").trim() ||
    (officialId ? "https://line.me/R/ti/p/" + encodeURIComponent(officialId) : "") ||
    (personalId ? "https://line.me/ti/p/~" + encodeURIComponent(personalId) : "");
  var lineReady = Boolean(addUrl);
  var phone = String(site.phone || "0968-275-562");

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- LINE 連結 ---------- */
  if (lineReady) {
    $all("[data-line-link]").forEach(function (a) {
      a.href = addUrl;
      a.target = "_blank";
      a.rel = "noopener";
    });
    $all("[data-line-ready]").forEach(function (el) { el.hidden = false; });
    $all("[data-line-pending]").forEach(function (el) { el.hidden = true; });
    var shownId = officialId || personalId;
    if (shownId) {
      $all("[data-line-id]").forEach(function (el) { el.textContent = "ID：" + shownId; el.hidden = false; });
    }
    if (!officialId) {
      // 個人帳號無法自動帶入訊息，說明文字改為「複製後貼上」
      $all("[data-inquiry-sub]").forEach(function (el) {
        el.textContent = "填好按送出，會幫你把詢問內容整理好並複製，再到 LINE 聊天室貼上就能傳給我們。";
      });
    }
  }

  function renderQr() {
    var box = $("#line-qr");
    if (!box || !lineReady || typeof window.qrcode !== "function") return;
    try {
      var qr = window.qrcode(0, "M");
      qr.addData(addUrl);
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      var svg = box.querySelector("svg");
      if (svg) { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "LINE 加好友 QR Code"); }
      box.hidden = false;
    } catch (e) { /* 產生失敗就不顯示，按鈕仍可用 */ }
  }

  /* ---------- 提示訊息 ---------- */
  var toastTimer;
  function toast(msg) {
    var el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 4200);
  }

  // 同步複製：必須在使用者點擊的當下執行，離開頁面前就已完成
  function copySync(text) {
    var ta = document.createElement("textarea");
    var ok = false;
    try {
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;font-size:16px;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      ok = document.execCommand("copy");
    } catch (e) { ok = false; }
    if (ta.parentNode) ta.parentNode.removeChild(ta);
    return ok;
  }

  function copyText(text) {
    if (copySync(text)) return Promise.resolve(true);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  }

  /* ---------- 詢問表單 → LINE 訊息 ---------- */
  var form = $("#inquiry");
  if (form) {
    var dateInput = form.elements["date"];
    if (dateInput) {
      var now = new Date();
      dateInput.min = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var msgEl = $("#form-msg");
      msgEl.textContent = "";

      var missing = ["use", "type"].filter(function (name) {
        var el = form.elements[name];
        var bad = !el.value;
        el.classList.toggle("invalid", bad);
        return bad;
      });
      if (missing.length) {
        msgEl.textContent = "請先選擇用途與冰塊種類。";
        form.elements[missing[0]].focus();
        return;
      }

      var lines = [
        "【冠霖冰行｜冰塊詢問】",
        "用途：" + form.elements["use"].value,
        "冰塊種類：" + form.elements["type"].value
      ];
      var qty = form.elements["qty"].value.trim();
      var date = form.elements["date"].value;
      var note = form.elements["note"].value.trim();
      if (qty) lines.push("大約數量：" + qty);
      if (date) lines.push("需要日期：" + date.replace(/-/g, "/"));
      lines.push("取貨方式：" + form.elements["pickup"].value);
      if (note) lines.push("備註：" + note);
      var text = lines.join("\n");

      if (officialId) {
        // 官方帳號：直接開啟聊天室並帶入訊息
        window.open("https://line.me/R/oaMessage/" + encodeURIComponent(officialId) + "/?" + encodeURIComponent(text), "_blank", "noopener");
        toast("已開啟 LINE，按下傳送就完成詢問。");
      } else if (lineReady) {
        // 個人帳號：LINE 無法自動帶入文字。
        // 先在這一頁完成複製並顯示結果，再由客人按按鈕開啟 LINE，
        // 避免頁面還沒複製完就跳走。
        showSendPanel(text);
      } else {
        copyText(text).then(function (ok) {
          toast((ok ? "詢問內容已複製。" : "") + "LINE 設定中，請先來電 " + phone + "。");
        });
      }
    });

    var panel = $("#send-panel");
    var panelText = "";

    function setCopyStatus(ok) {
      var status = $("#send-status");
      var again = $("#send-copy");
      status.textContent = ok ? "✓ 詢問內容已複製" : "還沒複製成功，請按下方「複製詢問內容」";
      status.classList.toggle("is-fail", !ok);
      again.textContent = ok ? "再複製一次" : "複製詢問內容";
    }

    function showSendPanel(text) {
      if (!panel) return;
      panelText = text;
      $("#send-text").textContent = text;
      $("#send-open").href = addUrl;
      panel.hidden = false;
      copyText(text).then(function (ok) {
        setCopyStatus(ok);
        panel.scrollIntoView({ block: "center", behavior: root.classList.contains("no-motion") ? "auto" : "smooth" });
        panel.focus({ preventScroll: true });
      });
    }

    if (panel) {
      $("#send-copy").addEventListener("click", function () {
        copyText(panelText).then(function (ok) {
          setCopyStatus(ok);
          toast(ok ? "已複製，可以到 LINE 貼上了。" : "複製失敗，請長按上方文字手動複製。");
        });
      });
    }

    // 必填兩項都選好後，送出按鈕亮起呼吸光圈，提示「可以送出了」
    var submitBtn = form.querySelector('button[type="submit"]');
    function syncReady() {
      if (submitBtn) submitBtn.classList.toggle("pulse", Boolean(form.elements["use"].value && form.elements["type"].value));
    }
    $all("select", form).forEach(function (el) {
      el.addEventListener("change", function () { el.classList.remove("invalid"); syncReady(); });
    });
    syncReady();
  }

  /* ---------- 近期動態 ---------- */
  var PAGE = 4;

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function fmtDate(str) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(str || ""));
    return m ? m[1] + "." + pad(+m[2]) + "." + pad(+m[3]) : String(str || "");
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function safeUrl(url) {
    url = String(url || "").trim();
    return /^(https?:\/\/|images\/|\.?\/)/i.test(url) ? url : "";
  }

  function newsItem(n) {
    var art = el("article", "news-item");

    var meta = el("div", "news-meta");
    var time = el("time", "news-date", fmtDate(n.date));
    time.dateTime = String(n.date || "");
    meta.appendChild(time);
    if (n.tag) meta.appendChild(el("span", "news-tag", n.tag));
    art.appendChild(meta);

    var body = el("div", "news-content");
    body.appendChild(el("h3", "", n.title || ""));
    if (n.body) body.appendChild(el("p", "news-body", n.body));

    var img = safeUrl(n.image);
    if (img) {
      var im = el("img", "news-img");
      im.src = img; im.alt = n.title || ""; im.loading = "lazy";
      body.appendChild(im);
    }
    var link = safeUrl(n.link);
    if (link) {
      var a = el("a", "news-link", (n.linkText || "查看詳情") + " →");
      a.href = link;
      if (/^https?:/i.test(link)) { a.target = "_blank"; a.rel = "noopener"; }
      body.appendChild(a);
    }
    art.appendChild(body);
    return art;
  }

  function renderNews() {
    var list = $("#news-list");
    var more = $("#news-more");
    if (!list) return;

    var items = (Array.isArray(window.GL_NEWS) ? window.GL_NEWS : [])
      .filter(function (n) { return n && n.title; })
      .slice()
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });

    if (!items.length) {
      list.appendChild(el("p", "news-empty", "目前沒有最新消息，歡迎追蹤我們的 LINE 或臉書。"));
      return;
    }

    var shown = 0;
    function showMore() {
      items.slice(shown, shown + PAGE).forEach(function (n, i) {
        var node = newsItem(n);
        node.classList.add("reveal");
        node.style.transitionDelay = (i * 90) + "ms";
        list.appendChild(node);
        observe(node);
      });
      shown = Math.min(shown + PAGE, items.length);
      if (more) more.hidden = shown >= items.length;
    }
    showMore();
    if (more) more.addEventListener("click", showMore);
  }

  /* ---------- 手機選單 ---------- */
  var toggle = $(".nav-toggle");
  var nav = $("#site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (ev) {
      if (ev.target.closest("a")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- 捲動進場 ---------- */
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var node = e.target;
        node.classList.add("in");
        io.unobserve(node);
        setTimeout(function () { node.classList.add("shown"); }, 1100);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
  }
  function observe(node) {
    if (io) io.observe(node); else node.classList.add("in");
  }
  $all("[data-stagger]").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) { child.style.setProperty("--i", i); });
  });
  $all(".reveal, [data-stagger]").forEach(observe);

  /* ---------- 頁首：捲動陰影、目前所在區塊 ---------- */
  var header = $(".site-header");
  if (header) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        header.classList.toggle("scrolled", window.scrollY > 12);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var navLinks = {};
  $all('.site-nav > a[href^="#"]:not(.btn)').forEach(function (a) { navLinks[a.getAttribute("href").slice(1)] = a; });
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(navLinks).forEach(function (id) {
          if (id === e.target.id) navLinks[id].setAttribute("aria-current", "true");
          else navLinks[id].removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(navLinks).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });
  }

  /* ---------- 動態效果開關 ---------- */
  var motionBtn = $("#motion-toggle");
  var osReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (motionBtn && !osReduce) {
    var syncMotion = function () {
      var on = !root.classList.contains("no-motion");
      motionBtn.textContent = "動態效果：" + (on ? "開" : "關");
      motionBtn.setAttribute("aria-pressed", on ? "true" : "false");
    };
    motionBtn.hidden = false;
    syncMotion();
    motionBtn.addEventListener("click", function () {
      var off = root.classList.toggle("no-motion");
      try { off ? localStorage.setItem("gl-motion", "off") : localStorage.removeItem("gl-motion"); } catch (e) {}
      syncMotion();
    });
  }

  /* ---------- 啟動 ---------- */
  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
  renderNews();
  renderQr();
})();
