// Shared materials. Static set pieces use world-mapped textures: the texture is projected along the
// face's dominant axis in world space, so every wall, floor and step lines up on the same 16-texel
// grid no matter how the box was built or rotated by 90 degrees.
// Every set material also has the see-through cut: anything standing between the camera and the
// hero is dithered away in a circle around them, so tall buildings never hide the fight.
import * as THREE from 'three';
import * as T from './textures.js';

export const shared = {
  time: { value: 0 },
  cutFocus: { value: new THREE.Vector3(0, -100, 0) },
  cutDir: { value: new THREE.Vector3(-0.54, -0.64, -0.54) },
  cutR: { value: 2.6 },
};

function patch(mat, tex) {
  const ws = tex ? (tex.userData.worldSize || [2, 2]) : null;
  if (tex) mat.map = tex;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.cutFocus = shared.cutFocus; sh.uniforms.cutDir = shared.cutDir; sh.uniforms.cutR = shared.cutR;
    if (ws) sh.uniforms.worldSize = { value: new THREE.Vector2(ws[0], ws[1]) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wp4 = vec4(transformed, 1.0); vec3 wn3 = objectNormal;
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4; wn3 = mat3(instanceMatrix) * wn3;
        #endif
        vWPos = (modelMatrix * wp4).xyz; vWNrm = normalize(mat3(modelMatrix) * wn3);`);
    let frag = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWNrm; uniform vec3 cutFocus; uniform vec3 cutDir; uniform float cutR;
        ${ws ? 'uniform vec2 worldSize;' : ''}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        {
          vec3 dp = vWPos - cutFocus; float along = dot(dp, cutDir);
          float ld = length(dp - cutDir * along);
          if (along < -1.4 && vWPos.y > 0.35 && ld < cutR) {
            float chk = mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0);
            if (ld < cutR * 0.78 || chk < 0.5) discard;
          }
        }`);
    if (ws) frag = frag.replace('#include <map_fragment>', `
        vec3 an = abs(vWNrm); vec2 wuv;
        if (an.y >= an.x && an.y >= an.z) wuv = vec2(vWPos.x, -vWPos.z);
        else if (an.x >= an.z) wuv = vec2(-vWPos.z * sign(vWNrm.x), vWPos.y);
        else wuv = vec2(vWPos.x * sign(vWNrm.z), vWPos.y);
        wuv = floor(wuv * 16.0 + 0.001) / 16.0 + 1.0/32.0;
        diffuseColor *= texture2D(map, wuv / worldSize);`);
    sh.fragmentShader = frag;
  };
  mat.customProgramCacheKey = () => 'bm' + (ws ? ws.join('x') : 'plain') + (mat.emissiveMap ? 'e' : '');
  return mat;
}
export const cutout = (mat) => patch(mat, null);

const cache = new Map();
function get(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }

export const M = {
  cobble: (tone) => get('cobble' + tone, () => patch(new THREE.MeshPhongMaterial({ shininess: 18, specular: 0x3a4658 }), T.cobble(1, tone))),
  court: (tone) => get('court' + tone, () => patch(new THREE.MeshPhongMaterial({ shininess: 20, specular: 0x3c4a5c }), T.court(21, tone))),
  flags: (tone) => get('flags' + tone, () => patch(new THREE.MeshPhongMaterial({ shininess: 22, specular: 0x404c5e }), T.flags(2, tone))),
  brick: (tone) => get('brick' + tone, () => patch(new THREE.MeshLambertMaterial(), T.brick(3, tone))),
  ashlar: (tone) => get('ashlar' + tone, () => patch(new THREE.MeshLambertMaterial(), T.ashlar(4, tone))),
  slate: (tone) => get('slate' + tone, () => patch(new THREE.MeshLambertMaterial(), T.slate(5, tone))),
  wood: (tone) => get('wood' + tone, () => patch(new THREE.MeshLambertMaterial(), T.wood(6, tone))),
  plaster: (tone) => get('plaster' + tone, () => patch(new THREE.MeshLambertMaterial(), T.plaster(7, tone))),
  dirt: (tone) => get('dirt' + tone, () => patch(new THREE.MeshLambertMaterial(), T.dirt(8, tone))),
  grass: (tone) => get('grass' + tone, () => patch(new THREE.MeshLambertMaterial(), T.grass(9, tone))),
  iron: () => get('iron', () => new THREE.MeshLambertMaterial({ color: 0x10141b })),
  ironLit: () => get('ironLit', () => new THREE.MeshPhongMaterial({ color: 0x141922, specular: 0x55606e, shininess: 30 })),
  flat: (color, opts = {}) => get('flat' + color + JSON.stringify(opts), () => cutout(new THREE.MeshLambertMaterial({ color, ...opts }))),
  glow: (color, intensity = 3) => get('glow' + color + intensity, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), fog: false })),
  // a decal (window, door, rose): a panel that takes light and fog; lit glass glows
  decal: (tex, emissive = 0) => get('decal' + tex.uuid + emissive, () => {
    const m = new THREE.MeshLambertMaterial({ map: tex, transparent: false, alphaTest: 0.5 });
    if (emissive) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = tex; m.emissiveIntensity = emissive; }
    return cutout(m);
  }),
};
