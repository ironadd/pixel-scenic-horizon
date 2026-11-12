import * as THREE from 'three';

export function createPixelOcean(shoreDepthTex, worldSizeX, worldSizeZ, seaLevel) {
  const uniforms = {
    uTime: { value: 0 },
    uShoreTex: { value: shoreDepthTex },
    uWorldSize: { value: new THREE.Vector2(worldSizeX, worldSizeZ) },
    uShallowColor: { value: new THREE.Color(0x46f0df) },
    uMidOceanColor: { value: new THREE.Color(0x1690db) },
    uDeepOceanColor: { value: new THREE.Color(0x0d4688) },
    uFoamColor: { value: new THREE.Color(0xf7fdff) },
    uHorizonColor: { value: new THREE.Color(0xbceaff) },
    uSunDir: { value: new THREE.Vector3(-0.35, 0.55, 0.75).normalize() },
    uSpecColor: { value: new THREE.Color(0xfff4c2) },
    uNightAmount: { value: 0.0 },
    uLighthousePos: { value: new THREE.Vector3(67.5, 55.8, 38.5) },
    uLighthouseAngle: { value: 0.0 },
    uLighthouseIntensity: { value: 0.0 }
  };

  const vertexShader = /* glsl */ `
    uniform float uTime;
    varying vec3 vWorldPos;

    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      // Gentle stepped ocean swell near center
      float dist = length(wp.xz);
      float swell = sin(floor(wp.x * 0.5) * 0.35 + uTime * 1.4) * cos(floor(wp.z * 0.5) * 0.35 - uTime * 1.1) * 0.09;
      wp.y += swell * smoothstep(550.0, 80.0, dist);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const fragmentShader = /* glsl */ `
    uniform float uTime;
    uniform sampler2D uShoreTex;
    uniform vec2 uWorldSize;
    uniform vec3 uShallowColor;
    uniform vec3 uMidOceanColor;
    uniform vec3 uDeepOceanColor;
    uniform vec3 uFoamColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uSunDir;
    uniform vec3 uSpecColor;
    uniform float uNightAmount;
    uniform vec3 uLighthousePos;
    uniform float uLighthouseAngle;
    uniform float uLighthouseIntensity;

    varying vec3 vWorldPos;

    float hash21(vec2 p) {
      p = fract(p * vec2(127.1, 311.7));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }

    void main() {
      // Quantize world XZ to 4x4 sub-pixels per voxel -> genuine crisp pixel-art water!
      vec2 pixXZ = floor(vWorldPos.xz * 4.0) / 4.0;

      // Sample shore depth inside voxel world bounds; smoothly default to deep water outside
      vec2 uv = (pixXZ + uWorldSize * 0.5) / uWorldSize;
      float inGrid = step(0.002, uv.x) * step(uv.x, 0.998) * step(0.002, uv.y) * step(uv.y, 0.998);
      float rawDepth = mix(1.0, texture2D(uShoreTex, clamp(uv, 0.002, 0.998)).r, inGrid);

      // Animated pixel wave ripples
      float w1 = vnoise(pixXZ * 0.28 + vec2(uTime * 0.35, -uTime * 0.42));
      float w2 = vnoise(pixXZ * 0.55 + vec2(-uTime * 0.48, uTime * 0.31));
      float waveMix = (w1 * 0.6 + w2 * 0.4);

      // Depth-based turquoise -> cerulean -> sapphire color bands
      vec3 waterCol = mix(uShallowColor, uMidOceanColor, smoothstep(0.04, 0.36, rawDepth));
      waterCol = mix(waterCol, uDeepOceanColor, smoothstep(0.34, 0.82, rawDepth));

      // Crisp pixel wave crest highlights across open water
      float openCrest = step(0.77, waveMix + sin(pixXZ.y * 0.45 - uTime * 1.6) * 0.08);
      waterCol = mix(waterCol, mix(waterCol, uFoamColor, 0.28), openCrest * (1.0 - uNightAmount * 0.55));

      // Shoreline Surf Waves & Night Bioluminescent "Blue Tears" (星海蓝眼泪)!
      float alpha = mix(0.62, 0.95, smoothstep(0.02, 0.45, rawDepth));
      if (rawDepth < 0.32 && rawDepth > 0.001) {
        float surfPhase = rawDepth * 28.0 - uTime * 2.2 + (w1 - 0.5) * 2.2;
        float surfWave = sin(surfPhase);
        float shoreEdge = 1.0 - smoothstep(0.0, 0.28, rawDepth);
        float foamMask = step(0.38, surfWave * shoreEdge + (1.0 - smoothstep(0.0, 0.075, rawDepth)) * 0.65);

        if (foamMask > 0.5) {
          // At night, shoreline surf shimmers with romantic bioluminescent electric cyan-blue!
          vec3 nightBioCol = vec3(0.18, 0.88, 1.0) * 1.45;
          vec3 activeFoam = mix(uFoamColor, nightBioCol, uNightAmount * 0.78);
          waterCol = mix(waterCol, activeFoam, 0.9);
          alpha = max(alpha, 0.92);
        }
      }

      // Pixelated Sun / Moon Glittering Reflection Path across the Sea!
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 waveNorm = normalize(vec3(
        (w1 - 0.5) * 0.42 + sin(pixXZ.x * 0.9 + uTime * 2.1) * 0.08,
        1.0,
        (w2 - 0.5) * 0.42 + cos(pixXZ.y * 0.9 - uTime * 1.8) * 0.08
      ));

      vec3 lightDir = normalize(vec3(uSunDir.x, max(0.08, abs(uSunDir.y)), uSunDir.z));
      vec3 halfVec = normalize(lightDir + viewDir);
      float spec = pow(max(0.0, dot(waveNorm, halfVec)), 52.0);
      // Quantize glitter into crisp dancing pixel diamonds!
      float pixGlitter = step(0.24, spec) * 0.55 + step(0.52, spec) * 0.85;
      waterCol += uSpecColor * pixGlitter;

      // Sweeping Lighthouse Beam Reflection on Night/Dusk Waves!
      if (uLighthouseIntensity > 0.02) {
        vec2 toWater = pixXZ - uLighthousePos.xz;
        float distLH = length(toWater);
        if (distLH > 5.0 && distLH < 210.0) {
          vec2 dirLH = toWater / distLH;
          vec2 beamDir = vec2(cos(uLighthouseAngle), sin(uLighthouseAngle));
          // Dual-sided lighthouse beam
          float align = abs(dot(dirLH, beamDir));
          float beamCone = smoothstep(0.955, 0.998, align);
          float atten = (1.0 - distLH / 210.0);
          waterCol += vec3(1.0, 0.92, 0.65) * beamCone * atten * uLighthouseIntensity * (0.45 + 0.55 * waveMix);
        }
      }

      // Seamless Horizon Mist Blend so ocean meets sky with zero hard edge!
      float camDist = length(vWorldPos.xz);
      float horizonFade = smoothstep(145.0, 560.0, camDist);
      waterCol = mix(waterCol, uHorizonColor, horizonFade);
      alpha = mix(alpha, 1.0, horizonFade);

      gl_FragColor = vec4(waterCol, alpha);
    }
  `;

  const geo = new THREE.PlaneGeometry(1280, 1280, 96, 96);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = seaLevel + 0.68;
  mesh.renderOrder = 1;
  return { mesh, uniforms };
}
