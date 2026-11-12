import * as THREE from 'three';
import { BLOCK, isTranslucentBlock } from '../voxel/BlockTypes.js';
import { SEA_LEVEL } from './TerrainBuilder.js';

export function buildStructures(world, noise) {
  const chimneySpots = [];
  const sakuraSpots = [];
  const waterfallMistSpots = [
    new THREE.Vector3(7.5, 33.0, -25.0),
    new THREE.Vector3(8.0, 21.0, -14.0),
    new THREE.Vector3(6.0, 21.0, -13.5),
    new THREE.Vector3(9.5, 21.0, -13.5)
  ];

  // =========================================================================
  // 1. CLOSED-LOOP COASTAL RAILWAY, TUNNELS & GRAND 6-ARCH STONE VIADUCT
  // =========================================================================
  const RAIL_Y = 24;

  // Control points form a smooth closed loop:
  // Straight panoramic coastal run along z=20 from x=-54 to x=+42, then smooth mountain tunnel return!
  const curvePoints = [
    new THREE.Vector3(-54, RAIL_Y, 20),
    new THREE.Vector3(-38, RAIL_Y, 20),
    new THREE.Vector3(-20, RAIL_Y, 20),
    new THREE.Vector3(0,   RAIL_Y, 20),
    new THREE.Vector3(20,  RAIL_Y, 20),
    new THREE.Vector3(40,  RAIL_Y, 20),
    new THREE.Vector3(53,  RAIL_Y, 15),
    new THREE.Vector3(59,  RAIL_Y, 2),
    new THREE.Vector3(57,  RAIL_Y, -18),
    new THREE.Vector3(38,  RAIL_Y, -37),
    new THREE.Vector3(6,   RAIL_Y, -44),
    new THREE.Vector3(-28, RAIL_Y, -41),
    new THREE.Vector3(-54, RAIL_Y, -28),
    new THREE.Vector3(-64, RAIL_Y, -8),
    new THREE.Vector3(-63, RAIL_Y, 11)
  ];

  const trainCurve = new THREE.CatmullRomCurve3(curvePoints, true, 'centripetal', 0.35);

  // Carve interior mountain tunnels & lay continuous railway roadbed!
  const samples = 720;
  for (let i = 0; i < samples; i++) {
    const u = i / samples;
    const pt = trainCurve.getPointAt(u);
    const tan = trainCurve.getTangentAt(u);
    const perpX = -tan.z;
    const perpZ = tan.x;

    const cx = Math.round(pt.x);
    const cz = Math.round(pt.z);

    // Determine if inside mountain mass (ground prior to carving is significantly above RAIL_Y + 3)
    const naturalTop = world.getGroundY(cx, cz, world.sizeY - 1);
    const inMountain = (pt.z < 6 && naturalTop > RAIL_Y + 4);

    if (inMountain) {
      // Carve a lined stone tunnel (width 5, height 5) so Ride-Train camera travels cleanly inside!
      for (let w = -3; w <= 3; w++) {
        const tx = Math.round(pt.x + perpX * w);
        const tz = Math.round(pt.z + perpZ * w);
        for (let dy = 0; dy <= 6; dy++) {
          const ty = RAIL_Y + dy;
          const isShell = Math.abs(w) === 3 || dy === 6 || (Math.abs(w) === 2 && dy === 5);
          if (isShell) {
            if (world.get(tx, ty, tz) !== BLOCK.AIR) {
              world.set(tx, ty, tz, BLOCK.DARK_STONE);
            }
          } else if (dy >= 1) {
            world.set(tx, ty, tz, BLOCK.AIR);
          }
        }
      }
      // Occasional warm tunnel wall lamp every ~26 steps
      if (i % 26 === 0) {
        const lx = Math.round(pt.x + perpX * 2);
        const lz = Math.round(pt.z + perpZ * 2);
        world.set(lx, RAIL_Y + 3, lz, BLOCK.LANTERN_GOLD);
      }
    } else {
      // Clear any stray blocks right above open-air track
      for (let w = -2; w <= 2; w++) {
        const tx = Math.round(pt.x + perpX * w);
        const tz = Math.round(pt.z + perpZ * w);
        for (let dy = 1; dy <= 5; dy++) {
          world.set(tx, RAIL_Y + dy, tz, BLOCK.AIR);
        }
      }
    }

    // Lay track roadbed (3 blocks wide) & support embankment outside the Viaduct span
    const isViaductSpan = (pt.z > 17.5 && pt.x >= -24 && pt.x <= 36);
    for (let w = -1; w <= 1; w++) {
      const rx = Math.round(pt.x + perpX * w);
      const rz = Math.round(pt.z + perpZ * w);
      world.set(rx, RAIL_Y, rz, w === 0 ? BLOCK.RAIL_BED : BLOCK.VIADUCT_TRIM);

      if (!isViaductSpan) {
        // Solid stone masonry embankment down to terrain
        for (let y = RAIL_Y - 1; y >= 4; y--) {
          const cur = world.get(rx, y, rz);
          if (cur !== BLOCK.AIR && !isTranslucentBlock(cur)) break;
          world.set(rx, y, rz, BLOCK.VIADUCT_STONE);
        }
      }
    }
  }

  // Sculpt Architectural Stone Tunnel Portals where train enters/exits mountains!
  buildTunnelPortal(world, 59, RAIL_Y, 4, 'Z');   // East Mountain Portal
  buildTunnelPortal(world, -64, RAIL_Y, -3, 'Z'); // West Sakura Portal

  // Build the Grand 6-Arch Coastal Stone Viaduct (x = -24 .. +36, z = 18 .. 22)
  // Piers at -24, -14, -4, +6, +16, +26, +36 -> River at x~11 flows cleanly under central arch [+6..+16]!
  for (let x = -25; x <= 37; x++) {
    // Clear track corridor above deck
    for (let z = 19; z <= 21; z++) {
      world.set(x, RAIL_Y, z, z === 20 ? BLOCK.RAIL_BED : BLOCK.VIADUCT_TRIM);
      world.set(x, RAIL_Y - 1, z, BLOCK.VIADUCT_STONE);
    }

    // Cornice & low stone parapet on z=18 and z=22
    for (const pz of [18, 22]) {
      world.set(x, RAIL_Y - 1, pz, BLOCK.VIADUCT_TRIM);
      world.set(x, RAIL_Y, pz, BLOCK.VIADUCT_STONE);
      // Crenelated / open balustrade feel so train wheels & body stay visible
      if (x % 2 === 0) {
        world.set(x, RAIL_Y + 1, pz, BLOCK.VIADUCT_TRIM);
      }
    }

    // Semicircular Stone Arches & Piers!
    if (x >= -24 && x <= 36) {
      const localX = ((x + 24) % 10); // 0..9, pier center at 0 (and 36)
      const distFromArchCenter = Math.abs(localX - 5); // 0 at arch crown, 5 at pier center
      const isPier = (localX <= 1 || localX >= 9 || x === -24 || x === 36);

      // Arch intrados height (semicircle radius ~4.2)
      const archRise = Math.sqrt(Math.max(0, 18.5 - distFromArchCenter * distFromArchCenter));
      const archCeilingY = Math.round((RAIL_Y - 6) + archRise);

      for (let z = 18; z <= 22; z++) {
        const isOuterFace = (z === 18 || z === 22);
        for (let y = RAIL_Y - 2; y >= 5; y--) {
          if (!isPier && y < archCeilingY) continue; // Open arch!

          const existing = world.get(x, y, z);
          if (y < 10 && existing !== BLOCK.AIR && !isTranslucentBlock(existing)) continue;

          if (y <= SEA_LEVEL + 1 && (x + y + z) % 5 === 0) {
            world.set(x, y, z, BLOCK.MOSS_STONE); // Sea moss at waterline
          } else if (isOuterFace && !isPier && y === archCeilingY) {
            world.set(x, y, z, BLOCK.VIADUCT_TRIM); // Arch voussoir ring highlight
          } else {
            world.set(x, y, z, BLOCK.VIADUCT_STONE);
          }
        }
      }

      // Pier cutwater buttresses & vintage viaduct streetlamps at every pier!
      if (localX === 0 || x === 36) {
        for (const bz of [17, 23]) {
          for (let y = RAIL_Y - 1; y >= 8; y--) {
            world.set(x, y, bz, y === RAIL_Y - 1 ? BLOCK.VIADUCT_TRIM : BLOCK.VIADUCT_STONE);
          }
        }
        // Cast-iron lamp posts along viaduct piers
        for (const lz of [18, 22]) {
          world.set(x, RAIL_Y + 1, lz, BLOCK.VIADUCT_TRIM);
          world.set(x, RAIL_Y + 2, lz, BLOCK.WOOD_DARK);
          world.set(x, RAIL_Y + 3, lz, BLOCK.WOOD_DARK);
          world.set(x, RAIL_Y + 4, lz, BLOCK.LANTERN_GOLD);
        }
      }
    }
  }

  // =========================================================================
  // 2. SEASIDE SAKURA STATION ("晴岚海滨站") & BEACH LEVEL CROSSING
  // =========================================================================
  buildSeasideStation(world);

  // Level Crossing & Cobblestone Path from Station/Village down to Golden Crescent Beach (x = -30..-29)
  const crossingX = -30;
  for (let z = 10; z <= 33; z++) {
    for (let dx = 0; dx <= 1; dx++) {
      const px = crossingX + dx;
      if (z >= 19 && z <= 21) {
        // Wooden plank crossing flush across the rails!
        world.set(px, RAIL_Y, z, z === 20 ? BLOCK.RAIL_BED : BLOCK.WOOD_OAK);
        continue;
      }
      const gy = world.getGroundY(px, z, RAIL_Y + 1);
      if (gy >= SEA_LEVEL) {
        world.set(px, gy, z, BLOCK.COBBLESTONE);
      }
    }
  }
  // Stepped stone stairs connecting RAIL_Y (z=22) smoothly down to beach (z=29)
  for (let step = 0; step < 7; step++) {
    const sz = 22 + step;
    const sy = Math.max(SEA_LEVEL + 1, RAIL_Y - 1 - step);
    for (let dx = -1; dx <= 2; dx++) {
      const px = crossingX + dx;
      for (let y = sy; y >= 12; y--) {
        world.set(px, y, sz, (dx === -1 || dx === 2) ? BLOCK.VIADUCT_STONE : BLOCK.COBBLESTONE);
      }
      for (let cy = sy + 1; cy <= sy + 4; cy++) {
        world.set(px, cy, sz, BLOCK.AIR);
      }
    }
  }

  // =========================================================================
  // 3. EAST CAPE RED-AND-WHITE LIGHTHOUSE ("望海灯塔") & KEEPER'S COTTAGE
  // =========================================================================
  const lighthouseBeaconPos = buildLighthouse(world, 67, 30, 38);
  buildCottage(world, 56, 28, 27, 7, 6, BLOCK.ROOF_TERRACOTTA, true, chimneySpots);

  // Winding cliffside path & white birch coastal fence from Keeper's Cottage to Lighthouse
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const px = Math.round(56 * (1 - t) + 65 * t);
    const pz = Math.round(30 * (1 - t) + 36 * t);
    const gy = world.getGroundY(px, pz, 34);
    if (gy >= 24) {
      world.set(px, gy, pz, BLOCK.COBBLESTONE);
      world.set(px + 1, gy, pz, BLOCK.COBBLESTONE);
      if (i % 3 === 0) {
        const fy = world.getGroundY(px - 2, pz, 34);
        if (fy >= 24) {
          world.set(px - 2, fy + 1, pz, BLOCK.LIGHTHOUSE_WHITE);
        }
      }
    }
  }

  // =========================================================================
  // 4. CENTRAL VALLEY WATERWHEEL MILL, RED ARCH BRIDGE & COZY COTTAGES
  // =========================================================================
  // Waterwheel Mill beside the Emerald Mill Pond
  buildCottage(world, 21, 21, -5, 8, 7, BLOCK.ROOF_TERRACOTTA, true, chimneySpots);
  // Stone mill-race wall facing the pond on x=17
  world.fillBox(17, 17, -8, 17, 22, -2, BLOCK.MOSS_STONE);
  world.set(17, 21, -5, BLOCK.WOOD_DARK); // Axle bearing block
  const waterwheelHubPos = new THREE.Vector3(16.2, 21.2, -5.0);

  // Second Valley Cottage on West Blossom Slope & Northeast Autumn Cottage
  buildCottage(world, -17, 21, -3, 7, 6, BLOCK.ROOF_BLUE, true, chimneySpots);
  buildCottage(world, 29, 25, -15, 7, 6, BLOCK.ROOF_TERRACOTTA, true, chimneySpots);

  // Traditional Red Wooden Arch Footbridge ("朱红溪桥") across valley stream at z = 5
  buildRedArchBridge(world, 4, 16, 5, 19);

  // Hilltop Wooden Observatory Gazebo ("观海亭") on West Sakura Ridge
  buildGazebo(world, -54, 36, -17);

  // =========================================================================
  // 5. WEST FLOWER HILL DUTCH WINDMILL ("花田大风车")
  // =========================================================================
  const windmillHubPos = buildWindmill(world, -66, 27, 6);

  // =========================================================================
  // 6. CEDAR HARBOR PIER, BEACH UMBRELLAS, CAMPFIRE & SEA TORII REEF
  // =========================================================================
  buildHarborPier(world, -16, 30, 54);
  buildBeachProps(world);
  buildSeaToriiIslet(world, 28, 18, 56);

  // =========================================================================
  // 7. LUSH FORESTS, WEEPING WILLOWS, SAKURA GROVES & WILDFLOWER RIBBONS
  // =========================================================================
  populateFlora(world, noise, sakuraSpots);

  return {
    trainCurve,
    railY: RAIL_Y,
    crossingPos: new THREE.Vector3(crossingX + 0.5, RAIL_Y, 20),
    lighthouseBeaconPos,
    windmillHubPos,
    waterwheelHubPos,
    chimneySpots,
    sakuraSpots,
    waterfallMistSpots
  };
}

