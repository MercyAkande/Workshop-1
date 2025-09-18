// app.js — main Three.js logic (ES module)
// NOTE: This file assumes a local server because of module imports.
// If you don't have one: `python -m http.server 8000` or `npx serve` in the folder.

import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.150.1/examples/jsm/controls/OrbitControls.js';

// ---------- Basic scene setup ----------
const container = document.getElementById('container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b0f14, 0.02);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 2000);
camera.position.set(0, 30, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// orbit controls (desktop + mobile)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.minDistance = 10;
controls.maxDistance = 300;

// ---------- Lights (simulate Sun and Torch) ----------
const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff1c9, 0.8); // warm sunlight
sunLight.position.set(50, 80, 20);
sunLight.castShadow = false;
scene.add(sunLight);

const torchLight = new THREE.PointLight(0xffdcaa, 0.0, 200, 2); // starts off
torchLight.position.set(-40, 10, 20);
scene.add(torchLight);

// ---------- Helper variables ----------
const nodeGroup = new THREE.Group();
scene.add(nodeGroup);

const edgeGroup = new THREE.Group();
scene.add(edgeGroup);

const particleGroup = new THREE.Group();
scene.add(particleGroup);

// raycaster for interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// animation / tween helpers
const clock = new THREE.Clock();

// ---------- Ontology data (editable) ----------
/*
  Nodes have: id, label, category (affects color/behavior), position (optional)
  Edges: source id, target id
*/
const nodes = [
  { id: 'Material', label: 'Responsive Material', category: 'core', position: new THREE.Vector3(0, 0, 0) },
  { id: 'Sun', label: 'Sun (ambient light)', category: 'light', position: new THREE.Vector3(50, 40, -20) },
  { id: 'Torch', label: 'Torch / Lamp', category: 'light', position: new THREE.Vector3(-50, 18, 8) },
  { id: 'Wrapping', label: 'Wrapping / Cover', category: 'usage', position: new THREE.Vector3(24, -10, 12) },
  { id: 'Body', label: 'Product Body', category: 'usage', position: new THREE.Vector3(-28, -12, 14) },
  { id: 'Feeding', label: 'Pet Feeding Use', category: 'usecase', position: new THREE.Vector3(0, -28, 0) },
  { id: 'Responsivity', label: 'Responsivity Modes', category: 'property', position: new THREE.Vector3(0, 20, -20) },
  { id: 'Thermo', label: 'Thermochromic', category: 'property', position: new THREE.Vector3(18, 28, -5) },
  { id: 'Hydro', label: 'Hydrochromic', category: 'property', position: new THREE.Vector3(-18, 28, -5) },
  { id: 'Safety', label: 'Safety / Non-toxic', category: 'constraint', position: new THREE.Vector3(-48, -28, -10) },
  { id: 'Cleaning', label: 'Cleaning / Durability', category: 'constraint', position: new THREE.Vector3(48, -28, -10) },
  { id: 'Manufacture', label: 'Manufacturability', category: 'process', position: new THREE.Vector3(0, 40, 18) },
];

const edges = [
  ['Material', 'Sun'],
  ['Material', 'Torch'],
  ['Material', 'Wrapping'],
  ['Material', 'Body'],
  ['Material', 'Responsivity'],
  ['Responsivity', 'Thermo'],
  ['Responsivity', 'Hydro'],
  ['Body', 'Feeding'],
  ['Wrapping', 'Feeding'],
  ['Material', 'Safety'],
  ['Material', 'Cleaning'],
  ['Material', 'Manufacture'],
];

// ---------- Visual styles per category ----------
const categoryStyle = {
  core: { color: 0x60e6ff, size: 2.4 },
  light: { color: 0xffd17a, size: 2.1 },
  usage: { color: 0x9be76b, size: 1.9 },
  property: { color: 0xd78fff, size: 1.8 },
  constraint: { color: 0xff8b8b, size: 1.7 },
  process: { color: 0xa7c0ff, size: 1.6 },
  default: { color: 0xffffff, size: 1.6 }
};

// maps id -> mesh and metadata
const nodeMap = new Map();

// ---------- Create nodes ----------
const sphereGeom = new THREE.SphereGeometry(1, 24, 24);
const labelCanvasCache = new Map();

function makeLabelTexture(text) {
  // cache small label textures to reduce cost
  if (labelCanvasCache.has(text)) return labelCanvasCache.get(text);
  const fontSize = 48;
  const padding = 12;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px Inter, Arial`;
  const w = Math.ceil(ctx.measureText(text).width) + padding*2;
  const h = fontSize + padding*2;
  canvas.width = w;
  canvas.height = h;
  // background
  ctx.fillStyle = 'rgba(8,10,12,0.0)';
  ctx.fillRect(0,0,w,h);
  // text
  ctx.font = `${fontSize}px Inter, Arial`;
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padding, h/2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  labelCanvasCache.set(text, texture);
  return texture;
}

for (const n of nodes) {
  const style = categoryStyle[n.category] || categoryStyle.default;
  const mat = new THREE.MeshStandardMaterial({
    color: style.color,
    metalness: 0.3,
    roughness: 0.6,
    emissive: 0x000000,
    emissiveIntensity: 0.0,
  });
  const mesh = new THREE.Mesh(sphereGeom, mat);
  mesh.scale.setScalar(style.size);
  mesh.position.copy(n.position || new THREE.Vector3(
    (Math.random()-0.5)*40, (Math.random()-0.5)*20, (Math.random()-0.5)*40
  ));
  mesh.userData = { id: n.id, label: n.label, category: n.category, baseScale: style.size };
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  // label as sprite
  const labelTex = makeLabelTexture(n.label);
  const labelMat = new THREE.SpriteMaterial({ map: labelTex, depthTest: false, sizeAttenuation: true });
  const sprite = new THREE.Sprite(labelMat);
  sprite.scale.set(12, 3.6, 1);
  sprite.position.set(0, style.size + 1.4, 0);
  mesh.add(sprite);

  nodeGroup.add(mesh);
  nodeMap.set(n.id, { mesh, data: n });
}

// ---------- Create edges ----------
const edgeMat = new THREE.LineBasicMaterial({ color: 0x2f82ff, transparent: true, opacity: 0.35 });
for (const [a,b] of edges) {
  const na = nodeMap.get(a).mesh;
  const nb = nodeMap.get(b).mesh;
  const geo = new THREE.BufferGeometry().setFromPoints([na.position, nb.position]);
  const line = new THREE.Line(geo, edgeMat.clone());
  line.userData = { a, b };
  edgeGroup.add(line);
}

// ---------- Particles for interaction feedback ----------
const particlePool = [];
const PARTICLE_MAX = 200;
for (let i=0;i<PARTICLE_MAX;i++){
  const g = new THREE.SphereGeometry(0.08, 6, 6);
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const p = new THREE.Mesh(g, m);
  p.userData = { alive: false, life: 0, velocity: new THREE.Vector3() };
  p.visible = false;
  particlePool.push(p);
  particleGroup.add(p);
}

// ---------- Interaction: raycast + pointer events ----------
let dragging = null;
let dragOffset = new THREE.Vector3();
let activeIntersect = null;

// get pointer in normalized device coords
function updatePointer(ev){
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ( (ev.clientX - rect.left) / rect.width ) * 2 - 1;
  const y = - ( (ev.clientY - rect.top) / rect.height ) * 2 + 1;
  pointer.set(x,y);
}

function spawnParticles(origin, color=0xffffff) {
  for (const p of particlePool) {
    if (!p.userData.alive) {
      p.userData.alive = true;
      p.userData.life = 0.7 + Math.random()*0.6;
      p.position.copy(origin);
      p.scale.setScalar(0.6 + Math.random()*0.6);
      p.material.color.setHex(color);
      p.material.opacity = 1.0;
      // random velocity
      p.userData.velocity.set(
        (Math.random()-0.5)*6,
        Math.random()*6,
        (Math.random()-0.5)*6
      );
      p.visible = true;
      break;
    }
  }
}

// respond to tapping a node
function onNodeActivate(nodeEntry) {
  const mesh = nodeEntry.mesh;
  // pulse scale & emissive
  const base = mesh.userData.baseScale || 1.0;
  // simple tween via userData
  mesh.userData._pulse = { t: 0, duration: 0.6, peak: base * 1.6 };

  // emissive color and particle burst
  const cat = mesh.userData.category;
  const color = (categoryStyle[cat]||categoryStyle.default).color;
  mesh.material.emissive.setHex(color);
  mesh.material.emissiveIntensity = 0.9;

  // spawn particle burst
  for (let i=0;i<8;i++) spawnParticles(mesh.getWorldPosition(new THREE.Vector3()), color);

  // if the activated node is Sun or Torch, adjust lights
  if (mesh.userData.id === 'Sun') {
    // toggle sun intensity briefly
    sunLight.intensity = Math.min(2.2, sunLight.intensity + 0.9);
  } else if (mesh.userData.id === 'Torch') {
    torchLight.intensity = Math.min(3.0, torchLight.intensity + 1.6);
  }
}

// pointer event handlers
function onPointerDown(ev){
  updatePointer(ev);
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(Array.from(nodeMap.values()).map(x=>x.mesh), true);
  if (intersects.length > 0) {
    const hit = intersects[0];
    const mesh = hit.object;
    // mark dragging
    dragging = mesh;
    // compute offset between hit position and mesh position in world
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), hit.point);
    dragOffset.copy(hit.point).sub(mesh.position);
    // activate response
    onNodeActivate(nodeMap.get(mesh.userData.id));
  } else {
    dragging = null;
  }
}

function onPointerMove(ev){
  if (!dragging) return;
  updatePointer(ev);
  // project pointer to world and set node position
  raycaster.setFromCamera(pointer, camera);
  // intersect with plane parallel to camera at dragging depth
  const dir = raycaster.ray.direction;
  const origin = raycaster.ray.origin;
  const depth = dragging.position.distanceTo(camera.position);
  const target = new THREE.Vector3().copy(dir).multiplyScalar(depth).add(origin);
  // set new position with offset
  dragging.position.copy(target.sub(dragOffset));
  // update edges connected to this node
  for (const line of edgeGroup.children) {
    if (line.userData.a === dragging.userData.id || line.userData.b === dragging.userData.id) {
      const aPos = nodeMap.get(line.userData.a).mesh.position;
      const bPos = nodeMap.get(line.userData.b).mesh.position;
      line.geometry.setFromPoints([aPos, bPos]);
      line.geometry.attributes.position.needsUpdate = true;
    }
  }
}

function onPointerUp(ev){
  // stop dragging
  dragging = null;
}

// handle global pointer (works for mouse and touch)
renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);

// also support touchstart/touchmove via pointer events (above suffices)

// reset button
document.getElementById('resetBtn').addEventListener('click', () => {
  controls.reset();
  camera.position.set(0,30,80);
  sunLight.intensity = 0.8;
  torchLight.intensity = 0.0;
  // reset nodes to base scale and emissive
  nodeMap.forEach(({mesh})=>{
    mesh.scale.setScalar(mesh.userData.baseScale || 1.6);
    mesh.material.emissiveIntensity = 0.0;
    mesh.material.emissive.setHex(0x000000);
  });
});

// ---------- Animation loop ----------
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // damp emissive & pulse animations for nodes
  nodeMap.forEach(({mesh})=>{
    // pulse handling
    const pulse = mesh.userData._pulse;
    if (pulse) {
      pulse.t += dt;
      const p = Math.sin((pulse.t / pulse.duration) * Math.PI) * 0.6 + 0.4;
      const targetScale = THREE.MathUtils.lerp(mesh.userData.baseScale, pulse.peak, p);
      mesh.scale.lerp(new THREE.Vector3(targetScale,targetScale,targetScale), 0.18);
      // fade emissive over time
      mesh.material.emissiveIntensity = Math.max(0, mesh.material.emissiveIntensity - dt * 1.2);
      if (pulse.t > pulse.duration + 0.2) {
        delete mesh.userData._pulse;
        // ensure back to base
        mesh.scale.lerp(new THREE.Vector3(mesh.userData.baseScale,mesh.userData.baseScale,mesh.userData.baseScale), 0.2);
      }
    } else {
      // tiny breathing for alive mesh
      mesh.scale.x = THREE.MathUtils.lerp(mesh.scale.x, mesh.userData.baseScale, 0.04);
      mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, mesh.userData.baseScale, 0.04);
      mesh.scale.z = THREE.MathUtils.lerp(mesh.scale.z, mesh.userData.baseScale, 0.04);
      // emissive relax
      mesh.material.emissiveIntensity = Math.max(0, mesh.material.emissiveIntensity - dt * 0.2);
      if (mesh.material.emissiveIntensity === 0) mesh.material.emissive.setHex(0x000000);
    }
  });

  // update particles
  for (const p of particlePool) {
    if (!p.userData.alive) continue;
    p.userData.life -= dt;
    if (p.userData.life <= 0) {
      p.userData.alive = false;
      p.visible = false;
      continue;
    }
    // basic Euler step
    p.position.addScaledVector(p.userData.velocity, dt);
    p.userData.velocity.multiplyScalar(0.98);
    p.material.opacity = Math.max(0, p.userData.life / 1.2);
  }

  // slowly cool down special lights
  sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, 0.8, dt*0.6);
  torchLight.intensity = THREE.MathUtils.lerp(torchLight.intensity, 0.0, dt*1.2);

  // subtle node motion to make it feel alive
  nodeGroup.children.forEach((m, idx) => {
    const off = Math.sin(clock.elapsedTime * 0.3 + idx) * 0.08;
    m.position.y += off * dt;
  });

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ---------- handle resize ----------
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Accessibility: pointer tap highlight on touch (visual feedback) ----------
renderer.domElement.addEventListener('pointerdown', (ev)=>{
  // show a small ripple at the touch point for mobile feel
  const ripple = document.createElement('div');
  ripple.className = 'touch-feedback';
  ripple.style.left = (ev.clientX - 20) + 'px';
  ripple.style.top = (ev.clientY - 20) + 'px';
  ripple.style.width = '40px';
  ripple.style.height = '40px';
  ripple.style.borderRadius = '50%';
  ripple.style.background = 'rgba(255,255,255,0.06)';
  ripple.style.backdropFilter = 'blur(2px)';
  ripple.style.transition = 'transform 700ms ease, opacity 700ms ease';
  document.body.appendChild(ripple);
  requestAnimationFrame(()=> {
    ripple.style.transform = 'scale(3)';
    ripple.style.opacity = '0';
  });
  setTimeout(()=> ripple.remove(), 800);
});
