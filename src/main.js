import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { SeededNoise } from './voxel/Noise.js';
import { createPixelAtlas } from './voxel/PixelTextures.js';
import { VoxelWorld } from './voxel/VoxelWorld.js';
import { buildTerrain, SEA_LEVEL } from './world/TerrainBuilder.js';
import { buildStructures } from './world/StructureBuilder.js';
import { createPixelSky } from './shaders/SkyShader.js';
import { createPixelOcean } from './shaders/WaterShader.js';
import { ScenicEntities } from './entities/ScenicEntities.js';
import { ScenicSoundscape } from './audio/Soundscape.js';

// ============================================================================
// 1. RENDERER, SCENE & POST-PROCESSING INITIALIZATION
// ============================================================================
const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xb8e6ff, 0.0022);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 1200);
camera.position.set(26, 46, 118);

const controls = new OrbitControls(camera, canvas);
controls.target.set(2, 26, 4);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.488;
controls.minDistance = 14;
controls.maxDistance = 215;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.26;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.28, // strength
  0.45, // radius
  0.82  // threshold
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// Pixel Rendering Style Modes (0: Crisp HD Voxel, 1: Fine Pixel Art, 2: Retro 16-bit Pixel)
const PIXEL_MODES = [
  { label: '精致体素', scale: 1.0, useDeviceDPR: true },
  { label: '细腻像素画', scale: 0.44, useDeviceDPR: false },
  { label: '复古像素风', scale: 0.26, useDeviceDPR: false }
];
let pixelModeIndex = 0;

function applyResolution() {
  const mode = PIXEL_MODES[pixelModeIndex];
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = mode.useDeviceDPR ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const rw = Math.max(320, Math.floor(w * mode.scale));
  const rh = Math.max(180, Math.floor(h * mode.scale));

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(dpr);
  renderer.setSize(rw, rh, false);
  composer.setPixelRatio(dpr);
  composer.setSize(rw, rh);
  bloomPass.resolution.set(rw, rh);
}
applyResolution();
window.addEventListener('resize', applyResolution);

// ============================================================================
// 2. LIGHTING RIG
// ============================================================================
const hemiLight = new THREE.HemisphereLight(0xa8dcff, 0x4f7a52, 0.85);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfff6dd, 1.95);
dirLight.position.set(-48, 78, 56);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 10;
dirLight.shadow.camera.far = 260;
const shadowBound = 105;
dirLight.shadow.camera.left = -shadowBound;
dirLight.shadow.camera.right = shadowBound;
dirLight.shadow.camera.top = shadowBound;
dirLight.shadow.camera.bottom = -shadowBound;
dirLight.shadow.bias = -0.0005;
dirLight.shadow.normalBias = 0.02;
scene.add(dirLight);

// Subtle warm village & station fill lights for sunset/night magic
const stationWarmLight = new THREE.PointLight(0xffb454, 0, 26, 1.6);
stationWarmLight.position.set(-43, 27.5, 17.5);
scene.add(stationWarmLight);

const valleyWarmLight = new THREE.PointLight(0xffae4a, 0, 28, 1.6);
valleyWarmLight.position.set(15, 24.5, -1);
scene.add(valleyWarmLight);

const campfireLight = new THREE.PointLight(0xff7728, 0, 18, 1.7);
campfireLight.position.set(-27, 17.2, 35);
scene.add(campfireLight);

// ============================================================================
// 3. BUILD PROCEDURAL PIXEL ATLAS, VOXEL WORLD, SHADERS & ENTITIES
// ============================================================================
const noise = new SeededNoise(20261112);
const atlas = createPixelAtlas();
const world = new VoxelWorld(192, 96, 160);

buildTerrain(world, noise);
const landmarks = buildStructures(world, noise);
const { group: voxelMeshGroup, materials: voxelMaterials, voxelCount } = world.buildMeshes(atlas);
scene.add(voxelMeshGroup);

const shoreDepthTex = world.buildShoreDepthTexture(SEA_LEVEL);
const sky = createPixelSky();
scene.add(sky.mesh);

const ocean = createPixelOcean(shoreDepthTex, world.sizeX, world.sizeZ, SEA_LEVEL);
scene.add(ocean.mesh);