function buildTunnelPortal(world, cx, railY, cz, axis = 'Z') {
  for (let dx = -4; dx <= 4; dx++) {
    for (let dy = 0; dy <= 7; dy++) {
      const wx = axis === 'Z' ? cx + dx : cx;
      const wz = axis === 'Z' ? cz : cz + dx;
      const wy = railY + dy;

      const archR = Math.hypot(dx, (dy - 1) * 0.85);
      if (Math.abs(dx) <= 2 && dy >= 1 && dy <= 4 && archR < 3.2) {
        world.set(wx, wy, wz, BLOCK.AIR);
      } else if (dy === 7 || Math.abs(dx) === 4) {
        world.set(wx, wy, wz, BLOCK.VIADUCT_TRIM);
      } else {
        world.set(wx, wy, wz, BLOCK.VIADUCT_STONE);
      }
    }
  }
  // Portal warm lanterns
  world.set(cx - 3, railY + 5, cz + (axis === 'Z' ? 1 : 0), BLOCK.LANTERN_GOLD);
  world.set(cx + 3, railY + 5, cz + (axis === 'Z' ? 1 : 0), BLOCK.LANTERN_GOLD);
}

function buildSeasideStation(world) {
  const py = 24;
  // Stone base & oak wood platform right north of track (z = 14..18, x = -52..-35)
  for (let x = -52; x <= -35; x++) {
    for (let z = 14; z <= 18; z++) {
      for (let y = py - 1; y >= 15; y--) {
        world.set(x, y, z, BLOCK.VIADUCT_STONE);
      }
      world.set(x, py, z, z === 18 ? BLOCK.VIADUCT_TRIM : BLOCK.WOOD_OAK);
      for (let cy = py + 1; cy <= py + 7; cy++) {
        world.set(x, cy, z, BLOCK.AIR);
      }
    }
  }

  // Cozy ticket house on back of platform (x = -49..-42, z = 14..16)
  for (let x = -49; x <= -42; x++) {
    for (let z = 14; z <= 16; z++) {
      for (let y = py + 1; y <= py + 3; y++) {
        const isCorner = (x === -49 || x === -42) && (z === 14 || z === 16);
        if (isCorner) {
          world.set(x, y, z, BLOCK.WOOD_DARK);
        } else if (z === 16 && y === py + 2 && (x === -47 || x === -44)) {
          world.set(x, y, z, BLOCK.WARM_WINDOW);
        } else if (z === 16 && x === -46 && (y === py + 1 || y === py + 2)) {
          world.set(x, y, z, BLOCK.WOOD_OAK); // Ticket door
        } else {
          world.set(x, y, z, BLOCK.PLASTER_CREAM);
        }
      }
    }
  }

  // Station Canopy Pillars along platform & pitched cobalt-blue tile roof (ROOF_BLUE)
  for (const px of [-51, -46, -41, -36]) {
    for (let y = py + 1; y <= py + 3; y++) {
      world.set(px, y, 17, BLOCK.WOOD_DARK);
    }
  }
  for (let x = -52; x <= -35; x++) {
    for (let z = 13; z <= 18; z++) {
      const roofH = (z === 15 || z === 16) ? py + 5 : py + 4;
      world.set(x, roofH, z, BLOCK.ROOF_BLUE);
      if (z === 15 || z === 16) world.set(x, py + 4, z, BLOCK.WOOD_BIRCH);
    }
  }

  // Waiting wooden bench, retro red mailbox & warm hanging station lamps!
  world.set(-39, py + 1, 16, BLOCK.WOOD_OAK);
  world.set(-38, py + 1, 16, BLOCK.WOOD_OAK);
  world.set(-36, py + 1, 15, BLOCK.LIGHTHOUSE_RED);
  world.set(-36, py + 2, 15, BLOCK.LIGHTHOUSE_RED);
  world.set(-48, py + 3, 18, BLOCK.LANTERN_GOLD);
  world.set(-39, py + 3, 18, BLOCK.LANTERN_GOLD);
}

