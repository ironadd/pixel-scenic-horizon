// Block IDs and properties for "山海晴岚 · 像素风景线"

export const BLOCK = {
  AIR: 0,

  // Natural Terrain
  GRASS: 1,            // Sunlit emerald top, grassy overhang side, dirt bottom
  LUSH_GRASS: 2,       // Deeper meadow grass
  TERRACE_GRASS: 3,    // Golden-lime rice/tea paddy top
  DIRT: 4,             // Rich warm soil
  SAND: 5,             // Warm golden-cream beach sand
  WET_SAND: 6,         // Darker shoreline sand
  CHALK_CLIFF: 7,      // Warm white limestone coastal cliff
  STONE: 8,            // Cool alpine slate stone
  DARK_STONE: 9,       // Deep basalt / mountain shadow rock
  MOSS_STONE: 10,      // Moss-draped river & viaduct base rock
  SNOW: 11,            // Crisp alpine snow
  SNOW_STONE: 12,      // Snow-capped rock transition
  ICE_GLACIER: 13,     // Pale cyan glacier ice
  COBBLESTONE: 14,     // Winding garden & village path stone

  // Architecture & Railway
  VIADUCT_STONE: 15,   // Warm dressed sandstone brick for coastal viaduct
  VIADUCT_TRIM: 16,    // Light cream cornice stone
  TUNNEL_DARK: 17,     // Deep unlit tunnel interior block
  RAIL_BED: 18,        // Gravel ballast + wooden sleeper + steel rail top
  WOOD_OAK: 19,        // Warm cedar/oak planks (pier, bridges, decks)
  WOOD_DARK: 20,       // Dark spruce timber beams & pilings
  WOOD_BIRCH: 21,      // Light cream-birch wood
  PLASTER_CREAM: 22,   // Cozy cottage cream plaster wall
  LIGHTHOUSE_WHITE: 23,// Crisp whitewashed lighthouse masonry
  LIGHTHOUSE_RED: 24,  // Iconic vermilion-red lighthouse stripe & Torii wood
  ROOF_TERRACOTTA: 25, // Warm terracotta cottage roof shingles
  ROOF_BLUE: 26,       // Seaside station cobalt-slate roof tiles

  // Trees & Flora
  TRUNK_PINE: 27,      // Dark reddish-brown bark
  TRUNK_SAKURA: 28,    // Dark plum-grey cherry bark
  LEAF_PINE: 29,       // Deep alpine spruce needles
  LEAF_OAK: 30,        // Sunlit summer green foliage
  LEAF_WILLOW: 31,     // Fresh lime-green weeping willow foliage
  LEAF_SAKURA: 32,     // Soft pink cherry blossom clusters
  LEAF_SAKURA_LIGHT:33,// Pale blush white-pink sakura highlights
  LEAF_GINKGO: 34,     // Golden autumn ginkgo foliage
  LEAF_MAPLE: 35,      // Warm coral-amber autumn maple

  // Flowers & Seabed Details (slightly smaller or solid decorative blocks)
  FLOWER_LAVENDER: 36, // Purple lavender cluster
  FLOWER_SUN: 37,      // Golden sunflower / dandelion cluster
  FLOWER_POPPY: 38,    // Coral-red poppy / tulip cluster
  FLOWER_TULIP_PINK:39,// Pink tulip cluster
  CORAL_PINK: 40,      // Reef pink coral
  CORAL_CYAN: 41,      // Reef turquoise coral
  KELP_GREEN: 42,      // Underwater sea grass

  // Translucent Water & Glass (meshed into water/translucent pass)
  RIVER_WATER: 43,     // Translucent emerald-cyan stream & waterfall water
  WATER_FOAM: 44,      // Frothy white waterfall crest & splash block
  GLASS_CLEAR: 45,     // Lighthouse lantern room glass

  // Emissive / Glowing Blocks (meshed into emissive pass or vertex-emissive)
  WARM_WINDOW: 46,     // Cozy warm amber cottage & station window
  LANTERN_GOLD: 47,    // Glowing harbor / street / stone lantern core
  BEACON_CORE: 48,     // Intense lighthouse lamp core
  CAMPFIRE_EMBER: 49,  // Glowing beach driftwood campfire
  UMBRELLA_CYAN: 50,   // Beach umbrella sky-blue stripe
  UMBRELLA_CORAL: 51   // Beach umbrella coral-red stripe
};

