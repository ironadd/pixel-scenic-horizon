import { BLOCK } from '../voxel/BlockTypes.js';

export const SEA_LEVEL = 14;

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function gauss2D(x, z, cx, cz, rx, rz) {
  const dx = (x - cx) / rx;
  const dz = (z - cz) / rz;
  return Math.exp(-(dx * dx + dz * dz));
}

export function buildTerrain(world, noise) {
  const W = world.sizeX;
  const D = world.sizeZ;
  const halfX = world.halfX;
  const halfZ = world.halfZ;

  // Precompute 2D heightmap so we can inspect slope gradients cleanly
  const heights = new Float32Array(W * D);
  const riverMask = new Float32Array(W * D); // >0 inside river channel
  const riverWaterY = new Int16Array(W * D);

  const riverCenterX = (z) => {
    return 7.5 + Math.sin(z * 0.095 + 0.4) * 3.2 + Math.cos(z * 0.045) * 1.5;
  };

  for (let gz = 0; gz < D; gz++) {
    for (let gx = 0; gx < W; gx++) {
      const x = gx - halfX;
      const z = gz - halfZ;
      const idx = gz * W + gx;

      // Base gentle rolling terrain + fractal detail
      const fbmLow = noise.fbm2D(x * 0.016 + 11.3, z * 0.016 - 5.7, 4);
      const fbmDetail = noise.fbm2D(x * 0.048 - 3.1, z * 0.048 + 8.4, 3);
      const ridge = noise.ridged2D(x * 0.024 + 4.2, z * 0.024 + 2.9, 4);

      // Crescent bay peninsula base shape:
      // High land in North & West & East headlands, curving open bay in South-Central (x in [-45, 45], z > 22)
      let h = 6.5 + fbmLow * 4.0 + fbmDetail * 1.4;

      // Peninsula mainland shelf (North & Midground)
      const mainland = smoothstep(42, 10, z) * 12.5;
      h += mainland;

      // Crescent Bay scoop in South-Central so ocean sweeps gracefully inward toward viaduct & beach
      const bayScoop = gauss2D(x, z, -4, 44, 44, 24) * 12.5;
      h -= bayScoop;

      // 1. Main Sacred Snow Peak ("晴岚雪峰") at (-8, -48)
      const mainPeakEnv = gauss2D(x, z, -8, -48, 30, 23);
      const mainPeakCore = gauss2D(x, z, -8, -49, 13, 11);
      h += mainPeakEnv * (38.0 + ridge * 21.0) + mainPeakCore * (18.0 + ridge * 8.0);

      // 2. Eastern Alpine Peak ("东岭翠峰") at (+45, -40)
      const eastPeakEnv = gauss2D(x, z, 45, -40, 25, 20);
      const eastPeakCore = gauss2D(x, z, 46, -41, 11, 9.5);
      h += eastPeakEnv * (28.0 + ridge * 14.0) + eastPeakCore * 13.0;

      // 3. Western Sakura Ridge ("西岚花岭") at (-56, -28)
      const westPeakEnv = gauss2D(x, z, -56, -28, 26, 21);
      h += westPeakEnv * (24.0 + ridge * 9.0);

      // 4. West Windmill Flower Hill & Seaside Station Bluff
      h += gauss2D(x, z, -66, 6, 19, 16) * 14.5;
      h += gauss2D(x, z, -44, 16, 18, 11) * 8.5;

      // 5. East Lighthouse Cape Headland ("望海灯塔山岬") jutting Southeast!
      const capeEnv = gauss2D(x, z, 63, 24, 21, 24);
      const capeTip = gauss2D(x, z, 67, 38, 12, 11);
      // Steepen cliff edge on the cape for dramatic coastal chalk cliffs
      const capePlateau = Math.min(1.0, (capeEnv * 1.25 + capeTip * 1.15));
      h += Math.pow(capePlateau, 0.78) * 19.5;

      // 6. Offshore Reef Islet ("海中鸟居礁屿") at (+28, +56)
      const islet = gauss2D(x, z, 28, 56, 7.5, 6.5);
      if (islet > 0.12) {
        h = Math.max(h, 6.0 + islet * 13.5 + fbmDetail * 1.2);
      }

      // 7. Secondary small Western Sea Stack at (-58, +48)
      const westStack = gauss2D(x, z, -58, 48, 5.5, 5.0);
      if (westStack > 0.15) {
        h = Math.max(h, 6.0 + westStack * 12.0);
      }

      // 8. Golden-Lime Stepped Terraced Fields ("阳光梯田") at x in [-37, -11], z in [-20, 4]
      const terraceWeight = gauss2D(x, z, -24, -8, 14, 12);
      if (terraceWeight > 0.28 && h > 16.5 && h < 33.0) {
        const stepped = Math.round(h / 2.0) * 2.0;
        h = h * (1 - terraceWeight * 0.85) + stepped * (terraceWeight * 0.85);
      }

      // 9. Smooth Flat Pads for key architectural landmarks
      // Seaside Station platform pad (-44, +18) -> Y = 23
      const stationPad = gauss2D(x, z, -44, 17, 11, 5.5);
      if (stationPad > 0.35) {
        const w = smoothstep(0.35, 0.78, stationPad);
        h = h * (1 - w) + 23.0 * w;
      }

      // Lighthouse summit pad (+67, +38) -> Y = 30
      const lhPad = gauss2D(x, z, 67, 38, 7.5, 7.0);
      if (lhPad > 0.35) {
        const w = smoothstep(0.35, 0.8, lhPad);
        h = h * (1 - w) + 30.0 * w;
      }

      // Keeper's cottage pad (+56, +27) -> Y = 28
      const keeperPad = gauss2D(x, z, 56, 27, 6.5, 6.0);
      if (keeperPad > 0.4) {
        const w = smoothstep(0.4, 0.82, keeperPad);
        h = h * (1 - w) + 28.0 * w;
      }

      // Windmill hill pad (-66, +6) -> Y = 27
      const millPad = gauss2D(x, z, -66, 6, 7.0, 6.5);
      if (millPad > 0.38) {
        const w = smoothstep(0.38, 0.82, millPad);
        h = h * (1 - w) + 27.0 * w;
      }

      // Waterwheel Mill cottage pad (+21, -5) -> Y = 21
      const waterMillPad = gauss2D(x, z, 21, -5, 6.8, 6.2);
      if (waterMillPad > 0.38) {
        const w = smoothstep(0.38, 0.82, waterMillPad);
        h = h * (1 - w) + 21.0 * w;
      }

      // Hilltop Gazebo pad (-54, -17) -> Y = 36
      const gazeboPad = gauss2D(x, z, -54, -17, 5.5, 5.5);
      if (gazeboPad > 0.4) {
        const w = smoothstep(0.4, 0.85, gazeboPad);
        h = h * (1 - w) + 36.0 * w;
      }

      // 10. Carve Central Alpine Glacier Pool, Triple Waterfall & River Gorge!
      if (z >= -38 && z <= 30) {
        const rcx = riverCenterX(z);
        let halfWidth = 2.8;
        // Widen at Glacier Pool (z ~ -33), Upper Pool (z ~ -22), and Emerald Mill Pond (z ~ -7)
        const glacierPool = gauss2D(x, z, rcx, -33, 6.5, 4.5);
        const upperPool = gauss2D(x, z, rcx, -22, 5.2, 3.6);
        const millPond = gauss2D(x, z, rcx + 1.0, -7, 7.8, 6.2);

        if (glacierPool > 0.25) halfWidth = Math.max(halfWidth, 6.2 * glacierPool + 2.2);
        if (upperPool > 0.25) halfWidth = Math.max(halfWidth, 5.0 * upperPool + 2.0);
        if (millPond > 0.22) halfWidth = Math.max(halfWidth, 7.5 * millPond + 2.4);
        if (z > 16) halfWidth += (z - 16) * 0.35; // Estuary widens into bay

        const distR = Math.abs(x - rcx);
        if (distR < halfWidth + 4.5) {
          // Target water surface profile along Z (3-tier cascade!)
          let wy = SEA_LEVEL;
          if (z < -28) {
            wy = 44; // High alpine glacier pool
          } else if (z < -25) {
            // Waterfall Tier 1 plunge (44 -> 32)
            const t = (z - (-28)) / 3.0;
            wy = Math.round(44 * (1 - t) + 32 * t);
          } else if (z < -18) {
            wy = 32; // Upper mountain pool
          } else if (z < -14) {
            // Waterfall Tier 2 plunge (32 -> 20)
            const t = (z - (-18)) / 4.0;
            wy = Math.round(32 * (1 - t) + 20 * t);
          } else if (z < -1) {
            wy = 20; // Emerald Mill Pond
          } else if (z < 12) {
            // Gentle stepped valley rapids (20 -> 16)
            const t = (z - (-1)) / 13.0;
            wy = Math.round(20 * (1 - t) + 16 * t);
          } else if (z < 21) {
            wy = 15;
          } else {
            wy = SEA_LEVEL;
          }

          if (distR <= halfWidth) {
            const bedDepth = (millPond > 0.35 || glacierPool > 0.35) ? 3.2 : 2.2;
            const carvedBed = wy - bedDepth;
            if (h > carvedBed) {
              h = carvedBed;
            }
            riverMask[idx] = 1.0 - (distR / (halfWidth + 0.5));
            riverWaterY[idx] = wy;
          } else {
            // Smooth valley bank blend
            const bankT = smoothstep(halfWidth, halfWidth + 4.5, distR);
            const bankTarget = wy + 1.2;
            if (h > bankTarget) {
              h = bankTarget * (1 - bankT) + h * bankT;
            }
          }
        }
      }

      // 11. Outer Peninsula Border Falloff -> guarantees natural island/peninsula shoreline on all 4 sides!
      const marginX = Math.min(gx, W - 1 - gx);
      const marginNorth = gz;
      const marginSouth = D - 1 - gz;
      const edgeDist = Math.min(marginX, marginNorth * 1.15, marginSouth);
      if (edgeDist < 16) {
        const oceanFloor = 4.5 + fbmDetail * 1.2;
        const t = smoothstep(2, 16, edgeDist);
        h = oceanFloor * (1 - t) + h * t;
      }

      heights[idx] = Math.max(2, Math.min(world.sizeY - 6, h));
    }
  }

  // Populate Voxel Grid from heightmap, local slope, biome zones, and river cascades
  for (let gz = 0; gz < D; gz++) {
    for (let gx = 0; gx < W; gx++) {
      const x = gx - halfX;
      const z = gz - halfZ;
      const idx = gz * W + gx;

      const hFloat = heights[idx];
      const topY = Math.floor(hFloat);

      // Local slope gradient for cliff rock exposure
      const hL = heights[gz * W + Math.max(0, gx - 1)];
      const hR = heights[gz * W + Math.min(W - 1, gx + 1)];
      const hD = heights[Math.max(0, gz - 1) * W + gx];
      const hU = heights[Math.min(D - 1, gz + 1) * W + gx];
      const slope = Math.hypot((hR - hL) * 0.5, (hU - hD) * 0.5);

      const nVar = noise.hash2(x, z);
      const snowLine = 49 + Math.floor(noise.fbm2D(x * 0.08, z * 0.08, 2) * 5.0);
      const isEastCape = (x > 40 && z > 2);
      const isTerraceZone = gauss2D(x, z, -24, -8, 13.5, 11.5) > 0.3 && topY >= 17 && topY <= 32;
      const isBeachZone = (z > 16 && x > -56 && x < 44);

      for (let y = 0; y <= topY; y++) {
        let blockId = BLOCK.STONE;

        if (y === 0) {
          blockId = BLOCK.DARK_STONE;
        } else if (y < topY - 3) {
          blockId = (y > 38 && nVar > 0.5) ? BLOCK.DARK_STONE : BLOCK.STONE;
        } else if (y < topY) {
          // Subsurface layer (3 blocks deep)
          if (topY >= snowLine) {
            blockId = slope > 1.3 ? BLOCK.DARK_STONE : BLOCK.STONE;
          } else if (slope > 1.35) {
            blockId = isEastCape ? BLOCK.CHALK_CLIFF : BLOCK.STONE;
          } else if (topY <= SEA_LEVEL + 2 && isBeachZone) {
            blockId = BLOCK.SAND;
          } else {
            blockId = BLOCK.DIRT;
          }
        } else {
          // Surface block (y === topY)
          if (riverMask[idx] > 0 && topY < riverWaterY[idx]) {
            blockId = (nVar > 0.45) ? BLOCK.MOSS_STONE : BLOCK.STONE;
          } else if (topY < SEA_LEVEL - 1) {
            // Seabed
            blockId = (nVar > 0.2) ? BLOCK.SAND : BLOCK.WET_SAND;
          } else if (topY <= SEA_LEVEL) {
            blockId = isEastCape && slope > 1.1 ? BLOCK.CHALK_CLIFF : BLOCK.WET_SAND;
          } else if (topY <= SEA_LEVEL + 2 && (isBeachZone || slope < 0.85)) {
            blockId = BLOCK.SAND;
          } else if (topY >= snowLine) {
            if (slope > 1.65) {
              blockId = BLOCK.DARK_STONE;
            } else if (slope > 1.15) {
              blockId = BLOCK.SNOW_STONE;
            } else if (nVar > 0.88 && topY < snowLine + 14 && Math.abs(x + 2) < 16) {
              blockId = BLOCK.ICE_GLACIER;
            } else {
              blockId = BLOCK.SNOW;
            }
          } else if (slope > 1.32) {
            // Exposed scenic cliffs! Chalk limestone on East Cape, mossy stone near river, slate on peaks
            if (isEastCape) {
              blockId = BLOCK.CHALK_CLIFF;
            } else if (Math.abs(x - riverCenterX(z)) < 11 && topY < 38) {
              blockId = nVar > 0.4 ? BLOCK.MOSS_STONE : BLOCK.STONE;
            } else {
              blockId = nVar > 0.65 ? BLOCK.DARK_STONE : BLOCK.STONE;
            }
          } else if (isTerraceZone) {
            blockId = (slope > 0.75) ? BLOCK.MOSS_STONE : BLOCK.TERRACE_GRASS;
          } else if (topY > 36) {
            blockId = nVar > 0.35 ? BLOCK.LUSH_GRASS : BLOCK.MOSS_STONE;
          } else {
            blockId = nVar > 0.6 ? BLOCK.LUSH_GRASS : BLOCK.GRASS;
          }
        }

        world.set(x, y, z, blockId);
      }

      // Fill River, Pools & Waterfall Cascades above SEA_LEVEL
      if (riverMask[idx] > 0) {
        const wy = riverWaterY[idx];
        if (wy > SEA_LEVEL && wy > topY) {
          const isWaterfallSteep = (z >= -29 && z <= -24) || (z >= -19 && z <= -13);
          for (let y = topY + 1; y <= wy; y++) {
            if (isWaterfallSteep && (y === wy || nVar > 0.45)) {
              world.set(x, y, z, BLOCK.WATER_FOAM);
            } else if ((z === -24 || z === -13) && y === wy) {
              // Splash foam ring at waterfall base!
              world.set(x, y, z, BLOCK.WATER_FOAM);
            } else {
              world.set(x, y, z, BLOCK.RIVER_WATER);
            }
          }
        }
      }

      // Underwater Coral Reefs & Sea Kelp in the shallow crystal bay!
      if (topY >= 7 && topY <= SEA_LEVEL - 2 && z > 20 && z < 66) {
        if (nVar > 0.965) {
          world.set(x, topY + 1, z, BLOCK.CORAL_PINK);
        } else if (nVar > 0.935 && nVar <= 0.965) {
          world.set(x, topY + 1, z, BLOCK.CORAL_CYAN);
        } else if (nVar > 0.89 && nVar <= 0.915) {
          const kh = 1 + (nVar > 0.905 ? 1 : 0);
          for (let ky = 1; ky <= kh; ky++) {
            if (topY + ky < SEA_LEVEL) world.set(x, topY + ky, z, BLOCK.KELP_GREEN);
          }
        }
      }
    }
  }

  return { heights, riverCenterX };
}
