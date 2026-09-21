export const trailVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const trailFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uSpeed;
  uniform float uIntensity;

  varying vec2 vUv;

  void main() {
    float t = fract(vUv.y * 5.0 - uTime * uSpeed);
    float stripe = smoothstep(0.0, 0.12, t) - smoothstep(0.42, 0.55, t);

    float edge = smoothstep(0.0, 0.2, vUv.x) * (1.0 - smoothstep(0.8, 1.0, vUv.x));
    float glow = stripe * edge * uIntensity;

    gl_FragColor = vec4(uColor, clamp(glow, 0.0, 1.0));
  }
`;
