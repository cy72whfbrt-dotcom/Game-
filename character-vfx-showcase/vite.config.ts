import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "./",
  resolve: {
    alias: [
      // three/examples/jsm addons (e.g. RoomEnvironment) import bare "three";
      // alias it to the webgpu build so every module shares one Three.js
      // instance and node-compatible material classes. Only the exact bare
      // specifier is rewritten so "three/tsl" etc. resolve normally.
      { find: /^three$/, replacement: "three/webgpu" },
    ],
  },
  build: {
    target: "esnext",
    outDir: "dist",
  },
  server: {
    host: true,
    port: 5173,
  },
});
