/* 3D props beside the story: a departure board (hero), a compass (Idea), an altimeter
   counting views (Production), a browser + phone (Build: web and app development),
   a flip calendar landing on "Call booked" (Launch), and an enamel pin for each project.
   Each prop follows an empty anchor element in the page, so the layout lives in CSS
   and the props stay put on any screen size. Same materials as the boarding pass. */
import * as THREE from './vendor/three.module.js';

const host = document.getElementById('props');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const SERIF = '"Instrument Serif", Georgia, serif';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';

if (host) start().catch((e) => { console.warn('3D props disabled:', e); host.remove(); });

async function start() {
  if (window.SZPass) await window.SZPass.ready();          // fonts are loaded once this resolves
  if (document.fonts) await document.fonts.load('600 50px Inter', '\u010c').catch(() => {});
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const ANISO = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  camera.position.set(0, 0, 9);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Scene();
  room.background = new THREE.Color(0x353a47);
  const card = (w, h, c, x, y, z, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); room.add(m);
  };
  card(6, 3, 0xffffff, -3, 5, 4, 0.5, Math.PI / 2.4);
  card(4, 6, 0xd5e2ff, 7, 1, 1, -Math.PI / 2);
  card(8, 3, 0xffb873, 0, 1.5, -8);
  card(3, 8, 0xffffff, -7, 0, 2, Math.PI / 2);
  card(10, 10, 0x161c2a, 0, -6, 0, 0, -Math.PI / 2);
  scene.environment = pmrem.fromScene(room, 0.035).texture;
  scene.add(new THREE.HemisphereLight(0xffe7c8, 0x27384f, 1.3));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2); key.position.set(-4, 5, 6);
  const fill = new THREE.DirectionalLight(0xbcd4ff, 0.7); fill.position.set(5, 1, 4);
  const rim = new THREE.DirectionalLight(0xffae66, 2.0); rim.position.set(2, 2.5, -6);
  scene.add(key, fill, rim);

  /* ---------- helpers ---------- */
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, srgb) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = ANISO;
    return t;
  }
  // draw(g, orm): the same function paints colour, or the roughness/metal map (G = rough, B = metal)
  function pair(w, h, draw) {
    const a = cv(w, h), b = cv(w, h);
    draw(a.getContext('2d'), false, w, h); draw(b.getContext('2d'), true, w, h);
    return [tex(a, true), tex(b, false)];
  }
  const ORM = (rough, metal) => `rgb(255,${Math.round(rough * 255)},${Math.round(metal * 255)})`;
  const FOIL = ORM(0.22, 1);
  function foilGrad(g, x0, y0, x1, y1) {
    const f = g.createLinearGradient(x0, y0, x1, y1);
    f.addColorStop(0, '#8a6326'); f.addColorStop(0.35, '#d9b46a'); f.addColorStop(0.55, '#f4dc9c'); f.addColorStop(0.75, '#b98c3f'); f.addColorStop(1, '#7d5a22');
    return f;
  }
  function spaced(g, text, x, y, size, color, weight = 600, track = 0.3, align = 'left') {
    g.font = `${weight} ${size}px ${SANS}`; g.fillStyle = color;
    const t = track * size; let w = 0;
    for (let i = 0; i < text.length; i++) w += g.measureText(text[i]).width + (i < text.length - 1 ? t : 0);
    let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    for (let i = 0; i < text.length; i++) { g.fillText(text[i], cx, y); cx += g.measureText(text[i]).width + t; }
  }
  function circleText(g, text, cx, cy, r, size, fill) {
    g.save(); g.font = `600 ${size}px ${SANS}`; g.fillStyle = fill; g.textAlign = 'center'; g.textBaseline = 'middle';
    const chars = [...text]; const step = (Math.PI * 2) / chars.length;
    chars.forEach((ch, i) => {
      const a = -Math.PI / 2 + i * step;
      g.save(); g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
    });
    g.restore();
  }
  function rrect(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function poly(pts) { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; }
  function ellipse(cx, cy, rx, ry) { const s = new THREE.Shape(); s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0); return s; }
  // extruded solid whose back sits at z = 0; returns mesh, front face at z = depth + 2 * bevel
  function ext(shape, depth, bevel, mat, seg = 24) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 3, curveSegments: seg });
    g.translate(0, 0, bevel);
    return new THREE.Mesh(g, mat);
  }
  function plane(w, h, mat) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); }
  function disc(r, mat, seg = 96) { return new THREE.Mesh(new THREE.CircleGeometry(r, seg), mat); }

  // every prop owns its materials so each can fade on its own
  function kit() {
    const mats = [];
    const reg = (m, base = 1) => { m.transparent = true; m.userData.base = base; m.opacity = base; mats.push(m); return m; };
    return {
      mats,
      gold: () => reg(new THREE.MeshPhysicalMaterial({ color: 0xd8b26a, metalness: 1, roughness: 0.26, clearcoat: 0.4, clearcoatRoughness: 0.2 })),
      goldDim: () => reg(new THREE.MeshPhysicalMaterial({ color: 0xa47c3c, metalness: 1, roughness: 0.4 })),
      steel: () => reg(new THREE.MeshPhysicalMaterial({ color: 0xc8ced8, metalness: 1, roughness: 0.3 })),
      ink: () => reg(new THREE.MeshPhysicalMaterial({ color: 0x161a23, metalness: 0.5, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.25 })),
      deep: () => reg(new THREE.MeshPhysicalMaterial({ color: 0x0b0d13, metalness: 0.3, roughness: 0.5 })),
      cream: () => reg(new THREE.MeshPhysicalMaterial({ color: 0xf2ebdd, roughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color(0xfff1da) })),
      enamel: (c) => reg(new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 })),
      glass: () => reg(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, clearcoat: 1, envMapIntensity: 2.4, depthWrite: false }), 0.13),
      face: (map, orm, extra = {}) => reg(new THREE.MeshPhysicalMaterial(Object.assign({ map, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1, clearcoat: 0.5, clearcoatRoughness: 0.15 }, extra))),
      reg
    };
  }

  /* ---------- 1. departure board ---------- */
  const glyphCache = new Map();
  function glyph(ch) {
    if (glyphCache.has(ch)) return glyphCache.get(ch);
    const c = cv(256, 352), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 352); gr.addColorStop(0, '#1d212b'); gr.addColorStop(0.5, '#12151c'); gr.addColorStop(1, '#1b1f28');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 352);
    g.fillStyle = '#f2ebdd'; g.font = `600 250px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 128, 186);
    const t = tex(c, true); glyphCache.set(ch, t); return t;
  }
  function halfPlane(w, h, top, back) {
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, top ? h / 2 : -h / 2, 0);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const v = uv.getY(i);
      uv.setY(i, back ? 0.5 - v * 0.5 : top ? 0.5 + v * 0.5 : v * 0.5);
    }
    return geo;
  }
  function makeBoard() {
    const K = kit(), G = new THREE.Group();
    const housing = ext(rrect(4.0, 1.66, 0.16), 0.16, 0.035, K.ink()); G.add(housing);
    const FZ = 0.16 + 0.07;
    const [lt, lo] = pair(1400, 96, (g, orm, w, h) => {
      g.fillStyle = orm ? ORM(0.5, 0) : '#161a23'; g.fillRect(0, 0, w, h);
      if (orm) { g.fillStyle = FOIL; }
      spaced(g, 'DEPARTURES', 24, 64, 40, orm ? FOIL : foilGrad(g, 0, 0, 400, 0), 600, 0.34);
      if (!orm) spaced(g, 'FLIGHT SZ001 · GATE CALL', w - 24, 64, 30, 'rgba(242,235,221,.62)', 600, 0.3, 'right');
    });
    const label = plane(3.6, 0.247, K.face(lt, lo, { metalness: 1 })); label.position.set(0, 0.6, FZ + 0.002); G.add(label);
    const tiles = [];
    const TW = 0.6, TH = 0.84, HW2 = 0.54, HH = 0.37;
    for (let i = 0; i < 5; i++) {
      const tg = new THREE.Group(); tg.position.set(-1.36 + i * 0.68, -0.16, FZ);
      tg.add(ext(rrect(TW, TH, 0.06), 0.05, 0.012, K.deep()));
      const z = 0.05 + 0.025;
      const mTop = K.reg(new THREE.MeshStandardMaterial({ map: glyph(' '), roughness: 0.55 }));
      const mBot = K.reg(new THREE.MeshStandardMaterial({ map: glyph(' '), roughness: 0.55 }));
      const mFlapF = K.reg(new THREE.MeshStandardMaterial({ map: glyph(' '), roughness: 0.55 }));
      const mFlapB = K.reg(new THREE.MeshStandardMaterial({ map: glyph(' '), roughness: 0.55, side: THREE.BackSide }));
      const top = new THREE.Mesh(halfPlane(HW2, HH, true), mTop); top.position.z = z;
      const bot = new THREE.Mesh(halfPlane(HW2, HH, false), mBot); bot.position.z = z;
      const flap = new THREE.Group(); flap.position.z = z + 0.004;
      flap.add(new THREE.Mesh(halfPlane(HW2, HH, true), mFlapF), new THREE.Mesh(halfPlane(HW2, HH, true, true), mFlapB));
      flap.visible = false;
      const gap = plane(HW2 + 0.02, 0.012, K.deep()); gap.position.z = z + 0.006;
      const pinL = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 12), K.gold()); pinL.rotation.z = Math.PI / 2; pinL.position.set(-HW2 / 2 - 0.02, 0, z);
      const pinR = pinL.clone(); pinR.position.x = HW2 / 2 + 0.02;
      tg.add(top, bot, flap, gap, pinL, pinR); G.add(tg);
      tiles.push({ ch: ' ', mTop, mBot, mFlapF, mFlapB, flap, queue: [], t0: 0, from: ' ', to: ' ' });
    }
    const TARGET = 'SZ001', AZ = 'ABCDEFGHJKLMNPRTUVWXY0123456789';
    let played = false, wasHidden = true;
    function play(now) {
      tiles.forEach((tl, i) => {
        tl.queue = [];
        const n = reduce ? 0 : 4 + i * 2;
        for (let k = 0; k < n; k++) tl.queue.push(AZ[(Math.random() * AZ.length) | 0]);
        tl.queue.push(TARGET[i]); tl.t0 = now + i * 70;
      });
    }
    const FLIP = 110;
    return {
      group: G, nom: [4.15, 1.8], mats: K.mats,
      update(o, now) {
        if (o > 0.4 && wasHidden) { play(now); wasHidden = false; played = true; }
        if (o < 0.02) wasHidden = true;
        let busy = false;
        for (const tl of tiles) {
          if (!tl.flap.visible && tl.queue.length && now >= tl.t0) {
            tl.from = tl.ch; tl.to = tl.queue.shift();
            tl.mTop.map = glyph(tl.to); tl.mFlapF.map = glyph(tl.from); tl.mFlapB.map = glyph(tl.to);
            tl.flap.rotation.x = 0; tl.flap.visible = true; tl.start = now;
          }
          if (tl.flap.visible) {
            const k = clamp((now - tl.start) / FLIP);
            tl.flap.rotation.x = -Math.PI * k * k;
            if (k >= 1) { tl.flap.visible = false; tl.ch = tl.to; tl.mBot.map = glyph(tl.ch); tl.t0 = now + 10; }
            busy = true;
          } else if (tl.queue.length) busy = true;
        }
        G.rotation.y = (reduce ? 0 : Math.sin(now / 2600) * 0.1) - 0.18;
        G.rotation.x = -0.06;
        return busy || !played;
      }
    };
  }

  /* ---------- 2. light bulb with a paper-plane filament (Idea) ---------- */
  function glowSprite(K, color, base = 1) {
    const c = cv(256, 256), g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, color); gr.addColorStop(0.25, color.replace(/[\d.]+\)$/, '0.45)')); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const m = K.reg(new THREE.SpriteMaterial({ map: tex(c, true), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), base);
    m.userData.custom = true;                     // its opacity is driven by the prop itself
    return new THREE.Sprite(m);
  }
  function makeBulb() {
    const K = kit(), G = new THREE.Group();
    // glass: a classic bulb profile turned on a lathe
    const prof = [];
    for (let k = 0; k <= 24; k++) { const th = (k / 24) * 2.2; prof.push(new THREE.Vector2(Math.max(0.001, 0.8 * Math.sin(th)), 0.55 + 0.8 * Math.cos(th))); }
    const end = prof[prof.length - 1];
    for (let k = 1; k <= 10; k++) { const t = k / 10, e = t * t * (3 - 2 * t); prof.push(new THREE.Vector2(end.x + (0.33 - end.x) * e, end.y + (-0.42 - end.y) * t)); }
    prof.push(new THREE.Vector2(0.33, -0.5));
    const glassM = K.glass(); glassM.side = THREE.DoubleSide; glassM.userData.base = 0.2;
    const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), glassM); G.add(glass);
    const glow = glowSprite(K, 'rgba(255,214,150,1)', 0.95); glow.position.y = 0.6; glow.scale.setScalar(2.6); G.add(glow);
    // filament shaped like a paper plane
    const P3 = (x, y) => new THREE.Vector3(x, y, 0);
    const outline = [P3(-0.34, 0.5), P3(0.32, 0.8), P3(-0.1, 0.28), P3(-0.04, 0.56), P3(-0.34, 0.5)];
    const filM = K.reg(new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false }));
    const fil = new THREE.Group(); G.add(fil);
    for (let k = 0; k < outline.length - 1; k++) {
      fil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(outline[k], outline[k + 1]), 8, 0.014, 8), filM));
    }
    fil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(P3(0.32, 0.8), P3(-0.04, 0.56)), 8, 0.012, 8), filM));
    const wireM = K.goldDim();
    [[P3(-0.12, -0.42), P3(-0.34, 0.5)], [P3(0.12, -0.42), P3(-0.1, 0.28)]].forEach(([a, b]) => {
      const mid = a.clone().lerp(b, 0.5); mid.x += 0.06;
      G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 16, 0.008, 6), wireM));
    });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.36, 24), K.glass()); stem.position.y = -0.3; G.add(stem);
    // screw base
    const gold = K.gold();
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.31, 0.44, 48), gold); sock.position.y = -0.72; G.add(sock);
    for (let k = 0; k < 4; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.026, 12, 48), gold); r.rotation.x = Math.PI / 2; r.position.y = -0.56 - k * 0.1; G.add(r); }
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.1, 32), K.deep()); ins.position.y = -0.99; G.add(ins);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.06, 24), gold); tip.position.y = -1.06; G.add(tip);
    const lamp = new THREE.PointLight(0xffcf8a, 0, 3.2, 1.6); lamp.position.y = 0.55; G.add(lamp);
    const dim = new THREE.Color(0x4a3c2a), lit = new THREE.Color(0xfff0cf);
    return {
      group: G, nom: [1.9, 2.6], mats: K.mats,
      update(o, now, local) {
        let on = smooth((local - 0.06) / 0.14);
        if (!reduce && local > 0.06 && local < 0.2) on *= 0.55 + 0.45 * Math.abs(Math.sin(local * 260));
        filM.color.copy(dim).lerp(lit, on);
        glow.material.opacity = glow.material.userData.base * on * smooth(o) * (reduce ? 1 : 0.92 + 0.08 * Math.sin(now / 160));
        lamp.intensity = 6 * on * smooth(o);
        G.rotation.y = (reduce ? 0 : Math.sin(now / 2200) * 0.5);
        G.rotation.z = -0.08;
        return false;
      }
    };
  }

  /* ---------- 3. film clapperboard (Production) ---------- */
  function stripes(w, h, phase) {
    const c = cv(w, h), g = c.getContext('2d');
    g.fillStyle = '#0d0f14'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2ebdd';
    const step = h * 1.6;
    for (let x = -h * 2 + phase * step; x < w + h * 2; x += step * 2) {
      g.beginPath(); g.moveTo(x, h); g.lineTo(x + step, h); g.lineTo(x + step + h * 0.9, 0); g.lineTo(x + h * 0.9, 0); g.closePath(); g.fill();
    }
    return tex(c, true);
  }
  function makeClapper() {
    const K = kit(), G = new THREE.Group();
    const W = 2.6, SH = 1.62;
    const slate = ext(rrect(W, SH, 0.07), 0.1, 0.02, K.deep()); slate.position.y = -0.24; G.add(slate);
    const [ft] = pair(1300, 810, (g, orm, w, h) => {
      if (orm) return;
      g.fillStyle = '#111318'; g.fillRect(0, 0, w, h);
      const chalk = 'rgba(242,235,221,.86)';
      g.strokeStyle = 'rgba(242,235,221,.5)'; g.lineWidth = 4;
      [[0, 270, w, 270], [0, 540, w, 540], [650, 0, 650, 540], [433, 540, 433, h], [866, 540, 866, h]].forEach(([a, b, c2, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); });
      const cell = (lab, val, x, y, size = 150) => {
        spaced(g, lab, x + 40, y + 62, 30, 'rgba(242,235,221,.55)', 600, 0.34);
        g.fillStyle = chalk; g.font = `400 ${size}px ${SERIF}`; g.fillText(val, x + 36, y + 216);
      };
      cell('PROD.', 'SZ001', 0, 0); cell('DIRECTOR', 'S. Zoranic', 650, 0, 104);
      cell('SCENE', '922', 0, 270); cell('TAKE', '2B+', 650, 270);
      cell('ROLL', '40', 0, 540, 120); cell('LIKES', '11M', 433, 540, 120); cell('CAMERA', 'A', 866, 540, 120);
    });
    const face = plane(W - 0.1, SH - 0.1, K.reg(new THREE.MeshStandardMaterial({ map: ft, roughness: 0.85 }))); face.position.set(0, -0.24, 0.141); G.add(face);
    const BH = 0.3, BD = 0.12;
    const barMat = (ph) => K.reg(new THREE.MeshStandardMaterial({ map: stripes(1040, 120, ph), roughness: 0.5 }));
    const darkM = K.deep();
    const box = (map) => new THREE.Mesh(new THREE.BoxGeometry(W, BH, BD), [darkM, darkM, darkM, darkM, map, darkM]);
    const bar = box(barMat(0)); bar.position.set(0, -0.24 + SH / 2 + BH / 2 + 0.01, 0.07); G.add(bar);
    const arm = new THREE.Group(); arm.position.set(-W / 2, -0.24 + SH / 2 + BH + 0.03, 0.07); G.add(arm);
    const armBox = box(barMat(0.5)); armBox.position.set(W / 2, BH / 2, 0); arm.add(armBox);
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, BD + 0.06, 24), K.gold()); hinge.rotation.x = Math.PI / 2; hinge.position.set(-W / 2 + 0.06, -0.24 + SH / 2 + BH + 0.02, 0.07); G.add(hinge);
    const CLAPS = [0.3, 0.62], OPEN = 0.36;
    return {
      group: G, nom: [2.9, 2.9], mats: K.mats,
      update(o, now, local) {
        let a = OPEN;
        for (const c of CLAPS) {
          const d = local - c;
          if (d > -0.03 && d < 0) a = Math.min(a, OPEN * (-d / 0.03));
          else if (d >= 0 && d < 0.14) a = Math.min(a, OPEN * smooth((d - 0.02) / 0.12) + Math.max(0, Math.sin(d * 120) * 0.04 * (1 - d / 0.14)) * (d < 0.03 ? 1 : 0));
        }
        arm.rotation.z = a;
        const shake = reduce ? 0 : CLAPS.reduce((s2, c) => s2 + Math.max(0, 1 - Math.abs(local - c) / 0.02) * 0.02, 0);
        G.rotation.y = (reduce ? 0 : Math.sin(now / 2400) * 0.14) - 0.26;
        G.rotation.x = -0.06 + shake; G.rotation.z = 0.04;
        return false;
      }
    };
  }

  /* ---------- 4. browser + phone (Build: web and app development) ---------- */
  function makeDevices() {
    const K = kit(), G = new THREE.Group();
    // browser window
    const win = new THREE.Group(); win.position.set(-0.55, 0.22, -0.35); win.rotation.y = 0.22; G.add(win);
    win.add(ext(rrect(2.7, 1.78, 0.12), 0.06, 0.02, K.ink()));
    const [wt] = pair(1280, 840, (g, orm, w, h) => {
      if (orm) return;
      g.fillStyle = '#0d1018'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1a1f2b'; g.fillRect(0, 0, w, 74);
      ['#e0894a', '#e3c385', '#9cc0ff'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(40 + i * 34, 37, 11, 0, 7); g.fill(); });
      g.fillStyle = '#0d1018'; g.beginPath(); g.roundRect(240, 18, 800, 38, 19); g.fill();
      spaced(g, 'YOUR-PROJECT.COM', 640, 46, 18, 'rgba(242,235,221,.6)', 600, 0.3, 'center');
      const gr = g.createLinearGradient(0, 74, 0, h); gr.addColorStop(0, '#1b2547'); gr.addColorStop(0.55, '#5a557a'); gr.addColorStop(1, '#e6a066');
      g.fillStyle = gr; g.fillRect(0, 74, w, h - 74);
      g.fillStyle = '#f2ebdd'; g.font = `400 96px ${SERIF}`; g.fillText('From idea', 70, 270);
      g.fillStyle = '#f6e2b9'; g.font = `italic 400 96px ${SERIF}`; g.fillText('to launch.', 70, 370);
      g.fillStyle = 'rgba(242,235,221,.7)'; g.fillRect(72, 410, 420, 10); g.fillRect(72, 434, 340, 10);
      g.fillStyle = '#f2ebdd'; g.beginPath(); g.roundRect(72, 480, 200, 56, 28); g.fill();
      g.strokeStyle = '#f2ebdd'; g.lineWidth = 3; g.beginPath(); g.roundRect(290, 480, 200, 56, 28); g.stroke();
      g.fillStyle = 'rgba(242,235,221,.14)';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.roundRect(70 + i * 390, 600, 360, 200, 16); g.fill(); }
    });
    const ws = plane(2.56, 1.68, K.reg(new THREE.MeshStandardMaterial({ map: wt, roughness: 0.35, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: 0.55 })));
    ws.position.z = 0.1 + 0.001; win.add(ws);
    // phone
    const ph = new THREE.Group(); ph.position.set(1.0, -0.18, 0.4); ph.rotation.y = -0.32; G.add(ph);
    ph.add(ext(rrect(0.98, 2.0, 0.17), 0.07, 0.028, K.reg(new THREE.MeshPhysicalMaterial({ color: 0xcdb991, metalness: 1, roughness: 0.3, clearcoat: 0.5 }))));
    const scr = cv(520, 1080), sg = scr.getContext('2d');
    sg.fillStyle = '#0b0d13'; sg.beginPath(); sg.roundRect(0, 0, 520, 1080, 70); sg.fill();
    sg.fillStyle = '#000'; sg.beginPath(); sg.roundRect(200, 22, 120, 34, 17); sg.fill();
    spaced(sg, 'BOOK A CALL', 44, 140, 22, '#e3c385', 600, 0.34);
    sg.fillStyle = '#f2ebdd'; sg.font = `400 64px ${SERIF}`; sg.fillText('Pick a time', 44, 222);
    const days = ['M', 'T', 'W', 'T', 'F'];
    days.forEach((d, i) => {
      const x = 44 + i * 90; sg.fillStyle = i === 2 ? '#f2ebdd' : 'rgba(242,235,221,.1)'; sg.beginPath(); sg.roundRect(x, 268, 74, 96, 18); sg.fill();
      sg.fillStyle = i === 2 ? '#0b0d13' : 'rgba(242,235,221,.8)'; sg.font = `600 24px ${SANS}`; sg.textAlign = 'center';
      sg.fillText(d, x + 37, 306); sg.font = `600 30px ${SANS}`; sg.fillText(String(16 + i), x + 37, 346); sg.textAlign = 'left';
    });
    ['09:00', '10:30', '13:00', '15:30'].forEach((t, i) => {
      const y = 410 + i * 92; sg.strokeStyle = i === 1 ? '#e3c385' : 'rgba(242,235,221,.25)'; sg.lineWidth = 3;
      sg.beginPath(); sg.roundRect(44, y, 432, 72, 36); sg.stroke();
      if (i === 1) { sg.fillStyle = 'rgba(227,195,133,.16)'; sg.fill(); }
      sg.fillStyle = '#f2ebdd'; sg.font = `600 28px ${SANS}`; sg.fillText(t, 76, y + 46);
    });
    sg.fillStyle = '#f2ebdd'; sg.beginPath(); sg.roundRect(44, 900, 432, 84, 42); sg.fill();
    spaced(sg, 'CONFIRM', 260, 952, 24, '#0b0d13', 600, 0.34, 'center');
    const st = tex(scr, true);
    const ps = plane(0.9, 1.87, K.reg(new THREE.MeshStandardMaterial({ map: st, roughness: 0.25, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.6, alphaTest: 0.5 })));
    ps.position.z = 0.126 + 0.001; ph.add(ps);
    // </> in gold
    const code = new THREE.Group(); code.position.set(0.25, 1.22, 0.2); G.add(code);
    const lt = poly([[-0.08, 0], [0.16, 0.2], [0.16, 0.12], [0.02, 0], [0.16, -0.12], [0.16, -0.2]]);
    const gt = poly([[0.08, 0], [-0.16, 0.2], [-0.16, 0.12], [-0.02, 0], [-0.16, -0.12], [-0.16, -0.2]]);
    const sl = poly([[0.06, 0.24], [0.12, 0.24], [-0.06, -0.24], [-0.12, -0.24]]);
    const a = ext(lt, 0.05, 0.012, K.gold()); a.position.x = -0.36;
    const b = ext(gt, 0.05, 0.012, K.gold()); b.position.x = 0.36;
    code.add(a, b, ext(sl, 0.05, 0.012, K.gold()));
    return {
      group: G, nom: [3.7, 2.8], mats: K.mats,
      update(o, now, local) {
        const k = smooth(local * 1.6);
        ph.position.x = 1.0 + (1 - k) * 0.5; ph.position.z = 0.4 + k * 0.15;
        code.position.y = 1.22 + (reduce ? 0 : Math.sin(now / 700) * 0.04);
        G.rotation.y = (reduce ? 0 : Math.sin(now / 2600) * 0.1) + 0.12;
        G.rotation.x = -0.05;
        return false;
      }
    };
  }

  /* ---------- 5. rocket lifting off (Launch) ---------- */
  function makeRocket() {
    const K = kit(), G = new THREE.Group();
    const R = new THREE.Group(); G.add(R);
    const prof = [[0, 1.6], [0.1, 1.52], [0.2, 1.36], [0.28, 1.16], [0.34, 0.92], [0.37, 0.62], [0.38, 0.3], [0.37, -0.1], [0.34, -0.45], [0.29, -0.7], [0.2, -0.8], [0.001, -0.8]].map(([x, y]) => new THREE.Vector2(x, y));
    const bodyM = K.reg(new THREE.MeshPhysicalMaterial({ color: 0xf2ebdd, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.2 }));
    R.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 72), bodyM));
    // airmail band
    const bc = cv(1024, 96), bg = bc.getContext('2d');
    bg.fillStyle = '#f2ebdd'; bg.fillRect(0, 0, 1024, 96);
    for (let x = -96, k = 0; x < 1100; x += 48, k++) { bg.fillStyle = k % 2 ? '#b8432c' : '#2350c8'; bg.beginPath(); bg.moveTo(x, 96); bg.lineTo(x + 24, 96); bg.lineTo(x + 24 + 60, 0); bg.lineTo(x + 60, 0); bg.closePath(); bg.fill(); }
    const bt = tex(bc, true); bt.wrapS = THREE.RepeatWrapping; bt.repeat.x = 2;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.383, 0.383, 0.16, 72, 1, true), K.reg(new THREE.MeshPhysicalMaterial({ map: bt, roughness: 0.35, clearcoat: 1 }))); band.position.y = 0.22; R.add(band);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.18, 32), K.gold()); tip.position.y = 1.53; R.add(tip);
    // porthole
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 16, 48), K.gold()); ring.position.set(0, 0.72, 0.35); ring.rotation.x = -0.12; R.add(ring);
    const win = disc(0.115, K.reg(new THREE.MeshPhysicalMaterial({ color: 0x9cc0ff, emissive: 0x2350c8, emissiveIntensity: 0.6, roughness: 0.05, clearcoat: 1 }))); win.position.set(0, 0.72, 0.352); win.rotation.x = -0.12; R.add(win);
    // fins
    const fin = poly([[0, 0.12], [0.44, -0.32], [0.48, -0.74], [0.3, -0.62], [0, -0.42]]);
    for (let k = 0; k < 3; k++) {
      const pv = new THREE.Group(); pv.rotation.y = (k / 3) * Math.PI * 2 + Math.PI / 6; R.add(pv);
      const f = ext(fin, 0.035, 0.012, K.gold()); f.position.set(0.3, -0.12, -0.03); pv.add(f);
    }
    const nozzle = new THREE.Mesh(new THREE.LatheGeometry([[0.13, -0.78], [0.15, -0.86], [0.21, -0.98], [0.23, -1.0]].map(([x, y]) => new THREE.Vector2(x, y)), 48), K.reg(new THREE.MeshPhysicalMaterial({ color: 0x2a2d35, metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide })));
    R.add(nozzle);
    // flame: two additive cones + glow
    const fc = cv(64, 256), fg = fc.getContext('2d');
    const gr = fg.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.18, 'rgba(255,214,140,.95)'); gr.addColorStop(0.5, 'rgba(255,128,60,.55)'); gr.addColorStop(1, 'rgba(255,90,40,0)');
    fg.fillStyle = gr; fg.fillRect(0, 0, 64, 256);
    const ft = tex(fc, true);
    const flameM = (b) => { const m = K.reg(new THREE.MeshBasicMaterial({ map: ft, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), b); m.userData.custom = true; return m; };
    const flame = new THREE.Group(); flame.position.y = -1.0; R.add(flame);
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.3, 32, 1, true), flameM(0.9)); outer.rotation.x = Math.PI; outer.position.y = -0.65; flame.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.75, 32, 1, true), flameM(1)); inner.rotation.x = Math.PI; inner.position.y = -0.37; flame.add(inner);
    const fglow = glowSprite(K, 'rgba(255,170,90,1)', 0.8); fglow.position.y = -0.3; fglow.scale.setScalar(1.6); flame.add(fglow);
    // smoke puffs at the pad
    const sc = cv(128, 128), sg = sc.getContext('2d');
    const sgr = sg.createRadialGradient(64, 64, 0, 64, 64, 64); sgr.addColorStop(0, 'rgba(236,230,224,.9)'); sgr.addColorStop(0.6, 'rgba(200,196,200,.35)'); sgr.addColorStop(1, 'rgba(180,180,190,0)');
    sg.fillStyle = sgr; sg.fillRect(0, 0, 128, 128);
    const st = tex(sc, true);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const puffs = [];
    for (let k = 0; k < 14; k++) {
      const m = K.reg(new THREE.SpriteMaterial({ map: st, depthWrite: false }), 0.85); m.userData.custom = true;
      const sp = new THREE.Sprite(m); G.add(sp);
      puffs.push({ sp, a: (rnd() - 0.5) * Math.PI * 1.6, d: 0.3 + rnd() * 0.7, s: 0.5 + rnd() * 0.6, t: rnd() * 0.25 });
    }
    return {
      group: G, nom: [1.7, 4.1], mats: K.mats,
      update(o, now, local) {
        const ign = smooth(local / 0.18), lift = smooth((local - 0.22) / 0.7);
        const t = now / 1000;
        const flick = reduce ? 1 : 0.9 + 0.1 * Math.sin(t * 40) + 0.05 * Math.sin(t * 73);
        flame.scale.set(1, (0.25 + ign * 0.75 + lift * 0.35) * flick, 1);
        for (const c of [outer, inner]) c.material.opacity = c.material.userData.base * ign * smooth(o);
        fglow.material.opacity = fglow.material.userData.base * ign * smooth(o);
        R.position.y = -0.95 + lift * 1.15;
        R.position.x = reduce ? 0 : Math.sin(t * 31) * 0.006 * ign;
        R.rotation.z = -0.04 * lift;
        R.rotation.y = reduce ? 0 : t * 0.25;
        puffs.forEach((p) => {
          const k = clamp((local - p.t) / 0.5);
          const r = p.d * (0.2 + k * 1.1);
          p.sp.position.set(Math.sin(p.a) * r, -1.95 + k * 0.12 + Math.cos(p.a) * 0.05, Math.cos(p.a) * r * 0.4);
          p.sp.scale.setScalar(p.s * (0.4 + k * 1.2));
          p.sp.material.opacity = p.sp.material.userData.base * Math.sin(Math.min(1, k) * Math.PI) * ign * smooth(o);
        });
        G.rotation.y = 0; G.rotation.x = 0;
        return false;
      }
    };
  }

  /* ---------- 6. project pins ---------- */
  // same order as the chapters in index.html
  const PINS = [
    { name: 'FEWWANTLEADS', kind: 'YOUTUBE AGENCY', ink: '#b85a26', icon: 'play' },
    { name: 'FWL STUDIOS', kind: 'MINECRAFT AGENCY', ink: '#0b4fd6', icon: 'fwl' },
    { name: 'SEZO', kind: 'STEEL \u00b7 SINCE 1972', ink: '#2a3a52', icon: 'beam' },
    { name: 'ENTERIJERI KUKI', kind: 'CAR INTERIORS', ink: '#5e2f1f', icon: 'wheel' },
    { name: 'ALBEYK', kind: 'NOVI PAZAR', ink: '#9c2f22', icon: 'burger' },
    { name: 'BEGOVI\u0106 WATCHES', kind: 'VINTAGE \u00b7 EST. 2021', ink: '#1d3a32', icon: 'watch' },
    { name: 'DINA TAJI\u0106', kind: 'ARTIST', ink: '#6e2a45', icon: 'palette' },
    { name: 'FUREVER CANVAS', kind: 'PET PORTRAITS', ink: '#3b2f6e', icon: 'paw' },
    { name: 'MOJ \u010cAS', kind: 'WEB APP', ink: '#2350c8', icon: 'clock' }
  ];
  function makePin(i) {
    const P = PINS[i] || PINS[0];
    const K = kit(), G = new THREE.Group();
    const R = 1;
    G.add(ext(ellipse(0, 0, R, R), 0.1, 0.05, K.gold(), 64));
    const FZ = 0.1 + 0.1;
    const [ft, fo] = pair(1024, 1024, (g, orm) => {
      const c = 512;
      g.fillStyle = orm ? ORM(0.2, 0) : P.ink; g.beginPath(); g.arc(c, c, 512, 0, 7); g.fill();
      g.lineWidth = 8; g.strokeStyle = orm ? FOIL : foilGrad(g, 0, 0, 1024, 1024);
      g.beginPath(); g.arc(c, c, 372, 0, 7); g.stroke();
      const label = `${P.name} · ${P.kind} · LANDMARK 0${i + 1} · `;
      circleText(g, label, c, c, 438, label.length > 50 ? 44 : 50, orm ? FOIL : '#e8cc8f');
    });
    const face = disc(0.93, K.face(ft, fo, { metalness: 1 })); face.position.z = FZ + 0.001; G.add(face);
    const ic = new THREE.Group(); ic.position.z = FZ; G.add(ic);
    const raise = (shape, mat, d = 0.07, b = 0.014) => { const m = ext(shape, d, b, mat); ic.add(m); return m; };
    const gold = K.gold();
    const I = P.icon;
    if (I === 'play') {                                    // a play screen with a rising bar chart under it
      const frame = rrect(0.9, 0.62, 0.14); const hole = new THREE.Path();
      hole.moveTo(-0.33, -0.19); hole.lineTo(0.33, -0.19); hole.lineTo(0.33, 0.19); hole.lineTo(-0.33, 0.19); hole.closePath();
      frame.holes.push(hole); raise(frame, gold).position.y = 0.12;
      raise(poly([[-0.1, 0.27], [-0.1, -0.03], [0.16, 0.12]]), K.cream(), 0.08);
      [[-0.22, 0.07], [0, 0.12], [0.22, 0.18]].forEach(([x, h]) => { raise(rrect(0.13, h, 0.03), gold, 0.06).position.set(x, -0.3 + h / 2, 0); });
    } else if (I === 'fwl') {                             // FWL Studios logo: the hammer F, traced from fwlstudios.com
      const F = [[-0.5,0.2275],[-0.4937,0.2305],[-0.477,0.2715],[-0.4625,0.2852],[-0.4609,0.2955],[-0.3814,0.375],[-0.3711,0.3765],[-0.3574,0.391],[-0.332,0.4],[-0.2949,0.4223],[-0.2773,0.4234],[-0.2715,0.4301],[-0.2539,0.4312],[-0.2461,0.4385],[-0.2246,0.4385],[-0.2148,0.4463],[-0.1777,0.4463],[-0.168,0.4541],[0.127,0.4541],[0.1391,0.4434],[0.142,0.4316],[0.1523,0.4301],[0.166,0.4156],[0.1973,0.415],[0.2154,0.4238],[0.2461,0.4541],[0.3223,0.4541],[0.335,0.4414],[0.332,0.2203],[0.2461,0.2197],[0.2148,0.2504],[0.2051,0.2515],[0.1973,0.2588],[0.1758,0.2588],[0.1576,0.25],[0.127,0.2197],[-0.1133,0.2197],[-0.125,0.2095],[-0.126,0.0996],[-0.1152,0.0875],[0.1973,0.0869],[0.2021,0.0762],[0.1871,0.0527],[0.186,0.043],[0.1719,0.0299],[0.1703,0.0195],[0.1558,0.0059],[0.1547,-0.0039],[0.1402,-0.0176],[0.1313,-0.043],[0.1168,-0.0566],[0.1156,-0.0664],[0.0898,-0.0922],[-0.1133,-0.0928],[-0.125,-0.103],[-0.1265,-0.293],[-0.1392,-0.2969],[-0.183,-0.3418],[-0.1939,-0.3438],[-0.2377,-0.3887],[-0.2486,-0.3906],[-0.2924,-0.4355],[-0.3105,-0.4443],[-0.3213,-0.4395],[-0.3213,0.2148],[-0.314,0.2227],[-0.3129,0.2402],[-0.3062,0.2461],[-0.2973,0.2715],[-0.2642,0.3125],[-0.2539,0.314],[-0.2441,0.3237],[-0.2437,0.334],[-0.2539,0.3369],[-0.2637,0.3291],[-0.3008,0.3291],[-0.3086,0.3219],[-0.3262,0.3207],[-0.332,0.314],[-0.3496,0.3129],[-0.3711,0.2984],[-0.4121,0.2817],[-0.4258,0.2672],[-0.4355,0.266],[-0.4721,0.2285],[-0.4824,0.227],[-0.5,0.2119]];
      raise(poly(F.map(([x, y]) => [x * 0.92, y * 0.92])), K.reg(new THREE.MeshPhysicalMaterial({ color: 0xf4f6fb, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 })), 0.09, 0.012);
      const star = [], R1 = 0.0593, R2 = R1 * 0.28;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, r = k % 2 ? R2 : R1; star.push([0.3785 + Math.sin(a) * r, 0.2978 + Math.cos(a) * r]); }
      raise(poly(star), K.reg(new THREE.MeshStandardMaterial({ color: 0x5fe3ff, emissive: 0x22c9ff, emissiveIntensity: 1.4, roughness: 0.3 })), 0.06, 0.01);
    } else if (I === 'beam') {                             // steel I-beam
      raise(poly([[-0.42, 0.46], [0.42, 0.46], [0.42, 0.3], [0.09, 0.3], [0.09, -0.3], [0.42, -0.3], [0.42, -0.46], [-0.42, -0.46], [-0.42, -0.3], [-0.09, -0.3], [-0.09, 0.3], [-0.42, 0.3]]), K.steel(), 0.1);
    } else if (I === 'burger') {                           // burger
      const bun = new THREE.Shape(); bun.moveTo(-0.46, 0.1); bun.absellipse(0, 0.1, 0.46, 0.36, Math.PI, 0, true); bun.lineTo(-0.46, 0.1);
      raise(bun, K.enamel(0xd28a3c), 0.08);
      const lettuce = new THREE.Shape(); lettuce.moveTo(-0.5, 0.06);
      for (let k = 0; k <= 10; k++) lettuce.lineTo(-0.5 + k * 0.1, 0.03 + (k % 2 ? -0.05 : 0.02));
      lettuce.lineTo(0.5, -0.04); lettuce.lineTo(-0.5, -0.04); raise(lettuce, K.enamel(0x6aa84f), 0.07);
      raise(rrect(0.94, 0.17, 0.08), K.enamel(0x5a3220), 0.08).position.y = -0.14;
      raise(rrect(0.88, 0.15, 0.07), K.enamel(0xd28a3c), 0.08).position.y = -0.34;
      [[-0.2, 0.3], [0.05, 0.36], [0.24, 0.26], [-0.04, 0.22]].forEach(([x, y]) => { const s = raise(ellipse(0, 0, 0.035, 0.018), K.cream(), 0.02, 0.008); s.position.set(x, y, 0.09); });
    } else if (I === 'paw') {                              // paw with a crown
      const cream = K.cream();
      raise(ellipse(0, -0.3, 0.26, 0.2), cream);
      [[-0.3, -0.04, 0.09, 0.12], [-0.11, 0.08, 0.09, 0.12], [0.11, 0.08, 0.09, 0.12], [0.3, -0.04, 0.09, 0.12]].forEach(([x, y, rx, ry]) => raise(ellipse(x, y, rx, ry), cream));
      raise(poly([[-0.22, 0.26], [0.22, 0.26], [0.27, 0.5], [0.12, 0.38], [0, 0.54], [-0.12, 0.38], [-0.27, 0.5]]), gold, 0.06);
    } else if (I === 'wheel') {                            // steering wheel with a stitched rim
      const ring = ellipse(0, 0, 0.5, 0.5); const h = new THREE.Path(); h.absellipse(0, 0, 0.38, 0.38, 0, Math.PI * 2, true, 0); ring.holes.push(h);
      raise(ring, K.enamel(0x2a1a14), 0.09);
      for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; const d = raise(rrect(0.014, 0.05, 0.006), K.cream(), 0.01, 0.004); d.position.set(Math.sin(a) * 0.44, Math.cos(a) * 0.44, 0.11); d.rotation.z = -a; }
      raise(poly([[-0.38, 0.03], [-0.12, 0.08], [0.12, 0.08], [0.38, 0.03], [0.38, -0.06], [0.12, -0.06], [0.06, -0.38], [-0.06, -0.38], [-0.12, -0.06], [-0.38, -0.06]]), gold, 0.07);
      raise(ellipse(0, 0, 0.13, 0.13), gold, 0.1);
    } else if (I === 'watch') {                            // wristwatch
      raise(rrect(0.3, 0.98, 0.08), K.enamel(0x3a2418), 0.05);
      raise(ellipse(0, 0, 0.3, 0.3), gold, 0.09);
      const fc = raise(ellipse(0, 0, 0.24, 0.24), K.cream(), 0.02, 0.006); fc.position.z = 0.1;
      raise(rrect(0.06, 0.08, 0.02), gold, 0.06).position.set(0.33, 0, 0.02);
      const hh2 = raise(rrect(0.035, 0.14, 0.015), K.ink(), 0.01, 0.004); hh2.position.set(0.03, 0.05, 0.13); hh2.rotation.z = -0.6;
      const mh = raise(rrect(0.025, 0.2, 0.012), K.ink(), 0.01, 0.004); mh.position.set(-0.05, 0.08, 0.14); mh.rotation.z = 0.5;
    } else if (I === 'palette') {                          // painter's palette with a brush
      const pal = ellipse(0, -0.02, 0.48, 0.38); const th = new THREE.Path(); th.absellipse(0.2, -0.2, 0.07, 0.06, 0, Math.PI * 2, true, 0); pal.holes.push(th);
      raise(pal, K.cream(), 0.07);
      [[-0.26, 0.08, 0xc4632a], [-0.08, 0.2, 0x2350c8], [0.14, 0.18, 0xd8b26a], [-0.24, -0.16, 0x6aa84f], [0.3, 0.02, 0x9c2f22]].forEach(([x, y, c]) => { const b = raise(ellipse(0, 0, 0.07, 0.06), K.enamel(c), 0.03, 0.01); b.position.set(x, y, 0.09); });
      const br = new THREE.Group(); br.position.set(0.1, 0.02, 0.16); br.rotation.z = -0.75; ic.add(br);
      br.add(ext(rrect(0.05, 0.7, 0.025), 0.03, 0.01, gold)); br.add(ext(poly([[-0.04, 0.35], [0.04, 0.35], [0.02, 0.48], [0, 0.52], [-0.02, 0.48]]), 0.03, 0.01, K.ink()));
    } else {                                               // clock showing the real hour
      const ring = ellipse(0, 0, 0.5, 0.5); const h = new THREE.Path(); h.absellipse(0, 0, 0.42, 0.42, 0, Math.PI * 2, true, 0); ring.holes.push(h);
      raise(ring, gold, 0.07);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; const d = raise(ellipse(0, 0, k % 3 ? 0.018 : 0.03, k % 3 ? 0.018 : 0.03), gold, 0.03, 0.008); d.position.set(Math.sin(a) * 0.35, Math.cos(a) * 0.35, 0); }
      const hr = new THREE.Group(), mn = new THREE.Group(); ic.add(hr, mn);
      hr.add(ext(rrect(0.07, 0.26, 0.03), 0.03, 0.01, K.cream())); hr.children[0].position.set(0, 0.11, 0.06);
      mn.add(ext(rrect(0.05, 0.36, 0.02), 0.03, 0.01, K.cream())); mn.children[0].position.set(0, 0.16, 0.08);
      raise(ellipse(0, 0, 0.05, 0.05), gold, 0.1);
      G.userData.hands = [hr, mn];
    }
    return {
      group: G, nom: [2.2, 2.2], mats: K.mats,
      update(o, now, d) {
        if (G.userData.hands) {
          const t = new Date(), H = (t.getHours() % 12) + t.getMinutes() / 60, Mi = t.getMinutes() + t.getSeconds() / 60;
          G.userData.hands[0].rotation.z = -(H / 12) * Math.PI * 2; G.userData.hands[1].rotation.z = -(Mi / 60) * Math.PI * 2;
        }
        G.rotation.y = d * (1.1 / ((window.SITE && window.SITE.T) ? window.SITE.T.step : 0.12)) + (reduce ? 0 : Math.sin(now / 1800 + i) * 0.22);
        G.rotation.x = -0.1 + (reduce ? 0 : Math.sin(now / 2300 + i) * 0.05);
        return false;
      }
    };
  }

  /* ---------- wire props to their anchors ---------- */
  const MAKERS = { board: makeBoard, bulb: makeBulb, clapper: makeClapper, devices: makeDevices, rocket: makeRocket };
  const items = [];
  document.querySelectorAll('.cap-prop').forEach((el) => {
    const make = MAKERS[el.dataset.kind]; const cap = document.querySelectorAll('.cap')[+el.dataset.cap];
    if (!make || !cap) return;
    const p = make(); p.anchor = el; p.src = cap; p.a = +cap.dataset.in; p.b = +cap.dataset.out; p.type = 'cap';
    scene.add(p.group); items.push(p);
  });
  document.querySelectorAll('.ch-emblem').forEach((el) => {
    const i = +el.dataset.pin, ch = el.closest('.chapter');
    const p = makePin(i); p.anchor = el; p.src = ch; p.c = +ch.dataset.c; p.type = 'pin';
    scene.add(p.group); items.push(p);
  });

  let W = 1, H = 1, hh = 1, hw = 1;
  const TAN = Math.tan(THREE.MathUtils.degToRad(16));
  function resize() {
    W = host.clientWidth || innerWidth; H = host.clientHeight || innerHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    hh = 9 * TAN; hw = hh * camera.aspect;
  }
  addEventListener('resize', resize); resize();
  canvas_lost(renderer.domElement);
  function canvas_lost(c) { c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); host.remove(); }); }

  let wasDrawn = false, lastKey = '', lastT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || !window.SITE) return;
    const film = window.SITE.film, phase = window.SITE.phase;
    const hr = host.getBoundingClientRect();
    let any = false, animating = false, keyState = '';
    for (const p of items) {
      const o = clamp(+p.src.style.opacity || 0);
      if (o < 0.01) { p.group.visible = false; continue; }
      const r = p.anchor.getBoundingClientRect();
      if (!r.width || !r.height) { p.group.visible = false; continue; }
      any = true; p.group.visible = true;
      const e = smooth(o);
      const wpp = (2 * hh) / H;
      const s = Math.min((r.width * wpp) / p.nom[0], (r.height * wpp) / p.nom[1]) * (0.84 + 0.16 * e);
      const cx = (r.left + r.width / 2 - hr.left) / W, cy = (r.top + r.height / 2 - hr.top) / H;
      const local = p.type === 'cap' ? clamp((film - p.a) / (p.b - p.a)) : phase - p.c;
      if (p.update(o, now, local)) animating = true;
      p.group.scale.setScalar(s);
      p.group.position.set((cx * 2 - 1) * hw, (1 - cy * 2) * hh - (1 - e) * 0.2 * s, 0);
      p.group.rotation.y += (1 - e) * -0.8;
      for (const m of p.mats) if (!m.userData.custom) m.opacity = m.userData.base * e;
      keyState += `${p.group.position.x.toFixed(3)},${p.group.position.y.toFixed(3)},${s.toFixed(3)},${o.toFixed(3)},${local.toFixed(4)}|`;
    }
    if (!any) { if (wasDrawn) { renderer.clear(); wasDrawn = false; } return; }
    const idle = !reduce;                                  // gentle sway: ~30 fps
    if (keyState === lastKey && !animating && !(idle && now - lastT > 33)) return;
    lastKey = keyState; lastT = now; wasDrawn = true;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
