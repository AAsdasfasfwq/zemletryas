// Director: owns renderer/pipeline/overlay, the shot list and the sets.
// frame(t) is a pure function of time -> deterministic seekable rendering.
import * as THREE from 'three';
import { Pipeline, DEFAULT_POST } from './engine/pipeline.js';
import { Overlay } from './overlay/overlay.js';
import { clamp, lerp, noise1, fbm1, ease, smooth } from './engine/util.js';

export class Director {
  constructor(canvas, { scale = 1, samples = 4 } = {}) {
    this.W = Math.round(1920 * scale); this.H = Math.round(1080 * scale);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance', stencil: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.W, this.H, false);
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.pipeline = new Pipeline(this.renderer, this.W, this.H, { samples });
    this.overlay = new Overlay(scale);
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 5000);
    this.sets = {}; this.shots = []; this.transitions = [];
    this.frameIndex = 0;
  }
  addSet(name, set) { this.sets[name] = set; }
  async buildAll(onProgress) {
    const names = Object.keys(this.sets); let i = 0;
    for (const n of names) {
      const s = this.sets[n];
      if (!s.built) { s.build(this); s.built = true; }
      i++; if (onProgress) onProgress(i / names.length, n);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  // precompile shaders for every set so playback never stalls
  compileAll() { for (const n in this.sets) { const s = this.sets[n]; if (s.scene) this.renderer.compile(s.scene, this.camera); } }

  setShots(shots) {
    shots.sort((a, b) => a.t0 - b.t0);
    for (let i = 0; i < shots.length; i++) if (shots[i].t1 === undefined) shots[i].t1 = i + 1 < shots.length ? shots[i + 1].t0 : shots[i].t0 + 5;
    this.shots = shots;
  }
  shotAt(t) {
    let lo = 0, hi = this.shots.length - 1, best = 0;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (this.shots[m].t0 <= t) { best = m; lo = m + 1; } else hi = m - 1; }
    return best;
  }

  frame(t) {
    const idx = this.shotAt(t); const shot = this.shots[idx];
    const P = DEFAULT_POST();
    const cam = this.camera;
    cam.fov = 40; cam.near = 0.1; cam.far = 5000; cam.up.set(0, 1, 0); cam.zoom = 1; cam.filmOffset = 0;
    cam.position.set(0, 0, 10); cam.rotation.set(0, 0, 0); cam.quaternion.identity();
    this.overlay.begin();
    const c = {
      t, lt: t - shot.t0, dur: shot.t1 - shot.t0, u: clamp((t - shot.t0) / (shot.t1 - shot.t0)),
      shot, idx, cam, post: P, director: this, sets: this.sets,
      scene: null, overlay: this.overlay,
      g: null,
      use: (name) => { const s = this.sets[name]; if (!s) throw new Error('no set ' + name); c.scene = s.scene; return s; },
      use2D: () => { c.g = this.overlay.use(); P.overlayAmt = 1; return c.g; },
      only2D: () => { P.sceneAmt = 0; c.scene = null; return c.use2D(); },
      look: (pos, target, roll = 0) => { cam.position.copy(pos); cam.lookAt(target); if (roll) cam.rotateZ(roll); },
      // handheld drift
      handheld: (amt = 1, speed = 1) => {
        const s = t * speed;
        cam.rotateX(fbm1(s * 0.35 + 11.3) * 0.012 * amt); cam.rotateY(fbm1(s * 0.3 + 3.1) * 0.016 * amt); cam.rotateZ(fbm1(s * 0.25 + 7.7) * 0.008 * amt);
      },
      // earthquake shake (high frequency)
      shake: (amt = 1, freq = 9) => {
        const s = t * freq;
        cam.position.x += noise1(s + 1.7) * 0.06 * amt; cam.position.y += noise1(s * 1.3 + 9.1) * 0.05 * amt; cam.position.z += noise1(s * 0.9 + 4.4) * 0.04 * amt;
        cam.rotateZ(noise1(s * 1.1 + 2.2) * 0.012 * amt); cam.rotateX(noise1(s * 1.4 + 5.5) * 0.01 * amt);
        P.chroma += 2.5 * Math.min(amt, 2);
      },
      project: (v) => { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * 1920, y: (-p.y * 0.5 + 0.5) * 1080, behind: p.z > 1 }; },
    };
    shot.fn(c);
    if (window.__camOverride) { const o = window.__camOverride; cam.fov = o.fov || cam.fov; cam.position.set(...o.pos); cam.up.set(...(o.up || [0, 1, 0])); cam.lookAt(...o.target); P.focus = 0; P.aperture = 0; } // QA hook
    // transitions (whip/flash/dip) around cuts
    for (const tr of this.transitions) {
      const d = t - tr.t; if (Math.abs(d) > tr.len) continue;
      const k = 1 - Math.abs(d) / tr.len; const kk = smooth(k);
      if (tr.kind === 'whip') { P.whip += kk * 0.09; P.whipDir = tr.dir || [1, 0]; P.uvShift = [(d < 0 ? -1 : 1) * -(1 - kk) * 0 + (tr.dir ? tr.dir[0] : 1) * (d < 0 ? kk : -kk) * 0.03, 0]; }
      else if (tr.kind === 'flash') { P.flash = Math.max(P.flash, (d >= 0 ? ease.outCubic(1 - d / tr.len) : smooth(k)) * (tr.amount || 1)); P.flashColor = tr.color || [1, 1, 1]; }
      else if (tr.kind === 'dip') P.fade = Math.max(P.fade, kk);
      else if (tr.kind === 'zoom') { P.zoomBlur += kk * 0.12; }
    }
    cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    const ov = this.overlay.end();
    this.pipeline.render(c.scene, cam, P, ov, Math.floor(t * 30));
    this.frameIndex++;
    return c;
  }
}
