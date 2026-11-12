import * as THREE from 'three';
import { BLOCK, BLOCK_INFO, isTranslucentBlock, isEmissiveBlock } from './BlockTypes.js';
import { getTileUVRect } from './PixelTextures.js';

const FACES = [
  { // +Y (top)
    dir: [0, 1, 0], faceSlot: 0, shade: 1.0,
    verts: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]]
  },
  { // -Y (bottom)
    dir: [0, -1, 0], faceSlot: 2, shade: 0.62,
    verts: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]
  },
  { // +X (east)
    dir: [1, 0, 0], faceSlot: 1, shade: 0.86,
    verts: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]]
  },
  { // -X (west)
    dir: [-1, 0, 0], faceSlot: 1, shade: 0.80,
    verts: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]
  },
  { // +Z (south / coastal front)
    dir: [0, 0, 1], faceSlot: 1, shade: 0.93,
    verts: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]
  },
  { // -Z (north)
    dir: [0, 0, -1], faceSlot: 1, shade: 0.76,
    verts: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]
  }
];

const AO_CURVE = [0.46, 0.66, 0.84, 1.0];

export class VoxelWorld {
  constructor(sizeX = 192, sizeY = 96, sizeZ = 160) {
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.sizeZ = sizeZ;
    this.halfX = Math.floor(sizeX / 2);
    this.halfZ = Math.floor(sizeZ / 2);
    this.data = new Uint8Array(sizeX * sizeY * sizeZ);
    this.voxelCount = 0;
  }

  // World coords (wx, wy, wz) -> Grid coords (gx, gy, gz)
  inBoundsGrid(gx, gy, gz) {
    return gx >= 0 && gx < this.sizeX && gy >= 0 && gy < this.sizeY && gz >= 0 && gz < this.sizeZ;
  }

  indexGrid(gx, gy, gz) {
    return (gy * this.sizeZ + gz) * this.sizeX + gx;
  }

  set(wx, wy, wz, id) {
    const gx = (wx | 0) + this.halfX;
    const gy = wy | 0;
    const gz = (wz | 0) + this.halfZ;
    if (!this.inBoundsGrid(gx, gy, gz)) return;
    this.data[this.indexGrid(gx, gy, gz)] = id;
  }

  get(wx, wy, wz) {
    const gx = (wx | 0) + this.halfX;
    const gy = wy | 0;
    const gz = (wz | 0) + this.halfZ;
    if (!this.inBoundsGrid(gx, gy, gz)) return BLOCK.AIR;
    return this.data[this.indexGrid(gx, gy, gz)];
  }

  getGrid(gx, gy, gz) {
    if (!this.inBoundsGrid(gx, gy, gz)) return BLOCK.AIR;
    return this.data[this.indexGrid(gx, gy, gz)];
  }

