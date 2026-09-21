export const VignetteGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignetteStrength: { value: 0.55 },
    uGrainStrength: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignetteStrength;
    uniform float uGrainStrength;
    varying vec2 vUv;

    float grainNoise(vec2 uv) {
      return fract(sin(dot(uv, vec2(12.9898, 78.233)) + uTime * 60.0) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      vec2 centered = vUv - 0.5;
      float vignette = 1.0 - dot(centered, centered) * uVignetteStrength * 1.6;
      color.rgb *= clamp(vignette, 0.0, 1.0);

      float grain = (grainNoise(vUv) - 0.5) * uGrainStrength;
      color.rgb += grain;

      gl_FragColor = color;
    }
  `,
};
