/* Boarding pass artwork, drawn once on 2D canvases.
   The same canvases are the 3D paper plane's textures (front = pass, back = airmail)
   and the <img> of the final boarding pass, so the 3D hand-off lands pixel for pixel. */
(function () {
  'use strict';
  var W = 2048, H = 854;                     // 2.4 : 1
  var STUB = 1478;                            // perforation x
  var R = 34;                                 // corner radius
  var NOTCH = 30;
  var C = {
    paper: '#f2ebdd', paper2: '#e9dfcb', ink: '#15171d', soft: 'rgba(21,23,29,.56)',
    faint: 'rgba(21,23,29,.14)', blue: '#2350c8', amber: '#c4632a', red: '#b8432c'
  };
  var SERIF = '"Instrument Serif", Georgia, serif';
  var SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';

  function canvas() { var c = document.createElement('canvas'); c.width = W; c.height = H; return c; }

  // card outline with rounded corners and two perforation notches
  function cardPath(g) {
    g.beginPath();
    g.moveTo(R, 0);
    g.lineTo(STUB - NOTCH, 0); g.arc(STUB, 0, NOTCH, Math.PI, 0, true);
    g.lineTo(W - R, 0); g.arcTo(W, 0, W, R, R);
    g.lineTo(W, H - R); g.arcTo(W, H, W - R, H, R);
    g.lineTo(STUB + NOTCH, H); g.arc(STUB, H, NOTCH, 0, Math.PI, true);
    g.lineTo(R, H); g.arcTo(0, H, 0, H - R, R);
    g.lineTo(0, R); g.arcTo(0, 0, R, 0, R);
    g.closePath();
  }

  // seeded RNG so the paper grain is identical on every load
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function paper(g, tone) {
    cardPath(g); g.save(); g.clip();
    var gr = g.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, tone || C.paper); gr.addColorStop(1, C.paper2);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    var r = rng(7);
    for (var i = 0; i < 9000; i++) {
      var a = r() * 0.05;
      g.fillStyle = r() > 0.5 ? 'rgba(90,70,40,' + a + ')' : 'rgba(255,255,255,' + a * 1.4 + ')';
      g.fillRect(r() * W, r() * H, 1 + r() * 2.2, 1 + r() * 2.2);
    }
    g.restore();
  }

  function spaced(g, text, x, y, size, color, weight, track, align) {
    g.font = (weight || 600) + ' ' + size + 'px ' + SANS;
    g.fillStyle = color;
    var t = (track == null ? 0.3 : track) * size;
    var w = 0, i;
    for (i = 0; i < text.length; i++) w += g.measureText(text[i]).width + (i < text.length - 1 ? t : 0);
    var cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    for (i = 0; i < text.length; i++) { g.fillText(text[i], cx, y); cx += g.measureText(text[i]).width + t; }
    return w;
  }

  // small plane glyph (top view), nose pointing right
  function glyph(g, x, y, s, fill) {
    g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = fill;
    g.beginPath();
    g.moveTo(26, 0); g.lineTo(-18, -17); g.lineTo(-10, -2); g.lineTo(-24, -2); g.lineTo(-28, -9);
    g.lineTo(-32, -9); g.lineTo(-29, 0); g.lineTo(-32, 9); g.lineTo(-28, 9); g.lineTo(-24, 2);
    g.lineTo(-10, 2); g.lineTo(-18, 17); g.closePath(); g.fill(); g.restore();
  }

  function foil(g, x0, y0, x1, y1) {
    var f = g.createLinearGradient(x0, y0, x1, y1);
    f.addColorStop(0, '#8a6326'); f.addColorStop(0.35, '#d9b46a'); f.addColorStop(0.55, '#f4dc9c');
    f.addColorStop(0.75, '#b98c3f'); f.addColorStop(1, '#7d5a22');
    return f;
  }

  // Both maps get the same "foil" shapes: one draws gold, the other marks them metallic.
  function front(g, orm) {
    var FOIL = orm ? 'rgb(255,50,255)' : null;
    if (!orm) paper(g);
    else { cardPath(g); g.fillStyle = 'rgb(255,205,0)'; g.fill(); }
    g.save(); cardPath(g); g.clip();
    g.textBaseline = 'alphabetic';
    var L = 92;

    if (!orm) {
      spaced(g, 'BOARDING PASS \u00b7 BUSINESS', L, 118, 25, C.soft, 600, 0.34);
      var nb = spaced(g, 'NOW BOARDING', STUB - 92, 118, 25, C.amber, 600, 0.34, 'right');
      g.fillStyle = C.amber; g.beginPath(); g.arc(STUB - 92 - nb - 24, 109, 8, 0, 7); g.fill();
    }
    // foil hairline under the header
    g.fillStyle = FOIL || foil(g, L, 0, STUB - 90, 0); g.fillRect(L, 152, STUB - 90 - L, 3);

    if (!orm) {
      g.fillStyle = C.ink; g.font = '400 154px ' + SERIF; g.fillText('Your project,', L - 6, 318);
      g.fillStyle = C.blue; g.font = 'italic 400 154px ' + SERIF; g.fillText('cleared for takeoff', L - 6, 450);

      spaced(g, 'FROM', L, 548, 21, C.soft, 600, 0.36);
      g.fillStyle = C.ink; g.font = '400 70px ' + SERIF; g.fillText('Idea', L - 2, 618);
      spaced(g, 'TO', 1016, 548, 21, C.soft, 600, 0.36);
      g.fillStyle = C.ink; g.font = '400 70px ' + SERIF; g.fillText('Final product', 1014, 618);
      g.strokeStyle = C.faint; g.lineWidth = 3; g.setLineDash([3, 12]); g.lineCap = 'round';
      g.beginPath(); g.moveTo(268, 596); g.lineTo(960, 596); g.stroke(); g.setLineDash([]);
    }
    glyph(g, 614, 596, 1.15, FOIL || foil(g, 580, 580, 650, 612));

    if (!orm) {
      var cols = [['FLIGHT', 'SZ001'], ['GATE', 'CALL'], ['SEAT', '1A'], ['PILOT', 'S. ZORANIC']];
      var xs = [L, 420, 700, 930];
      g.fillStyle = C.faint; g.fillRect(L, 680, STUB - 90 - L, 2);
      for (var i = 0; i < 4; i++) {
        spaced(g, cols[i][0], xs[i], 736, 20, C.soft, 600, 0.36);
        g.fillStyle = C.ink; g.font = '600 40px ' + SANS; g.fillText(cols[i][1], xs[i], 792);
      }
      // perforation
      g.strokeStyle = 'rgba(21,23,29,.26)'; g.lineWidth = 3; g.setLineDash([2, 14]);
      g.beginPath(); g.moveTo(STUB, NOTCH + 18); g.lineTo(STUB, H - NOTCH - 18); g.stroke(); g.setLineDash([]);

      // stub
      var S = STUB + 78;
      spaced(g, 'PASSENGER', S, 118, 21, C.soft, 600, 0.36);
      g.fillStyle = C.ink; g.font = 'italic 400 92px ' + SERIF; g.fillText('You', S - 4, 214);
    }
    var S2 = STUB + 78;
    g.font = '400 206px ' + SERIF; g.fillStyle = FOIL || foil(g, S2, 300, S2 + 420, 460);
    g.fillText('SZ001', S2 - 8, 452);
    if (!orm) {
      spaced(g, 'SEAT 1A \u00b7 ZONE 1', S2, 520, 21, C.soft, 600, 0.36);
      // barcode
      var r = rng(11), bx = S2, bw = W - 92 - S2;
      g.fillStyle = C.ink;
      while (bx < S2 + bw - 4) { var w = 3 + Math.floor(r() * 4) * 3; if (r() > 0.36) g.fillRect(bx, 640, w, 128); bx += w + 4 + Math.floor(r() * 3) * 3; }
    }
    g.restore();
    if (orm) { // outside the card stays rough, and paper-rough inside
      g.globalCompositeOperation = 'destination-over'; g.fillStyle = 'rgb(255,205,0)'; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }
  }

  // Back: airmail envelope. Drawn mirrored so it reads correctly on the back of the sheet.
  function back(g, orm) {
    var FOIL = orm ? 'rgb(255,50,255)' : null;
    // outline in sheet coordinates (notches line up with the front), artwork mirrored
    if (!orm) paper(g, '#f4eee2'); else { g.fillStyle = 'rgb(255,205,0)'; g.fillRect(0, 0, W, H); }
    g.save(); cardPath(g); g.clip();
    g.save(); g.translate(W, 0); g.scale(-1, 1);
    if (!orm) {
      // chevron border
      var b = 58, step = 64;
      g.save();
      g.beginPath(); g.rect(0, 0, W, H); g.rect(b, b, W - 2 * b, H - 2 * b); g.clip('evenodd');
      for (var x = -H; x < W + H; x += step) {
        g.fillStyle = (Math.round(x / step) % 2 === 0) ? C.blue : C.red;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + step / 2, 0); g.lineTo(x + step / 2 + H, H); g.lineTo(x + H, H); g.closePath(); g.fill();
      }
      g.restore();
      spaced(g, 'PAR AVION \u00b7 BY AIR MAIL', W / 2, 230, 26, C.blue, 600, 0.42, 'center');
      g.fillStyle = C.ink; g.font = 'italic 400 170px ' + SERIF; g.textAlign = 'center';
      g.fillText('Semin Zoranic', W / 2, 452);
      g.textAlign = 'left';
      spaced(g, 'CREATIVE DIRECTOR & PRODUCER', W / 2, 560, 24, C.soft, 600, 0.42, 'center');
    }
    g.fillStyle = FOIL || foil(g, W / 2 - 200, 0, W / 2 + 200, 0);
    g.fillRect(W / 2 - 230, 296, 460, 3);
    g.font = '400 64px ' + SERIF; g.textAlign = 'center'; g.fillText('SZ001', W / 2, 680); g.textAlign = 'left';
    g.restore();
    g.restore();
  }

  var cache = null;
  function build() {
    if (cache) return cache;
    var f = canvas(), fo = canvas(), b = canvas(), bo = canvas();
    front(f.getContext('2d'), false); front(fo.getContext('2d'), true);
    back(b.getContext('2d'), false); back(bo.getContext('2d'), true);
    cache = { front: f, frontOrm: fo, back: b, backOrm: bo, W: W, H: H, aspect: W / H };
    return cache;
  }

  var ready = null;
  window.SZPass = {
    aspect: W / H,
    ready: function () {
      if (ready) return ready;
      var fonts = document.fonts ? Promise.all([
        document.fonts.load('400 100px "Instrument Serif"'),
        document.fonts.load('italic 400 100px "Instrument Serif"'),
        document.fonts.load('600 40px Inter')
      ]).catch(function () {}) : Promise.resolve();
      var timeout = new Promise(function (r) { setTimeout(r, 2500); });
      ready = Promise.race([fonts, timeout]).then(build);
      return ready;
    }
  };
})();