function buildLighthouse(world, cx, baseY, cz) {
  // Stone octagonal foundation plinth
  for (let y = baseY - 4; y <= baseY + 1; y++) {
    for (let dz = -4; dz <= 4; dz++) {
      for (let dx = -4; dx <= 4; dx++) {
        if (dx * dx + dz * dz <= 18) {
          world.set(cx + dx, y, cz + dz, y === baseY + 1 ? BLOCK.VIADUCT_TRIM : BLOCK.VIADUCT_STONE);
        }
      }
    }
  }

  // Tapered Red & White Striped Tower (height 21 blocks: baseY+2 .. baseY+22)
  const towerTop = baseY + 22;
  for (let y = baseY + 2; y <= towerTop; y++) {
    const t = (y - (baseY + 2)) / 20.0;
    const radius = 3.4 - t * 1.05;
    const r2 = radius * radius;
    const innerR2 = Math.max(0.8, (radius - 1.15) * (radius - 1.15));
    const stripeRed = Math.floor((y - (baseY + 2)) / 4) % 2 === 1;
    const mat = stripeRed ? BLOCK.LIGHTHOUSE_RED : BLOCK.LIGHTHOUSE_WHITE;

    for (let dz = -4; dz <= 4; dz++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d2 = dx * dx + dz * dz;
        if (d2 <= r2) {
          if (d2 >= innerR2) {
            // Glowing spiral stairwell windows facing bay/west
            if ((y === baseY + 7 && dz === 3 && dx === 0) ||
                (y === baseY + 13 && dx === -3 && dz === 0) ||
                (y === baseY + 18 && dz === 2 && dx === 0)) {
              world.set(cx + dx, y, cz + dz, BLOCK.WARM_WINDOW);
            } else {
              world.set(cx + dx, y, cz + dz, mat);
            }
          } else {
            world.set(cx + dx, y, cz + dz, BLOCK.AIR);
          }
        }
      }
    }
  }
  // Entrance door facing northwest path
  world.set(cx - 3, baseY + 2, cz, BLOCK.WOOD_DARK);
  world.set(cx - 3, baseY + 3, cz, BLOCK.WARM_WINDOW);

  // Black/Dark-Timber Gallery Balcony (towerTop + 1)
  const galY = towerTop + 1;
  for (let dz = -3; dz <= 3; dz++) {
    for (let dx = -3; dx <= 3; dx++) {
      const d2 = dx * dx + dz * dz;
      if (d2 <= 11) {
        world.set(cx + dx, galY, cz + dz, BLOCK.WOOD_DARK);
        if (d2 >= 7.5 && (Math.abs(dx) + Math.abs(dz)) % 2 === 0) {
          world.set(cx + dx, galY + 1, cz + dz, BLOCK.WOOD_DARK);
        }
      }
    }
  }

  // Glass Lantern Room & Intense Beacon Core (galY + 1 .. galY + 4)
  for (let y = galY + 1; y <= galY + 4; y++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const d2 = dx * dx + dz * dz;
        if (d2 <= 5) {
          if (dx === 0 && dz === 0 && (y === galY + 2 || y === galY + 3)) {
            world.set(cx, y, cz, BLOCK.BEACON_CORE);
          } else if (d2 >= 2) {
            world.set(cx + dx, y, cz + dz, BLOCK.GLASS_CLEAR);
          }
        }
      }
    }
  }

  // Pointed Vermilion Cupola & Lightning Spire
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dz * dz <= 6) world.set(cx + dx, galY + 5, cz + dz, BLOCK.LIGHTHOUSE_RED);
      if (dx * dx + dz * dz <= 2) world.set(cx + dx, galY + 6, cz + dz, BLOCK.LIGHTHOUSE_RED);
    }
  }
  world.set(cx, galY + 7, cz, BLOCK.LIGHTHOUSE_RED);
  world.set(cx, galY + 8, cz, BLOCK.LANTERN_GOLD);

  return new THREE.Vector3(cx + 0.5, galY + 2.8, cz + 0.5);
}