const entities = new ScenicEntities(scene, landmarks);
const soundscape = new ScenicSoundscape();

document.getElementById('voxel-count').textContent = voxelCount.toLocaleString('zh-CN');
setTimeout(() => {
  document.getElementById('loading-screen').classList.add('fade-out');
}, 320);

// ============================================================================
// 4. FOUR POETIC ATMOSPHERIC KEYFRAMES & CONTINUOUS 24-HOUR CYCLE
// ============================================================================
const ATMOSPHERE_KEYS = [
  {
    hour: 0.0, name: '星海渔火',
    zenith: 0x070f26, mid: 0x102247, horizon: 0x1c3866, sunsetGlow: 0x263f73,
    sunCol: 0x9ec5ff, shallow: 0x146b8c, midSea: 0x0c3d6e, deepSea: 0x071f42, spec: 0xaed4ff,
    hemiSky: 0x2c4b82, hemiGnd: 0x142238, hemiInt: 0.55,
    dirCol: 0x8cb8ff, dirInt: 0.52, cloud: 0x4a628a, petal: 0xc988a8,
    fog: 0.0021, night: 1.0, sunset: 0.0, aurora: 0.88, bloom: 0.55, exposure: 1.02
  },
  {
    hour: 5.2, name: '破晓微光',
    zenith: 0x1e3566, mid: 0x4e5d94, horizon: 0xd98fa6, sunsetGlow: 0xff9482,
    sunCol: 0xffcaa6, shallow: 0x35b8bf, midSea: 0x1f6aa6, deepSea: 0x10396b, spec: 0xffd6ba,
    hemiSky: 0x8ea4d6, hemiGnd: 0x384d48, hemiInt: 0.68,
    dirCol: 0xffb899, dirInt: 0.95, cloud: 0xf2c2cf, petal: 0xffb5cc,
    fog: 0.0024, night: 0.35, sunset: 0.55, aurora: 0.15, bloom: 0.42, exposure: 1.02
  },
  {
    hour: 6.4, name: '春樱朝雾',
    zenith: 0x3b7be0, mid: 0x8abcf7, horizon: 0xffd9df, sunsetGlow: 0xff9eb5,
    sunCol: 0xfff0d4, shallow: 0x52ebde, midSea: 0x2ca2e0, deepSea: 0x165999, spec: 0xffe8cc,
    hemiSky: 0xffd6e4, hemiGnd: 0x567d62, hemiInt: 0.92,
    dirCol: 0xffe3c2, dirInt: 1.55, cloud: 0xfff0f4, petal: 0xffbfd4,
    fog: 0.0025, night: 0.0, sunset: 0.42, aurora: 0.0, bloom: 0.34, exposure: 1.06
  },
  {
    hour: 11.25, name: '碧海晴岚',
    zenith: 0x1668e3, mid: 0x52b6ff, horizon: 0xc2eeff, sunsetGlow: 0xfff4cc,
    sunCol: 0xfff8d6, shallow: 0x45f2df, midSea: 0x1694e0, deepSea: 0x0d4a91, spec: 0xfff9d6,
    hemiSky: 0xa6deff, hemiGnd: 0x568750, hemiInt: 0.95,
    dirCol: 0xfff9e6, dirInt: 2.05, cloud: 0xffffff, petal: 0xffadc6,
    fog: 0.0016, night: 0.0, sunset: 0.0, aurora: 0.0, bloom: 0.26, exposure: 1.06
  },
  {
    hour: 15.6, name: '午后暖阳',
    zenith: 0x1f6edb, mid: 0x62bcf5, horizon: 0xd9f0de, sunsetGlow: 0xffbe73,
    sunCol: 0xffeeb5, shallow: 0x42e6d0, midSea: 0x1988cc, deepSea: 0x0f4582, spec: 0xffeab0,
    hemiSky: 0xb2dfFA, hemiGnd: 0x5d824c, hemiInt: 0.9,
    dirCol: 0xffeec4, dirInt: 1.85, cloud: 0xfffaf0, petal: 0xffb3c8,
    fog: 0.0018, night: 0.0, sunset: 0.18, aurora: 0.0, bloom: 0.28, exposure: 1.05
  },
  {
    hour: 17.75, name: '橘海落日',
    zenith: 0x26326e, mid: 0x994d78, horizon: 0xff9248, sunsetGlow: 0xff5e2b,
    sunCol: 0xffb347, shallow: 0x3ec4ba, midSea: 0x286299, deepSea: 0x163363, spec: 0xffa042,
    hemiSky: 0xff9e75, hemiGnd: 0x4a3e42, hemiInt: 0.82,
    dirCol: 0xff9947, dirInt: 1.75, cloud: 0xffb085, petal: 0xffa69e,
    fog: 0.0022, night: 0.12, sunset: 1.0, aurora: 0.0, bloom: 0.46, exposure: 1.04
  },
  {
    hour: 19.3, name: '暮色蓝调',
    zenith: 0x0f1c45, mid: 0x293d75, horizon: 0x7c527d, sunsetGlow: 0xd95b43,
    sunCol: 0xff8855, shallow: 0x1e8299, midSea: 0x134b7a, deepSea: 0x0a274d, spec: 0xc2d8ff,
    hemiSky: 0x475e99, hemiGnd: 0x1f2b3d, hemiInt: 0.62,
    dirCol: 0x9eb8ff, dirInt: 0.68, cloud: 0x737fa8, petal: 0xd490b0,
    fog: 0.0022, night: 0.72, sunset: 0.35, aurora: 0.45, bloom: 0.52, exposure: 1.03
  },
  {
    hour: 22.5, name: '星海渔火',
    zenith: 0x060d22, mid: 0x0f2044, horizon: 0x1b3663, sunsetGlow: 0x243b6b,
    sunCol: 0x9ec5ff, shallow: 0x146b8c, midSea: 0x0c3d6e, deepSea: 0x071f42, spec: 0xb5d8ff,
    hemiSky: 0x2b4a80, hemiGnd: 0x142238, hemiInt: 0.56,
    dirCol: 0x8fbaff, dirInt: 0.54, cloud: 0x4a628a, petal: 0xc988a8,
    fog: 0.0020, night: 1.0, sunset: 0.0, aurora: 0.92, bloom: 0.56, exposure: 1.03
  },
  {
    hour: 24.0, name: '星海渔火',
    zenith: 0x070f26, mid: 0x102247, horizon: 0x1c3866, sunsetGlow: 0x263f73,
    sunCol: 0x9ec5ff, shallow: 0x146b8c, midSea: 0x0c3d6e, deepSea: 0x071f42, spec: 0xaed4ff,
    hemiSky: 0x2c4b82, hemiGnd: 0x142238, hemiInt: 0.55,
    dirCol: 0x8cb8ff, dirInt: 0.52, cloud: 0x4a628a, petal: 0xc988a8,
    fog: 0.0021, night: 1.0, sunset: 0.0, aurora: 0.88, bloom: 0.55, exposure: 1.02
  }
];

