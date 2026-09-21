/**
 * three@0.169 does not ship type declarations for the `three/webgpu` /
 * `three/tsl` entry points (the WebGPURenderer + TSL node system used
 * throughout this project) or for examples/jsm addons. These ambient
 * shims keep the project's own code compiling while treating the three.js
 * surface itself as `any`, which is safe here since this app only
 * consumes it and never re-exports its types across a package boundary.
 */
declare module "three/webgpu" {
  const content: any;
  export = content;
}

declare module "three/tsl" {
  const content: any;
  export = content;
}

declare module "three/examples/jsm/environments/RoomEnvironment.js" {
  const content: any;
  export = content;
}