// Tile indices in our 16x16 Atlas (0..255). Each entry specifies [topTile, sideTile, bottomTile]
export const TILE = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  LUSH_GRASS_TOP: 3,
  TERRACE_TOP: 4,
  SAND: 5,
  WET_SAND: 6,
  CHALK_CLIFF: 7,
  STONE: 8,
  DARK_STONE: 9,
  MOSS_STONE: 10,
  SNOW: 11,
  SNOW_SIDE: 12,
  ICE_GLACIER: 13,
  COBBLESTONE: 14,
  VIADUCT_STONE: 15,
  VIADUCT_TRIM: 16,
  TUNNEL_DARK: 17,
  RAIL_TOP: 18,
  GRAVEL: 19,
  WOOD_OAK: 20,
  WOOD_DARK: 21,
  WOOD_BIRCH: 22,
  PLASTER_CREAM: 23,
  LIGHTHOUSE_WHITE: 24,
  LIGHTHOUSE_RED: 25,
  ROOF_TERRACOTTA: 26,
  ROOF_BLUE: 27,
  TRUNK_PINE_SIDE: 28,
  TRUNK_TOP: 29,
  TRUNK_SAKURA_SIDE: 30,
  LEAF_PINE: 31,
  LEAF_OAK: 32,
  LEAF_WILLOW: 33,
  LEAF_SAKURA: 34,
  LEAF_SAKURA_LIGHT: 35,
  LEAF_GINKGO: 36,
  LEAF_MAPLE: 37,
  FLOWER_LAVENDER: 38,
  FLOWER_SUN: 39,
  FLOWER_POPPY: 40,
  FLOWER_TULIP_PINK: 41,
  CORAL_PINK: 42,
  CORAL_CYAN: 43,
  KELP_GREEN: 44,
  RIVER_WATER: 45,
  WATER_FOAM: 46,
  GLASS_CLEAR: 47,
  WARM_WINDOW: 48,
  LANTERN_GOLD: 49,
  BEACON_CORE: 50,
  CAMPFIRE_EMBER: 51,
  UMBRELLA_CYAN: 52,
  UMBRELLA_CORAL: 53
};