let currentHour = 11.25;
let targetHour = 11.25;
let autoCycleTime = false;

const _cA = new THREE.Color();
const _cB = new THREE.Color();
const envState = {
  nightAmount: 0,
  sunsetAmount: 0,
  cloudTint: new THREE.Color(0xffffff),
  petalTint: new THREE.Color(0xffadc6)
};

function lerpColorHex(hexA, hexB, t, out) {
  _cA.setHex(hexA);
  _cB.setHex(hexB);
  return out.copy(_cA).lerp(_cB, t);
}

function updateAtmosphere(hour, elapsed) {
  const h = ((hour % 24) + 24) % 24;
  let k0 = ATMOSPHERE_KEYS[0];
  let k1 = ATMOSPHERE_KEYS[ATMOSPHERE_KEYS.length - 1];
  for (let i = 0; i < ATMOSPHERE_KEYS.length - 1; i++) {
    if (h >= ATMOSPHERE_KEYS[i].hour && h <= ATMOSPHERE_KEYS[i + 1].hour) {
      k0 = ATMOSPHERE_KEYS[i];
      k1 = ATMOSPHERE_KEYS[i + 1];
      break;
    }
  }
  const span = Math.max(0.001, k1.hour - k0.hour);
  const rawT = (h - k0.hour) / span;
  const t = rawT * rawT * (3 - 2 * rawT);

  const lerpNum = (a, b) => a + (b - a) * t;

  lerpColorHex(k0.zenith, k1.zenith, t, sky.uniforms.uZenithColor.value);
  lerpColorHex(k0.mid, k1.mid, t, sky.uniforms.uMidSkyColor.value);
  lerpColorHex(k0.horizon, k1.horizon, t, sky.uniforms.uHorizonColor.value);
  lerpColorHex(k0.sunsetGlow, k1.sunsetGlow, t, sky.uniforms.uSunsetGlowColor.value);
  lerpColorHex(k0.sunCol, k1.sunCol, t, sky.uniforms.uSunColor.value);

  const night = lerpNum(k0.night, k1.night);
  const sunset = lerpNum(k0.sunset, k1.sunset);
  const aurora = lerpNum(k0.aurora, k1.aurora);

  sky.uniforms.uNightAmount.value = night;
  sky.uniforms.uSunsetAmount.value = sunset;
  sky.uniforms.uAuroraAmount.value = aurora;

  // Artistic Sky Sun & Moon directions so sunrise/sunset & moon frame beautifully over the sea & mountains!
  const dayFrac = (h - 6.0) / 12.0; // 0 at 06:00 -> 0.5 at 12:00 -> 1.0 at 18:00
  const sunElev = Math.sin(dayFrac * Math.PI) * 0.78;
  const sunAzimX = Math.cos(dayFrac * Math.PI) * 0.84;
  // Angle slightly northwest at sunset so the giant pixel sunset disc & ocean reflection appear right in frame!
  const sunZ = (h >= 5.0 && h <= 19.2) ? (-0.52 + Math.sin(dayFrac * Math.PI) * 0.35) : -0.65;
  sky.uniforms.uSunDir.value.set(sunAzimX, sunElev, sunZ).normalize();

  const moonDir = sky.uniforms.uMoonDir.value.set(0.42, 0.36, -0.83).normalize();

  // Key shadow-casting light keeps generous front-three-quarter angle so viaduct & peaks stay sculpted!
  if (night < 0.72) {
    dirLight.position.set(sunAzimX * 75, Math.max(22, sunElev * 95 + 18), 58);
  } else {
    dirLight.position.set(36, 62, 54);
  }

  lerpColorHex(k0.dirCol, k1.dirCol, t, dirLight.color);
  dirLight.intensity = lerpNum(k0.dirInt, k1.dirInt);

  lerpColorHex(k0.hemiSky, k1.hemiSky, t, hemiLight.color);
  lerpColorHex(k0.hemiGnd, k1.hemiGnd, t, hemiLight.groundColor);
  hemiLight.intensity = lerpNum(k0.hemiInt, k1.hemiInt);

  // Ocean uniforms
  lerpColorHex(k0.shallow, k1.shallow, t, ocean.uniforms.uShallowColor.value);
  lerpColorHex(k0.midSea, k1.midSea, t, ocean.uniforms.uMidOceanColor.value);
  lerpColorHex(k0.deepSea, k1.deepSea, t, ocean.uniforms.uDeepOceanColor.value);
  ocean.uniforms.uHorizonColor.value.copy(sky.uniforms.uHorizonColor.value);
  lerpColorHex(k0.spec, k1.spec, t, ocean.uniforms.uSpecColor.value);
  ocean.uniforms.uNightAmount.value = night;
  ocean.uniforms.uSunDir.value.copy(night > 0.65 ? moonDir : sky.uniforms.uSunDir.value);
  ocean.uniforms.uLighthouseAngle.value = entities.lighthouseAngle;
  ocean.uniforms.uLighthouseIntensity.value = Math.max(0, night * 1.1 + sunset * 0.45);

  // Scene Fog, Exposure & Bloom
  scene.fog.color.copy(sky.uniforms.uHorizonColor.value);
  scene.fog.density = lerpNum(k0.fog, k1.fog);
  bloomPass.strength = lerpNum(k0.bloom, k1.bloom);
  renderer.toneMappingExposure = lerpNum(k0.exposure, k1.exposure);

  // Warm cottage windows, lanterns & beach campfire glow
  const warmFactor = Math.max(night, sunset * 0.88);
  voxelMaterials.emissiveMat.emissiveIntensity = 0.35 + warmFactor * 1.95;
  stationWarmLight.intensity = warmFactor * 12.0;
  valleyWarmLight.intensity = warmFactor * 11.0;
  campfireLight.intensity = (0.35 + warmFactor * 0.9) * (8.5 + Math.sin(elapsed * 9.0) * 2.0);

  lerpColorHex(k0.cloud, k1.cloud, t, envState.cloudTint);
  lerpColorHex(k0.petal, k1.petal, t, envState.petalTint);
  envState.nightAmount = night;
  envState.sunsetAmount = sunset;

  // Update HUD Clock & Mood Label
  const hh = String(Math.floor(h)).padStart(2, '0');
  const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
  document.getElementById('clock-display').textContent = `${hh}:${mm}`;
  document.getElementById('mood-label').textContent = rawT < 0.5 ? k0.name : k1.name;
}