function buildCottage(world, cx, baseY, cz, w, d, roofBlock, hasChimney, chimneySpots) {
  const x0 = cx - Math.floor(w / 2);
  const x1 = x0 + w - 1;
  const z0 = cz - Math.floor(d / 2);
  const z1 = z0 + d - 1;

  // Cobblestone foundation down to solid terrain
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      for (let y = baseY; y >= baseY - 5; y--) {
        world.set(x, y, z, BLOCK.COBBLESTONE);
      }
      for (let y = baseY + 1; y <= baseY + 9; y++) {
        world.set(x, y, z, BLOCK.AIR);
      }
    }
  }

  // Timber-framed cream plaster walls & warm glowing windows
  const wallH = 4;
  for (let y = baseY + 1; y <= baseY + wallH; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const onX = (x === x0 || x === x1);
        const onZ = (z === z0 || z === z1);
        if (!onX && !onZ) continue;

        if (onX && onZ) {
          world.set(x, y, z, BLOCK.WOOD_DARK); // Corner timber posts
        } else if (y === baseY + wallH) {
          world.set(x, y, z, BLOCK.WOOD_DARK); // Top beam
        } else if (z === z1 && x === cx && (y === baseY + 1 || y === baseY + 2)) {
          world.set(x, y, z, BLOCK.WOOD_OAK); // Front door
        } else if (y === baseY + 2 && ((onZ && Math.abs(x - cx) === 2) || (onX && z === cz))) {
          world.set(x, y, z, BLOCK.WARM_WINDOW);
          // Flower window box right under window!
          if (z === z1) world.set(x, baseY + 1, z + 1, BLOCK.FLOWER_POPPY);
        } else {
          world.set(x, y, z, BLOCK.PLASTER_CREAM);
        }
      }
    }
  }
  // Porch lantern
  world.set(cx + 1, baseY + 3, z1 + 1, BLOCK.LANTERN_GOLD);

  // Gabled Shingle Roof with 1-block overhang
  const halfSpan = Math.ceil((d + 2) / 2);
  for (let ry = 0; ry <= halfSpan; ry++) {
    const rz0 = z0 - 1 + ry;
    const rz1 = z1 + 1 - ry;
    if (rz0 > rz1) break;
    const wy = baseY + wallH + 1 + ry;
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      world.set(x, wy, rz0, roofBlock);
      world.set(x, wy, rz1, roofBlock);
      // Fill gable triangles at x0 & x1
      if (x === x0 || x === x1) {
        for (let gz = rz0 + 1; gz < rz1; gz++) {
          world.set(x, wy, gz, (gz === cz && ry === 1) ? BLOCK.WARM_WINDOW : BLOCK.PLASTER_CREAM);
        }
      }
    }
  }

  // Stone Chimney & smoke emitter spot
  if (hasChimney) {
    const chX = x1 - 1;
    const chZ = z0 + 1;
    const chTop = baseY + wallH + halfSpan + 2;
    for (let y = baseY + 1; y <= chTop; y++) {
      world.set(chX, y, chZ, y === chTop ? BLOCK.DARK_STONE : BLOCK.COBBLESTONE);
    }
    chimneySpots.push(new THREE.Vector3(chX + 0.5, chTop + 1.1, chZ + 0.5));
  }
}

