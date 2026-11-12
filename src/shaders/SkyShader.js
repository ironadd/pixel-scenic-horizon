import * as THREE from 'three';

export function createPixelSky() {
  const uniforms = {
    uTime: { value: 0 },
    uZenithColor: { value: new THREE.Color(0x1b6fe8) },
    uMidSkyColor: { value: new THREE.Color(0x5bb8ff) },
    uHorizonColor: { value: new THREE.Color(0xbceaff) },
    uSunsetGlowColor: { value: new THREE.Color(0xff7b42) },
    uSunDir: { value: new THREE.Vector3(-0.35, 0.55, 0.75).normalize() },
    uMoonDir: { value: new THREE.Vector3(0.35, 0.62, -0.70).normalize() },
    uSunColor: { value: new THREE.Color(0xfff5cc) },
    uNightAmount: { value: 0.0 },
    uSunsetAmount: { value: 0.0 },
    uAuroraAmount: { value: 0.0 }
  };

  const vertexShader = /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    uniform float uTime;
    uniform vec3 uZenithColor;
    uniform vec3 uMidSkyColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uSunsetGlowColor;
    uniform vec3 uSunDir;
    uniform vec3 uMoonDir;
    uniform vec3 uSunColor;
    uniform float uNightAmount;
    uniform float uSunsetAmount;
    uniform float uAuroraAmount;

    varying vec3 vDir;

    float hash21(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }

    float noise2(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
      vec3 dir = normalize(vDir);

      // Subtle pixel-art angular quantization for sun/stars/bands
      vec3 pixDir = normalize(floor(dir * 260.0 + 0.5) / 260.0);

      float h = clamp(dir.y, 0.0, 1.0);
      // Painterly stepped-smooth vertical sky gradient
      float hBand = mix(h, floor(h * 28.0) / 28.0, 0.25);

      vec3 col = mix(uHorizonColor, uMidSkyColor, smoothstep(0.0, 0.28, hBand));
      col = mix(col, uZenithColor, smoothstep(0.24, 0.85, hBand));

      // Warm radial sunset / sunrise horizon bloom around sun azimuth
      float sunHorizDot = max(0.0, dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))));
      float horizonGlow = pow(sunHorizDot, 2.5) * exp(-h * 5.2) * uSunsetAmount;
      col += uSunsetGlowColor * horizonGlow * 0.85;

      // Pixelated Giant Sun Disc & Stepped Corona (only when above horizon)
      if (uSunDir.y > -0.12) {
        // Construct tangent basis around sun for crisp square pixel-art disc!
        vec3 upRef = abs(uSunDir.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
        vec3 sRight = normalize(cross(upRef, uSunDir));
        vec3 sUp = cross(uSunDir, sRight);

        float sx = dot(dir, sRight);
        float sy = dot(dir, sUp);
        float forward = dot(dir, uSunDir);

        if (forward > 0.7) {
          float sunScale = mix(0.048, 0.076, uSunsetAmount); // Bigger dramatic sunset sun!
          vec2 sunPix = floor(vec2(sx, sy) / (sunScale / 7.0) + 0.5) * (sunScale / 7.0);
          float dSun = length(sunPix);

          if (dSun < sunScale) {
            // Vertical gradient across sun disc (white-gold top -> tangerine-coral bottom at sunset)
            float sunGrad = clamp((sy / sunScale) * 0.5 + 0.5, 0.0, 1.0);
            vec3 discCol = mix(mix(uSunColor, vec3(1.0, 0.36, 0.18), uSunsetAmount * 0.75), vec3(1.0, 0.98, 0.86), sunGrad);
            // Clip cleanly below sea horizon
            float vis = smoothstep(-0.015, 0.01, dir.y);
            col = mix(col, discCol * 1.35, vis);
          } else {
            float halo = exp(-max(0.0, dSun - sunScale) * 18.0) * smoothstep(-0.05, 0.05, uSunDir.y);
            col += uSunColor * halo * 0.55;
          }
        }
      }

      // Night Sky: Pixel Stars, Milky Way River & Shimmering Aurora!
      if (uNightAmount > 0.02 && dir.y > 0.0) {
        float upperMask = smoothstep(0.01, 0.16, dir.y);

        // Starfield on spherical pixel cells
        vec2 starSphere = vec2(atan(pixDir.z, pixDir.x) * 95.0, pixDir.y * 140.0);
        vec2 starCell = floor(starSphere);
        float starRnd = hash21(starCell);
        if (starRnd > 0.982) {
          float twinkle = 0.62 + 0.38 * sin(uTime * (1.8 + fract(starRnd * 37.0) * 3.5) + starRnd * 80.0);
          vec3 starTint = mix(vec3(0.82, 0.92, 1.0), vec3(1.0, 0.92, 0.76), fract(starRnd * 19.0));
          col += starTint * twinkle * uNightAmount * upperMask * 1.35;
        }

        // Diagonal Milky Way Stardust Band
        float mwCoord = dir.x * 0.65 + dir.z * 0.45 - (dir.y - 0.45) * 0.55;
        float mwBand = exp(-mwCoord * mwCoord * 11.0);
        float mwCloud = noise2(vec2(atan(dir.z, dir.x) * 6.0, dir.y * 8.0));
        col += vec3(0.24, 0.34, 0.65) * mwBand * mwCloud * uNightAmount * upperMask * 0.55;

        // Pixelated Northern Aurora Borealis Curtain
        if (uAuroraAmount > 0.01) {
          float aurWave = sin(pixDir.x * 5.5 + uTime * 0.35) * 0.06 + cos(pixDir.x * 11.0 - uTime * 0.22) * 0.03;
          float aurBand = smoothstep(0.12, 0.28, pixDir.y + aurWave) * smoothstep(0.62, 0.32, pixDir.y + aurWave);
          float northMask = smoothstep(-0.2, -0.75, dir.z); // Concentrated above snow mountains!
          float folds = 0.45 + 0.55 * sin(pixDir.x * 28.0 + noise2(vec2(pixDir.x * 12.0, uTime * 0.25)) * 5.0);
          vec3 aurCol = mix(vec3(0.12, 0.95, 0.68), vec3(0.56, 0.32, 0.98), clamp((pixDir.y - 0.18) * 3.2, 0.0, 1.0));
          col += aurCol * aurBand * northMask * folds * uAuroraAmount * 0.72;
        }

        // Pixel Crescent / Full Moon Disc with subtle pixel craters
        vec3 mUpRef = vec3(0.0, 1.0, 0.0);
        vec3 mRight = normalize(cross(mUpRef, uMoonDir));
        vec3 mUp = cross(uMoonDir, mRight);
        float mx = dot(dir, mRight);
        float my = dot(dir, mUp);
        if (dot(dir, uMoonDir) > 0.8) {
          float mScale = 0.042;
          vec2 mPix = floor(vec2(mx, my) / (mScale / 6.0) + 0.5) * (mScale / 6.0);
          float dMoon = length(mPix);
          if (dMoon < mScale) {
            float crater = step(0.62, hash21(floor(mPix * 220.0)));
            vec3 moonSurf = mix(vec3(0.95, 0.97, 1.0), vec3(0.76, 0.83, 0.94), crater * 0.45);
            col = mix(col, moonSurf * 1.25, uNightAmount * upperMask);
          } else {
            float mHalo = exp(-max(0.0, dMoon - mScale) * 24.0);
            col += vec3(0.55, 0.72, 1.0) * mHalo * uNightAmount * 0.4;
          }
        }
      }

      // Subtle distant pixel island silhouettes right on the ocean horizon
      if (dir.y >= -0.005 && dir.y < 0.024 && dir.z > 0.15) {
        float az = floor(atan(dir.x, dir.z) * 90.0) / 90.0;
        float silH = max(0.0, sin(az * 7.0 + 1.2) * sin(az * 13.0 - 0.4)) * 0.018;
        if (dir.y < silH) {
          vec3 silCol = mix(uHorizonColor * 0.78, uMidSkyColor * 0.65, 0.5);
          col = mix(col, silCol, 0.55);
        }
      }

      // Below horizon smooth blend to horizon mist
      if (dir.y < 0.0) {
        col = mix(uHorizonColor, uHorizonColor * 0.75, clamp(-dir.y * 4.0, 0.0, 1.0));
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const geo = new THREE.SphereGeometry(680, 48, 32);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}
