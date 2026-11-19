/* Scroll engine: loader, progress rail, corner captions, project chapters, the gate,
   and (when clips are listed on #film) the scroll-scrubbed video layers.
   Broadcasts the 3D phase as `site-progress` for product.js and feeds sky.js. */
(function () {
  'use strict';
  var html = document.documentElement;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < (a || 0) ? (a || 0) : v > (b == null ? 1 : b) ? (b == null ? 1 : b) : v; };
  var smooth = function (x) { x = clamp(x); return x * x * (3 - 2 * x); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) html.classList.add('reduce');

  var track = $('#track'), stage = $('#stage'), filmEl = $('#film');
  var nChap = document.querySelectorAll('.chapter').length || 1;
  // scroll budget in stage heights: the film, then ~1.7 per project, plus the plane's entry and the gate
  var FILM = 9, PER = 1.68, FIRST = 1.25, D3 = Math.ceil(FIRST + PER * (nChap - 1) + 3.04 + 0.75);   // ... + gate glide/fade + a short hold
  var SPLIT = FILM / (FILM + D3);
  var STEP = PER / D3;                                    // phase between two chapters
  var T = { entry: 1.0 / D3, first: FIRST / D3, step: STEP };
  T.centers = []; for (var ci = 0; ci < nChap; ci++) T.centers.push(T.first + ci * STEP);
  T.last = T.centers[nChap - 1];
  T.H0 = T.last + 0.62 / D3; T.H1 = T.H0 + 1.9 / D3; T.F0 = T.H1 + 0.14 / D3; T.F1 = T.F0 + 0.38 / D3;
  T.TW = STEP * 0.62;
  var CHAP_TRAVEL = 1.03 / STEP;          // viewport heights of text travel per unit of phase
  var FADE_A = STEP * 0.233, FADE_B = STEP * 0.183;

  var caps = $$('.cap').map(function (el) { return { el: el, a: +el.dataset.in, b: +el.dataset.out }; });
  var chapters = $$('.chapter').map(function (el, i) {
    if (i % 2 === 1 && !reduce) el.classList.add('right');
    el.dataset.c = T.centers[i].toFixed(5);
    return { el: el, c: T.centers[i], i: i };
  });
  var chapHead = $('.chapters-head'), chapnav = $('#chapnav'), navBtns = $$('#chapnav button');
  var explore = $('#explore'), gate = $('#gate'), gateBits = $$('.gate-actions, .gate-links');
  var railFill = $('#railFill'), railCount = $('#railCount'), hint = $('#hint');
  var cveilL = $('#cveilL'), cveilR = $('#cveilR');
  var instant = /[?&]instant\b/.test(location.search);   // QA: no easing

  /* ---------- layout ---------- */
  var vh = 0, vw = 0;
  function layout() {
    var h = stage.clientHeight || innerHeight, w = innerWidth;
    if (Math.abs(h - vh) < 1 && w === vw) return;
    vh = h; vw = w;
    track.style.height = Math.round((FILM + D3 + 1) * vh) + 'px';
    force = true;
  }
  var lastW = innerWidth, lastH = innerHeight;
  addEventListener('resize', function () {
    // ignore the mobile URL bar sliding in and out
    if (innerWidth !== lastW || Math.abs(innerHeight - lastH) > 120) { lastW = innerWidth; lastH = innerHeight; layout(); }
  });

  /* ---------- jumps ---------- */
  function trackTop() { return track.getBoundingClientRect().top + scrollY; }
  function span() { return track.offsetHeight - stage.clientHeight; }
  function jump(p) { scrollTo({ top: trackTop() + span() * p, behavior: reduce ? 'auto' : 'smooth' }); }
  function jumpChapter(i) { jump(SPLIT + (1 - SPLIT) * chapters[i].c); }
  $$('[data-jump]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var j = a.getAttribute('data-jump');
      if (j === 'gate') jump(1); else jump(0);
    });
  });
  navBtns.forEach(function (b) { b.addEventListener('click', function () { jumpChapter(+b.dataset.i); }); });
  chapters.forEach(function (ch) {
    ch.el.addEventListener('focusin', function () { if (Math.abs(phase - ch.c) > .03) jumpChapter(ch.i); });
  });
  gate.addEventListener('focusin', function () { if (phase < T.F1) jump(1); });

  /* ---------- clips (optional) ---------- */
  var clipSrc = (filmEl.getAttribute('data-clips') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var mobileSrc = (filmEl.getAttribute('data-clips-mobile') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (mobileSrc.length === clipSrc.length && matchMedia('(max-width: 760px)').matches) clipSrc = mobileSrc;
  var layers = clipSrc.map(function (src) {
    var v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'metadata';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    filmEl.appendChild(v);
    var L = { v: v, src: src, dur: 0, t: 0, target: 0, s: 0, e: 1 };
    v.addEventListener('loadedmetadata', function () { L.dur = v.duration || 5; v.currentTime = .001; splitClips(); });
    return L;
  });
  if (layers.length) html.classList.add('has-clips');
  function splitClips() {
    var total = 0, acc = 0;
    layers.forEach(function (L) { total += L.dur || 5; });
    layers.forEach(function (L) { L.s = acc / total; acc += L.dur || 5; L.e = acc / total; });
    force = true;
  }
  var XF = .018;
  function updateClips(f) {
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var inA = i === 0 ? 1 : smooth((f - (L.s - XF)) / (2 * XF));
      var outB = i === layers.length - 1 ? 1 : 1 - smooth((f - (L.e - XF)) / (2 * XF));
      L.v.style.opacity = Math.min(inA, outB);
      if (f < L.s - .12 || f > L.e + .12 || !L.dur) continue;
      L.target = clamp((f - L.s) / (L.e - L.s)) * (L.dur - .05);
    }
  }
  function easeClips() {
    var moving = false;
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      if (!L.dur) continue;
      L.t += (L.target - L.t) * .14;
      if (Math.abs(L.v.currentTime - L.t) > .01 && !L.v.seeking) { L.v.currentTime = L.t; }
      if (Math.abs(L.target - L.t) > .002) moving = true;
    }
    return moving;
  }

  /* ---------- loader ---------- */
  var loader = $('#loader'), bar = $('#loaderBar'), label = $('#loaderLabel');
  var ASSETS = [['vendor/three.module.js', 691648], ['assets/fonts/display.woff2', 21032], ['assets/fonts/display-italic.woff2', 22128],
    ['assets/fonts/inter-500.woff2', 24272], ['assets/fonts/inter-600.woff2', 24452], ['assets/pass.webp', 88782]];
  var got = [], need = [], finished = false;
  function paintBar() {
    var a = 0, b = 0;
    for (var i = 0; i < need.length; i++) { a += Math.min(got[i], need[i]); b += need[i]; }
    if (bar) bar.style.transform = 'scaleX(' + (b ? a / b : 1) + ')';
  }
  function pull(url, size, i, onBlob) {
    need[i] = size; got[i] = 0;
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      var len = +res.headers.get('content-length'); if (len) need[i] = len;
      if (!res.body || !res.body.getReader) return res.blob().then(function (b) { got[i] = need[i]; paintBar(); return b; });
      var reader = res.body.getReader(), parts = [];
      return (function read() {
        return reader.read().then(function (r) {
          if (r.done) { got[i] = need[i]; paintBar(); return new Blob(parts); }
          parts.push(r.value); got[i] += r.value.byteLength; paintBar(); return read();
        });
      })();
    }).then(function (blob) { if (onBlob) onBlob(blob); }).catch(function () {
      got[i] = need[i]; paintBar(); if (onBlob) onBlob(null);
    });
  }
  function flap(el, to, done) {
    var from = el.textContent, n = Math.max(from.length, to.length), f = 0, AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (reduce) { el.textContent = to; if (done) done(); return; }
    var id = setInterval(function () {
      f++; var out = '';
      for (var i = 0; i < n; i++) {
        if (f > i * 2 + 5) out += to[i] || ' ';
        else out += f > i * 2 ? AZ[(Math.random() * 26) | 0] : (from[i] || ' ');
      }
      el.textContent = out.replace(/\s+$/, '');
      if (f > n * 2 + 5) { clearInterval(id); el.textContent = to; if (done) done(); }
    }, 34);
  }
  function finish() {
    if (finished) return; finished = true;
    html.classList.add('loaded'); ready = true; force = true;
  }
  var jobs = ASSETS.map(function (a, i) { return pull(a[0], a[1], i); });
  layers.forEach(function (L, k) {
    var i = ASSETS.length + k;
    jobs.push(pull(L.src, 4e6, i, function (blob) { L.v.src = blob ? URL.createObjectURL(blob) : L.src; }));
  });
  var passReady = window.SZPass ? window.SZPass.ready() : Promise.resolve();
  Promise.all(jobs.concat([passReady])).then(finish, finish);
  setTimeout(finish, 2500);

  /* ---------- line reveals: each headline line slides up out of a mask ---------- */
  var ready = false;
  function splitLines() {
    $$('.cap .display, .chapter .display, .closing .display, .process .display').forEach(function (el) {
      if (el.querySelector('.ln')) return;
      el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(function (part, i) {
        return '<span class="ln"><span style="--d:' + i + '">' + part + '</span></span>';
      }).join('');
    });
  }
  splitLines();
  window.addEventListener('gate-open', function () { force = true; });
  window.addEventListener('langchange', function () { splitLines(); force = true; });
  // sections after the flight reveal when they scroll into view
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.18 });
    $$('.process, .manifest .col, .closing').forEach(function (el) { io.observe(el); });
  } else $$('.process, .manifest .col, .closing').forEach(function (el) { el.classList.add('in'); });

  /* ---------- per-frame update ---------- */
  var raw = 0, cur = -1, film = 0, phase = 0, force = true, lastPhase = -1;
  function readScroll() {
    var r = track.getBoundingClientRect(), s = track.offsetHeight - stage.clientHeight;
    raw = s > 0 ? clamp(-r.top / s) : 0;
    html.classList.toggle('past-track', r.bottom < stage.clientHeight - 2);
  }
  function update() {
    film = clamp(cur / SPLIT);
    phase = clamp((cur - SPLIT) / (1 - SPLIT));
    if (window.SKY) window.SKY.set(film, phase);
    if (html.classList.contains('no-sky')) stage.style.setProperty('--dawn', smooth((film - .45) / .35).toFixed(3));
    if (layers.length) updateClips(film);
    if (phase !== lastPhase) { lastPhase = phase; window.dispatchEvent(new CustomEvent('site-progress', { detail: phase })); }

    railFill.style.transform = 'scaleY(' + cur.toFixed(4) + ')';
    var pct = Math.round(cur * 100); railCount.textContent = (pct < 10 ? '0' : '') + pct;
    hint.classList.toggle('off', cur > .004);

    var clear = 1 - smooth(phase / (T.entry * 0.7));
    for (var i = 0; i < caps.length; i++) {
      var c = caps[i], sp = c.b - c.a, fade = Math.min(sp * .3, .03);
      var head = c.a <= 0 ? 1 : (film - c.a) / fade, tail = (c.b - film) / fade;
      var o = clamp(Math.min(head, tail)) * clear;
      var local = clamp((film - c.a) / sp);
      var y = reduce ? 0 : (1 - local) * 14 - 7;
      c.el.style.opacity = o.toFixed(3);
      c.el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
      c.el.style.visibility = o > .002 ? 'visible' : 'hidden';
      c.el.classList.toggle('in', ready && !html.classList.contains('gated') && o > .35);
    }

    var near = 0, best = 9, vl = 0, vr = 0;
    for (var k = 0; k < chapters.length; k++) {
      var ch = chapters[k], d = phase - ch.c;
      var oc = 1 - smooth((Math.abs(d) - FADE_A) / FADE_B);
      if (phase <= 0) oc = 0;
      ch.el.style.setProperty('--chapter-y', (-d * CHAP_TRAVEL * vh).toFixed(1) + 'px');
      ch.el.style.opacity = oc.toFixed(3);
      if (Math.abs(d) < best) { best = Math.abs(d); near = k; }
      if (ch.el.classList.contains('right')) vr = Math.max(vr, oc); else vl = Math.max(vl, oc);
      ch.el.classList.toggle('in', oc > .35);
    }
    cveilL.style.opacity = vl.toFixed(3); cveilR.style.opacity = vr.toFixed(3);
    chapHead.style.opacity = (smooth((phase - T.entry * .4) / (T.entry * .6)) * (1 - smooth((phase - (T.H0 - .03)) / .03))).toFixed(3);
    var navOn = phase > T.entry * .8 && phase < T.H0;
    chapnav.classList.toggle('on', navOn);
    navBtns.forEach(function (b, j) { b.classList.toggle('on', j === near); });
    explore.classList.toggle('on', navOn && html.classList.contains('has-3d'));

    var g0 = html.classList.contains('has-3d') ? T.F0 : T.last + 2 * STEP / 3;
    var go = smooth((phase - g0) / .03), g2 = smooth((phase - g0 - .02) / .03);
    gate.style.opacity = go.toFixed(3);
    gate.classList.toggle('on', go > .01);
    gate.style.pointerEvents = go > .6 ? 'auto' : 'none';
    gateBits.forEach(function (el) { el.style.opacity = g2.toFixed(3); el.style.transform = 'translateY(' + ((1 - g2) * 12).toFixed(1) + 'px)'; });
  }
  function tick() {
    requestAnimationFrame(tick);
    readScroll();
    var d = raw - cur;
    var next = (cur < 0 || reduce || instant || Math.abs(d) < .00005) ? raw : cur + d * .14;
    var clipsMoving = layers.length ? easeClips() : false;
    if (next === cur && !force && !clipsMoving) return;
    cur = next; force = false;
    update();
  }
  layout();
  requestAnimationFrame(tick);
  window.SITE = { jump: jump, get phase() { return phase; }, get film() { return film; }, SPLIT: SPLIT, T: T };
})();
