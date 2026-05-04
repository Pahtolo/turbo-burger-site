// Turbo Burger 3D scenes.
// Uses a static GLB exported from the supplied robot STEP file plus procedural food/workcell geometry.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = new URL('./assets/ur5e.glb', import.meta.url).href;

const COLORS = {
  ink: 0x0d0b09,
  graphite: 0x24211e,
  paper: 0xf4efe4,
  steel: 0xaeb2aa,
  warmSteel: 0xd7d1c2,
  ember: 0xff5a23,
  emberDeep: 0xa12d17,
  grill: 0x151413,
  pattyRaw: 0xbe7063,
  pattyCooked: 0x6f321e,
};

const robotLoader = new GLTFLoader();
let robotAssetPromise = null;

function loadRobotAsset() {
  robotAssetPromise ??= robotLoader.loadAsync(MODEL_URL).then((gltf) => {
    const asset = gltf.scene;
    asset.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) {
        node.material = node.material.clone();
        node.material.envMapIntensity = 0.65;
      }
    });
    return asset;
  });
  return robotAssetPromise;
}

function cloneRobot(targetHeight = 3.1) {
  return loadRobotAsset().then((asset) => {
    const model = asset.clone(true);
    model.traverse((node) => {
      if (node.isMesh && node.material) node.material = node.material.clone();
    });

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    model.position.sub(center);

    const height = Math.max(size.y, 0.001);
    const scale = targetHeight / height;
    model.scale.setScalar(scale);
    model.userData.loadedRobot = true;
    return model;
  });
}

function material(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.58,
    metalness: opts.metalness ?? 0.1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
}

const mats = {
  grill: material(COLORS.grill, { roughness: 0.42, metalness: 0.55 }),
  steel: material(COLORS.steel, { roughness: 0.38, metalness: 0.5 }),
  graphite: material(COLORS.graphite, { roughness: 0.45, metalness: 0.45 }),
};

// Deterministic pseudo-random helpers keep the model stable across reloads.
function rand(seed) {
  const x = Math.sin(seed * 127.1) * 43758.5453123;
  return x - Math.floor(x);
}

function wave(angle, seed = 1) {
  return (
    Math.sin(angle * 3.0 + seed) * 0.42 +
    Math.sin(angle * 7.0 + seed * 1.7) * 0.32 +
    Math.sin(angle * 11.0 + seed * 0.4) * 0.26
  );
}

function buildIrregularPatty({ radius = 0.52, height = 0.16, cooked = 0.55 } = {}) {
  const geometry = new THREE.CylinderGeometry(radius, radius * 1.04, height, 96, 5, false);
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    const radial = Math.hypot(x, z);
    if (radial > 0.02) {
      const n = wave(angle, 2.3);
      const edgePush = 1 + n * 0.04 + Math.sin(y * 70 + angle * 5) * 0.01;
      pos.setX(i, x * edgePush);
      pos.setZ(i, z * edgePush);
    }
    const capLift = Math.abs(y) > height * 0.45 ? Math.sin(angle * 8.0) * 0.012 : 0;
    pos.setY(i, y + capLift);
  }

  geometry.computeVertexNormals();

  const pattyMat = material(lerpColor(COLORS.pattyRaw, COLORS.pattyCooked, cooked), {
    roughness: 0.86,
  });
  const patty = new THREE.Mesh(geometry, pattyMat);
  patty.castShadow = true;
  patty.receiveShadow = true;

  const group = new THREE.Group();
  group.add(patty);

  group.userData.patty = patty;
  return group;
}

function buildGriddle() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 1.25), mats.grill);
  base.position.y = 0.02;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const lipMat = material(0x34302b, { roughness: 0.4, metalness: 0.6 });
  const backLip = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.16, 0.06), lipMat);
  backLip.position.set(0, 0.13, -0.65);
  group.add(backLip);

  const heatMat = new THREE.MeshBasicMaterial({
    color: COLORS.ember,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 4; i += 1) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.018), heatMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.087 + i * 0.001, -0.36 + i * 0.24);
    group.add(line);
  }

  const glow = new THREE.PointLight(COLORS.ember, 0.8, 4, 2);
  glow.position.set(0, 0.35, 0);
  group.add(glow);
  group.userData.glow = glow;
  return group;
}

function buildPlaceholderRobot() {
  const group = new THREE.Group();
  const wire = new THREE.MeshBasicMaterial({
    color: 0xf2eadc,
    wireframe: true,
    transparent: true,
    opacity: 0.28,
  });
  const joint = new THREE.SphereGeometry(0.16, 16, 10);
  const link = new THREE.CylinderGeometry(0.07, 0.07, 0.72, 16);

  for (let i = 0; i < 5; i += 1) {
    const s = new THREE.Mesh(joint, wire);
    s.position.set(Math.sin(i * 0.8) * 0.22, i * 0.55, 0);
    group.add(s);
    if (i < 4) {
      const l = new THREE.Mesh(link, wire);
      l.position.set(Math.sin(i * 0.8 + 0.4) * 0.15, i * 0.55 + 0.28, 0);
      l.rotation.z = Math.sin(i * 0.5) * 0.25;
      group.add(l);
    }
  }
  return group;
}