function buildRedArchBridge(world, x0, x1, cz, bankY) {
  const mid = (x0 + x1) * 0.5;
  const half = (x1 - x0) * 0.5;
  for (let x = x0; x <= x1; x++) {
    const norm = (x - mid) / half;
    const arch = Math.round((1 - norm * norm) * 3.2);
    const y = bankY + arch;
    for (let dz = -1; dz <= 1; dz++) {
      world.set(x, y, cz + dz, BLOCK.WOOD_OAK);
      if (dz !== 0) {
        world.set(x, y + 1, cz + dz, BLOCK.LIGHTHOUSE_RED); // Vermilion bridge railing!
      }
    }
    if (x === x0 || x === x1 || Math.abs(x - Math.round(mid)) === 0) {
      world.set(x, y + 2, cz - 1, BLOCK.LIGHTHOUSE_RED);
      world.set(x, y + 2, cz + 1, BLOCK.LIGHTHOUSE_RED);
    }
  }
  // Stone lanterns at bridge approaches
  for (const bx of [x0 - 1, x1 + 1]) {
    for (const bz of [cz - 2, cz + 2]) {
      const gy = world.getGroundY(bx, bz, bankY + 3);
      world.set(bx, gy + 1, bz, BLOCK.COBBLESTONE);
      world.set(bx, gy + 2, bz, BLOCK.LANTERN_GOLD);
      world.set(bx, gy + 3, bz, BLOCK.VIADUCT_STONE);
    }
  }
}

function buildGazebo(world, cx, baseY, cz) {
  for (let dz = -3; dz <= 3; dz++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx + dz * dz <= 10) {
        world.set(cx + dx, baseY, cz + dz, BLOCK.VIADUCT_TRIM);
        for (let y = baseY + 1; y <= baseY + 6; y++) world.set(cx + dx, y, cz + dz, BLOCK.AIR);
      }
    }
  }
  for (const [px, pz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    for (let y = baseY + 1; y <= baseY + 3; y++) {
      world.set(cx + px, y, cz + pz, BLOCK.LIGHTHOUSE_RED);
    }
  }
  for (let dz = -3; dz <= 3; dz++) {
    for (let dx = -3; dx <= 3; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dz));
      if (d <= 3) world.set(cx + dx, baseY + 4, cz + dz, BLOCK.ROOF_BLUE);
      if (d <= 2) world.set(cx + dx, baseY + 5, cz + dz, BLOCK.ROOF_BLUE);
      if (d <= 0) world.set(cx + dx, baseY + 6, cz + dz, BLOCK.LANTERN_GOLD);
    }
  }
  world.set(cx, baseY + 3, cz, BLOCK.LANTERN_GOLD);
}

