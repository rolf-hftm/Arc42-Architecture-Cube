// Fix TypeScript module declarations for Three.js "addons" import paths in Angular builds.
// Keeps proper typings by re-exporting from the examples/jsm modules.

declare module 'three/addons/controls/OrbitControls.js' {
  export { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
}

declare module 'three/addons/renderers/CSS2DRenderer.js' {
  export { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
}

declare module 'three/addons/environments/RoomEnvironment.js' {
  export { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
}
