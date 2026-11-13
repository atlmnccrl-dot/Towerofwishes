// The pixel pipeline: the 3D scene is rendered into a small buffer (about 250 px tall) with an
// orthographic isometric camera at 16 buffer pixels per metre, then scaled up by a whole number
// without smoothing. The camera moves in whole buffer pixels; the remainder is applied in the
// final pass as a screen-pixel offset, so scrolling is smooth but nothing shimmers.
// Post: bloom for lamps, colour grade, vignette, ordered dither, lightning flash, fades.
import * as THREE from 'three';

export const PPU = 16;              // buffer pixels per world unit
const TARGET_H = 200;               // aim for a buffer this tall
export const PITCH = THREE.MathUtils.degToRad(40);
export const YAW = THREE.MathUtils.degToRad(45);
const DIST = 80;

const QUAD_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export class PixelRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
    gl.setPixelRatio(1);
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.BasicShadowMap;
    gl.toneMapping = THREE.NoToneMapping;
    this.gl = gl;
    const ctx = gl.getContext();
    this.hdr = !!(ctx.getExtension('EXT_color_buffer_float') || ctx.getExtension('EXT_color_buffer_half_float'));

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 200);
    this.camera.position.set(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH)).multiplyScalar(DIST);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
    this.right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    this.up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    this.fwd = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 2).negate();

    this.focus = new THREE.Vector3();     // where the camera looks (smoothed by the caller)
    this.shakeAmt = 0; this.shakeT = 0;
    this.ppu = PPU; this.zoom = 1;
    this.sub = new THREE.Vector2();

    // post uniforms (public)
    this.post = {
      flash: 0, fade: 0, fadeColor: new THREE.Color(0, 0, 0), hurt: 0, vignette: 0.55, saturation: 0.82,
      lift: new THREE.Color(0.018, 0.028, 0.05), gain: new THREE.Color(1.0, 1.0, 1.04), exposure: 1.0, bloom: 0.55,
      dawn: 0, desat: 0, time: 0,
    };

    this._buildPasses();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  _rt(w, h, depth, linear) {
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: linear ? THREE.LinearFilter : THREE.NearestFilter, magFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
      type: this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: depth, stencilBuffer: false, generateMipmaps: false,
    });
  }

  _buildPasses() {
    const quad = new THREE.PlaneGeometry(2, 2);
    this.quadScene = new THREE.Scene(); this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(quad, null); this.quadScene.add(this.quad); this.quad.frustumCulled = false;
    this.brightMat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, texel: { value: new THREE.Vector2() } }, vertexShader: QUAD_VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D tex; uniform vec2 texel; varying vec2 vUv;
        vec3 b(vec2 o){ vec3 c = texture2D(tex, vUv + o*texel).rgb; float l = max(c.r, max(c.g, c.b)); return c * smoothstep(0.72, 1.6, l); }
        void main(){ vec3 c = b(vec2(-1.,-1.))+b(vec2(1.,-1.))+b(vec2(-1.,1.))+b(vec2(1.,1.)); gl_FragColor = vec4(c*0.25, 1.0); }`,
    });
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: QUAD_VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tex, vUv).rgb*0.227;
          c += (texture2D(tex, vUv+dir*1.384).rgb + texture2D(tex, vUv-dir*1.384).rgb)*0.316;
          c += (texture2D(tex, vUv+dir*3.230).rgb + texture2D(tex, vUv-dir*3.230).rgb)*0.070;
          gl_FragColor = vec4(c, 1.0); }`,
    });
    const P = this.post;
    this.finalMat = new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: null }, bloomTex: { value: null }, rtSize: { value: new THREE.Vector2() }, scale: { value: 1 }, sub: { value: new THREE.Vector2() },
        flash: { value: 0 }, fade: { value: 0 }, fadeColor: { value: P.fadeColor }, hurt: { value: 0 }, vignette: { value: P.vignette }, saturation: { value: P.saturation },
        lift: { value: P.lift }, gain: { value: P.gain }, exposure: { value: 1 }, bloom: { value: P.bloom }, dawn: { value: 0 }, view: { value: new THREE.Vector2() }, time: { value: 0 },
      },
      vertexShader: QUAD_VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D tex; uniform sampler2D bloomTex; uniform vec2 rtSize; uniform float scale; uniform vec2 sub; uniform vec2 view;
        uniform float flash, fade, hurt, vignette, saturation, exposure, bloom, dawn, time; uniform vec3 fadeColor, lift, gain;
        const float bayer[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
        vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
        void main(){
          vec2 frag = gl_FragCoord.xy;
          vec2 bp = frag / scale + vec2(1.0) + sub;          // buffer pixel coordinate (1 px pad)
          vec2 pix = floor(bp);
          vec3 c = texture2D(tex, (pix + 0.5) / rtSize).rgb;
          vec3 bl = texture2D(bloomTex, bp / rtSize).rgb;
          c += bl * bloom;
          c *= exposure;
          // filmic-ish rolloff for lamp hot spots
          c = c / (1.0 + max(c - 0.9, 0.0));
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          float redness = clamp((c.r - max(c.g, c.b)) * 6.0, 0.0, 1.0);
          c = mix(vec3(l), c, mix(saturation, 1.25, redness));
          c = c * gain + lift * (1.0 - l);
          // dawn: the night lifts, warm light floods in
          c = mix(c, c * vec3(1.35, 1.12, 0.86) + vec3(0.05, 0.03, 0.0), dawn);
          vec2 uv = (pix - 1.0 - sub) / view;
          vec2 q = uv - 0.5; float v = 1.0 - dot(q, q) * vignette * 2.2;
          c *= clamp(v, 0.0, 1.0);
          c += hurt * vec3(0.35, 0.0, 0.0) * (1.0 - v + 0.25);
          c = mix(c, vec3(0.75, 0.82, 0.95), flash);
          vec3 s = toSRGB(c);
          s = clamp((s - 0.42) * 1.12 + 0.42, 0.0, 1.0);
          // ordered dither, then quantise: a touch of banding in fog and light, like hand-placed pixels
          int bi = int(mod(pix.x, 4.0)) + int(mod(pix.y, 4.0)) * 4;
          float d = (bayer[bi] / 16.0 - 0.5) / 40.0;
          s = floor((s + d) * 40.0 + 0.5) / 40.0;
          s = mix(s, fadeColor, fade);
          gl_FragColor = vec4(s, 1.0);
        }`,
    });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const pw = Math.round(innerWidth * dpr), ph = Math.round(innerHeight * dpr);
    const s = Math.max(1, Math.round(ph / TARGET_H));
    const bw = Math.ceil(pw / s), bh = Math.ceil(ph / s);
    this.scale = s; this.bw = bw; this.bh = bh; this.dpr = dpr;
    this.gl.setSize(bw * s, bh * s, false);
    this.canvas.style.width = (bw * s / dpr) + 'px'; this.canvas.style.height = (bh * s / dpr) + 'px';
    const rw = bw + 2, rh = bh + 2;
    if (this.rt) { this.rt.dispose(); this.bA.dispose(); this.bB.dispose(); }
    this.rt = this._rt(rw, rh, true, false);
    const qw = Math.max(1, Math.ceil(rw / 3)), qh = Math.max(1, Math.ceil(rh / 3));
    this.bA = this._rt(qw, qh, false, true); this.bB = this._rt(qw, qh, false, true);
    this._updateFrustum();
    if (this.onResize) this.onResize(bw, bh, s);
  }

  _updateFrustum() {
    const ppu = this.ppu * this.zoom;
    const hw = (this.bw + 2) / 2 / ppu, hh = (this.bh + 2) / 2 / ppu;
    const c = this.camera; c.left = -hw; c.right = hw; c.top = hh; c.bottom = -hh; c.updateProjectionMatrix();
  }

  setZoom(z) { if (Math.abs(z - this.zoom) > 1e-4) { this.zoom = z; this._updateFrustum(); } }
  shake(amount, time = 0.25) { this.shakeAmt = Math.max(this.shakeAmt, amount); this.shakeT = Math.max(this.shakeT, time); }

  // World point -> buffer pixel position on screen (top-left origin), for HUD anchoring.
  project(v, out = { x: 0, y: 0 }) {
    const p = v.clone().project(this.camera);
    out.x = (p.x * 0.5 + 0.5) * (this.bw + 2) - 1 - this.sub.x;
    out.y = this.bh - ((p.y * 0.5 + 0.5) * (this.bh + 2) - 1 - this.sub.y);
    return out;
  }

  // Buffer pixel (top-left origin) -> world point on the plane at height y.
  unproject(bx, by, y = 0) {
    const nx = (bx + 1 + this.sub.x) / (this.bw + 2) * 2 - 1;
    const ny = ((this.bh - by) + 1 + this.sub.y) / (this.bh + 2) * 2 - 1;
    const o = new THREE.Vector3(nx, ny, -1).unproject(this.camera); const d = this.fwd;
    const t = (y - o.y) / d.y; return o.addScaledVector(d, t);
  }

  render(dt) {
    const P = this.post; P.time += dt;
    // camera: snap focus to whole buffer pixels along the view plane, keep the remainder for the final pass
    let f = this.focus.clone();
    if (this.shakeT > 0) {
      this.shakeT -= dt; const a = this.shakeAmt * Math.min(1, this.shakeT * 6);
      f.addScaledVector(this.right, (Math.random() - 0.5) * a).addScaledVector(this.up, (Math.random() - 0.5) * a);
      if (this.shakeT <= 0) this.shakeAmt = 0;
    }
    const ppu = this.ppu * this.zoom;
    const fx = f.dot(this.right), fy = f.dot(this.up), fz = f.dot(this.fwd);
    const sx = Math.round(fx * ppu) / ppu, sy = Math.round(fy * ppu) / ppu;
    this.sub.set((fx - sx) * ppu, (fy - sy) * ppu);
    this.camera.position.copy(this.right).multiplyScalar(sx).addScaledVector(this.up, sy).addScaledVector(this.fwd, fz - DIST);
    this.camera.updateMatrixWorld();
    if (this.onBeforeRender) this.onBeforeRender(sx, sy);

    const gl = this.gl;
    gl.setRenderTarget(this.rt); gl.render(this.scene, this.camera);
    // bloom
    this.quad.material = this.brightMat; this.brightMat.uniforms.tex.value = this.rt.texture; this.brightMat.uniforms.texel.value.set(1 / this.rt.width, 1 / this.rt.height);
    gl.setRenderTarget(this.bA); gl.render(this.quadScene, this.quadCam);
    this.quad.material = this.blurMat;
    this.blurMat.uniforms.tex.value = this.bA.texture; this.blurMat.uniforms.dir.value.set(1 / this.bA.width, 0); gl.setRenderTarget(this.bB); gl.render(this.quadScene, this.quadCam);
    this.blurMat.uniforms.tex.value = this.bB.texture; this.blurMat.uniforms.dir.value.set(0, 1 / this.bA.height); gl.setRenderTarget(this.bA); gl.render(this.quadScene, this.quadCam);
    // final
    const u = this.finalMat.uniforms; this.quad.material = this.finalMat;
    u.tex.value = this.rt.texture; u.bloomTex.value = this.bA.texture; u.rtSize.value.set(this.rt.width, this.rt.height); u.scale.value = this.scale;
    u.sub.value.set(this.sub.x, this.sub.y); u.view.value.set(this.bw, this.bh);
    u.flash.value = P.flash; u.fade.value = P.fade; u.hurt.value = P.hurt; u.vignette.value = P.vignette; u.saturation.value = P.saturation * (1 - P.desat);
    u.exposure.value = P.exposure; u.bloom.value = P.bloom; u.dawn.value = P.dawn; u.time.value = P.time;
    gl.setRenderTarget(null); gl.render(this.quadScene, this.quadCam);
  }
}