function buildWindmill(world, cx, baseY, cz) {
  // Stone base + Cream octagonal tower (height 12)
  for (let y = baseY; y <= baseY + 11; y++) {
    const t = (y - baseY) / 11;
    const r = 3.3 - t * 0.9;
    const r2 = r * r;
    for (let dz = -4; dz <= 4; dz++) {
      for (let dx = -4; dx <= 4; dx++) {
        if (dx * dx + dz * dz <= r2) {
          const mat = y <= baseY + 2 ? BLOCK.COBBLESTONE : BLOCK.PLASTER_CREAM;
          world.set(cx + dx, y, cz + dz, mat);
        }
      }
    }
  }
  // Wooden gallery ring at baseY + 4
  for (let dz = -4; dz <= 4; dz++) {
    for (let dx = -4; dx <= 4; dx++) {
      const d2 = dx * dx + dz * dz;
      if (d2 >= 8 && d2 <= 15) world.set(cx + dx, baseY + 4, cz + dz, BLOCK.WOOD_OAK);
    }
  }
  // Warm windows & door facing bay (+Z)
  world.set(cx, baseY + 1, cz + 3, BLOCK.WOOD_DARK);
  world.set(cx, baseY + 2, cz + 3, BLOCK.WOOD_DARK);
  world.set(cx, baseY + 6, cz + 3, BLOCK.WARM_WINDOW);
  world.set(cx + 2, baseY + 8, cz + 1, BLOCK.WARM_WINDOW);

  // Conical terracotta cap
  for (let ry = 0; ry <= 3; ry++) {
    const cr = 3.0 - ry * 0.8;
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (dx * dx + dz * dz <= cr * cr) {
          world.set(cx + dx, baseY + 12 + ry, cz + dz, BLOCK.ROOF_TERRACOTTA);
        }
      }
    }
  }

  // Rotor axle protruding toward +Z
  const hubY = baseY + 10;
  world.set(cx, hubY, cz + 3, BLOCK.WOOD_DARK);
  return new THREE.Vector3(cx + 0.5, hubY + 0.5, cz + 4.1);
}

function buildHarborPier(world, cx, zStart, zEnd) {
  const deckY = SEA_LEVEL + 2; // Y = 16
  for (let z = zStart; z <= zEnd; z++) {
    const isEndDeck = z >= zEnd - 4;
    const halfW = isEndDeck ? 3 : 1;

    for (let dx = -halfW; dx <= halfW; dx++) {
      world.set(cx + dx, deckY, z, BLOCK.WOOD_OAK);
    }

    // Dark timber pilings driven into seabed every 5 blocks
    if ((z - zStart) % 5 === 0 || z === zEnd) {
      for (const px of [cx - halfW, cx + halfW]) {
        for (let y = deckY; y >= 5; y--) {
          world.set(px, y, z, BLOCK.WOOD_DARK);
        }
        world.set(px, deckY + 1, z, BLOCK.WOOD_DARK);
        if ((z - zStart) % 10 === 0 || z === zEnd) {
          world.set(px, deckY + 2, z, BLOCK.WOOD_DARK);
          world.set(px, deckY + 3, z, BLOCK.LANTERN_GOLD);
        }
      }
    }
  }
}

function buildBeachProps(world) {
  // Colorful Pixel Beach Umbrellas along Golden Crescent Beach!
  const umbrellas = [
    { x: -36, z: 31, mat: BLOCK.UMBRELLA_CORAL },
    { x: -24, z: 33, mat: BLOCK.UMBRELLA_CYAN },
    { x: -6,  z: 34, mat: BLOCK.UMBRELLA_CORAL },
    { x: 20,  z: 32, mat: BLOCK.UMBRELLA_CYAN }
  ];

  for (const u of umbrellas) {
    const gy = world.getGroundY(u.x, u.z, SEA_LEVEL + 5);
    if (gy >= SEA_LEVEL && gy <= SEA_LEVEL + 3) {
      world.set(u.x, gy + 1, u.z, BLOCK.WOOD_BIRCH);
      world.set(u.x, gy + 2, u.z, BLOCK.WOOD_BIRCH);
      world.set(u.x, gy + 3, u.z, BLOCK.WOOD_BIRCH);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          world.set(u.x + dx, gy + 4, u.z + dz, (dx === 0 && dz === 0) ? u.mat : u.mat);
        }
      }
      // Little wooden beach lounge chair beside umbrella
      world.set(u.x + 2, gy + 1, u.z, BLOCK.WOOD_OAK);
      world.set(u.x + 2, gy + 1, u.z + 1, BLOCK.WOOD_OAK);
    }
  }

  // Cozy Beach Driftwood Campfire at (-27, z=35)
  const fx = -27, fz = 35;
  const fgy = world.getGroundY(fx, fz, SEA_LEVEL + 4);
  if (fgy >= SEA_LEVEL) {
    world.set(fx, fgy + 1, fz, BLOCK.CAMPFIRE_EMBER);
    world.set(fx - 2, fgy + 1, fz, BLOCK.WOOD_OAK); // Log seat
    world.set(fx + 2, fgy + 1, fz, BLOCK.WOOD_OAK);
  }
}