export const BLOCK_INFO = {
  [BLOCK.GRASS]:            { faces: [TILE.GRASS_TOP, TILE.GRASS_SIDE, TILE.DIRT] },
  [BLOCK.LUSH_GRASS]:       { faces: [TILE.LUSH_GRASS_TOP, TILE.GRASS_SIDE, TILE.DIRT] },
  [BLOCK.TERRACE_GRASS]:    { faces: [TILE.TERRACE_TOP, TILE.GRASS_SIDE, TILE.DIRT] },
  [BLOCK.DIRT]:             { faces: [TILE.DIRT, TILE.DIRT, TILE.DIRT] },
  [BLOCK.SAND]:             { faces: [TILE.SAND, TILE.SAND, TILE.SAND] },
  [BLOCK.WET_SAND]:         { faces: [TILE.WET_SAND, TILE.WET_SAND, TILE.WET_SAND] },
  [BLOCK.CHALK_CLIFF]:      { faces: [TILE.CHALK_CLIFF, TILE.CHALK_CLIFF, TILE.CHALK_CLIFF] },
  [BLOCK.STONE]:            { faces: [TILE.STONE, TILE.STONE, TILE.STONE] },
  [BLOCK.DARK_STONE]:       { faces: [TILE.DARK_STONE, TILE.DARK_STONE, TILE.DARK_STONE] },
  [BLOCK.MOSS_STONE]:       { faces: [TILE.LUSH_GRASS_TOP, TILE.MOSS_STONE, TILE.STONE] },
  [BLOCK.SNOW]:             { faces: [TILE.SNOW, TILE.SNOW, TILE.SNOW] },
  [BLOCK.SNOW_STONE]:       { faces: [TILE.SNOW, TILE.SNOW_SIDE, TILE.STONE] },
  [BLOCK.ICE_GLACIER]:      { faces: [TILE.ICE_GLACIER, TILE.ICE_GLACIER, TILE.ICE_GLACIER] },
  [BLOCK.COBBLESTONE]:      { faces: [TILE.COBBLESTONE, TILE.COBBLESTONE, TILE.COBBLESTONE] },

  [BLOCK.VIADUCT_STONE]:    { faces: [TILE.VIADUCT_TRIM, TILE.VIADUCT_STONE, TILE.VIADUCT_STONE] },
  [BLOCK.VIADUCT_TRIM]:     { faces: [TILE.VIADUCT_TRIM, TILE.VIADUCT_TRIM, TILE.VIADUCT_TRIM] },
  [BLOCK.TUNNEL_DARK]:      { faces: [TILE.TUNNEL_DARK, TILE.TUNNEL_DARK, TILE.TUNNEL_DARK], noAO: true },
  [BLOCK.RAIL_BED]:         { faces: [TILE.RAIL_TOP, TILE.GRAVEL, TILE.GRAVEL] },
  [BLOCK.WOOD_OAK]:         { faces: [TILE.WOOD_OAK, TILE.WOOD_OAK, TILE.WOOD_OAK] },
  [BLOCK.WOOD_DARK]:        { faces: [TILE.WOOD_DARK, TILE.WOOD_DARK, TILE.WOOD_DARK] },
  [BLOCK.WOOD_BIRCH]:       { faces: [TILE.WOOD_BIRCH, TILE.WOOD_BIRCH, TILE.WOOD_BIRCH] },
  [BLOCK.PLASTER_CREAM]:    { faces: [TILE.PLASTER_CREAM, TILE.PLASTER_CREAM, TILE.PLASTER_CREAM] },
  [BLOCK.LIGHTHOUSE_WHITE]: { faces: [TILE.LIGHTHOUSE_WHITE, TILE.LIGHTHOUSE_WHITE, TILE.LIGHTHOUSE_WHITE] },
  [BLOCK.LIGHTHOUSE_RED]:   { faces: [TILE.LIGHTHOUSE_RED, TILE.LIGHTHOUSE_RED, TILE.LIGHTHOUSE_RED] },
  [BLOCK.ROOF_TERRACOTTA]:  { faces: [TILE.ROOF_TERRACOTTA, TILE.ROOF_TERRACOTTA, TILE.ROOF_TERRACOTTA] },
  [BLOCK.ROOF_BLUE]:        { faces: [TILE.ROOF_BLUE, TILE.ROOF_BLUE, TILE.ROOF_BLUE] },

  [BLOCK.TRUNK_PINE]:       { faces: [TILE.TRUNK_TOP, TILE.TRUNK_PINE_SIDE, TILE.TRUNK_TOP] },
  [BLOCK.TRUNK_SAKURA]:     { faces: [TILE.TRUNK_TOP, TILE.TRUNK_SAKURA_SIDE, TILE.TRUNK_TOP] },
  [BLOCK.LEAF_PINE]:        { faces: [TILE.LEAF_PINE, TILE.LEAF_PINE, TILE.LEAF_PINE] },
  [BLOCK.LEAF_OAK]:         { faces: [TILE.LEAF_OAK, TILE.LEAF_OAK, TILE.LEAF_OAK] },
  [BLOCK.LEAF_WILLOW]:      { faces: [TILE.LEAF_WILLOW, TILE.LEAF_WILLOW, TILE.LEAF_WILLOW] },
  [BLOCK.LEAF_SAKURA]:      { faces: [TILE.LEAF_SAKURA, TILE.LEAF_SAKURA, TILE.LEAF_SAKURA] },
  [BLOCK.LEAF_SAKURA_LIGHT]:{ faces: [TILE.LEAF_SAKURA_LIGHT, TILE.LEAF_SAKURA_LIGHT, TILE.LEAF_SAKURA_LIGHT] },
  [BLOCK.LEAF_GINKGO]:      { faces: [TILE.LEAF_GINKGO, TILE.LEAF_GINKGO, TILE.LEAF_GINKGO] },
  [BLOCK.LEAF_MAPLE]:       { faces: [TILE.LEAF_MAPLE, TILE.LEAF_MAPLE, TILE.LEAF_MAPLE] },

  [BLOCK.FLOWER_LAVENDER]:  { faces: [TILE.FLOWER_LAVENDER, TILE.FLOWER_LAVENDER, TILE.LUSH_GRASS_TOP] },
  [BLOCK.FLOWER_SUN]:       { faces: [TILE.FLOWER_SUN, TILE.FLOWER_SUN, TILE.GRASS_TOP] },
  [BLOCK.FLOWER_POPPY]:     { faces: [TILE.FLOWER_POPPY, TILE.FLOWER_POPPY, TILE.GRASS_TOP] },
  [BLOCK.FLOWER_TULIP_PINK]:{ faces: [TILE.FLOWER_TULIP_PINK, TILE.FLOWER_TULIP_PINK, TILE.GRASS_TOP] },
  [BLOCK.CORAL_PINK]:       { faces: [TILE.CORAL_PINK, TILE.CORAL_PINK, TILE.CORAL_PINK] },
  [BLOCK.CORAL_CYAN]:       { faces: [TILE.CORAL_CYAN, TILE.CORAL_CYAN, TILE.CORAL_CYAN] },
  [BLOCK.KELP_GREEN]:       { faces: [TILE.KELP_GREEN, TILE.KELP_GREEN, TILE.KELP_GREEN] },

  [BLOCK.RIVER_WATER]:      { faces: [TILE.RIVER_WATER, TILE.RIVER_WATER, TILE.RIVER_WATER], translucent: true, noShadow: true },
  [BLOCK.WATER_FOAM]:       { faces: [TILE.WATER_FOAM, TILE.WATER_FOAM, TILE.WATER_FOAM], translucent: true, noShadow: true },
  [BLOCK.GLASS_CLEAR]:      { faces: [TILE.GLASS_CLEAR, TILE.GLASS_CLEAR, TILE.GLASS_CLEAR], translucent: true, noShadow: true },

  [BLOCK.WARM_WINDOW]:      { faces: [TILE.WARM_WINDOW, TILE.WARM_WINDOW, TILE.WARM_WINDOW], emissive: true },
  [BLOCK.LANTERN_GOLD]:     { faces: [TILE.LANTERN_GOLD, TILE.LANTERN_GOLD, TILE.LANTERN_GOLD], emissive: true },
  [BLOCK.BEACON_CORE]:      { faces: [TILE.BEACON_CORE, TILE.BEACON_CORE, TILE.BEACON_CORE], emissive: true },
  [BLOCK.CAMPFIRE_EMBER]:   { faces: [TILE.CAMPFIRE_EMBER, TILE.CAMPFIRE_EMBER, TILE.CAMPFIRE_EMBER], emissive: true },
  [BLOCK.UMBRELLA_CYAN]:    { faces: [TILE.UMBRELLA_CYAN, TILE.UMBRELLA_CYAN, TILE.UMBRELLA_CYAN] },
  [BLOCK.UMBRELLA_CORAL]:   { faces: [TILE.UMBRELLA_CORAL, TILE.UMBRELLA_CORAL, TILE.UMBRELLA_CORAL] }
};

export function isTranslucentBlock(id) {
  if (id === BLOCK.AIR) return true;
  const info = BLOCK_INFO[id];
  return !!(info && info.translucent);
}

export function isEmissiveBlock(id) {
  const info = BLOCK_INFO[id];
  return !!(info && info.emissive);
}
