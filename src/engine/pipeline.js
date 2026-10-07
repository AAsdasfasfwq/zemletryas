// HDR post-processing pipeline:
// scene (MSAA, half-float, depth) -> DOF + whip/zoom blur -> bloom mip chain -> final grade
// (ACES, white balance, lift/gamma/gain, saturation, 2D overlay, vignette, grain, CA, flash, letterbox)
import * as THREE from 'three';

const FS_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function fsTriangle() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return g;
}

const DOF_FRAG = /* glsl */`
uniform sampler2D tColor; uniform sampler2D tDepth;
uniform float near, far, focus, aperture, maxBlur;
uniform vec2 res; uniform vec2 whipDir; uniform float whip; uniform float zoomBlur; uniform vec2 zoomCenter;
varying vec2 vUv;
float linD(float d){ float z = d*2.0-1.0; return 2.0*near*far/(far+near - z*(far-near)); }
float cocAt(float d){ return clamp(aperture * abs(1.0 - focus / d), 0.0, 1.0) * maxBlur; }
void main(){
  float dc = linD(texture2D(tDepth, vUv).x);
  float coc = cocAt(dc);
  vec2 px = 1.0 / res;
  bool doDof = coc > 0.6;
  bool doDir = whip > 0.0005 || zoomBlur > 0.0005;
  if(!doDof && !doDir){ gl_FragColor = texture2D(tColor, vUv); return; }
  const int N = 28;
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for(int i=0;i<N;i++){
    float fi = float(i);
    float r = sqrt((fi+0.5)/float(N));
    float a = fi * 2.39996323;
    vec2 off = vec2(cos(a), sin(a)) * r * coc * px;
    float lt = fi/float(N-1) - 0.5;
    off += whipDir * whip * lt;
    off += (vUv - zoomCenter) * zoomBlur * (fi/float(N-1));
    vec2 suv = clamp(vUv + off, vec2(0.0005), vec2(0.9995));
    vec3 c = texture2D(tColor, suv).rgb;
    float w = 1.0;
    if(doDof){
      float ds = linD(texture2D(tDepth, suv).x);
      float cs = cocAt(ds);
      // reject sharp samples that sit in front of us (prevents halos)
      w = (ds >= dc - 0.001) ? 1.0 : smoothstep(r*coc*0.5, r*coc + 0.5, cs);
      w = max(w, 0.02);
    }
    acc += c * w; wsum += w;
  }
  gl_FragColor = vec4(acc / max(wsum, 1e-4), 1.0);
}`;

const PREFILTER_FRAG = /* glsl */`
uniform sampler2D tSrc; uniform vec2 texel; uniform float threshold; uniform float knee;
varying vec2 vUv;
void main(){
  vec3 c = vec3(0.0);
  c += texture2D(tSrc, vUv + texel*vec2(-1.0,-1.0)).rgb;
  c += texture2D(tSrc, vUv + texel*vec2( 1.0,-1.0)).rgb;
  c += texture2D(tSrc, vUv + texel*vec2(-1.0, 1.0)).rgb;
  c += texture2D(tSrc, vUv + texel*vec2( 1.0, 1.0)).rgb;
  c *= 0.25;
  c = min(c, vec3(60.0));
  float br = max(c.r, max(c.g, c.b));
  float soft = br - threshold + knee; soft = clamp(soft, 0.0, 2.0*knee); soft = soft*soft/(4.0*knee+1e-4);
  float contrib = max(soft, br - threshold) / max(br, 1e-4);
  gl_FragColor = vec4(c * contrib, 1.0);
}`;

