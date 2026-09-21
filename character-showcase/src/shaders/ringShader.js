export const ringVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ringFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uSpeed;
  uniform float uSegments;
  uniform float uIntensity;

  varying vec2 vUv;

  void main() {
    float t = fract(vUv.x * uSegments - uTime * uSpeed);
    float bar = smoothstep(0.0, 0.10, t) - smoothstep(0.45, 0.58, t);

    float edgeFade = smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.8, 1.0, vUv.y));
    float pulse = 0.7 + 0.3 * sin(uTime * 2.2);

    float glow = bar * edgeFade * pulse * uIntensity;
    gl_FragColor = vec4(uColor, clamp(glow, 0.0, 1.0));
  }
`;