// ============================================================================
// 5. CAMERA MODES (Panorama Orbit / Ride Train / Harbor Cruise / Free Fly WASD)
// ============================================================================
let cameraMode = 'panorama';
const flyKeys = {};
let flyYaw = 0.32;
let flyPitch = -0.18;
let flyDragging = false;
let flySpeed = 28;

window.addEventListener('keydown', (e) => {
  flyKeys[e.code] = true;
  if (e.code === 'KeyH') toggleUI();
  if (e.code === 'KeyP') cyclePixelMode();
  if (e.code === 'KeyM') toggleAudio();
});
window.addEventListener('keyup', (e) => {
  flyKeys[e.code] = false;
});

canvas.addEventListener('mousedown', (e) => {
  if (cameraMode === 'free' && e.button === 0) flyDragging = true;
});
window.addEventListener('mouseup', () => {
  flyDragging = false;
});
window.addEventListener('mousemove', (e) => {
  if (cameraMode === 'free' && flyDragging) {
    flyYaw -= e.movementX * 0.003;
    flyPitch = Math.max(-1.42, Math.min(1.42, flyPitch - e.movementY * 0.003));
  }
});
canvas.addEventListener('wheel', (e) => {
  if (cameraMode === 'free') {
    flySpeed = Math.max(8, Math.min(80, flySpeed - Math.sign(e.deltaY) * 4));
  }
}, { passive: true });