const DOWN_FRAG = /* glsl */`
uniform sampler2D tSrc; uniform vec2 texel; varying vec2 vUv;
void main(){
  vec3 a = texture2D(tSrc, vUv + texel*vec2(-2.0, 2.0)).rgb;
  vec3 b = texture2D(tSrc, vUv + texel*vec2( 0.0, 2.0)).rgb;
  vec3 c = texture2D(tSrc, vUv + texel*vec2( 2.0, 2.0)).rgb;
  vec3 d = texture2D(tSrc, vUv + texel*vec2(-2.0, 0.0)).rgb;
  vec3 e = texture2D(tSrc, vUv).rgb;
  vec3 f = texture2D(tSrc, vUv + texel*vec2( 2.0, 0.0)).rgb;
  vec3 g = texture2D(tSrc, vUv + texel*vec2(-2.0,-2.0)).rgb;
  vec3 h = texture2D(tSrc, vUv + texel*vec2( 0.0,-2.0)).rgb;
  vec3 i = texture2D(tSrc, vUv + texel*vec2( 2.0,-2.0)).rgb;
  vec3 j = texture2D(tSrc, vUv + texel*vec2(-1.0, 1.0)).rgb;
  vec3 k = texture2D(tSrc, vUv + texel*vec2( 1.0, 1.0)).rgb;
  vec3 l = texture2D(tSrc, vUv + texel*vec2(-1.0,-1.0)).rgb;
  vec3 m = texture2D(tSrc, vUv + texel*vec2( 1.0,-1.0)).rgb;
  vec3 o = e*0.125 + (a+c+g+i)*0.03125 + (b+d+f+h)*0.0625 + (j+k+l+m)*0.125;
  gl_FragColor = vec4(o, 1.0);
}`;

const UP_FRAG = /* glsl */`
uniform sampler2D tSrc; uniform sampler2D tPrev; uniform vec2 texel; uniform float radius; varying vec2 vUv;
void main(){
  vec2 t = texel * radius;
  vec3 s = texture2D(tSrc, vUv + vec2(-t.x, t.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, t.y)).rgb*2.0 + texture2D(tSrc, vUv + vec2(t.x, t.y)).rgb
         + texture2D(tSrc, vUv + vec2(-t.x, 0.0)).rgb*2.0 + texture2D(tSrc, vUv).rgb*4.0 + texture2D(tSrc, vUv + vec2(t.x, 0.0)).rgb*2.0
         + texture2D(tSrc, vUv + vec2(-t.x,-t.y)).rgb + texture2D(tSrc, vUv + vec2(0.0,-t.y)).rgb*2.0 + texture2D(tSrc, vUv + vec2(t.x,-t.y)).rgb;
  gl_FragColor = vec4(texture2D(tPrev, vUv).rgb + s / 16.0, 1.0);
}`;

