/* 3D chapter: the boarding pass, folded into a paper plane, flies past the six project
   chapters, then glides to the gate, unfolds and hands off to the real boarding pass.
   One sheet mesh, two faces (pass / airmail), folded on the CPU from a flat card. */
import * as THREE from './vendor/three.module.js';

const html = document.documentElement;
const host = document.getElementById('product');
const passImg = document.getElementById('passImg');
const resetBtn = document.getElementById('resetView');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

// timing comes from main.js: chapter centres, glide to the gate (H0-H1), crossfade to the <img> (F0-F1)
const T = (window.SITE && window.SITE.T) || { centers: [0.13, 0.25, 0.37, 0.49, 0.61, 0.73], entry: 0.1, H0: 0.79, H1: 0.925, F0: 0.935, F1: 0.962, TW: 0.075 };
const CENTERS = T.centers, H0 = T.H0, H1 = T.H1, F0 = T.F0, F1 = T.F1;
const YAW_R = -2.45, YAW_L = -0.69;   // resting headings: nose toward the text, angled to camera

start().catch((err) => { console.warn('3D disabled:', err); fail(); });

function fail() {
  html.classList.remove('has-3d');
  host.style.display = 'none';
}

async function start() {
  if (!window.SZPass) throw new Error('pass art missing');
  const art = await window.SZPass.ready();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  const planeLabel = () => canvas.setAttribute('aria-label', window.I18N ? window.I18N.t('plane') : 'The boarding pass folded into a paper plane. Drag, or use the left and right arrow keys, to turn it.');
  planeLabel(); window.addEventListener('langchange', planeLabel);
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  camera.position.set(0, 0, 9);

  // reflections without HDR files: a few softbox cards rendered into a PMREM
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Scene();
  room.background = new THREE.Color(0x3b404d);
  const box = (w, h, color, x, y, z, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); room.add(m);
  };
  box(6, 3, 0xffffff, -3, 5, 4, 0.5, Math.PI / 2.4);
  box(4, 6, 0xd8e4ff, 7, 1, 1, -Math.PI / 2);
  box(8, 3, 0xffb873, 0, 1.5, -8);
  box(10, 10, 0x1b2233, 0, -6, 0, 0, -Math.PI / 2);
  scene.environment = pmrem.fromScene(room, 0.035).texture;

  const hemi = new THREE.HemisphereLight(0xffe7c8, 0x27384f, 1.5);
  const key = new THREE.DirectionalLight(0xfff0dc, 2.3); key.position.set(-4, 5, 6);
  const fill = new THREE.DirectionalLight(0xbcd4ff, 0.8); fill.position.set(5, 1, 4);
  const rim = new THREE.DirectionalLight(0xffae66, 2.4); rim.position.set(2, 2.5, -6);
  scene.add(hemi, key, fill, rim);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = maxAniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  const mat = (map, orm, side) => new THREE.MeshPhysicalMaterial({
    map, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1, side,
    alphaTest: 0.5, sheen: 0.35, sheenRoughness: 0.75, sheenColor: new THREE.Color(0xfff1da),
    envMapIntensity: 0.95, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0
  });
  const frontMat = mat(tex(art.front, true), tex(art.frontOrm, false), THREE.FrontSide);
  const backMat = mat(tex(art.back, true), tex(art.backOrm, false), THREE.BackSide);

  /* ---------- the sheet ---------- */
  const L = 3.2, WD = L / art.aspect, HW = WD / 2;
  const NU = coarse ? 84 : 120, NV = coarse ? 40 : 56;
  const count = (NU + 1) * (NV + 1);
  const pos = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const PU = new Float32Array(count), PV = new Float32Array(count);
  for (let j = 0, k = 0; j <= NV; j++) {
    for (let i = 0; i <= NU; i++, k++) {
      PU[k] = -L / 2 + (L * i) / NU; PV[k] = -HW + (WD * j) / NV;
      uv[k * 2] = i / NU; uv[k * 2 + 1] = j / NV;
    }
  }
  const idx = [];
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  // f = 0: flat card in the XZ plane (print facing down); f = 1: dart paper plane, nose at +X
  let lastFold = -1;
  function fold(f) {
    if (Math.abs(f - lastFold) < 1e-4) return;
    lastFold = f;
    const beta = f * 1.49, sb = Math.sin(beta), cb = Math.cos(beta);
    for (let k = 0; k < count; k++) {
      const u = PU[k], v = PV[k];
      const t = clamp((L / 2 - u) / L);                // 0 at the nose, 1 at the tail
      const s = v < 0 ? -1 : 1, a = Math.abs(v);
      const ke = HW * 0.27 * (0.45 + 0.55 * t);        // keel half-width, shallow at the nose
      let X = u, Y, Z;
      if (a <= ke) {
        Z = s * a * cb; Y = (a - ke) * sb;
      } else {
        const span = 1 - f * (1 - (0.05 + 0.95 * Math.pow(t, 0.85)));
        const w = (a - ke) * span;
        const tip = clamp((a - ke) / (HW - ke));
        const dih = f * (0.1 + 0.22 * tip * tip);
        Z = s * (ke * cb + w * Math.cos(dih)); Y = w * Math.sin(dih);
      }
      Y += f * (0.05 * Math.sin(Math.PI * t) + HW * 0.12);
      X += f * 0.04;
      pos[k * 3] = X; pos[k * 3 + 1] = Y; pos[k * 3 + 2] = Z;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  }
  fold(1);

  const plane = new THREE.Group();
  plane.add(new THREE.Mesh(geo, frontMat), new THREE.Mesh(geo, backMat));
  scene.add(plane);

  /* ---------- layout ---------- */
  let W = 1, H = 1, hw = 1, hh = 1, portrait = false;
  const TAN = Math.tan(THREE.MathUtils.degToRad(16));
  function resize() {
    W = host.clientWidth || innerWidth; H = host.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    hh = 9 * TAN; hw = hh * camera.aspect; portrait = W / H < 0.85;
    dirty = true;
  }

  /* ---------- interaction ---------- */
  let yawUser = 0, yawUserT = 0, dragging = false, lastX = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (!host.classList.contains('live')) return;
    dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    yawUserT += (e.clientX - lastX) * 0.012; lastX = e.clientX; dirty = true;
  });
  const endDrag = (e) => { dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch (_) {} };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { yawUserT -= 0.3; dirty = true; e.preventDefault(); }
    if (e.key === 'ArrowRight') { yawUserT += 0.3; dirty = true; e.preventDefault(); }
  });
  resetBtn.addEventListener('click', () => { yawUserT = Math.round(yawUserT / (Math.PI * 2)) * Math.PI * 2; dirty = true; });

  /* ---------- choreography ---------- */
  const side = (i) => (reduce ? 1 : i % 2 === 0 ? 1 : -1);
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion(), qd = new THREE.Quaternion();
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
  const qCard = new THREE.Quaternion().setFromAxisAngle(AX, -Math.PI / 2);
  const qFly = new THREE.Quaternion();
  const P = { x: 0, y: 0, z: 0, s: 1, yaw: 0, bank: 0, tilt: 0.38, pitch: -0.06 };

  // desktop: the plane flies in the lower third, under the preview card; phones: bottom right, beside the card
  function restX(sd) { return portrait ? hw * (0.46 + sd * 0.04) : sd * hw * 0.5; }
  function restY() { return portrait ? -hh * 0.6 : -hh * 0.06; }
  function scale0() {
    const len = portrait ? Math.min(hw * 2 * 0.5, hh * 2 * 0.24) : Math.min(hw * 2 * 0.3, hh * 2 * 0.46);
    return len / L;
  }

  function flight(phase, time) {
    const s0 = scale0();
    P.s = s0; P.z = 0; P.bank = 0; P.tilt = portrait ? 0.62 : 0.55; P.pitch = -0.06;
    // entry
    const e = reduce ? 1 : smooth(phase / T.entry);
    let x = restX(1), y = restY(), yaw = YAW_R, z = 0, bank = 0;
    if (e < 1) {                                      // emerges from the sunrise, far behind
      const r = restX(1);
      x = lerp(r * 0.2, r, e); y = lerp(hh * 0.1, restY(), e); z = lerp(-18, 0, e);
      yaw = lerp(YAW_R + 0.7, YAW_R, e); bank = Math.sin(e * Math.PI) * 0.3;
    }
    // transitions between chapters
    for (let i = 0; i < CENTERS.length - 1; i++) {
      const sA = side(i), sB = side(i + 1);
      if (sA === sB) continue;
      const m = (CENTERS[i] + CENTERS[i + 1]) / 2, TW = T.TW;
      const kl = clamp((phase - (m - TW / 2)) / TW);
      if (kl <= 0) continue;
      const a0 = sA > 0 ? YAW_R : YAW_L, a1 = sA > 0 ? -Math.PI : 0, a2 = sA > 0 ? YAW_L : YAW_R;
      x = lerp(restX(sA), restX(sB), smooth(kl));
      yaw = kl < 0.5 ? lerp(a0, a1, smooth(kl * 2)) : lerp(a1, a2, smooth(kl * 2 - 1));
      const arc = Math.sin(kl * Math.PI);
      y = restY() + arc * hh * (portrait ? 0.06 : 0.12);
      z = arc * 1.4;
      bank = arc * 0.55 * (sA > 0 ? 1 : -1);
    }
    // idle life
    const live = reduce ? 0 : 1;
    y += live * Math.sin(time * 1.1) * 0.05;
    bank += live * Math.sin(time * 0.8) * 0.035;
    P.x = x; P.y = y; P.z = z; P.yaw = yaw; P.bank = bank;
  }

  function composeFly(out) {
    qa.setFromAxisAngle(AX, P.tilt);
    qb.setFromAxisAngle(AY, P.yaw + yawUser);
    qc.setFromAxisAngle(AX, P.bank);
    qd.setFromAxisAngle(AZ, P.pitch);
    return out.copy(qa).multiply(qb).multiply(qc).multiply(qd);
  }

  function gateTarget() {
    const r = passImg.getBoundingClientRect(), hr = host.getBoundingClientRect();
    if (!r.width) return null;
    const cx = (r.left + r.width / 2 - hr.left) / W, cy = (r.top + r.height / 2 - hr.top) / H;
    return { x: (cx * 2 - 1) * hw, y: (1 - cy * 2) * hh, s: ((r.width / W) * 2 * hw) / L };
  }

  /* ---------- render loop ---------- */
  let phase = 0, dirty = true, visible = false, lastT = 0;
  window.addEventListener('site-progress', (e) => { phase = e.detail; dirty = true; });
  addEventListener('resize', resize);
  resize();

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(); });

  html.classList.add('has-3d');

  function frame(now) {
    requestAnimationFrame(frame);
    const show = phase > 0.0005 && phase < F1;
    if (!show) {
      if (visible) { visible = false; host.style.opacity = 0; host.classList.remove('live'); }
      return;
    }
    if (document.hidden) return;
    const time = now / 1000;
    const easing = Math.abs(yawUserT - yawUser) > 0.0005;
    const bobbing = !reduce && phase < H1;
    if (!dirty && !easing && !(bobbing && now - lastT > 33)) return;
    lastT = now; dirty = false;
    visible = true;

    yawUser += (yawUserT - yawUser) * 0.09;
    flight(phase, time);

    const kh = smooth((phase - H0) / (H1 - H0));
    const kf = smooth((phase - (H0 + 0.035)) / (H1 - H0 - 0.035));
    composeFly(qFly);
    let x = P.x, y = P.y, z = P.z, s = P.s;
    if (kh > 0) {
      const g = gateTarget();
      if (g) { x = lerp(x, g.x, kh); y = lerp(y, g.y, kh); z = lerp(z, 0, kh); s = lerp(s, g.s, kh); }
      qFly.slerp(qCard, kh);
      yawUserT *= 1 - kh * 0.2;
    }
    fold(1 - kf);
    plane.position.set(x, y, z);
    plane.scale.setScalar(s);
    plane.quaternion.copy(qFly);

    // as the card lands, light it flat so it matches the printed pass
    const flat = smooth((phase - (H1 - 0.03)) / 0.03);
    frontMat.emissiveIntensity = backMat.emissiveIntensity = flat * 0.8;
    key.intensity = lerp(2.3, 0.7, flat); rim.intensity = lerp(2.4, 0, flat);
    fill.intensity = lerp(0.8, 0.1, flat); hemi.intensity = lerp(1.5, 0.8, flat);
    frontMat.envMapIntensity = backMat.envMapIntensity = lerp(0.95, 0.35, flat);

    const op = smooth(phase / (T.entry * 0.45)) * (1 - smooth((phase - F0) / (F1 - F0)));
    host.style.opacity = op.toFixed(3);
    host.classList.toggle('live', op > 0.5 && phase < H0);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