function buildSeaToriiIslet(world, cx, topY, cz) {
  const gy = world.getGroundY(cx, cz, topY + 4);
  const by = Math.max(SEA_LEVEL + 1, gy);
  // Iconic Vermilion Sea Torii Gate ("海上鸟居") facing the shore/horizon!
  for (let y = by + 1; y <= by + 6; y++) {
    world.set(cx - 2, y, cz, y === by + 1 ? BLOCK.DARK_STONE : BLOCK.LIGHTHOUSE_RED);
    world.set(cx + 2, y, cz, y === by + 1 ? BLOCK.DARK_STONE : BLOCK.LIGHTHOUSE_RED);
  }
  for (let dx = -3; dx <= 3; dx++) {
    world.set(cx + dx, by + 5, cz, BLOCK.LIGHTHOUSE_RED);
    world.set(cx + dx, by + 7, cz, BLOCK.LIGHTHOUSE_RED);
  }
  world.set(cx - 4, by + 7, cz, BLOCK.LIGHTHOUSE_RED);
  world.set(cx + 4, by + 7, cz, BLOCK.LIGHTHOUSE_RED);
  world.set(cx, by + 6, cz, BLOCK.WOOD_DARK); // Center tablet

  // Stone sea lantern beside Torii
  const ly = world.getGroundY(cx + 4, cz + 2, by + 2);
  if (ly >= SEA_LEVEL) {
    world.set(cx + 4, ly + 1, cz + 2, BLOCK.STONE);
    world.set(cx + 4, ly + 2, cz + 2, BLOCK.LANTERN_GOLD);
    world.set(cx + 4, ly + 3, cz + 2, BLOCK.STONE);
  }
  // Windswept reef pine
  placePineTree(world, cx - 4, world.getGroundY(cx - 4, cz - 1, by + 2), cz - 1, 6, false);
}

function placePineTree(world, x, y, z, height = 9, snowTip = false) {
  if (y <= SEA_LEVEL) return;
  for (let i = 1; i <= height - 2; i++) {
    world.set(x, y + i, z, BLOCK.TRUNK_PINE);
  }
  for (let ly = 2; ly <= height; ly++) {
    const rad = Math.max(0, Math.round((height - ly) * 0.42 + (ly % 2 === 0 ? 0.6 : 0.1)));
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dz * dz <= rad * rad + 0.6) {
          if (dx === 0 && dz === 0 && ly < height - 1) continue;
          const leafMat = (snowTip && ly >= height - 2 && (dx + dz + ly) % 2 === 0)
            ? BLOCK.SNOW
            : BLOCK.LEAF_PINE;
          world.set(x + dx, y + ly, z + dz, leafMat);
        }
      }
    }
  }
}

function placeRoundTree(world, x, y, z, trunkMat, leafPrimary, leafAccent, radius = 3, height = 6) {
  if (y <= SEA_LEVEL) return;
  for (let i = 1; i <= height - 1; i++) {
    world.set(x, y + i, z, trunkMat);
  }
  const cy = y + height;
  const r2 = (radius + 0.35) * (radius + 0.35);
  for (let dy = -radius + 1; dy <= radius; dy++) {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d2 = dx * dx + (dy * 1.15) * (dy * 1.15) + dz * dz;
        if (d2 <= r2) {
          const h = ((x + dx) * 7 + (y + dy) * 13 + (z + dz) * 19) & 7;
          if (d2 > r2 * 0.78 && h < 2) continue; // Airy painterly silhouette!
          const mat = (dy >= 1 && h > 4) ? leafAccent : leafPrimary;
          if (world.get(x + dx, cy + dy, z + dz) === BLOCK.AIR) {
            world.set(x + dx, cy + dy, z + dz, mat);
          }
        }
      }
    }
  }
}

function placeWillowTree(world, x, y, z) {
  if (y <= SEA_LEVEL) return;
  for (let i = 1; i <= 5; i++) world.set(x, y + i, z, BLOCK.TRUNK_PINE);
  const cy = y + 6;
  for (let dy = -1; dy <= 2; dy++) {
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (dx * dx + dy * dy * 1.5 + dz * dz <= 10) {
          world.set(x + dx, cy + dy, z + dz, BLOCK.LEAF_WILLOW);
        }
      }
    }
  }
  // Drooping willow curtains around rim!
  for (let dz = -3; dz <= 3; dz++) {
    for (let dx = -3; dx <= 3; dx++) {
      const r2 = dx * dx + dz * dz;
      if (r2 >= 6 && r2 <= 10 && ((dx * 3 + dz * 5) & 1) === 0) {
        const drop = 2 + (Math.abs(dx + dz) % 3);
        for (let k = 1; k <= drop; k++) {
          if (world.get(x + dx, cy - k, z + dz) === BLOCK.AIR) {
            world.set(x + dx, cy - k, z + dz, BLOCK.LEAF_WILLOW);
          }
        }
      }
    }
  }
}