function setCameraMode(mode) {
  cameraMode = mode;
  document.querySelectorAll('.cam-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.cam === mode);
  });
  document.getElementById('fly-hint').classList.toggle('hidden', mode !== 'free');

  if (mode === 'panorama') {
    controls.enabled = true;
    controls.autoRotate = true;
    camera.position.set(26, 46, 118);
    controls.target.set(2, 26, 4);
  } else if (mode === 'free') {
    controls.enabled = false;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    flyPitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y)));
    flyYaw = Math.atan2(-dir.x, -dir.z);
  } else {
    controls.enabled = false;
  }
}

// ============================================================================
// 6. UI CONTROLS & SHORTCUT BINDINGS
// ============================================================================
const MOOD_HOURS = {
  dawn: 6.4,
  noon: 11.25,
  sunset: 17.75,
  night: 22.5
};

const timeSlider = document.getElementById('time-slider');
const btnAutoTime = document.getElementById('btn-auto-time');

document.querySelectorAll('.mood-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mood-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    autoCycleTime = false;
    btnAutoTime.classList.remove('active');
    targetHour = MOOD_HOURS[btn.dataset.mood];
    timeSlider.value = targetHour;
  });
});

timeSlider.addEventListener('input', (e) => {
  targetHour = parseFloat(e.target.value);
  currentHour = targetHour;
  document.querySelectorAll('.mood-btn').forEach((b) => b.classList.remove('active'));
});

btnAutoTime.addEventListener('click', () => {
  autoCycleTime = !autoCycleTime;
  btnAutoTime.classList.toggle('active', autoCycleTime);
});

document.querySelectorAll('.cam-btn').forEach((btn) => {
  btn.addEventListener('click', () => setCameraMode(btn.dataset.cam));
});

function cyclePixelMode() {
  pixelModeIndex = (pixelModeIndex + 1) % PIXEL_MODES.length;
  applyResolution();
  const btn = document.getElementById('btn-pixel-mode');
  btn.textContent = `👾 画风：${PIXEL_MODES[pixelModeIndex].label}`;
  btn.classList.toggle('active', pixelModeIndex > 0);
}
document.getElementById('btn-pixel-mode').addEventListener('click', cyclePixelMode);

