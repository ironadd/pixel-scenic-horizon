import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SEA_LEVEL } from '../world/TerrainBuilder.js';

// Helper to assemble crisp multi-box voxel props into a single merged BufferGeometry with vertex colors
class MiniVoxelBuilder {
  constructor() {
    this.geos = [];
  }

  addBox(cx, cy, cz, sx, sy, sz, hexColor) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate(cx, cy, cz);
    const c = new THREE.Color(hexColor);
    const count = g.attributes.position.count;
    const cols = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    this.geos.push(g);
  }

  build(material, castShadow = true) {
    if (this.geos.length === 0) return new THREE.Mesh();
    const merged = BufferGeometryUtils.mergeGeometries(this.geos, false);
    for (const g of this.geos) g.dispose();
    this.geos.length = 0;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    return mesh;
  }
}

export class ScenicEntities {
  constructor(scene, landmarks) {
    this.scene = scene;
    this.landmarks = landmarks;
    this.root = new THREE.Group();
    this.root.name = 'ScenicEntities';
    scene.add(this.root);

    this.sharedSolidMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.05
    });

    this.sharedGlowMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: new THREE.Color(0xffbe55),
      emissiveIntensity: 1.0,
      roughness: 0.35
    });

    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92
    });

    this.trainU = 0.08; // Starts right near West Station approaching the Grand Viaduct!
    this.lighthouseAngle = 0.0;

    this._initTrain();
    this._initLevelCrossing();
    this._initWindmillAndWaterwheel();
    this._initLighthouseBeam();
    this._initClouds();
    this._initSailboats();
    this._initHotAirBalloons();
    this._initSeagulls();
    this._initWaterfallRainbow();
    this._initVoxelParticles();
  }

  // =========================================================================
  // 1. VINTAGE COASTAL SCENIC TRAIN ("山海号")
  // =========================================================================
  _initTrain() {
    this.trainCars = [];
    this.carArcSpacing = 0.0235; // Constant arc spacing along closed spline

    for (let i = 0; i < 3; i++) {
      const carGroup = new THREE.Group();
      const isLead = (i === 0);
      const bodyB = new MiniVoxelBuilder();
      const glowB = new MiniVoxelBuilder();

      const len = isLead ? 4.4 : 4.2;
      const w = 1.95;

      // Dark iron chassis & bogie wheels
      bodyB.addBox(0, 0.42, 0, len, 0.28, w * 0.92, 0x2c333d);
      for (const wx of [-len * 0.32, -len * 0.18, len * 0.18, len * 0.32]) {
        bodyB.addBox(wx, 0.25, w * 0.44, 0.42, 0.42, 0.16, 0x1d2229);
        bodyB.addBox(wx, 0.25, -w * 0.44, 0.42, 0.42, 0.16, 0x1d2229);
      }

      // Classic Emerald lower livery + Gold trim stripe + Warm Cream window band
      bodyB.addBox(0, 0.92, 0, len, 0.78, w, 0x1d7057);
      bodyB.addBox(0, 1.35, 0, len + 0.04, 0.14, w + 0.04, 0xe8b948);

      // Upper cream pillars & end bulkheads
      bodyB.addBox(-len * 0.45, 1.82, 0, len * 0.1, 0.82, w, 0xf5ebd6);
      bodyB.addBox(len * 0.45, 1.82, 0, len * 0.1, 0.82, w, 0xf5ebd6);
      for (const px of [-len * 0.16, len * 0.16]) {
        bodyB.addBox(px, 1.82, w * 0.46, 0.22, 0.82, 0.12, 0xf5ebd6);
        bodyB.addBox(px, 1.82, -w * 0.46, 0.22, 0.82, 0.12, 0xf5ebd6);
      }

      // Warm amber glowing passenger & cab windows!
      glowB.addBox(0, 1.82, 0, len * 0.84, 0.68, w * 0.92, 0xffe299);

      // Arched slate-grey roof + clerestory vents
      bodyB.addBox(0, 2.32, 0, len + 0.16, 0.22, w + 0.14, 0x465262);
      bodyB.addBox(0, 2.50, 0, len * 0.78, 0.18, w * 0.65, 0x586678);

      if (isLead) {
        // Retro crimson cowcatcher, brass headlamp & puffing smokestack!
        bodyB.addBox(len * 0.54, 0.34, 0, 0.42, 0.32, w * 0.88, 0xc93b32);
        bodyB.addBox(len * 0.30, 2.82, 0, 0.42, 0.56, 0.42, 0x262c35);
        bodyB.addBox(len * 0.30, 3.12, 0, 0.54, 0.14, 0.54, 0xe8b948);
        glowB.addBox(len * 0.52, 1.15, 0, 0.18, 0.34, 0.34, 0xfff8cc); // Front brass headlight
      } else {
        // Diamond pantograph / roof detail on middle car
        if (i === 1) {
          bodyB.addBox(0, 2.75, 0, 0.9, 0.32, 0.7, 0x7c8a99);
        }
      }

      // Coupler bar
      bodyB.addBox(-len * 0.54, 0.42, 0, 0.35, 0.16, 0.26, 0x222730);

      carGroup.add(bodyB.build(this.sharedSolidMat, true));
      carGroup.add(glowB.build(this.sharedGlowMat, false));

      if (isLead) {
        // Subtle warm headlight point light for tunnel & night viaduct magic
        this.trainHeadlight = new THREE.PointLight(0xffdca0, 8, 22, 1.6);
        this.trainHeadlight.position.set(2.8, 1.4, 0);
        carGroup.add(this.trainHeadlight);
      }

      this.root.add(carGroup);
      this.trainCars.push(carGroup);
    }
  }

  // =========================================================================
  // 2. WORKING SEASIDE RAILROAD CROSSING GATES
  // =========================================================================
  _initLevelCrossing() {
    const cp = this.landmarks.crossingPos;
    this.crossingGates = [];
    this.crossingBlinkMeshes = [];

    this.blinkMatA = new THREE.MeshBasicMaterial({ color: 0xff3322 });
    this.blinkMatB = new THREE.MeshBasicMaterial({ color: 0x441111 });

    // Two gates: North side (z - 1.6) and South side (z + 1.6)
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      const postGroup = new THREE.Group();
      postGroup.position.set(cp.x + sign * 1.4, cp.y + 0.5, cp.z + sign * 1.65);

      const postB = new MiniVoxelBuilder();
      postB.addBox(0, 1.1, 0, 0.24, 2.2, 0.24, 0x333942);
      postB.addBox(0, 1.85, 0, 0.85, 0.20, 0.12, 0xf7c931); // Crossbuck sign
      postB.addBox(0, 1.60, 0, 0.65, 0.18, 0.12, 0xf7f9fc);
      postGroup.add(postB.build(this.sharedSolidMat, true));

      // Blinking warning lamps
      const lampGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const l1 = new THREE.Mesh(lampGeo, this.blinkMatA);
      l1.position.set(-0.24, 1.35, 0.14);
      const l2 = new THREE.Mesh(lampGeo, this.blinkMatB);
      l2.position.set(0.24, 1.35, 0.14);
      postGroup.add(l1, l2);
      this.crossingBlinkMeshes.push([l1, l2]);

      // Pivoting Red-and-White Barrier Arm!
      const armPivot = new THREE.Group();
      armPivot.position.set(0, 0.95, 0);
      const armB = new MiniVoxelBuilder();
      const armDir = -sign; // Reach across the crossing lane
      for (let s = 0; s < 6; s++) {
        armB.addBox(armDir * (0.25 + s * 0.45), 0, 0, 0.45, 0.14, 0.14, s % 2 === 0 ? 0xe53935 : 0xffffff);
      }
      armPivot.add(armB.build(this.sharedSolidMat, true));
      postGroup.add(armPivot);

      this.root.add(postGroup);
      this.crossingGates.push({ armPivot, sign, angle: 1.32 });
    }
  }

  // =========================================================================
  // 3. SPINNING DUTCH WINDMILL SAILS & TIMBER WATERWHEEL
  // =========================================================================
  _initWindmillAndWaterwheel() {
    // Windmill Rotor (4 lattice sails)
    this.windmillRotor = new THREE.Group();
    this.windmillRotor.position.copy(this.landmarks.windmillHubPos);
    const wmB = new MiniVoxelBuilder();
    wmB.addBox(0, 0, 0.1, 0.9, 0.9, 0.9, 0x4a2f1e);
    for (let i = 0; i < 4; i++) {
      const armGroup = new THREE.Group();
      armGroup.rotation.z = (i * Math.PI) / 2;
      const sb = new MiniVoxelBuilder();
      sb.addBox(0, 4.2, 0.15, 0.26, 8.0, 0.24, 0x5c3b24); // Main wooden spar
      // Cream cloth sail offset to one side of spar
      sb.addBox(0.72, 4.7, 0.18, 1.15, 6.2, 0.10, 0xfaf3e3);
      for (let r = 0; r < 5; r++) {
        sb.addBox(0.65, 2.0 + r * 1.35, 0.22, 1.3, 0.12, 0.12, 0x8f6039);
      }
      armGroup.add(sb.build(this.sharedSolidMat, true));
      this.windmillRotor.add(armGroup);
    }
    this.root.add(this.windmillRotor);

    // Timber Waterwheel beside Emerald Mill Pond
    this.waterwheel = new THREE.Group();
    this.waterwheel.position.copy(this.landmarks.waterwheelHubPos);
    const wwB = new MiniVoxelBuilder();
    wwB.addBox(0, 0, 0, 1.2, 0.65, 0.65, 0x4a2f1e);
    const R = 2.55;
    const segments = 12;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const cy = Math.cos(a) * R;
      const cz = Math.sin(a) * R;
      // Rim & Wooden Paddle Buckets
      wwB.addBox(-0.35, cy, cz, 0.18, 0.45, 0.45, 0x7c5234);
      wwB.addBox(0.35, cy, cz, 0.18, 0.45, 0.45, 0x7c5234);
      wwB.addBox(0, cy * 1.06, cz * 1.06, 0.88, 0.22, 0.42, 0xb57c4a);
      if (i % 3 === 0) {
        wwB.addBox(0, cy * 0.5, cz * 0.5, 0.18, R, 0.18, 0x5c3b24);
      }
    }
    this.waterwheel.add(wwB.build(this.sharedSolidMat, true));
    this.root.add(this.waterwheel);
  }

  // =========================================================================
  // 4. ROTATING LIGHTHOUSE VOLUMETRIC LIGHT CONES
  // =========================================================================
  _initLighthouseBeam() {
    this.lighthouseGroup = new THREE.Group();
    this.lighthouseGroup.position.copy(this.landmarks.lighthouseBeaconPos);

    const coneLen = 85;
    const coneGeo = new THREE.ConeGeometry(11.5, coneLen, 16, 1, true);
    // Vertex alpha falloff from apex to far wide end for silky volumetric look!
    const pos = coneGeo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); // +coneLen/2 is apex, -coneLen/2 is open base
      const t = (y + coneLen * 0.5) / coneLen; // 1 at apex -> 0 at far end
      const fade = Math.pow(t, 1.8);
      cols[i * 3] = 1.0 * fade;
      cols[i * 3 + 1] = 0.93 * fade;
      cols[i * 3 + 2] = 0.68 * fade;
    }
    coneGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

    this.beamMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Dual opposing lighthouse beams along +X and -X
    const beam1 = new THREE.Mesh(coneGeo, this.beamMat);
    beam1.rotation.z = Math.PI / 2;
    beam1.position.x = coneLen * 0.5 + 1.2;
    beam1.rotation.y = -0.06;

    const beam2 = new THREE.Mesh(coneGeo, this.beamMat);
    beam2.rotation.z = -Math.PI / 2;
    beam2.position.x = -(coneLen * 0.5 + 1.2);

    this.lighthouseGroup.add(beam1, beam2);
    this.lighthousePointLight = new THREE.PointLight(0xffe799, 12, 55, 1.4);
    this.lighthouseGroup.add(this.lighthousePointLight);

    this.root.add(this.lighthouseGroup);
  }

  // =========================================================================
  // 5. VOLUMETRIC PUFFY 3D VOXEL CLOUDS
  // =========================================================================
  _initClouds() {
    this.clouds = [];
    const cloudConfigs = [
      { x: -95, y: 66, z: -55, scale: 1.25, speed: 1.15 },
      { x: -45, y: 74, z: -68, scale: 1.45, speed: 0.95 },
      { x: 18,  y: 78, z: -62, scale: 1.35, speed: 1.05 },
      { x: 75,  y: 68, z: -50, scale: 1.20, speed: 1.25 },
      { x: -115,y: 62, z: -15, scale: 1.10, speed: 1.35 },
      { x: 105, y: 64, z: -10, scale: 1.15, speed: 1.10 },
      { x: -70, y: 70, z: 35,  scale: 1.05, speed: 1.40 },
      { x: 35,  y: 72, z: 55,  scale: 1.25, speed: 1.00 },
      { x: -15, y: 56, z: -38, scale: 0.85, speed: 0.80 }, // Mountain shoulder mist cloud!
      { x: 52,  y: 53, z: -32, scale: 0.80, speed: 0.85 }
    ];

    cloudConfigs.forEach((cfg, idx) => {
      const cb = new MiniVoxelBuilder();
      const puffs = 5 + (idx % 3);
      for (let p = 0; p < puffs; p++) {
        const px = (p - (puffs - 1) * 0.5) * 4.2;
        const pz = Math.sin(p * 2.1 + idx) * 2.4;
        const pw = 6.5 - Math.abs(p - (puffs - 1) * 0.5) * 0.9;
        const ph = (p === Math.floor(puffs / 2)) ? 4.2 : 2.8;
        const pd = 5.2;
        cb.addBox(px, ph * 0.5, pz, pw, ph, pd, 0xffffff);
        cb.addBox(px * 0.8, 0.2, pz, pw + 1.4, 1.4, pd + 1.0, 0xeef5fc);
      }
      const mesh = cb.build(this.cloudMat, false);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      mesh.scale.setScalar(cfg.scale);
      this.root.add(mesh);
      this.clouds.push({ mesh, speed: cfg.speed, baseY: cfg.y, phase: idx * 1.3 });
    });
  }

  // =========================================================================
  // 6. BOBBING VOXEL SAILBOATS ON THE TURQUOISE BAY
  // =========================================================================
  _initSailboats() {
    this.boats = [];
    const boatSpecs = [
      { cx: -32, cz: 58, rx: 18, rz: 9, speed: 0.11, phase: 0.2, sailCol: 0xfffaf0, stripeCol: 0xeb5a46 },
      { cx: 8,   cz: 52, rx: 14, rz: 8, speed: -0.09, phase: 2.1, sailCol: 0xfffdf7, stripeCol: 0x2e86de },
      { cx: 48,  cz: 64, rx: 16, rz: 9, speed: 0.085, phase: 4.0, sailCol: 0xfff6e5, stripeCol: 0xf39c12 }
    ];

    for (const sp of boatSpecs) {
      const g = new THREE.Group();
      const bb = new MiniVoxelBuilder();
      const gb = new MiniVoxelBuilder();

      // Warm mahogany & white hull
      bb.addBox(0, 0.35, 0, 4.4, 0.65, 1.85, 0x8c5532);
      bb.addBox(2.25, 0.52, 0, 0.9, 0.55, 1.15, 0x8c5532); // Bow
      bb.addBox(0, 0.72, 0, 4.6, 0.22, 1.95, 0xf7f4eb);
      bb.addBox(0, 0.82, 0, 4.8, 0.14, 2.02, sp.stripeCol);

      // Mast & Billowing Pixel Sail
      bb.addBox(0.3, 2.9, 0, 0.22, 4.4, 0.22, 0x5c3b24);
      bb.addBox(-0.5, 1.4, 0, 2.4, 0.18, 0.18, 0x5c3b24); // Boom
      bb.addBox(-0.35, 2.85, 0.08, 2.0, 2.5, 0.16, sp.sailCol);
      bb.addBox(-0.20, 4.45, 0.06, 1.1, 0.85, 0.14, sp.sailCol);
      bb.addBox(1.35, 2.55, -0.05, 1.15, 2.0, 0.12, sp.sailCol); // Jib sail
      // Little pennant flag at masthead
      bb.addBox(-0.35, 5.05, 0, 0.75, 0.26, 0.08, sp.stripeCol);

      // Cozy stern lantern!
      gb.addBox(-1.95, 1.15, 0, 0.30, 0.35, 0.30, 0xffd275);

      g.add(bb.build(this.sharedSolidMat, true));
      g.add(gb.build(this.sharedGlowMat, false));
      this.root.add(g);
      this.boats.push({ group: g, ...sp });
    }
  }

  // =========================================================================
  // 7. COLORFUL PIXEL HOT-AIR BALLOONS IN THE SKY
  // =========================================================================
  _initHotAirBalloons() {
    this.balloons = [];
    const specs = [
      { x: -38, y: 54, z: -8,  c1: 0xff6b5b, c2: 0xfff3d6, c3: 0x38b6ff, phase: 0.0 },
      { x: 34,  y: 62, z: -18, c1: 0xffb838, c2: 0xffffff, c3: 0x7b61ff, phase: 2.3 },
      { x: 64,  y: 50, z: 10,  c1: 0x2ed573, c2: 0xfff7e6, c3: 0xff5252, phase: 4.5 }
    ];

    for (const s of specs) {
      const g = new THREE.Group();
      const bb = new MiniVoxelBuilder();
      const gb = new MiniVoxelBuilder();

      // Wicker basket + ropes
      bb.addBox(0, 0, 0, 1.3, 1.1, 1.3, 0x9c6639);
      for (const [rx, rz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
        bb.addBox(rx, 1.25, rz, 0.08, 1.5, 0.08, 0x5c3b24);
      }
      // Glowing warm burner flame!
      gb.addBox(0, 1.55, 0, 0.45, 0.55, 0.45, 0xffb84d);

      // Stepped Voxel Envelope Layers
      const rings = [
        { y: 2.4, w: 2.2, h: 1.0, c: s.c1 },
        { y: 3.5, w: 3.4, h: 1.3, c: s.c2 },
        { y: 4.9, w: 4.2, h: 1.5, c: s.c3 },
        { y: 6.3, w: 3.8, h: 1.2, c: s.c2 },
        { y: 7.4, w: 2.6, h: 0.9, c: s.c1 },
        { y: 8.1, w: 1.3, h: 0.5, c: s.c3 }
      ];
      for (const r of rings) {
        bb.addBox(0, r.y, 0, r.w, r.h, r.w * 0.86, r.c);
        bb.addBox(0, r.y, 0, r.w * 0.86, r.h, r.w, r.c);
      }

      g.add(bb.build(this.sharedSolidMat, true));
      g.add(gb.build(this.sharedGlowMat, false));
      g.position.set(s.x, s.y, s.z);
      this.root.add(g);
      this.balloons.push({ group: g, baseX: s.x, baseY: s.y, baseZ: s.z, phase: s.phase });
    }
  }

  // =========================================================================
  // 8. SOARING & FLAPPING PIXEL SEAGULLS
  // =========================================================================
  _initSeagulls() {
    this.gulls = [];
    const bodyGeo = new THREE.BoxGeometry(0.55, 0.18, 0.22);
    const wingGeo = new THREE.BoxGeometry(0.24, 0.08, 0.72);
    wingGeo.translate(0, 0, 0.36);
    const wingGeoR = new THREE.BoxGeometry(0.24, 0.08, 0.72);
    wingGeoR.translate(0, 0, -0.36);

    const gullMat = new THREE.MeshStandardMaterial({ color: 0xfafcff, roughness: 0.7 });

    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, gullMat);
      const wingL = new THREE.Mesh(wingGeo, gullMat);
      const wingR = new THREE.Mesh(wingGeoR, gullMat);
      g.add(body, wingL, wingR);

      const zone = i % 2 === 0
        ? { cx: -14, cz: 42, y: 23 + (i % 5) * 2.2, r: 12 + (i % 4) * 4 } // Harbor Pier flock
        : { cx: 64,  cz: 40, y: 38 + (i % 5) * 2.5, r: 14 + (i % 4) * 3.5 }; // Lighthouse Cliff flock

      this.root.add(g);
      this.gulls.push({
        group: g,
        wingL,
        wingR,
        ...zone,
        speed: (0.42 + (i % 4) * 0.08) * (i % 3 === 0 ? -1 : 1),
        phase: i * 1.15
      });
    }
  }

  // =========================================================================
  // 9. WATERFALL DAYLIGHT PIXEL RAINBOW ARC
  // =========================================================================
  _initWaterfallRainbow() {
    this.rainbowGroup = new THREE.Group();
    this.rainbowGroup.position.set(8.0, 20.5, -13.0);
    this.rainbowGroup.rotation.y = 0.18;

    const palette = [0xff4b4b, 0xff9436, 0xffe142, 0x52e062, 0x3bc8ff, 0x6c63ff];
    const rb = new MiniVoxelBuilder();
    const steps = 26;
    for (let b = 0; b < palette.length; b++) {
      const radius = 8.2 - b * 0.34;
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * Math.PI;
        const rx = Math.cos(a) * radius;
        const ry = Math.sin(a) * radius * 0.82;
        rb.addBox(rx, ry, 0, 0.75, 0.34, 0.34, palette[b]);
      }
    }

    this.rainbowMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = rb.build(this.rainbowMat, false);
    this.rainbowGroup.add(mesh);
    this.root.add(this.rainbowGroup);
  }

  // =========================================================================
  // 10. GPU INSTANCED 3D VOXEL PARTICLES (Sakura, Fireflies, Smoke, Mist)
  // =========================================================================
  _initVoxelParticles() {
    this._dummy = new THREE.Object3D();

    // A. Floating Pink Sakura Blossom Petals (160 cubes)
    this.sakuraCount = 160;
    const petalGeo = new THREE.BoxGeometry(0.24, 0.08, 0.24);
    this.sakuraMat = new THREE.MeshBasicMaterial({ color: 0xffadc6, transparent: true, opacity: 0.92 });
    this.sakuraMesh = new THREE.InstancedMesh(petalGeo, this.sakuraMat, this.sakuraCount);
    this.sakuraData = [];
    const sSpots = this.landmarks.sakuraSpots.length > 0
      ? this.landmarks.sakuraSpots
      : [new THREE.Vector3(-44, 28, 16)];

    for (let i = 0; i < this.sakuraCount; i++) {
      const origin = sSpots[i % sSpots.length];
      this.sakuraData.push({
        ox: origin.x + (Math.random() - 0.5) * 9,
        oy: origin.y + Math.random() * 5,
        oz: origin.z + (Math.random() - 0.5) * 9,
        life: Math.random(),
        speed: 0.07 + Math.random() * 0.06,
        seed: Math.random() * 20
      });
    }
    this.root.add(this.sakuraMesh);

    // B. Night Golden-Lime Fireflies (150 glowing cubes)
    this.fireflyCount = 150;
    const ffGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    this.fireflyMat = new THREE.MeshBasicMaterial({
      color: 0xd8ff59,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.fireflyMesh = new THREE.InstancedMesh(ffGeo, this.fireflyMat, this.fireflyCount);
    this.fireflyData = [];
    for (let i = 0; i < this.fireflyCount; i++) {
      // Cluster over wildflower meadows, terraced paddies, station sakura & valley river
      const zone = i % 3;
      const x = zone === 0 ? (-72 + Math.random() * 55) : (zone === 1 ? (45 + Math.random() * 32) : (-10 + Math.random() * 35));
      const z = zone === 0 ? (-15 + Math.random() * 36) : (zone === 1 ? (16 + Math.random() * 28) : (-16 + Math.random() * 34));
      const y = 18 + Math.random() * 14;
      this.fireflyData.push({ x, y, z, seed: Math.random() * 50 });
    }
    this.root.add(this.fireflyMesh);

    // C. Puffing Train Steam, Cottage Chimney Smoke & Waterfall Mist (110 cubes)
    this.puffCount = 110;
    const puffGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
    this.puffMat = new THREE.MeshLambertMaterial({
      color: 0xf5f9ff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    this.puffMesh = new THREE.InstancedMesh(puffGeo, this.puffMat, this.puffCount);
    this.puffs = [];
    for (let i = 0; i < this.puffCount; i++) {
      this.puffs.push({
        x: 0, y: -999, z: 0,
        vx: 0, vy: 1, vz: 0,
        age: 1.0, maxAge: 1.0,
        startScale: 0.5, endScale: 1.6
      });
    }
    this.puffCursor = 0;
    this.puffTimer = 0;
    this.root.add(this.puffMesh);
  }

  _spawnPuff(x, y, z, vx, vy, vz, maxAge = 2.4, startScale = 0.55, endScale = 1.75) {
    const p = this.puffs[this.puffCursor];
    this.puffCursor = (this.puffCursor + 1) % this.puffCount;
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.age = 0;
    p.maxAge = maxAge;
    p.startScale = startScale;
    p.endScale = endScale;
  }

  // =========================================================================
  // MAIN FRAME UPDATE & SCENIC CAMERA POSES
  // =========================================================================
  update(dt, elapsed, envState) {
    const curve = this.landmarks.trainCurve;

    // 1. Update Coastal Train along closed spline (gentle scenic slowdown past Seaside Station!)
    const leadPtCheck = curve.getPointAt(this.trainU);
    const nearStation = (leadPtCheck.z > 18 && leadPtCheck.x > -51 && leadPtCheck.x < -35);
    const speedFactor = nearStation ? 0.55 : 1.0;
    this.trainU = (this.trainU + dt * 0.028 * speedFactor) % 1.0;

    for (let i = 0; i < this.trainCars.length; i++) {
      const u = (this.trainU - i * this.carArcSpacing + 1.0) % 1.0;
      const uFront = (u + 0.005) % 1.0;
      const uBack = (u - 0.005 + 1.0) % 1.0;

      const pCenter = curve.getPointAt(u);
      const pFront = curve.getPointAt(uFront);
      const pBack = curve.getPointAt(uBack);

      const car = this.trainCars[i];
      car.position.set(pCenter.x, pCenter.y + 0.52, pCenter.z);

      const dir = pFront.clone().sub(pBack).normalize();
      car.rotation.y = Math.atan2(-dir.z, dir.x);
    }

    // Adjust train window & headlight glow with dusk/night
    const night = envState.nightAmount;
    const sunset = envState.sunsetAmount;
    this.sharedGlowMat.emissiveIntensity = 0.45 + Math.max(night, sunset * 0.85) * 1.9;
    this.trainHeadlight.intensity = (leadPtCheck.z < 5 || night > 0.25 || sunset > 0.4) ? 14.0 : 2.0;

    // 2. Level Crossing Gates lower automatically when train is on the station-crossing stretch!
    const leadPos = this.trainCars[0].position;
    const trainApproachingCrossing = (leadPos.z > 15 && leadPos.x > -52 && leadPos.x < -14);
    const targetGateAngle = trainApproachingCrossing ? 0.0 : 1.34;
    for (const gate of this.crossingGates) {
      gate.angle += (targetGateAngle - gate.angle) * Math.min(1, dt * 3.5);
      gate.armPivot.rotation.z = gate.angle * gate.sign;
    }
    if (trainApproachingCrossing) {
      const blink = Math.floor(elapsed * 4.5) % 2 === 0;
      this.blinkMatA.color.setHex(blink ? 0xff2b1f : 0x3a1010);
      this.blinkMatB.color.setHex(blink ? 0x3a1010 : 0xff2b1f);
    } else {
      this.blinkMatA.color.setHex(0x3a1010);
      this.blinkMatB.color.setHex(0x3a1010);
    }

    // 3. Spin Windmill Sails & Waterwheel
    this.windmillRotor.rotation.z = -elapsed * 0.48;
    this.waterwheel.rotation.x = elapsed * 0.85;

    // 4. Rotate Lighthouse Volumetric Beam
    this.lighthouseAngle = elapsed * 0.55;
    this.lighthouseGroup.rotation.y = -this.lighthouseAngle;
    const beamStrength = Math.max(0.0, night * 0.34 + sunset * 0.16);
    this.beamMat.opacity = beamStrength;
    this.lighthouseGroup.visible = beamStrength > 0.01;
    this.lighthousePointLight.intensity = 2.0 + night * 24.0 + sunset * 10.0;

    // 5. Drift Voxel Clouds & Tint by Sky Mood
    this.cloudMat.color.copy(envState.cloudTint);
    for (const c of this.clouds) {
      c.mesh.position.x += dt * c.speed;
      if (c.mesh.position.x > 155) c.mesh.position.x = -155;
      c.mesh.position.y = c.baseY + Math.sin(elapsed * 0.4 + c.phase) * 0.45;
    }

    // 6. Sailboats gliding & bobbing on waves
    for (const b of this.boats) {
      const ang = elapsed * b.speed + b.phase;
      const bx = b.cx + Math.cos(ang) * b.rx;
      const bz = b.cz + Math.sin(ang) * b.rz;
      const nextAng = ang + (b.speed >= 0 ? 0.05 : -0.05);
      const nx = b.cx + Math.cos(nextAng) * b.rx;
      const nz = b.cz + Math.sin(nextAng) * b.rz;

      b.group.position.set(bx, SEA_LEVEL + 0.58 + Math.sin(elapsed * 2.1 + b.phase) * 0.12, bz);
      b.group.rotation.y = Math.atan2(-(nz - bz), nx - bx);
      b.group.rotation.z = Math.sin(elapsed * 1.7 + b.phase) * 0.05;
      b.group.rotation.x = Math.cos(elapsed * 1.4 + b.phase) * 0.04;
    }

    // 7. Hot-Air Balloons gentle sky float
    for (const bl of this.balloons) {
      bl.group.position.y = bl.baseY + Math.sin(elapsed * 0.55 + bl.phase) * 2.1;
      bl.group.position.x = bl.baseX + Math.cos(elapsed * 0.22 + bl.phase) * 3.5;
      bl.group.rotation.y = elapsed * 0.12 + bl.phase;
    }

    // 8. Soaring Pixel Seagulls
    for (const g of this.gulls) {
      const a = elapsed * g.speed + g.phase;
      const gx = g.cx + Math.cos(a) * g.r;
      const gz = g.cz + Math.sin(a) * g.r * 0.78;
      const na = a + (g.speed > 0 ? 0.05 : -0.05);
      const nx = g.cx + Math.cos(na) * g.r;
      const nz = g.cz + Math.sin(na) * g.r * 0.78;

      g.group.position.set(gx, g.y + Math.sin(elapsed * 1.6 + g.phase) * 0.9, gz);
      g.group.rotation.y = Math.atan2(-(nz - gz), nx - gx);
      const flap = Math.sin(elapsed * 7.5 + g.phase * 2.0) * 0.52;
      g.wingL.rotation.x = flap;
      g.wingR.rotation.x = -flap;
    }

    // 9. Waterfall Rainbow visibility (shines in crisp daylight & sakura dawn!)
    const rainbowAlpha = Math.max(0, (1.0 - night * 1.5 - sunset * 0.45) * 0.30);
    this.rainbowMat.opacity = rainbowAlpha;
    this.rainbowGroup.visible = rainbowAlpha > 0.02;

    // 10. Update Voxel Particles
    // Sakura petals
    this.sakuraMat.color.copy(envState.petalTint);
    for (let i = 0; i < this.sakuraCount; i++) {
      const s = this.sakuraData[i];
      s.life = (s.life + dt * s.speed) % 1.0;
      const px = s.ox + Math.sin(elapsed * 1.2 + s.seed) * 2.4 + s.life * 3.8;
      const py = s.oy - s.life * 10.5;
      const pz = s.oz + Math.cos(elapsed * 1.0 + s.seed) * 2.0 + s.life * 2.2;
      this._dummy.position.set(px, py, pz);
      this._dummy.rotation.set(elapsed * 1.8 + s.seed, elapsed * 1.4, s.seed);
      const sc = Math.sin(s.life * Math.PI);
      this._dummy.scale.setScalar(0.65 + sc * 0.55);
      this._dummy.updateMatrix();
      this.sakuraMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.sakuraMesh.instanceMatrix.needsUpdate = true;

    // Night Fireflies
    const ffAlpha = Math.max(0, (night - 0.15) * 1.18 + sunset * 0.25);
    this.fireflyMat.opacity = Math.min(0.95, ffAlpha);
    this.fireflyMesh.visible = ffAlpha > 0.02;
    if (this.fireflyMesh.visible) {
      for (let i = 0; i < this.fireflyCount; i++) {
        const f = this.fireflyData[i];
        const fx = f.x + Math.sin(elapsed * 0.9 + f.seed) * 1.8;
        const fy = f.y + Math.sin(elapsed * 1.5 + f.seed * 1.3) * 1.1;
        const fz = f.z + Math.cos(elapsed * 0.85 + f.seed) * 1.8;
        const pulse = 0.45 + 0.55 * Math.max(0, Math.sin(elapsed * 3.4 + f.seed * 2.1));
        this._dummy.position.set(fx, fy, fz);
        this._dummy.rotation.set(0, 0, 0);
        this._dummy.scale.setScalar(pulse * 1.15);
        this._dummy.updateMatrix();
        this.fireflyMesh.setMatrixAt(i, this._dummy.matrix);
      }
      this.fireflyMesh.instanceMatrix.needsUpdate = true;
    }

    // Spawn Train Steam (when outside mountain tunnel!), Cottage Smoke & Waterfall Mist
    this.puffTimer += dt;
    if (this.puffTimer >= 0.11) {
      this.puffTimer = 0;

      // Train locomotive smokestack steam (only in open air z > 4)
      if (leadPos.z > 4) {
        const yaw = this.trainCars[0].rotation.y;
        const sx = leadPos.x + Math.cos(yaw) * 1.3;
        const sz = leadPos.z - Math.sin(yaw) * 1.3;
        this._spawnPuff(
          sx, leadPos.y + 3.25, sz,
          (Math.random() - 0.5) * 0.6, 2.2 + Math.random() * 0.7, (Math.random() - 0.5) * 0.6,
          2.1, 0.48, 1.85
        );
      }

      // Random cottage chimney curl
      if (this.landmarks.chimneySpots.length > 0) {
        const ch = this.landmarks.chimneySpots[Math.floor(Math.random() * this.landmarks.chimneySpots.length)];
        this._spawnPuff(
          ch.x, ch.y, ch.z,
          0.35 + (Math.random() - 0.5) * 0.3, 1.35, (Math.random() - 0.5) * 0.3,
          3.0, 0.42, 1.55
        );
      }

      // Waterfall splash mist
      const wf = this.landmarks.waterfallMistSpots[Math.floor(Math.random() * this.landmarks.waterfallMistSpots.length)];
      this._spawnPuff(
        wf.x + (Math.random() - 0.5) * 2.8, wf.y, wf.z + (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 0.8, 1.4 + Math.random() * 0.8, 0.5 + Math.random() * 0.5,
        1.5, 0.65, 1.95
      );
    }

    this.puffMat.color.copy(envState.cloudTint);
    for (let i = 0; i < this.puffCount; i++) {
      const p = this.puffs[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        this._dummy.position.set(0, -999, 0);
        this._dummy.scale.setScalar(0.001);
      } else {
        const t = p.age / p.maxAge;
        p.x += p.vx * dt;
        p.y += p.vy * dt * (1.0 - t * 0.45);
        p.z += p.vz * dt;
        this._dummy.position.set(p.x, p.y, p.z);
        this._dummy.rotation.set(t * 1.2, t * 1.6, 0);
        const sc = (p.startScale + (p.endScale - p.startScale) * t) * (1.0 - Math.pow(t, 2.5));
        this._dummy.scale.setScalar(Math.max(0.01, sc));
      }
      this._dummy.updateMatrix();
      this.puffMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.puffMesh.instanceMatrix.needsUpdate = true;
  }

  // Camera pose for "🚂 搭乘列车" mode
  getTrainCameraPose() {
    const curve = this.landmarks.trainCurve;
    const camU = (this.trainU - this.carArcSpacing * 0.85 + 1.0) % 1.0;
    const lookU = (this.trainU + 0.032) % 1.0;
    const pt = curve.getPointAt(camU);
    const lookPt = curve.getPointAt(lookU);
    const tan = curve.getTangentAt(camU);

    // Inside tunnel: tuck smoothly right above cab roof; outside: scenic window-side view overlooking bay!
    const inTunnel = pt.z < 4;
    const sideOffset = inTunnel ? 0.0 : 2.15;
    const heightOffset = inTunnel ? 3.25 : 3.65;
    // Outward normal toward the bay (+Z when moving +X)
    const outX = -tan.z;
    const outZ = tan.x;

    const pos = new THREE.Vector3(
      pt.x + outX * sideOffset,
      pt.y + heightOffset,
      pt.z + outZ * sideOffset
    );
    const target = new THREE.Vector3(
      lookPt.x + (inTunnel ? 0 : outX * 1.2),
      lookPt.y + 2.3,
      lookPt.z + (inTunnel ? 0 : outZ * 1.2)
    );
    return { pos, target };
  }

  // Camera pose for "⛵ 碧海巡航" mode (panoramic low-angle cruise across the bay looking at viaduct & peaks)
  getHarborCruisePose(elapsed) {
    const a = elapsed * 0.095;
    const pos = new THREE.Vector3(
      Math.sin(a) * 44 - 4,
      SEA_LEVEL + 6.5 + Math.sin(elapsed * 0.5) * 1.2,
      58 + Math.cos(a * 0.8) * 9
    );
    const target = new THREE.Vector3(
      Math.sin(a * 0.7) * 14 + 4,
      27.5,
      2.0
    );
    return { pos, target };
  }
}