function populateFlora(world, noise, sakuraSpots) {
  // Hand-placed Hero Sakura Trees around Seaside Station, Crossing & Hilltop Gazebo!
  const heroSakura = [
    [-53, 15], [-33, 15], [-42, 11], [-58, 22], [-50, -13], [-58, -19], [-24, 13], [2, 12]
  ];
  for (const [sx, sz] of heroSakura) {
    const sy = world.getGroundY(sx, sz, 45);
    const surf = world.get(sx, sy, sz);
    if (sy > SEA_LEVEL + 1 && (surf === BLOCK.GRASS || surf === BLOCK.LUSH_GRASS || surf === BLOCK.SAND)) {
      placeRoundTree(world, sx, sy, sz, BLOCK.TRUNK_SAKURA, BLOCK.LEAF_SAKURA, BLOCK.LEAF_SAKURA_LIGHT, 3, 6);
      sakuraSpots.push(new THREE.Vector3(sx + 0.5, sy + 6.0, sz + 0.5));
    }
  }

  // Hero Weeping Willows along Emerald Mill Pond & Valley Stream
  for (const [wx, wz] of [[1, -6], [15, 1], [3, 9], [15, 12]]) {
    const wy = world.getGroundY(wx, wz, 28);
    if (wy >= SEA_LEVEL + 1 && wy <= 24) {
      const surf = world.get(wx, wy, wz);
      if (surf === BLOCK.GRASS || surf === BLOCK.LUSH_GRASS || surf === BLOCK.MOSS_STONE) {
        placeWillowTree(world, wx, wy, wz);
      }
    }
  }

  // Procedural Biome Forests (Alpine Pines, Sakura West Ridge, Autumn Ginkgo/Maple East Slope)
  for (let z = -66; z <= 42; z += 5) {
    for (let x = -80; x <= 78; x += 5) {
      const jx = x + Math.floor((noise.hash2(x, z) - 0.5) * 3.5);
      const jz = z + Math.floor((noise.hash2(z + 19, x - 7) - 0.5) * 3.5);

      // Keep clear of railway corridor, station, lighthouse plateau, windmill pad & central beach view!
      if (Math.abs(jz - 20) < 5 && jx > -62 && jx < 52) continue;
      if (jx > -55 && jx < -32 && jz > 12 && jz < 24) continue;
      if (jx > 50 && jz > 22) continue; // Keep East Lighthouse headland open wildflower meadow!
      if (Math.hypot(jx - (-66), jz - 6) < 11) continue; // Keep Windmill flower field open!
      if (Math.hypot(jx - 21, jz - (-5)) < 8) continue;
      if (Math.hypot(jx - (-54), jz - (-17)) < 6) continue;
      if (jx > -36 && jx < -12 && jz > -19 && jz < 3) continue; // Keep sunlit terraces visible!

      const gy = world.getGroundY(jx, jz, 60);
      const surf = world.get(jx, gy, jz);
      if (surf !== BLOCK.GRASS && surf !== BLOCK.LUSH_GRASS && surf !== BLOCK.SNOW) continue;

      const r = noise.hash2(jx * 3, jz * 5);
      if (gy >= 34 && gy <= 52 && jz < -16) {
        // Alpine Conifer Belt!
        if (r > 0.35) {
          placePineTree(world, jx, gy, jz, 8 + Math.floor(r * 5), gy >= 45);
        }
      } else if (jx < -30 && jz < 8 && gy >= 18 && gy <= 42) {
        // West Sakura & Oak Blossom Slope
        if (r > 0.45) {
          placeRoundTree(world, jx, gy, jz, BLOCK.TRUNK_SAKURA, BLOCK.LEAF_SAKURA, BLOCK.LEAF_SAKURA_LIGHT, 3, 5 + (r > 0.75 ? 1 : 0));
          sakuraSpots.push(new THREE.Vector3(jx + 0.5, gy + 5.5, jz + 0.5));
        } else if (r > 0.28) {
          placePineTree(world, jx, gy, jz, 7, false);
        }
      } else if (jx > 18 && jz < 6 && gy >= 18 && gy <= 42) {
        // East Golden Ginkgo & Crimson Maple Autumn Valley!
        if (r > 0.55) {
          placeRoundTree(world, jx, gy, jz, BLOCK.TRUNK_PINE, BLOCK.LEAF_GINKGO, BLOCK.LEAF_GINKGO, 3, 6);
        } else if (r > 0.36) {
          placeRoundTree(world, jx, gy, jz, BLOCK.TRUNK_PINE, BLOCK.LEAF_MAPLE, BLOCK.LEAF_GINKGO, 2, 5);
        } else if (r > 0.2) {
          placePineTree(world, jx, gy, jz, 8, false);
        }
      } else if (gy >= 17 && gy <= 34 && r > 0.68) {
        placeRoundTree(world, jx, gy, jz, BLOCK.TRUNK_PINE, BLOCK.LEAF_OAK, BLOCK.LEAF_WILLOW, 2, 5);
      }
    }
  }

  // Sweeping Wildflower Meadows (Windmill Tulip/Lavender ribbons & East Lighthouse Flower Cape!)
  for (let z = -8; z <= 45; z++) {
    for (let x = -82; x <= 80; x++) {
      const gy = world.getGroundY(x, z, 36);
      const surf = world.get(x, gy, z);
      if (surf !== BLOCK.GRASS && surf !== BLOCK.LUSH_GRASS) continue;
      if (world.get(x, gy + 1, z) !== BLOCK.AIR) continue;

      const r = noise.hash2(x + 101, z - 53);

      // West Windmill Colorful Flower Ribbons!
      if (x >= -80 && x <= -52 && z >= -4 && z <= 18 && r > 0.55) {
        const stripe = Math.floor((x + z * 0.7 + 120) / 4) % 4;
        const fMat = stripe === 0 ? BLOCK.FLOWER_LAVENDER
          : stripe === 1 ? BLOCK.FLOWER_TULIP_PINK
          : stripe === 2 ? BLOCK.FLOWER_SUN
          : BLOCK.FLOWER_POPPY;
        world.set(x, gy, z, fMat);
      }
      // East Cape Lavender & Sunflower Coastal Meadow!
      else if (x >= 46 && x <= 78 && z >= 14 && z <= 44 && r > 0.58) {
        const fMat = (noise.fbm2D(x * 0.09, z * 0.09, 2) > 0) ? BLOCK.FLOWER_LAVENDER : BLOCK.FLOWER_SUN;
        world.set(x, gy, z, fMat);
      }
      // Scattered valley wildflowers
      else if (r > 0.93) {
        const fMat = r > 0.965 ? BLOCK.FLOWER_POPPY : BLOCK.FLOWER_SUN;
        world.set(x, gy, z, fMat);
      }
    }
  }
}