function addRobot(parent, options = {}) {
  const holder = new THREE.Group();
  holder.name = 'UR5e_holder';
  holder.position.copy(options.position ?? new THREE.Vector3());
  holder.rotation.set(
    options.rotation?.x ?? 0,
    options.rotation?.y ?? 0,
    options.rotation?.z ?? 0,
  );
  holder.scale.setScalar(options.scale ?? 1);
  parent.add(holder);

  const placeholder = buildPlaceholderRobot();
  placeholder.position.y = -1.2;
  holder.add(placeholder);

  cloneRobot(options.targetHeight ?? 3.1)
    .then((model) => {
      holder.remove(placeholder);
      model.position.y += options.yOffset ?? 0;
      holder.add(model);
      options.onLoaded?.(holder, model);
    })
    .catch((err) => {
      console.warn('Robot model failed to load:', err);
    });

  return holder;
}

function setupRenderer(mountEl) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mountEl.appendChild(renderer.domElement);
  return renderer;
}

function addLights(scene, mood = 'dark') {
  const ambient = new THREE.AmbientLight(0xffffff, mood === 'dark' ? 0.46 : 0.64);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff2dc, mood === 'dark' ? 2.0 : 1.45);
  key.position.set(4.5, 5.2, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 14;
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  scene.add(key);

  const rim = new THREE.DirectionalLight(COLORS.ember, mood === 'dark' ? 1.4 : 0.8);
  rim.position.set(-4, 2.4, -2.2);
  scene.add(rim);

  const cold = new THREE.DirectionalLight(0xc9f4ff, 0.44);
  cold.position.set(0, 4, -5);
  scene.add(cold);
}

function addFloor(scene, { radius = 8, dark = true } = {}) {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 96),
    new THREE.ShadowMaterial({ opacity: dark ? 0.36 : 0.18 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(radius * 1.45, 28, dark ? 0x49433d : 0x8b8274, dark ? 0x302b26 : 0xc7bdaa);
  grid.material.transparent = true;
  grid.material.opacity = dark ? 0.18 : 0.28;
  scene.add(grid);
  return { floor, grid };
}

function addParticleField(scene, count = 140) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (rand(i + 600) - 0.5) * 7.5;
    positions[i * 3 + 1] = rand(i + 700) * 4.2 + 0.15;
    positions[i * 3 + 2] = (rand(i + 800) - 0.5) * 5.5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xf4efe4,
      size: 0.018,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  scene.add(points);
  return points;
}

function resizeObserver(mountEl, camera, renderer, onResize) {
  const ro = new ResizeObserver(() => {
    const width = mountEl.clientWidth;
    const height = mountEl.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    onResize?.(width, height);
  });
  ro.observe(mountEl);
  return ro;
}

export function createHeroScene(mountEl) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, mountEl.clientWidth / mountEl.clientHeight, 0.1, 80);
  const renderer = setupRenderer(mountEl);
  const clock = new THREE.Clock();
  let alive = true;
  let raf = null;

  addLights(scene, 'dark');
  addFloor(scene, { radius: 8, dark: true });
  const particles = addParticleField(scene, 170);

  const heroRig = new THREE.Group();
  heroRig.position.set(1.25, -0.85, -0.25);
  heroRig.rotation.set(0.05, -0.72, -0.04);
  scene.add(heroRig);
  addRobot(heroRig, { targetHeight: 3.9 });

  const heroPatty = buildIrregularPatty({ radius: 0.5, height: 0.15, cooked: 0.55 });
  heroPatty.scale.setScalar(0.76);
  heroPatty.position.set(-1.35, 0.14, 0.55);
  heroPatty.rotation.y = -0.34;
  scene.add(heroPatty);

  const grill = buildGriddle();
  grill.position.set(-1.35, -0.03, 0.55);
  grill.scale.set(0.72, 0.72, 0.72);
  scene.add(grill);

  function frame() {
    const aspect = mountEl.clientWidth / Math.max(1, mountEl.clientHeight);
    const narrow = aspect < 0.85;
    camera.position.set(narrow ? 0.1 : 0.55, narrow ? 2.0 : 1.75, narrow ? 7.0 : 5.9);
    camera.lookAt(narrow ? 0.15 : 0.45, 0.88, 0);
  }
  frame();

  function tick() {
    if (!alive) return;
    const t = clock.getElapsedTime();
    heroRig.rotation.y = -0.72 + Math.sin(t * 0.28) * 0.08;
    heroRig.position.y = -0.85 + Math.sin(t * 0.55) * 0.035;
    heroPatty.rotation.y = -0.34 + Math.sin(t * 0.42) * 0.05;
    grill.userData.glow.intensity = 0.72 + Math.sin(t * 2.2) * 0.08;
    particles.rotation.y = t * 0.025;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  const ro = resizeObserver(mountEl, camera, renderer, frame);

  return {
    dispose() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      mountEl.removeChild(renderer.domElement);
    },
  };
}

