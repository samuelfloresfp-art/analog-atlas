// 3D Moon / Mars selector (three.js, vendored). Both planets spin on their own; the user
// cannot rotate them. Desktop: the selected planet is in front and overlaps the other —
// click the one behind to bring it forward. Mobile (narrow): one planet at a time with
// ← → arrows. Textures: NASA SVS CGI Moon Kit (LRO) and Solar System Scope (NASA data).

import * as THREE from "../../vendor/three/three.module.min.js";

const TEX = {
  moon: { hi: "assets/planets/moon-4k.jpg", lo: "assets/planets/moon-2k.jpg" },
  mars: { hi: "assets/planets/mars-4k.jpg", lo: "assets/planets/mars-2k.jpg" },
};
const ORDER = ["moon", "mars"];
const MOBILE_MAX = 720;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function glow(color, radius) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 c; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 5.0); gl_FragColor = vec4(c, f*0.35); }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), mat);
}

/**
 * @param {HTMLElement} el container (canvas is created inside)
 * @param {{planet:"moon"|"mars", onChange:(p:string)=>void}} opts
 * @returns {{select:(p:string)=>void, destroy:()=>void, ok:boolean}}
 */
export function createPlanetStage(el, { planet = "mars", onChange } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    console.warn("[planets] WebGL unavailable:", e.message);
    return { ok: false, select() {}, destroy() {} };
  }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);
  renderer.domElement.className = "planet-canvas";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  scene.add(new THREE.AmbientLight(0xffffff, 0.16));
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(-5, 2.5, 4);
  scene.add(sun);

  // faint star field behind the planets
  const starGeo = new THREE.BufferGeometry();
  const pts = [];
  for (let i = 0; i < 900; i++) pts.push((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 34, -18 - Math.random() * 10);
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.75 })));

  const loader = new THREE.TextureLoader();
  const wantHi = el.clientWidth * dpr > 900;
  const bodies = {};
  for (const id of ORDER) {
    const tex = loader.load(wantHi ? TEX[id].hi : TEX[id].lo, () => (dirty = true));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: id === "moon" ? 2.2 : 1.4, roughness: 1, metalness: 0 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), mat);
    mesh.userData.id = id;
    const group = new THREE.Group();
    group.add(mesh);
    if (id === "mars") group.add(glow("#ff9a6a", 1.035));
    else group.add(glow("#c9d3ff", 1.02));
    mesh.rotation.z = id === "mars" ? 0.44 : 0.03; // axial tilt
    mesh.rotation.y = id === "mars" ? 2.2 : 4.4;
    scene.add(group);
    bodies[id] = { group, mesh, from: null, to: null };
  }

  let selected = ORDER.includes(planet) ? planet : "mars";
  let mobile = el.clientWidth < MOBILE_MAX;
  let dirty = true;
  let anim = null; // {t0, dur}
  let dir = 1;

  // target layouts
  function layout() {
    const other = selected === "moon" ? "mars" : "moon";
    if (mobile) {
      return {
        [selected]: { x: 0, y: 0, z: 0, s: 1.25, o: 1 },
        [other]: { x: 4.2 * dir, y: 0, z: -2.5, s: 0.9, o: 0 },
      };
    }
    return {
      [selected]: { x: -0.75, y: -0.05, z: 0.6, s: 1.35, o: 1 },
      [other]: { x: 1.75, y: 0.45, z: -2.6, s: 1.05, o: 1 },
    };
  }
  function apply(id, p) {
    const g = bodies[id].group;
    g.position.set(p.x, p.y, p.z);
    g.scale.setScalar(p.s);
    g.visible = p.o > 0.02;
  }
  function snap() {
    const L = layout();
    for (const id of ORDER) {
      bodies[id].cur = { ...L[id] };
      apply(id, L[id]);
    }
    dirty = true;
  }
  function animateTo() {
    const L = layout();
    for (const id of ORDER) {
      bodies[id].from = { ...(bodies[id].cur || L[id]) };
      bodies[id].to = L[id];
      if (mobile && bodies[id].to.o > 0 && bodies[id].from.o === 0) {
        // entering from the opposite side
        bodies[id].from = { ...L[id], x: -4.2 * dir, z: -2.5, s: 0.9, o: 1 };
      }
    }
    anim = { t0: performance.now(), dur: reduce ? 1 : 1000 };
  }

  function resize() {
    const w = el.clientWidth, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the pair framed on wide and tall screens
    camera.position.z = mobile ? 6.4 : Math.max(7.2, 7.2 * (1.6 / camera.aspect));
    camera.updateProjectionMatrix();
    const wasMobile = mobile;
    mobile = w < MOBILE_MAX;
    if (wasMobile !== mobile) snap();
    dirty = true;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();
  snap();

  // click / tap: bring the planet behind to the front
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hit = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(ORDER.map((id) => bodies[id].mesh).filter((m) => m.parent.visible))[0];
    return h?.object.userData.id;
  };
  let down = null;
  const onDown = (e) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
    const id = hit(e);
    if (id && id !== selected) select(id, true);
  };
  const onMove = (e) => {
    const id = hit(e);
    renderer.domElement.style.cursor = id && id !== selected ? "pointer" : "default";
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointermove", onMove);

  function select(id, fromUser = false, direction) {
    if (!ORDER.includes(id) || id === selected) return;
    dir = direction ?? (ORDER.indexOf(id) > ORDER.indexOf(selected) ? 1 : -1);
    selected = id;
    animateTo();
    if (fromUser) onChange?.(id);
  }

  let last = performance.now();
  let raf = 0;
  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(el);
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    for (const id of ORDER) bodies[id].mesh.rotation.y += dt * (reduce ? 0.02 : id === "mars" ? 0.11 : 0.07);
    if (anim) {
      const t = Math.min(1, (now - anim.t0) / anim.dur);
      const k = ease(t);
      for (const id of ORDER) {
        const a = bodies[id].from, b = bodies[id].to;
        const p = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, s: a.s + (b.s - a.s) * k, o: t < 1 ? Math.max(a.o, b.o) : b.o };
        bodies[id].cur = p;
        apply(id, p);
      }
      if (t >= 1) anim = null;
    }
    renderer.render(scene, camera);
    dirty = false;
  }
  raf = requestAnimationFrame(frame);

  return {
    ok: true,
    get selected() {
      return selected;
    },
    select: (id, direction) => select(id, false, direction),
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      renderer.dispose();
      for (const id of ORDER) {
        bodies[id].mesh.geometry.dispose();
        bodies[id].mesh.material.map?.dispose();
        bodies[id].mesh.material.dispose();
      }
      renderer.domElement.remove();
    },
  };
}