const FINAL_FRAG = /* glsl */`
uniform sampler2D tColor; uniform sampler2D tBloom; uniform sampler2D tOverlay;
uniform float sceneAmt, overlayAmt, bloomStrength, exposure;
uniform float saturation, contrast, temperature, tint;
uniform vec3 lift, gammaV, gain;
uniform float vignette, grain, chroma, seed;
uniform vec3 flashColor; uniform float flash; uniform float fade; uniform float letterbox;
uniform vec2 res; uniform vec2 uvShift; uniform float uvZoom;
varying vec2 vUv;
vec3 aces(vec3 x){
  const mat3 m1 = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
  const mat3 m2 = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
  vec3 v = m1 * x; vec3 a = v*(v+0.0245786)-0.000090537; vec3 b = v*(0.983729*v+0.4329510)+0.238081;
  return clamp(m2 * (a/b), 0.0, 1.0);
}
vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec2 uv = (vUv - 0.5) / uvZoom + 0.5 + uvShift;
  vec3 col = vec3(0.0);
  if(sceneAmt > 0.0){
    vec2 dir = (uv - 0.5); float d2 = dot(dir, dir);
    vec2 caOff = dir * chroma * d2 * 4.0 / res.x;
    vec3 hdr;
    hdr.r = texture2D(tColor, uv + caOff).r;
    hdr.g = texture2D(tColor, uv).g;
    hdr.b = texture2D(tColor, uv - caOff).b;
    hdr += texture2D(tBloom, uv).rgb * bloomStrength;
    hdr *= exposure;
    // white balance in linear space
    hdr *= vec3(1.0 + temperature*0.10 + tint*0.02, 1.0 - tint*0.06, 1.0 - temperature*0.12 + tint*0.02);
    vec3 c = aces(hdr);
    c = toSRGB(c);
    // grade
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, saturation);
    c = (c - 0.5) * contrast + 0.5;
    c = clamp(c, 0.0, 1.0);
    c = c * gain + lift * (1.0 - c);
    c = pow(max(c, 0.0), 1.0 / gammaV);
    col = c * sceneAmt;
  }
  if(overlayAmt > 0.0){
    vec4 ov = texture2D(tOverlay, uv);
    col = mix(col, ov.rgb, ov.a * overlayAmt);
  }
  col = mix(col, flashColor, clamp(flash, 0.0, 1.0));
  // vignette
  vec2 vv = vUv - 0.5; vv.x *= res.x / res.y;
  float vig = smoothstep(1.15, 0.25, length(vv));
  col *= mix(1.0, vig, vignette);
  // film grain (luma-weighted)
  float n = h12(vUv * res + seed * 37.0) + h12(vUv * res * 1.7 - seed * 11.0) - 1.0;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col += n * grain * (0.35 + 0.65 * (1.0 - abs(lum - 0.45) * 1.4));
  col *= (1.0 - fade);
  // letterbox
  float lb = letterbox * 0.5;
  if(vUv.y < lb || vUv.y > 1.0 - lb) col = vec3(0.0);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export const DEFAULT_POST = () => ({
  exposure: 1.0, bloomStrength: 0.55, bloomThreshold: 1.0, bloomKnee: 0.5, bloomRadius: 1.0,
  aperture: 0, focus: 10, maxBlur: 14,
  whip: 0, whipDir: [1, 0], zoomBlur: 0, zoomCenter: [0.5, 0.5],
  saturation: 1.08, contrast: 1.06, temperature: 0, tint: 0,
  lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1],
  vignette: 0.45, grain: 0.045, chroma: 1.2,
  flash: 0, flashColor: [1, 1, 1], fade: 0, letterbox: 0,
  sceneAmt: 1, overlayAmt: 0, uvShift: [0, 0], uvZoom: 1,
});

export class Pipeline {
  constructor(renderer, W, H, { samples = 4 } = {}) {
    this.r = renderer; this.W = W; this.H = H;
    const depthTexture = new THREE.DepthTexture(W, H);
    depthTexture.type = THREE.UnsignedIntType;
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples, depthTexture, depthBuffer: true });
    this.rtDof = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
    this.levels = [];
    let w = Math.floor(W / 2), h = Math.floor(H / 2);
    for (let i = 0; i < 6; i++) {
      this.levels.push({
        down: new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false }),
        up: new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false }), w, h,
      });
      w = Math.max(2, Math.floor(w / 2)); h = Math.max(2, Math.floor(h / 2));
    }
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(fsTriangle(), null); this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    const mk = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.mDof = mk(DOF_FRAG, {
      tColor: { value: null }, tDepth: { value: null }, near: { value: 0.1 }, far: { value: 1000 }, focus: { value: 10 },
      aperture: { value: 0 }, maxBlur: { value: 14 }, res: { value: new THREE.Vector2(W, H) },
      whipDir: { value: new THREE.Vector2(1, 0) }, whip: { value: 0 }, zoomBlur: { value: 0 }, zoomCenter: { value: new THREE.Vector2(0.5, 0.5) },
    });
    this.mPre = mk(PREFILTER_FRAG, { tSrc: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 1 }, knee: { value: 0.5 } });
    this.mDown = mk(DOWN_FRAG, { tSrc: { value: null }, texel: { value: new THREE.Vector2() } });
    this.mUp = mk(UP_FRAG, { tSrc: { value: null }, tPrev: { value: null }, texel: { value: new THREE.Vector2() }, radius: { value: 1 } });
    this.blackTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); this.blackTex.needsUpdate = true;
    this.mFinal = mk(FINAL_FRAG, {
      tColor: { value: null }, tBloom: { value: null }, tOverlay: { value: this.blackTex },
      sceneAmt: { value: 1 }, overlayAmt: { value: 0 }, bloomStrength: { value: 0.5 }, exposure: { value: 1 },
      saturation: { value: 1 }, contrast: { value: 1 }, temperature: { value: 0 }, tint: { value: 0 },
      lift: { value: new THREE.Vector3() }, gammaV: { value: new THREE.Vector3(1, 1, 1) }, gain: { value: new THREE.Vector3(1, 1, 1) },
      vignette: { value: 0.4 }, grain: { value: 0.04 }, chroma: { value: 0.2 }, seed: { value: 0 },
      flashColor: { value: new THREE.Vector3(1, 1, 1) }, flash: { value: 0 }, fade: { value: 0 }, letterbox: { value: 0 },
      res: { value: new THREE.Vector2(W, H) }, uvShift: { value: new THREE.Vector2() }, uvZoom: { value: 1 },
    });
    // a cleared black scene target for 2D-only shots
    this.emptyBloom = this.levels[0].up;
  }

  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.quadScene, this.quadCam); }

  render(scene, camera, P, overlayTex, frameSeed) {
    const r = this.r; const u = this.mFinal.uniforms;
    let src = null;
    if (scene && camera && P.sceneAmt > 0) {
      r.setRenderTarget(this.rtScene); r.clear(true, true, true);
      r.render(scene, camera);
      src = this.rtScene.texture;
      const needDof = P.aperture > 0.001 || P.whip > 0.0005 || P.zoomBlur > 0.0005;
      if (needDof) {
        const d = this.mDof.uniforms;
        d.tColor.value = this.rtScene.texture; d.tDepth.value = this.rtScene.depthTexture;
        d.near.value = camera.near; d.far.value = camera.far; d.focus.value = P.focus; d.aperture.value = P.aperture; d.maxBlur.value = P.maxBlur;
        d.whip.value = P.whip; d.whipDir.value.set(P.whipDir[0], P.whipDir[1]); d.zoomBlur.value = P.zoomBlur; d.zoomCenter.value.set(P.zoomCenter[0], P.zoomCenter[1]);
        this.pass(this.mDof, this.rtDof); src = this.rtDof.texture;
      }
      // bloom
      if (P.bloomStrength > 0.001) {
        const L = this.levels;
        this.mPre.uniforms.tSrc.value = src; this.mPre.uniforms.texel.value.set(1 / this.W, 1 / this.H);
        this.mPre.uniforms.threshold.value = P.bloomThreshold; this.mPre.uniforms.knee.value = P.bloomKnee;
        this.pass(this.mPre, L[0].down);
        for (let i = 1; i < L.length; i++) {
          this.mDown.uniforms.tSrc.value = L[i - 1].down.texture; this.mDown.uniforms.texel.value.set(1 / L[i - 1].w, 1 / L[i - 1].h);
          this.pass(this.mDown, L[i].down);
        }
        // upsample: up[n-1] = down[n-1]; up[i] = down[i] + upsample(up[i+1])
        let prevUp = L[L.length - 1].down;
        for (let i = L.length - 2; i >= 0; i--) {
          this.mUp.uniforms.tSrc.value = prevUp.texture; this.mUp.uniforms.tPrev.value = L[i].down.texture;
          this.mUp.uniforms.texel.value.set(1 / L[i + 1].w, 1 / L[i + 1].h); this.mUp.uniforms.radius.value = P.bloomRadius;
          this.pass(this.mUp, L[i].up); prevUp = L[i].up;
        }
        u.tBloom.value = L[0].up.texture;
      } else u.tBloom.value = this.blackTex;
    }
    u.tColor.value = src || this.blackTex;
    u.sceneAmt.value = src ? P.sceneAmt : 0;
    u.overlayAmt.value = overlayTex ? P.overlayAmt : 0;
    u.tOverlay.value = overlayTex || this.blackTex;
    u.bloomStrength.value = P.bloomStrength / 6; u.exposure.value = P.exposure;
    u.saturation.value = P.saturation; u.contrast.value = P.contrast; u.temperature.value = P.temperature; u.tint.value = P.tint;
    u.lift.value.set(...P.lift); u.gammaV.value.set(...P.gamma); u.gain.value.set(...P.gain);
    u.vignette.value = P.vignette; u.grain.value = P.grain; u.chroma.value = P.chroma; u.seed.value = frameSeed % 997;
    u.flashColor.value.set(...P.flashColor); u.flash.value = P.flash; u.fade.value = P.fade; u.letterbox.value = P.letterbox;
    u.uvShift.value.set(P.uvShift[0], P.uvShift[1]); u.uvZoom.value = P.uvZoom;
    this.pass(this.mFinal, null);
  }
}
