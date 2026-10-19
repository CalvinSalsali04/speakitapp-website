/* Speak It — the page's one script. Nothing typed here leaves the page: the
   preview runs on assets/demo-parser.js in the browser and saves nothing. */
(function () {
  'use strict';
  var q = function (s) { return document.querySelector(s); };
  var all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------ download links --- */

  /* Only a real apps.apple.com listing is trusted. Until there is one, a
     Download button opens a short sheet instead of a dead link. */
  var store = '';
  try {
    var meta = q('meta[name="speak-it-app-store-url"]');
    var url = new URL(meta ? meta.content : '');
    if (url.protocol === 'https:' && url.hostname === 'apps.apple.com' && /\/id\d+/.test(url.pathname)) store = url.href;
  } catch (e) { /* no listing yet */ }

  var sheet = q('[data-sheet]');
  all('[data-acquire]').forEach(function (link) {
    if (store) { link.href = store; link.rel = 'noopener'; return; }
    link.addEventListener('click', function (event) {
      if (sheet && typeof sheet.showModal === 'function') { event.preventDefault(); sheet.showModal(); }
    });
  });
  if (sheet) sheet.addEventListener('click', function (event) { if (event.target === sheet) sheet.close(); });

  /* ------------------------------------------------------- launch price --- */

  /* Annual only, never monthly, exactly as SpeakItProView shows it. It ends at
     the same instant as SummerLaunchSale.endsAt in the app (midnight Toronto,
     22 October 2026), so the page cannot advertise a price the App Store has
     stopped charging. Empty LAUNCH_ANNUAL_PRICE removes the offer entirely. */
  var LAUNCH_ANNUAL_PRICE = '$14.99';
  var SALE_ENDS_AT = Date.parse('2026-10-22T04:00:00Z');
  if (LAUNCH_ANNUAL_PRICE && Date.now() < SALE_ENDS_AT) {
    all('[data-sale]').forEach(function (el) { el.hidden = false; });
    var annual = q('[data-annual]');
    if (annual) annual.textContent = LAUNCH_ANNUAL_PRICE;
  }

  /* "Tomorrow" in the example row, in the reader's own date format. */
  all('[data-tomorrow]').forEach(function (el) {
    var d = new Date(); d.setDate(d.getDate() + 1); d.setHours(17, 0, 0, 0);
    el.dateTime = d.toISOString();
  });

  /* ----------------------------------------------------------- ink drop --- */

  /* The app's listening indicator: one drop of ink whose edge ripples and
     swells with the voice and goes almost still between phrases, with a faint
     echo behind it. Same formula as the app; one filled path per frame, drawn
     only while it is on screen, and a still circle under Reduce Motion. */
  var canvas = q('[data-drop]');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(3, window.devicePixelRatio || 1);
    var size = 0, visible = true, level = 0, raf = 0;

    function ink() { return getComputedStyle(document.body).color; }
    function resize() {
      size = canvas.clientWidth || 96;
      canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
    }
    function shape(t, amp, scale, lag) {
      var s = size / 150;                    /* the drop lives in a 150-unit box */
      var base = 40 + amp * 16, e = 1.2 + amp * 10;
      ctx.beginPath();
      for (var i = 0; i <= 96; i++) {
        var a = (i / 96) * Math.PI * 2, w = a - lag;
        var r = (base + e * (0.5 * Math.sin(3 * w + t * 1.9) + 0.3 * Math.sin(5 * w - t * 2.6 + 1) + 0.2 * Math.sin(2 * w + t * 1.1 + 2))) * scale * s;
        var x = size / 2 + Math.cos(a) * r, y = size / 2 + Math.sin(a) * r;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
    }
    function glyph(color) {
      var s = size / 150, hs = [6, 12, 18, 12, 6];
      ctx.fillStyle = color;
      hs.forEach(function (h, i) {
        var w = 3 * s, x = size / 2 + (i - 2) * 5.4 * s - w / 2, y = size / 2 - h * s / 2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h * s, w / 2) : ctx.rect(x, y, w, h * s); ctx.fill();
      });
    }
    function paint(now) {
      var t = now / 1000, color = ink();
      /* phrases and pauses, like somebody thinking out loud */
      var talking = Math.sin(t * 0.8) > -0.4;
      var target = talking ? 0.2 + 0.45 * Math.pow(Math.abs(Math.sin(t * 6.6 + Math.sin(t * 1.7) * 2)), 1.6) : 0.02;
      level += (target - level) * 0.1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.globalAlpha = 0.05 + level * 0.04; ctx.fillStyle = color;
      shape(t, level, 1.22 + level * 0.25, 0.4); ctx.fill();
      ctx.globalAlpha = 1;
      shape(t, level, 1, 0); ctx.fill();
      glyph(getComputedStyle(document.documentElement).getPropertyValue('--on-ink').trim() || '#fff');
    }
    function loop(now) { paint(now); raf = visible && !still.matches ? requestAnimationFrame(loop) : 0; }
    function start() { if (!raf && visible && !still.matches) raf = requestAnimationFrame(loop); else if (still.matches) paint(0); }

    resize(); paint(0); start();
    window.addEventListener('resize', function () { resize(); paint(performance.now()); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; start(); }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; start(); });
    if (still.addEventListener) still.addEventListener('change', start);
    var scheme = window.matchMedia('(prefers-color-scheme: dark)');
    if (scheme.addEventListener) scheme.addEventListener('change', function () { paint(performance.now()); });
  }

  /* ------------------------------------------------------------- try one --- */

  var form = q('[data-form]'), input = q('#thought'), out = q('[data-result]');
  var preview = window.SpeakItPreview;

  function show(text) {
    if (!preview || !out) return;
    var r = preview.parse(text);
    if (!r) { input.focus(); return; }
    /* textContent only: what somebody types is shown as words, never markup */
    q('[data-where]').textContent = r.destination;
    q('[data-title]').textContent = r.needsReview ? r.original : r.title;
    q('[data-detail]').textContent = r.isTask ? r.detail : (r.needsReview ? '' : r.kind);
    q('[data-why]').textContent = r.summary;
    q('[data-mark]').className = r.isTask ? 'tick' : 'note';
    out.hidden = false;
    out.classList.remove('is-new'); void out.offsetWidth; out.classList.add('is-new');
    out.scrollIntoView({ block: 'nearest', behavior: still.matches ? 'auto' : 'smooth' });
  }

  all('[data-example]').forEach(function (chip) {
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', function () {
      all('[data-example]').forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      input.value = chip.dataset.example;
      show(chip.dataset.example);
    });
  });
  if (form) form.addEventListener('submit', function (event) {
    event.preventDefault();
    all('[data-example]').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    show(input.value);
    input.blur();   /* drop the keyboard so the result is visible */
  });
})();