export function createTurntableScene(mountEl) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x090807, 6.5, 15);

  const camera = new THREE.PerspectiveCamera(34, mountEl.clientWidth / mountEl.clientHeight, 0.1, 80);
  const renderer = setupRenderer(mountEl);
  const clock = new THREE.Clock();
  let alive = true;
  let lastProgress = 0;
  let raf = null;

  addLights(scene, 'dark');
  addFloor(scene, { radius: 8, dark: true });
  const particles = addParticleField(scene, 120);

  const turntable = new THREE.Group();
  scene.add(turntable);

  const armSide = new THREE.Group();
  armSide.position.set(1.35, 0, 0);
  turntable.add(armSide);
  const robotHolder = addRobot(armSide, {
    targetHeight: 3.15,
    yOffset: -0.08,
    rotation: new THREE.Euler(0, -Math.PI * 0.08, 0),
  });

  const pattySide = new THREE.Group();
  pattySide.position.set(-1.28, 0, 0);
  turntable.add(pattySide);

  const cookPatty = buildIrregularPatty({ radius: 0.52, height: 0.15, cooked: 0 });
  cookPatty.position.set(0.12, 0.12, -0.04);
  cookPatty.rotation.set(0.035, -0.28, -0.025);
  cookPatty.scale.setScalar(0.96);
  pattySide.add(cookPatty);

  let camDist = 6.8;
  let camLookX = 0;
  let camLookY = 1.12;

  function updateCamera(targetFocusArm) {
    const aspect = mountEl.clientWidth / Math.max(1, mountEl.clientHeight);
    const narrowMul = aspect < 0.8 ? 1.45 : aspect < 1.1 ? 1.18 : 1;
    const targetDist = lerp(4.15, 7.2, targetFocusArm) * narrowMul;
    const targetY = lerp(0.88, 1.42, targetFocusArm);
    const targetX = lerp(-0.08, 0.32, targetFocusArm);

    camDist += (targetDist - camDist) * 0.075;
    camLookY += (targetY - camLookY) * 0.075;
    camLookX += (targetX - camLookX) * 0.075;
    camera.position.set(camLookX, lerp(1.55, 2.55, targetFocusArm), camDist);
    camera.lookAt(camLookX, camLookY, 0);
  }

  function setProgress(p) {
    p = Math.max(0, Math.min(1, p));
    lastProgress = p;
    turntable.rotation.y = -Math.PI / 2 + p * Math.PI * 2;

    const cook = smoothstep(0.08, 0.66, p);
    cookPatty.userData.patty.material.color.setHex(lerpColor(COLORS.pattyRaw, COLORS.pattyCooked, smoothstep(0, 1, cook)));
    cookPatty.userData.patty.material.emissive.setHex(0x000000);
    cookPatty.userData.patty.material.emissiveIntensity = 0;

    robotHolder.rotation.z = Math.sin(smoothstep(0.2, 0.86, p) * Math.PI) * 0.035;
  }

  function tick() {
    if (!alive) return;
    const t = clock.getElapsedTime();
    particles.rotation.y = t * 0.018;

    armSide.updateWorldMatrix(true, false);
    pattySide.updateWorldMatrix(true, false);
    const armZ = getWorldZ(armSide);
    const pattyZ = getWorldZ(pattySide);
    const focusArm = smoothstep(-1.25, 1.25, (armZ - pattyZ) / 2);
    updateCamera(focusArm);

    setProgress(lastProgress);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  const ro = resizeObserver(mountEl, camera, renderer);
  setProgress(0);
  tick();

  return {
    setProgress,
    dispose() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      mountEl.removeChild(renderer.domElement);
    },
  };
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(hexA, hexB, t) {
  const ar = (hexA >> 16) & 0xff;
  const ag = (hexA >> 8) & 0xff;
  const ab = hexA & 0xff;
  const br = (hexB >> 16) & 0xff;
  const bg = (hexB >> 8) & 0xff;
  const bb = hexB & 0xff;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const b = Math.round(lerp(ab, bb, t));
  return (r << 16) | (g << 8) | b;
}

const _v = new THREE.Vector3();
function getWorldZ(obj) {
  obj.getWorldPosition(_v);
  return _v.z;
}