  fillBox(x0, y0, z0, x1, y1, z1, id) {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1);
    const ay = Math.min(y0, y1), by = Math.max(y0, y1);
    const az = Math.min(z0, z1), bz = Math.max(z0, z1);
    for (let y = ay; y <= by; y++) {
      for (let z = az; z <= bz; z++) {
        for (let x = ax; x <= bx; x++) {
          this.set(x, y, z, id);
        }
      }
    }
  }

  isOccluderGrid(gx, gy, gz) {
    const id = this.getGrid(gx, gy, gz);
    if (id === BLOCK.AIR) return false;
    return !isTranslucentBlock(id);
  }

  vertexAO(gx, gy, gz, nx, ny, nz, vx, vy, vz) {
    const sx = vx ? 1 : -1;
    const sy = vy ? 1 : -1;
    const sz = vz ? 1 : -1;

    let s1 = false, s2 = false, c = false;
    if (ny !== 0) {
      s1 = this.isOccluderGrid(gx + sx, gy + ny, gz);
      s2 = this.isOccluderGrid(gx, gy + ny, gz + sz);
      c = this.isOccluderGrid(gx + sx, gy + ny, gz + sz);
    } else if (nx !== 0) {
      s1 = this.isOccluderGrid(gx + nx, gy + sy, gz);
      s2 = this.isOccluderGrid(gx + nx, gy, gz + sz);
      c = this.isOccluderGrid(gx + nx, gy + sy, gz + sz);
    } else {
      s1 = this.isOccluderGrid(gx + sx, gy, gz + nz);
      s2 = this.isOccluderGrid(gx, gy + sy, gz + nz);
      c = this.isOccluderGrid(gx + sx, gy + sy, gz + nz);
    }

    if (s1 && s2) return AO_CURVE[0];
    const occ = (s1 ? 1 : 0) + (s2 ? 1 : 0) + (c ? 1 : 0);
    return AO_CURVE[3 - occ];
  }

  // Returns terrain surface Y ignoring elevated bridges/trees when scanning near ground, or top solid block
  getGroundY(wx, wz, maxScanY = this.sizeY - 1) {
    const gx = (wx | 0) + this.halfX;
    const gz = (wz | 0) + this.halfZ;
    if (gx < 0 || gx >= this.sizeX || gz < 0 || gz >= this.sizeZ) return 0;
    for (let gy = Math.min(this.sizeY - 1, maxScanY); gy >= 0; gy--) {
      const id = this.data[this.indexGrid(gx, gy, gz)];
      if (id !== BLOCK.AIR && !isTranslucentBlock(id)) {
        return gy;
      }
    }
    return 0;
  }

  // Build DataTexture encoding water depth around seaLevel so waves wrap piers/beaches but flow under bridges
  buildShoreDepthTexture(seaLevel = 14) {
    const texData = new Uint8Array(this.sizeX * this.sizeZ * 4);
    for (let gz = 0; gz < this.sizeZ; gz++) {
      for (let gx = 0; gx < this.sizeX; gx++) {
        // Scan from seaLevel + 1 downward to find seabed or shoreline obstacle right at the waterline
        let floorY = 2;
        for (let gy = seaLevel + 1; gy >= 0; gy--) {
          const id = this.data[this.indexGrid(gx, gy, gz)];
          if (id !== BLOCK.AIR && id !== BLOCK.RIVER_WATER && id !== BLOCK.WATER_FOAM && id !== BLOCK.GLASS_CLEAR) {
            floorY = gy;
            break;
          }
        }

        // Smooth edge taper near outer 6-voxel border so grid blends seamlessly into infinite ocean
        const edgeDist = Math.min(gx, this.sizeX - 1 - gx, gz, this.sizeZ - 1 - gz);
        if (edgeDist < 6) {
          const t = edgeDist / 6.0;
          floorY = Math.round(floorY * t + 3 * (1.0 - t));
        }

        const depth = Math.max(0, seaLevel - floorY); // 0 = dry land / pier at waterline, 1..12 = water depth
        const normDepth = Math.min(255, Math.round((depth / 12.0) * 255));
        const idx = (gz * this.sizeX + gx) * 4;
        texData[idx] = normDepth;
        texData[idx + 1] = floorY * 2;
        texData[idx + 2] = 0;
        texData[idx + 3] = 255;
      }
    }

    const tex = new THREE.DataTexture(texData, this.sizeX, this.sizeZ, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  buildMeshes(atlasTexture) {
    const CHUNK = 32;
    const group = new THREE.Group();
    group.name = 'VoxelLandscape';

    const solidMat = new THREE.MeshStandardMaterial({
      map: atlasTexture,
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.03
    });

    const emissiveMat = new THREE.MeshStandardMaterial({
      map: atlasTexture,
      emissiveMap: atlasTexture,
      emissive: new THREE.Color(0xffbe66),
      emissiveIntensity: 0.9,
      roughness: 0.45,
      metalness: 0.05
    });

    const transMat = new THREE.MeshStandardMaterial({
      map: atlasTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.84,
      roughness: 0.16,
      metalness: 0.08,
      depthWrite: false
    });

    let totalVoxels = 0;

    const createCollector = () => ({
      pos: [],
      norm: [],
      uv: [],
      col: [],
      idx: [],
      vertCount: 0
    });

    const makeMesh = (buf, mat, castShadow, receiveShadow, renderOrder = 0) => {
      if (buf.vertCount === 0) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(buf.norm, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
      geo.setIndex(buf.idx);
      geo.computeBoundingSphere();

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      mesh.renderOrder = renderOrder;
      return mesh;
    };

    const chunksX = Math.ceil(this.sizeX / CHUNK);
    const chunksZ = Math.ceil(this.sizeZ / CHUNK);

    const uvCache = new Array(64);
    const getUV = (tileId) => {
      if (!uvCache[tileId]) uvCache[tileId] = getTileUVRect(tileId);
      return uvCache[tileId];
    };

    for (let cz = 0; cz < chunksZ; cz++) {
      for (let cx = 0; cx < chunksX; cx++) {
        const solidBuf = createCollector();
        const emissiveBuf = createCollector();
        const transBuf = createCollector();

        const xStart = cx * CHUNK;
        const xEnd = Math.min(this.sizeX, xStart + CHUNK);
        const zStart = cz * CHUNK;
        const zEnd = Math.min(this.sizeZ, zStart + CHUNK);

        for (let gy = 0; gy < this.sizeY; gy++) {
          for (let gz = zStart; gz < zEnd; gz++) {
            for (let gx = xStart; gx < xEnd; gx++) {
              const id = this.data[this.indexGrid(gx, gy, gz)];
              if (id === BLOCK.AIR) continue;

              // Skip bottom bedrock face at gy=0 unless exposed
              totalVoxels++;

              const info = BLOCK_INFO[id];
              if (!info) continue;

              const isTrans = !!info.translucent;
              const isEmis = !!info.emissive;
              const target = isTrans ? transBuf : (isEmis ? emissiveBuf : solidBuf);

              const wx = gx - this.halfX;
              const wy = gy;
              const wz = gz - this.halfZ;

              for (let f = 0; f < 6; f++) {
                const face = FACES[f];
                const [nx, ny, nz] = face.dir;
                if (gy === 0 && ny === -1) continue;

                const nId = this.getGrid(gx + nx, gy + ny, gz + nz);
                if (isTrans) {
                  // Cull between identical translucent blocks or against opaque blocks
                  if (nId === id) continue;
                  if (nId !== BLOCK.AIR && !isTranslucentBlock(nId)) continue;
                } else {
                  if (nId !== BLOCK.AIR && !isTranslucentBlock(nId)) continue;
                }

                const tileId = info.faces[face.faceSlot];
                const { u0, v0, u1, v1 } = getUV(tileId);
                const faceUVs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

                const base = target.vertCount;
                const aos = [1, 1, 1, 1];

                for (let vi = 0; vi < 4; vi++) {
                  const [vx, vy, vz] = face.verts[vi];
                  target.pos.push(wx + vx, wy + vy, wz + vz);
                  target.norm.push(nx, ny, nz);
                  target.uv.push(faceUVs[vi][0], faceUVs[vi][1]);

                  let ao = 1.0;
                  if (!isEmis && !isTrans && !info.noAO) {
                    ao = this.vertexAO(gx, gy, gz, nx, ny, nz, vx, vy, vz);
                  }
                  aos[vi] = ao;

                  const light = isEmis ? 1.0 : face.shade * ao;
                  // Subtle cool-blue sky fill in deeper AO crevices so shadows stay painterly, never muddy
                  const r = light * (0.97 + 0.03 * ao);
                  const g = light * (0.98 + 0.02 * ao);
                  const b = light * (1.03 - 0.03 * ao);
                  target.col.push(r, g, b);
                }

                // Flip quad diagonal according to AO to avoid shading artifacts
                if (aos[0] + aos[2] > aos[1] + aos[3]) {
                  target.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
                } else {
                  target.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
                }
                target.vertCount += 4;
              }
            }
          }
        }

        const sm = makeMesh(solidBuf, solidMat, true, true, 0);
        if (sm) group.add(sm);
        const em = makeMesh(emissiveBuf, emissiveMat, true, false, 0);
        if (em) group.add(em);
        const tm = makeMesh(transBuf, transMat, false, false, 2);
        if (tm) group.add(tm);
      }
    }

    this.voxelCount = totalVoxels;
    return {
      group,
      materials: { solidMat, emissiveMat, transMat },
      voxelCount: totalVoxels
    };
  }
}