function toggleAudio() {
  const on = soundscape.toggle();
  const btn = document.getElementById('btn-audio');
  btn.textContent = on ? '🎵 海浪轻音：开' : '🎵 海浪轻音：关';
  btn.classList.toggle('active', on);
}
document.getElementById('btn-audio').addEventListener('click', toggleAudio);

document.getElementById('btn-shot').addEventListener('click', () => {
  composer.render();
  const link = document.createElement('a');
  link.download = `山海晴岚_像素风景线_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

let uiHidden = false;
let hintTimeout = null;
function toggleUI() {
  uiHidden = !uiHidden;
  document.getElementById('hud-top').classList.toggle('hud-hidden', uiHidden);
  document.getElementById('hud-bottom').classList.toggle('hud-hidden', uiHidden);
  document.getElementById('btn-restore-ui').classList.toggle('hidden', !uiHidden);

  const wpHint = document.getElementById('wallpaper-hint');
  if (uiHidden) {
    wpHint.classList.remove('hidden');
    clearTimeout(hintTimeout);
    hintTimeout = setTimeout(() => wpHint.classList.add('hidden'), 2600);
  } else {
    wpHint.classList.add('hidden');
  }
}
document.getElementById('btn-hide-ui').addEventListener('click', toggleUI);
document.getElementById('btn-restore-ui').addEventListener('click', toggleUI);

// ============================================================================
// 7. MAIN ANIMATION LOOP
// ============================================================================
const clock = new THREE.Clock();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(0.05, clock.getDelta());
  const elapsed = clock.elapsedTime;

  // Advance or smoothly approach target hour
  if (autoCycleTime) {
    targetHour = (targetHour + dt * 0.42) % 24;
    currentHour = targetHour;
    timeSlider.value = currentHour.toFixed(2);
  } else {
    // Shortest path around 24h wrap
    let diff = targetHour - currentHour;
    if (diff > 12) diff -= 24;
    if (diff < -12) diff += 24;
    currentHour = (currentHour + diff * Math.min(1, dt * 3.2) + 24) % 24;
  }

  sky.uniforms.uTime.value = elapsed;
  ocean.uniforms.uTime.value = elapsed;

  updateAtmosphere(currentHour, elapsed);
  entities.update(dt, elapsed, envState);

  // Sync lighthouse angle into water reflection after entity update
  ocean.uniforms.uLighthouseAngle.value = entities.lighthouseAngle;

  // Update Active Camera Mode
  if (cameraMode === 'panorama') {
    controls.update();
  } else if (cameraMode === 'train') {
    const pose = entities.getTrainCameraPose();
    camera.position.lerp(pose.pos, Math.min(1, dt * 6.5));
    controls.target.lerp(pose.target, Math.min(1, dt * 7.5));
    camera.lookAt(controls.target);
  } else if (cameraMode === 'harbor') {
    const pose = entities.getHarborCruisePose(elapsed);
    camera.position.lerp(pose.pos, Math.min(1, dt * 3.5));
    controls.target.lerp(pose.target, Math.min(1, dt * 3.5));
    camera.lookAt(controls.target);
  } else if (cameraMode === 'free') {
    const euler = new THREE.Euler(flyPitch, flyYaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    _camForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);

    const step = flySpeed * dt;
    if (flyKeys['KeyW'] || flyKeys['ArrowUp']) camera.position.addScaledVector(_camForward, step);
    if (flyKeys['KeyS'] || flyKeys['ArrowDown']) camera.position.addScaledVector(_camForward, -step);
    if (flyKeys['KeyD'] || flyKeys['ArrowRight']) camera.position.addScaledVector(_camRight, step);
    if (flyKeys['KeyA'] || flyKeys['ArrowLeft']) camera.position.addScaledVector(_camRight, -step);
    if (flyKeys['Space'] || flyKeys['KeyE']) camera.position.y += step;
    if (flyKeys['ShiftLeft'] || flyKeys['ShiftRight'] || flyKeys['KeyQ']) camera.position.y -= step;
    camera.position.y = Math.max(SEA_LEVEL + 1.8, Math.min(135, camera.position.y));
  }

  composer.render();
}

animate();
