/* Guided flight. Before the site shows, a black screen with a big video-style play button.
   Tap it: "Please don't touch your screen…", then the site reveals itself and scrolls on its own:
   every caption, every project (read it, then its live site full screen), the gate, the closing.
   Any scroll, tap or key by the visitor stops the tour. */
(function () {
  'use strict';
  var html = document.documentElement;
  var $ = function (s) { return document.querySelector(s); };
  var box = $('#tour'), play = $('#tourPlay'), skip = $('#tourSkip'), stopBtn = $('#tourStop'), again = $('#tourResume');
  var sc = $('#showcase'), scFrame = $('#scFrame'), scImg = $('#scImg'), scName = $('#scName'), scDomain = $('#scDomain');
  if (!box || !window.SITE) return;
  var offer = !/[?&](instant|notour)\b/.test(location.search);
  if (offer) { html.classList.add('gated'); box.hidden = false; }   // black before anything of the site shows
  var track = $('#track'), stage = $('#stage');
  var running = false, raf = 0, timer = 0;

  function trackTop() { return track.getBoundingClientRect().top + scrollY; }
  function span() { return track.offsetHeight - stage.clientHeight; }
  function yFilm(f) { return trackTop() + span() * f * SITE.SPLIT; }
  function yPhase(ph) { return trackTop() + span() * Math.min(1, SITE.SPLIT + ph * (1 - SITE.SPLIT)); }

  // stops: {y, hold seconds, chapter index for the showcase}
  function stops() {
    var list = [];
    document.querySelectorAll('.cap').forEach(function (c, i) {
      var a = +c.dataset.in, b = +c.dataset.out;
      if (i > 0) list.push({ y: yFilm(a + (b - a) * 0.45), hold: 5.2 });
      else list.push({ y: yFilm(0.03), hold: 3.2 });
    });
    SITE.T.centers.forEach(function (c, i) { list.push({ y: yPhase(c), hold: 5.5, chapter: i }); });
    list.push({ y: yPhase(1), hold: 5 });
    ['.process', '.manifest', '.closing'].forEach(function (s) {
      var el = $(s); if (el) list.push({ y: Math.min(el.getBoundingClientRect().top + scrollY - innerHeight * 0.12, document.documentElement.scrollHeight - innerHeight), hold: 5 });
    });
    return list;
  }
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function glide(to, done) {
    var from = scrollY, d = to - from, dur = Math.min(4200, Math.max(1500, Math.abs(d) / innerHeight * 520)), t0 = performance.now();
    (function step(now) {
      if (!running) return;
      var k = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + d * ease(k));
      if (k < 1) raf = requestAnimationFrame(step); else done();
    })(t0);
  }

  /* the project's live site, full screen */
  var OFF = 'translateY(70px) scale(.88)';
  function showcase(i, done) {
    var ch = document.querySelectorAll('.chapter')[i];
    if (!ch || !ch.dataset.shot) { done(); return; }
    scImg.src = ch.dataset.shot;
    scDomain.textContent = ch.dataset.domain || '';
    scName.textContent = ch.querySelector('.display').textContent;
    sc.hidden = false;
    scFrame.style.transition = 'none';
    scFrame.style.transform = OFF;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      sc.classList.add('on');
      scFrame.style.transition = 'transform 1.1s cubic-bezier(.16,.84,.24,1)';
      scFrame.style.transform = 'none';
      timer = setTimeout(function () {
        scFrame.style.transform = OFF;
        sc.classList.remove('on');
        timer = setTimeout(function () { sc.hidden = true; done(); }, 700);
      }, 5600);
    }); });
  }
  function closeShowcase() { sc.classList.remove('on'); sc.hidden = true; scFrame.style.transform = ''; }

  function run(fromHere) {
    var list = stops(), i = 0;
    if (fromHere) {                            // pick up at the next stop below where the visitor is
      while (i < list.length && list[i].y < scrollY - 40) i++;
      if (i >= list.length - 1) { i = 0; }
    }
    (function next() {
      if (!running) return;
      if (i >= list.length) { stop(); return; }
      var s = list[i++];
      glide(s.y, function () {
        timer = setTimeout(function () {
          if (!running) return;
          if (s.chapter != null) showcase(s.chapter, next); else next();
        }, s.hold * 1000);
      });
    })();
  }
  function stop() {
    running = false; cancelAnimationFrame(raf); clearTimeout(timer); closeShowcase();
    stopBtn.hidden = true; html.classList.remove('touring'); if (again) again.hidden = false;
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (e) { removeEventListener(e, onUser, true); });
  }
  function onUser(e) {
    if (e.target && e.target.closest && e.target.closest('#tourStop')) return;
    stop();
  }
  function openGate() {
    box.classList.add('gone');
    html.classList.remove('gated');
    window.dispatchEvent(new Event('gate-open'));
    if (again) again.hidden = false;
    setTimeout(function () { box.hidden = true; }, 700);
  }
  function whenLoaded(fn) { (function w() { if (html.classList.contains('loaded')) fn(); else setTimeout(w, 80); })(); }
  function begin(fromHere) {
    running = true; html.classList.add('touring'); stopBtn.hidden = false; if (again) again.hidden = true;
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (e) { addEventListener(e, onUser, { capture: true, passive: true }); });
  }
  function start() {
    scrollTo(0, 0);
    box.classList.add('noting');
    var t0 = performance.now();
    setTimeout(function () {
      whenLoaded(function () {
        openGate(); begin();
        timer = setTimeout(function () { run(false); }, 500);   // let the hero title rise first
      });
    }, 2400);
  }
  function replay() {
    if (running) return;
    var atEnd = scrollY > document.documentElement.scrollHeight - innerHeight * 1.6;
    if (atEnd) scrollTo(0, 0);
    begin(); timer = setTimeout(function () { run(!atEnd); }, 150);
  }
  play.addEventListener('click', start);
  /* "See my work": only the websites, as a grid; "Who I am" from there starts the flight */
  var works = $('#works'), chooseWork = $('#chooseWork'), worksClose = $('#worksClose'), worksWho = $('#worksWho');
  function showWorks() {
    if (!works) return;
    box.classList.add('gone'); works.hidden = false; works.scrollTop = 0;
    requestAnimationFrame(function () { works.classList.add('on'); });
    setTimeout(function () { box.hidden = true; }, 600);
    try { history.replaceState(null, '', '#radovi'); } catch (e) {}
  }
  function hideWorks() { works.classList.remove('on'); works.hidden = true; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
  if (chooseWork) chooseWork.addEventListener('click', showWorks);
  if (worksClose) worksClose.addEventListener('click', function () { hideWorks(); openGate(); });
  if (worksWho) worksWho.addEventListener('click', function () { hideWorks(); box.hidden = false; box.classList.remove('gone'); box.classList.add('on'); start(); });
  if (works) works.addEventListener('keydown', function (e) { if (e.key === 'Escape') { hideWorks(); openGate(); } });
  if (offer && /^#(radovi|work)$/.test(location.hash)) showWorks();
  skip.addEventListener('click', openGate);
  stopBtn.addEventListener('click', stop);
  if (again) again.addEventListener('click', replay);
  if (!offer && again) again.hidden = false;
  box.addEventListener('keydown', function (e) { if (e.key === 'Escape') openGate(); });

  // the play button shows straight away; the site underneath keeps loading meanwhile
  if (offer) requestAnimationFrame(function () { box.classList.add('on'); play.focus({ preventScroll: true }); });
  window.TOUR = { works: showWorks, start: function () { box.hidden = false; start(); }, replay: replay, stop: stop, show: function (i) { showcase(i, function () {}); } };
})();
