import * as THREE from 'three';
import { TILE } from './BlockTypes.js';

export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 16;
export const TILE_INNER = 16;
export const TILE_PAD = 2;
export const CELL_SIZE = TILE_INNER + TILE_PAD * 2; // 20px per cell -> 320x320 canvas

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hashPx(t, x, y) {
  let h = Math.imul(t + 17, 73856093) ^ Math.imul(x + 3, 19349663) ^ Math.imul(y + 11, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function getTileUVRect(tileIndex) {
  const col = tileIndex % ATLAS_COLS;
  const row = Math.floor(tileIndex / ATLAS_COLS);
  const totalW = ATLAS_COLS * CELL_SIZE;
  const totalH = ATLAS_ROWS * CELL_SIZE;

  const u0 = (col * CELL_SIZE + TILE_PAD) / totalW;
  const u1 = (col * CELL_SIZE + TILE_PAD + TILE_INNER) / totalW;
  // Canvas Y=0 is top; Three.js flipY=true means V=1 is top of canvas
  const v1 = 1.0 - (row * CELL_SIZE + TILE_PAD) / totalH;
  const v0 = 1.0 - (row * CELL_SIZE + TILE_PAD + TILE_INNER) / totalH;
  return { u0, v0, u1, v1 };
}

export function createPixelAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * CELL_SIZE;
  canvas.height = ATLAS_ROWS * CELL_SIZE;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(canvas.width, canvas.height);
  const data = img.data;

  // Helper to paint a single 16x16 tile using fn(x, y) -> [r, g, b, a?] and extrude 2px border
  const paintTile = (tileId, fn) => {
    const col = tileId % ATLAS_COLS;
    const row = Math.floor(tileId / ATLAS_COLS);
    const ox = col * CELL_SIZE;
    const oy = row * CELL_SIZE;

    const buf = new Array(16 * 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const c = fn(x, y, hashPx(tileId, x, y));
        buf[y * 16 + x] = [c[0], c[1], c[2], c[3] === undefined ? 255 : c[3]];
      }
    }

    for (let cy = 0; cy < CELL_SIZE; cy++) {
      for (let cx = 0; cx < CELL_SIZE; cx++) {
        const sx = Math.max(0, Math.min(15, cx - TILE_PAD));
        const sy = Math.max(0, Math.min(15, cy - TILE_PAD));
        const rgba = buf[sy * 16 + sx];
        const idx = ((oy + cy) * canvas.width + (ox + cx)) * 4;
        data[idx] = rgba[0];
        data[idx + 1] = rgba[1];
        data[idx + 2] = rgba[2];
        data[idx + 3] = rgba[3];
      }
    }
  };

  const pick = (pal, r) => hexToRgb(pal[Math.min(pal.length - 1, Math.floor(r * pal.length))]);

  // 1. Grass & Soil
  paintTile(TILE.GRASS_TOP, (x, y, r) => {
    const pal = ['#5ec24e', '#67cc55', '#55b546', '#74d660', '#4fa940'];
    const blade = ((x * 3 + y * 5) % 7 === 0) ? 0.82 : r;
    return pick(pal, blade);
  });

  paintTile(TILE.LUSH_GRASS_TOP, (x, y, r) => {
    const pal = ['#48ad49', '#52b950', '#3f9c42', '#62c75a'];
    return pick(pal, r);
  });

  paintTile(TILE.TERRACE_TOP, (x, y, r) => {
    // Golden-lime sunlit paddy/tea terrace with subtle water-furrow lines
    if (y % 4 === 0) return pick(['#69c996', '#5cb88a'], r);
    return pick(['#8bd450', '#9be05a', '#7bc445', '#a9e665'], r);
  });

  paintTile(TILE.DIRT, (x, y, r) => {
    const pal = ['#8c5e3e', '#805436', '#986847', '#744b30'];
    if (r > 0.92) return hexToRgb('#a8876c'); // tiny pebble
    return pick(pal, r);
  });

  paintTile(TILE.GRASS_SIDE, (x, y, r) => {
    const overhang = 3 + Math.floor(Math.sin(x * 0.9) * 1.3 + (hashPx(99, x, 0) > 0.5 ? 1 : 0));
    if (y < overhang) {
      return pick(['#5ec24e', '#67cc55', '#51af43', '#72d45e'], r);
    }
    if (y === overhang) {
      return hexToRgb('#5d3c26'); // crisp pixel drop-shadow under grass lip
    }
    if (r > 0.93) return hexToRgb('#a48369');
    return pick(['#8c5e3e', '#805436', '#986847', '#744b30'], r);
  });

  // 2. Sand & Coastal Cliffs
  paintTile(TILE.SAND, (x, y, r) => {
    const ripple = Math.sin((x + y * 0.5) * 0.8) * 0.08;
    return pick(['#f5e1a4', '#eed693', '#fae8b2', '#e5ca83'], Math.max(0, Math.min(0.99, r + ripple)));
  });

  paintTile(TILE.WET_SAND, (x, y, r) => {
    return pick(['#d4b475', '#caa96a', '#dec082', '#be9d60'], r);
  });

  paintTile(TILE.CHALK_CLIFF, (x, y, r) => {
    const strata = (y % 5 === 0) ? -0.18 : ((y % 8 === 3) ? 0.14 : 0);
    return pick(['#dcd7cb', '#e7e2d8', '#cec8ba', '#f0ece3'], Math.max(0, Math.min(0.99, r + strata)));
  });

  // 3. Mountain Stones, Snow & Glacier
  paintTile(TILE.STONE, (x, y, r) => {
    const crack = ((x + (y >> 1) * 3) % 8 === 0 && y % 4 === 1) ? 0.05 : r;
    return pick(['#6f7d8c', '#7c8b9b', '#8998a8', '#63707e'], crack);
  });

  paintTile(TILE.DARK_STONE, (x, y, r) => {
    return pick(['#495462', '#536070', '#3f4956', '#5d6b7c'], r);
  });

  paintTile(TILE.MOSS_STONE, (x, y, r) => {
    if (y < 5 || (r > 0.58 && y < 11)) {
      return pick(['#4da84b', '#5bbc56', '#3f9140'], r);
    }
    return pick(['#6b7987', '#788796', '#5d6a78'], r);
  });

  paintTile(TILE.SNOW, (x, y, r) => {
    return pick(['#f4f9ff', '#ffffff', '#e8f2fc', '#fbfdff'], r);
  });

  paintTile(TILE.SNOW_SIDE, (x, y, r) => {
    const snowLine = 5 + Math.floor(Math.cos(x * 0.75) * 1.6 + (hashPx(77, x, 1) > 0.5 ? 1 : 0));
    if (y < snowLine) return pick(['#f4f9ff', '#ffffff', '#e6f0fa'], r);
    return pick(['#6f7d8c', '#7c8b9b', '#5e6b79'], r);
  });

  paintTile(TILE.ICE_GLACIER, (x, y, r) => {
    const streak = ((x + y) % 5 === 0) ? 0.85 : r * 0.75;
    return pick(['#8fd8f8', '#a8e4ff', '#7ac7ec', '#ccf1ff'], streak);
  });

  paintTile(TILE.COBBLESTONE, (x, y, r) => {
    const bx = (x + (Math.floor(y / 4) % 2) * 4) % 8;
    const by = y % 4;
    if (bx === 0 || by === 0) return hexToRgb('#78726a');
    return pick(['#aba398', '#bab2a6', '#9b9388', '#c7bfb3'], r);
  });

  // 4. Viaduct, Railway & Architecture
  paintTile(TILE.VIADUCT_STONE, (x, y, r) => {
    const row = Math.floor(y / 4);
    const ox = (x + (row % 2) * 4) % 8;
    const oy = y % 4;
    if (oy === 0 || ox === 0) return hexToRgb('#b6a58b'); // warm mortar
    if (oy === 1) return hexToRgb('#eee5d5'); // sunlit top bevel
    return pick(['#ded2bc', '#d5c7af', '#e5dac6'], r);
  });

  paintTile(TILE.VIADUCT_TRIM, (x, y, r) => {
    if (y === 0 || y === 15) return hexToRgb('#f5efe4');
    if (y === 7) return hexToRgb('#c5b69e');
    return pick(['#ebe2d2', '#e3d9c7', '#f1e9db'], r);
  });

  paintTile(TILE.TUNNEL_DARK, (x, y, r) => {
    return pick(['#151922', '#1a1f2a', '#11141c'], r);
  });

  paintTile(TILE.GRAVEL, (x, y, r) => {
    return pick(['#7b7672', '#8c8681', '#6b6662', '#9b948e'], r);
  });

  paintTile(TILE.RAIL_TOP, (x, y, r) => {
    // Steel rails running along X (v = 3..4 & 11..12) + oak sleepers along Z
    if (y === 3 || y === 12) return hexToRgb('#d8e2ec'); // gleaming rail head
    if (y === 4 || y === 11) return hexToRgb('#798696'); // rail shadow side
    if (x % 4 === 1 || x % 4 === 2) {
      if (y >= 1 && y <= 14) return pick(['#6b472d', '#5c3b24', '#785135'], r); // wooden tie
    }
    return pick(['#847e78', '#948d86', '#726d68'], r); // ballast gravel
  });

  paintTile(TILE.WOOD_OAK, (x, y, r) => {
    if (y % 4 === 0) return hexToRgb('#8f6039'); // plank groove
    const grain = (x % 7 === 0 && r > 0.6) ? 0.1 : r;
    return pick(['#b8804f', '#c48b59', '#ab7445', '#ce9664'], grain);
  });

  paintTile(TILE.WOOD_DARK, (x, y, r) => {
    if (x % 4 === 0) return hexToRgb('#3d2618');
    return pick(['#563824', '#63412b', '#4a2f1e'], r);
  });

  paintTile(TILE.WOOD_BIRCH, (x, y, r) => {
    if (y % 4 === 0) return hexToRgb('#cbb899');
    return pick(['#e8dac0', '#f0e3cb', '#dfd0b4'], r);
  });

  paintTile(TILE.PLASTER_CREAM, (x, y, r) => {
    return pick(['#f7efe0', '#f2e8d5', '#fbf5ea', '#ebe0cc'], r);
  });

  paintTile(TILE.LIGHTHOUSE_WHITE, (x, y, r) => {
    if (y % 8 === 0) return hexToRgb('#dce3ec');
    return pick(['#f7faff', '#eef3fa', '#ffffff'], r);
  });

  paintTile(TILE.LIGHTHOUSE_RED, (x, y, r) => {
    if (y % 8 === 0) return hexToRgb('#b82d28');
    return pick(['#e03e36', '#eb4940', '#d1342d', '#f2574e'], r);
  });

  paintTile(TILE.ROOF_TERRACOTTA, (x, y, r) => {
    const sy = y % 4;
    const sx = (x + (Math.floor(y / 4) % 2) * 2) % 4;
    if (sy === 3) return hexToRgb('#9c3b26'); // shingle overlap shadow
    if (sx === 0) return hexToRgb('#b5472f');
    return pick(['#d45b3e', '#df6648', '#c85135', '#e87355'], r);
  });

  paintTile(TILE.ROOF_BLUE, (x, y, r) => {
    const sy = y % 4;
    const sx = (x + (Math.floor(y / 4) % 2) * 2) % 4;
    if (sy === 3) return hexToRgb('#24426b');
    if (sx === 0) return hexToRgb('#2d5284');
    return pick(['#3a69a6', '#4476b5', '#335d94', '#5185c4'], r);
  });

  // 5. Tree Trunks &Painterly Pixel Foliage
  paintTile(TILE.TRUNK_PINE_SIDE, (x, y, r) => {
    if (x % 3 === 0) return hexToRgb('#472d1d');
    return pick(['#5e3d28', '#6b462f', '#523422'], r);
  });

  paintTile(TILE.TRUNK_SAKURA_SIDE, (x, y, r) => {
    if (y % 5 === 2 && x % 4 !== 0) return hexToRgb('#6e5359'); // horizontal cherry bark lenticels
    return pick(['#4d383d', '#594147', '#422f34'], r);
  });

  paintTile(TILE.TRUNK_TOP, (x, y, r) => {
    const dx = x - 7.5, dy = y - 7.5;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 6.5) return hexToRgb('#523422');
    if (Math.round(d) % 2 === 0) return hexToRgb('#cfa474');
    return pick(['#dfb788', '#c49767'], r);
  });

  const paintFoliage = (tileId, pal) => {
    paintTile(tileId, (x, y, r) => {
      // Cluster dithering for authentic pixel-art leaf tufts
      const cx = ((x >> 1) * 7 + (y >> 1) * 13) % 5;
      const shade = (cx / 5) * 0.55 + r * 0.45;
      return pick(pal, shade);
    });
  };

  paintFoliage(TILE.LEAF_PINE, ['#1f5c3e', '#296e4b', '#338059', '#3f9468']);
  paintFoliage(TILE.LEAF_OAK, ['#3d9942', '#4cb04f', '#5cc45c', '#70d46b']);
  paintFoliage(TILE.LEAF_WILLOW, ['#64be4d', '#77cf5c', '#8be06d', '#9ceb7e']);
  paintFoliage(TILE.LEAF_SAKURA, ['#eb7ba0', '#f794b5', '#ffa8c5', '#ffc2d7']);
  paintFoliage(TILE.LEAF_SAKURA_LIGHT, ['#f7a3bf', '#ffb8d0', '#ffd0e0', '#ffe6ef']);
  paintFoliage(TILE.LEAF_GINKGO, ['#df991d', '#f0ad28', '#ffc238', '#ffd65c']);
  paintFoliage(TILE.LEAF_MAPLE, ['#cc4425', '#e35630', '#f56e3d', '#ff8952']);

  // 6. Wildflower Meadow & Reef Blocks
  const paintFlower = (tileId, basePal, petalPal) => {
    paintTile(tileId, (x, y, r) => {
      const gx = x % 4, gy = y % 4;
      if ((gx === 1 || gx === 2) && (gy === 1 || gy === 2) && hashPx(tileId + 5, x >> 2, y >> 2) > 0.25) {
        return pick(petalPal, r);
      }
      return pick(basePal, r);
    });
  };

  paintFlower(TILE.FLOWER_LAVENDER, ['#49a64c', '#57b858'], ['#9b6dff', '#b48eff', '#7f52e8']);
  paintFlower(TILE.FLOWER_SUN, ['#55b849', '#64c756'], ['#ffd026', '#ffe34d', '#f5ab18']);
  paintFlower(TILE.FLOWER_POPPY, ['#4eb049', '#5ec256'], ['#ff473d', '#ff6859', '#e02f26']);
  paintFlower(TILE.FLOWER_TULIP_PINK, ['#4eb049', '#5ec256'], ['#ff7eb3', '#ff9ec7', '#fff0f6']);

  paintTile(TILE.CORAL_PINK, (x, y, r) => pick(['#ff6b9c', '#ff85ad', '#e85485', '#ffa3c2'], r));
  paintTile(TILE.CORAL_CYAN, (x, y, r) => pick(['#2de0d4', '#52f2e6', '#1dc4b8', '#80fff5'], r));
  paintTile(TILE.KELP_GREEN, (x, y, r) => pick(['#238a68', '#2da37c', '#1b7054'], r));

  // 7. Translucent Stream Water, Waterfall Foam & Glass
  paintTile(TILE.RIVER_WATER, (x, y, r) => {
    const streak = ((y + x * 2) % 6 === 0) ? [165, 245, 250, 215] : null;
    if (streak) return streak;
    const c = pick(['#35d4da', '#45e2e6', '#2bc2cc', '#5cecf0'], r);
    return [c[0], c[1], c[2], 195];
  });

  paintTile(TILE.WATER_FOAM, (x, y, r) => {
    const c = pick(['#e8fbff', '#ffffff', '#cef4fc'], r);
    return [c[0], c[1], c[2], 235];
  });

  paintTile(TILE.GLASS_CLEAR, (x, y) => {
    if (x === 0 || x === 15 || y === 0 || y === 15) return [55, 68, 82, 245]; // iron muntin frame
    if (x + y === 5 || x + y === 6 || x + y === 19) return [230, 250, 255, 165]; // glass glint
    return [170, 225, 245, 85];
  });

  // 8. Emissive Warm Windows, Lanterns, Campfire & Beach Umbrellas
  paintTile(TILE.WARM_WINDOW, (x, y) => {
    // Cozy wooden mullion frame + glowing honey-orange interior
    if (x === 0 || x === 15 || y === 0 || y === 15 || x === 7 || x === 8 || y === 7 || y === 8) {
      return hexToRgb('#4f3322');
    }
    const dist = Math.hypot(x - 7.5, y - 7.5) / 10;
    const c = dist < 0.45 ? hexToRgb('#fff3b8') : (dist < 0.75 ? hexToRgb('#ffd166') : hexToRgb('#ff9f38'));
    return c;
  });

  paintTile(TILE.LANTERN_GOLD, (x, y) => {
    if (y === 0 || y === 15) return hexToRgb('#3c2f2a');
    const d = Math.hypot(x - 7.5, y - 7.5);
    return d < 4.5 ? hexToRgb('#fff9d6') : hexToRgb('#ffbe47');
  });

  paintTile(TILE.BEACON_CORE, () => [255, 252, 225, 255]);

  paintTile(TILE.CAMPFIRE_EMBER, (x, y, r) => {
    if (y > 11) return pick(['#4f3222', '#3b2418'], r);
    return pick(['#ff6a2b', '#ff9e2c', '#ffd447', '#ff451f'], r);
  });

  paintTile(TILE.UMBRELLA_CYAN, (x, y) => {
    return ((x >> 2) + (y >> 2)) % 2 === 0 ? hexToRgb('#2ec4e6') : hexToRgb('#ffffff');
  });

  paintTile(TILE.UMBRELLA_CORAL, (x, y) => {
    return ((x >> 2) + (y >> 2)) % 2 === 0 ? hexToRgb('#ff6b5b') : hexToRgb('#fff7e8');
  });

  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}
