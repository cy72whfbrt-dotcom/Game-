export const crackVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const crackFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uIntensity;

  varying vec2 vUv;

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 p = vUv * 7.0;
    float n1 = noise2(p);
    float n2 = noise2(p * 2.1 + 11.7);

    float crackA = 1.0 - smoothstep(0.0, 0.035, abs(n1 - 0.5));
    float crackB = 1.0 - smoothstep(0.0, 0.025, abs(n2 - 0.5));
    float mask = max(crackA, crackB * 0.6);

    float pulse = 0.55 + 0.45 * sin(uTime * 1.6);
    float radial = 1.0 - smoothstep(0.32, 0.5, length(vUv - 0.5));

    float glow = mask * pulse * radial * uIntensity;
    gl_FragColor = vec4(uColor, clamp(glow, 0.0, 1.0));
  }
`;
