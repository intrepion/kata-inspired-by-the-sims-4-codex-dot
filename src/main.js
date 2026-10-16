import * as THREE from "three";
import "./style.css";
import {
  createGame,
  NEEDS,
  CATALOG,
  enqueue,
  cancel,
  tick,
  mood,
  buy,
  serialize,
  restore,
  wall,
} from "./sim.js";
const $ = (id) => document.getElementById(id),
  key = "hearth-hollow-v1";
let game;
try {
  game = restore(localStorage.getItem(key));
} catch {
  game = createGame();
}
let buying = false,
  priorSpeed = 1,
  angle = 0.72,
  zoom = 17,
  panX = 0,
  panZ = 0,
  toastTimer;
function toast(s) {
  $("toast").textContent = s;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").textContent = ""), 4500);
}
const scene = new THREE.Scene();
scene.background = new THREE.Color("#e3e9d9");
scene.fog = new THREE.Fog("#e3e9d9", 33, 65);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("world").prepend(renderer.domElement);
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
const ambient = new THREE.HemisphereLight(0xfff9e8, 0x79937a, 2.6);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffedcc, 3);
sun.position.set(-7, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -18,
  right: 18,
  top: 18,
  bottom: -18,
});
sun.shadow.bias = -0.001;
scene.add(sun);
const house = new THREE.Group();
house.position.set(-5.5, 0, -4.5);
scene.add(house);
const mat = (c) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
function box(parent, x, y, z, w, h, d, c) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function ball(parent, x, y, z, r, c) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(c));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
box(scene, 0, -0.49, 0, 200, 0.5, 200, 0xdce4cf);
box(house, 5.5, -0.19, 4.5, 12.4, 0.35, 10.4, 0xc5b296);
for (let x = 0; x < 12; x++)
  for (let z = 0; z < 10; z++)
    box(
      house,
      x,
      -0.018,
      z,
      0.98,
      0.08,
      0.98,
      x > 7 && z > 4
        ? (x + z) % 2
          ? 0xc4d7ce
          : 0xd4e1d5
        : x > 7
          ? 0xe5d8bd
          : (x + z) % 2
            ? 0xd7bf98
            : 0xdec9a8,
    );
// Cutaway walls preserve sight lines; doorway gaps remain physical routing constraints.
for (let x = 0; x < 12; x++) {
  box(house, x, 0.6, -0.55, 1, 1.2, 0.15, 0xf2ead5);
  box(house, x, 0.15, 9.55, 1, 0.3, 0.15, 0xece2cb);
}
for (let z = 0; z < 10; z++) {
  box(house, -0.55, 0.6, z, 0.15, 1.2, 1, 0xf2ead5);
  box(house, 11.55, 0.15, z, 0.15, 0.3, 1, 0xece2cb);
  for (let x = 7; x < 12; x++)
    if (wall(x, z)) box(house, x, 0.32, z, 0.92, 0.64, 0.92, 0xe9dfc8);
}
box(house, 3, 0.05, 6.6, 4.6, 0.04, 3.8, 0xc7ccaa);
box(house, 3, 0.08, 5.7, 1.3, 0.15, 0.8, 0x9b7559);
box(house, 3, 0.35, 5.7, 1.25, 0.12, 0.75, 0xb9936d);
ball(house, 3, 0.51, 5.7, 0.14, 0xf7d4a2);
for (let x = 2; x < 6; x++) {
  box(house, x, 0.48, 0.1, 0.95, 0.95, 0.7, 0xa5bbae);
  box(house, x, 1, 0.1, 0.98, 0.1, 0.73, 0xf7efda);
}
box(house, 4, 1.08, 0.1, 0.5, 0.05, 0.4, 0x51685f);
for (const [x, z] of [
  [0.2, 8.8],
  [6, 1],
  [11, 5],
]) {
  box(house, x, 0.25, z, 0.4, 0.5, 0.4, 0xbb8d6a);
  for (let a = 0; a < 5; a++)
    ball(
      house,
      x + Math.cos(a * 1.3) * 0.18,
      0.67 + a * 0.06,
      z + Math.sin(a) * 0.14,
      0.22,
      0x6e8d59,
    );
}
// Front stepping stones and miniature garden.
for (let z = 11; z < 15; z++) box(house, 5, 0.01, z, 1.1, 0.08, 0.7, 0xc7ccb7);
for (const x of [-2, 14])
  for (const z of [-2, 5, 12]) {
    box(house, x, 0.65, z, 0.24, 1.3, 0.24, 0x9d8060);
    ball(house, x, 1.8, z, 1, 0x9eaf7e);
    ball(house, x + 0.3, 2.2, z, 0.7, 0xb0bd8c);
  }
const furniture = new THREE.Group();
house.add(furniture);
const objectMeshes = new Map();
function drawFurniture() {
  furniture.clear();
  objectMeshes.clear();
  for (const o of game.objects) {
    const g = new THREE.Group();
    g.position.set(o.x, 0, o.z);
    g.userData.object = o.id;
    furniture.add(g);
    objectMeshes.set(o.id, g);
    const c = CATALOG[o.type].color;
    if (o.type === "fridge") {
      box(g, 0, 0.8, 0, 0.85, 1.6, 0.8, c);
      box(g, 0, 0.81, 0.415, 0.83, 0.025, 0.02, 0x819c8a);
      box(g, 0.27, 1.1, 0.45, 0.05, 0.35, 0.06, 0xeee5ca);
    } else if (o.type === "bed") {
      box(g, 0, 0.24, 0, 0.9, 0.4, 0.96, 0x9d7d62);
      box(g, 0, 0.49, 0, 0.88, 0.17, 0.95, 0xf4e9d8);
      box(g, 0, 0.61, -0.28, 0.65, 0.14, 0.3, 0xf9f4e6);
      box(g, 0, 0.6, 0.2, 0.88, 0.12, 0.55, c);
      box(g, 0, 0.5, -0.5, 0.95, 1, 0.1, 0xa8896d);
    } else if (o.type === "toilet") {
      box(g, 0, 0.45, -0.25, 0.64, 0.85, 0.22, 0xf1f0e5);
      ball(g, 0, 0.3, 0.12, 0.32, c);
      box(g, 0, 0.55, 0.1, 0.55, 0.08, 0.62, 0xfdfcf1);
    } else if (o.type === "shower") {
      box(g, 0, 0.06, 0, 0.94, 0.12, 0.94, 0xf7f1df);
      box(g, 0, 0.95, -0.4, 0.85, 1.8, 0.1, c);
      box(g, 0.42, 0.95, 0, 0.06, 1.8, 0.9, 0xaed2d1);
      box(g, -0.1, 1.5, -0.25, 0.08, 0.65, 0.08, 0x688e8d);
      box(g, -0.1, 1.83, -0.05, 0.3, 0.07, 0.4, 0x6d9191);
    } else if (o.type === "sofa") {
      box(g, 0, 0.35, 0, 0.95, 0.55, 0.9, c);
      box(g, 0, 0.73, -0.35, 1, 0.7, 0.18, c);
      box(g, -0.42, 0.6, 0, 0.16, 0.5, 0.95, c);
      box(g, 0.42, 0.6, 0, 0.16, 0.5, 0.95, c);
      box(g, 0, 0.64, 0.02, 0.6, 0.12, 0.65, 0xe8ab8f);
    } else {
      box(g, 0, 0.3, 0, 0.85, 0.6, 0.85, 0xb78e67);
      box(g, 0, 0.67, 0, 0.9, 0.14, 0.9, c);
      box(g, 0, 1, -0.36, 0.9, 0.6, 0.16, c);
      box(g, 0, 0.8, 0, 0.35, 0.08, 0.3, 0xf1d9a7);
    }
  }
}
drawFurniture();
const residents = game.people.map((p) => {
  const g = new THREE.Group();
  house.add(g);
  box(g, 0, 0.63, 0, 0.33, 0.5, 0.25, p.color);
  ball(g, 0, 1.07, 0, 0.2, 0xe7bc99);
  ball(g, 0, 1.2, -0.04, 0.19, p.name === "Mira" ? 0x544839 : 0x7c634b);
  box(g, -0.12, 0.2, 0, 0.13, 0.43, 0.15, 0x425b50);
  box(g, 0.12, 0.2, 0, 0.13, 0.43, 0.15, 0x425b50);
  box(g, -0.25, 0.64, 0, 0.12, 0.44, 0.13, 0xe7bc99);
  box(g, 0.25, 0.64, 0, 0.12, 0.44, 0.13, 0xe7bc99);
  return g;
});
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.35, 0.42, 40),
  new THREE.MeshBasicMaterial({ color: 0xf7e7a8, side: THREE.DoubleSide }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.05;
house.add(ring);
const labelEls = [];
function labels() {
  $("labels").replaceChildren();
  labelEls.length = 0;
  for (const o of game.objects) {
    const b = document.createElement("button");
    b.className = "object-label";
    b.textContent = CATALOG[o.type].name;
    b.onclick = (e) => {
      e.stopPropagation();
      context(o, e.clientX, e.clientY);
    };
    $("labels").append(b);
    labelEls.push({
      el: b,
      get: () => new THREE.Vector3(o.x - 5.5, 1.6, o.z - 4.5),
    });
  }
  game.people.forEach((p, i) => {
    const b = document.createElement("button");
    b.className = "object-label person-label";
    b.textContent = p.name;
    b.onclick = (e) => {
      e.stopPropagation();
      if (i !== game.selected) personContext(i, e.clientX, e.clientY);
      else toast(`${p.name} is selected.`);
    };
    $("labels").append(b);
    labelEls.push({
      el: b,
      get: () => new THREE.Vector3(p.x - 5.5, 1.65, p.z - 4.5),
    });
  });
}
labels();
function cameraUpdate() {
  const w = $("world").clientWidth,
    h = $("world").clientHeight,
    ratio = w / h;
  camera.left = (-zoom * ratio) / 2;
  camera.right = (zoom * ratio) / 2;
  camera.top = zoom / 2;
  camera.bottom = -zoom / 2;
  camera.position.set(
    Math.sin(angle) * 19 + panX,
    19,
    Math.cos(angle) * 19 + panZ,
  );
  camera.lookAt(panX, 0, panZ);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
new ResizeObserver(cameraUpdate).observe($("world"));
function context(o, x, y) {
  if (buying) return;
  const def = CATALOG[o.type];
  showContext(
    def.name,
    [
      {
        text: `${def.action}${def.cost ? " · 8 credits" : ""}`,
        fn: () => {
          enqueue(game, game.selected, o.id);
          toast(
            `${def.action} added to ${game.people[game.selected].name}'s queue.`,
          );
        },
      },
    ],
    x,
    y,
  );
}
function personContext(i, x, y) {
  if (i === game.selected) {
    toast(`${game.people[i].name} is selected.`);
    return;
  }
  showContext(
    game.people[i].name,
    [
      { text: `Select ${game.people[i].name}`, fn: () => (game.selected = i) },
      {
        text: "Friendly conversation",
        fn: () => {
          enqueue(game, game.selected, i, "social");
          toast("Conversation queued. Meet your housemate nearby.");
        },
      },
    ],
    x,
    y,
  );
}
function showContext(name, actions, x, y) {
  const r = $("world").getBoundingClientRect(),
    el = $("context");
  el.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = name;
  el.append(title);
  for (const a of actions) {
    const b = document.createElement("button");
    b.textContent = a.text;
    b.onclick = () => {
      a.fn();
      el.hidden = true;
      ui();
    };
    el.append(b);
  }
  el.style.left = `${Math.max(8, Math.min(r.width - 210, x - r.left))}px`;
  el.style.top = `${Math.max(110, Math.min(r.height - 130, y - r.top))}px`;
  el.hidden = false;
}
const ray = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
renderer.domElement.addEventListener("click", (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    (-(e.clientY - r.top) / r.height) * 2 + 1,
  );
  ray.setFromCamera(pointer, camera);
  const floor = ray.ray.intersectPlane(
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    new THREE.Vector3(),
  );
  if (!floor) return;
  const x = Math.round(floor.x + 5.5),
    z = Math.round(floor.z + 4.5);
  if (buying) {
    if (buy(game, x, z)) {
      drawFurniture();
      labels();
      toast("A new reading nook. A new favorite corner.");
      exitBuy();
    } else
      toast(
        "Use a free floor square with open paths. Finish or cancel all queues first.",
      );
    return;
  }
  const residentHit = ray.intersectObjects(residents, true)[0];
  if (residentHit) {
    let group = residentHit.object;
    while (!residents.includes(group)) group = group.parent;
    personContext(residents.indexOf(group), e.clientX, e.clientY);
    return;
  }
  const hit = ray.intersectObjects(furniture.children, true)[0];
  if (hit) {
    let g = hit.object;
    while (g.parent !== furniture) g = g.parent;
    context(
      game.objects.find((o) => o.id === g.userData.object),
      e.clientX,
      e.clientY,
    );
    return;
  }
  if (x >= 0 && x < 12 && z >= 0 && z < 10)
    showContext(
      "A little change of scenery",
      [
        {
          text: "Walk here",
          fn: () => enqueue(game, game.selected, { x, z }, "walk"),
        },
      ],
      e.clientX,
      e.clientY,
    );
  else $("context").hidden = true;
});
function speed(n) {
  if (buying) exitBuy();
  game.speed = n;
  ui();
}
function exitBuy() {
  buying = false;
  game.speed = priorSpeed;
  $("mode").textContent = "LIVE MODE";
  $("buy").textContent = "＋ Buy nook · 90";
  ui();
}
$("buy").onclick = () => {
  if (buying) {
    exitBuy();
    return;
  }
  buying = true;
  priorSpeed = game.speed;
  game.speed = 0;
  $("mode").textContent = "BUY MODE";
  $("buy").textContent = "Finish buying";
  $("context").hidden = true;
  toast(
    "Click a free floor square · 90 credits. All queues must be empty. Escape exits.",
  );
  ui();
};
document
  .querySelectorAll("[data-speed]")
  .forEach((b) => (b.onclick = () => speed(+b.dataset.speed)));
$("left").onclick = () => {
  angle -= Math.PI / 4;
  cameraUpdate();
};
$("right").onclick = () => {
  angle += Math.PI / 4;
  cameraUpdate();
};
$("zoomIn").onclick = () => {
  zoom = Math.max(10, zoom - 2);
  cameraUpdate();
};
$("zoomOut").onclick = () => {
  zoom = Math.min(25, zoom + 2);
  cameraUpdate();
};
$("homeCamera").onclick = () => {
  angle = 0.72;
  zoom = 17;
  panX = panZ = 0;
  cameraUpdate();
};
$("world").addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom + Math.sign(e.deltaY), 10, 25);
    cameraUpdate();
  },
  { passive: false },
);
function save(manual = false) {
  try {
    localStorage.setItem(key, serialize(game));
    if (manual) toast("Household saved in this browser.");
  } catch {
    toast("Saving unavailable: browser storage is full or disabled.");
  }
}
$("save").onclick = () => save(true);
setInterval(save, 10000);
window.addEventListener("pagehide", () => save());
$("help").onclick = () => $("guide").showModal();
$("closeHelp").onclick = () => $("guide").close();
window.addEventListener("keydown", (e) => {
  if ($("guide").open) return;
  if (e.code === "Space") {
    e.preventDefault();
    speed(game.speed ? 0 : 1);
  }
  if (["0", "1", "2", "3"].includes(e.key)) speed(+e.key);
  if (e.key.toLowerCase() === "q") angle -= Math.PI / 8;
  if (e.key.toLowerCase() === "e") angle += Math.PI / 8;
  if (e.key === "Escape") {
    $("context").hidden = true;
    if (buying) exitBuy();
  }
  if (e.key.startsWith("Arrow")) {
    e.preventDefault();
    if (e.key === "ArrowLeft") panX -= 0.5;
    if (e.key === "ArrowRight") panX += 0.5;
    if (e.key === "ArrowUp") panZ -= 0.5;
    if (e.key === "ArrowDown") panZ += 0.5;
    panX = THREE.MathUtils.clamp(panX, -4, 4);
    panZ = THREE.MathUtils.clamp(panZ, -4, 4);
  }
  cameraUpdate();
});
function actionName(a) {
  return a.kind === "social"
    ? "Friendly conversation"
    : a.kind === "walk"
      ? "Walk here"
      : CATALOG[game.objects.find((o) => o.id === a.target)?.type]?.action ||
        "Interaction";
}
const renderedHTML = new Map();
function setHTML(id, html) {
  if (renderedHTML.get(id) !== html) {
    $(id).innerHTML = html;
    renderedHTML.set(id, html);
  }
}
let queueSignature = "",
  logSignature = "";
function ui() {
  const p = game.people[game.selected];
  setHTML(
    "clock",
    `<small>DAY ${Math.floor(game.time / 1440) + 1} · ${game.speed ? "A DAY TO MAKE YOUR OWN" : "PAUSED"}</small>${String(Math.floor(game.time / 60) % 24).padStart(2, "0")}:${String(Math.floor(game.time) % 60).padStart(2, "0")}`,
  );
  $("funds").textContent = `◈ ${game.funds} credits`;
  setHTML(
    "portraits",
    game.people
      .map(
        (p, i) =>
          `<button class="portrait ${i === game.selected ? "active" : ""}" data-person="${i}" aria-label="Select ${p.name}"><span class="avatar" style="background:#${p.color.toString(16)}">${p.name[0]}</span>${p.name}</button>`,
      )
      .join(""),
  );
  document.querySelectorAll("[data-person]").forEach(
    (b) =>
      (b.onclick = () => {
        game.selected = +b.dataset.person;
        ui();
      }),
  );
  setHTML("person", `<h2>${p.name}</h2><span class="mood">${mood(p)}</span>`);
  setHTML(
    "needs",
    NEEDS.map(
      (n) =>
        `<div class="need"><div class="need-line"><span>${n}</span><span>${Math.round(p.needs[n])}</span></div><div class="track"><div class="fill" style="width:${p.needs[n]}%;background:${p.needs[n] < 25 ? "#c17a59" : p.needs[n] < 50 ? "#b7a56e" : "#84a27a"}"></div></div></div>`,
    ).join(""),
  );
  $("bond").textContent = `${Math.round(game.relationship)} / 100`;
  const nextQueueSignature =
    `${game.selected}:` + p.queue.map((a) => `${a.id}:${a.phase}`).join(",");
  if (nextQueueSignature !== queueSignature) {
    queueSignature = nextQueueSignature;
    $("queue").innerHTML = p.queue.length
      ? p.queue
          .map(
            (a) =>
              `<div class="action"><span>${a.kind === "social" ? "♡" : "◷"}</span><div>${actionName(a)}<small>${a.phase}${a.auto ? " · autonomous" : ""}</small>${a.phase === "using" ? `<progress value="${a.elapsed}" max="${a.kind === "social" ? 8 : CATALOG[game.objects.find((o) => o.id === a.target).type].duration}"></progress>` : ""}</div><button aria-label="Cancel ${actionName(a)}" data-cancel="${a.id}">×</button></div>`,
          )
          .join("")
      : '<p class="idle">A moment to breathe. Autonomy is on.</p>';
  }
  document.querySelectorAll("#queue progress").forEach((el, i) => {
    el.value = p.queue.filter((a) => a.phase === "using")[i].elapsed;
  });
  document.querySelectorAll("[data-cancel]").forEach(
    (b) =>
      (b.onclick = () => {
        cancel(game, game.selected, +b.dataset.cancel);
        ui();
      }),
  );
  if (logSignature !== JSON.stringify(game.log)) {
    logSignature = JSON.stringify(game.log);
    $("log").replaceChildren(
      ...game.log.slice(0, 3).map((s) => {
        const el = document.createElement("p");
        el.textContent = s;
        return el;
      }),
    );
  }
  document.querySelectorAll("[data-speed]").forEach((b) => {
    b.classList.toggle("active", +b.dataset.speed === game.speed);
    b.setAttribute("aria-pressed", String(+b.dataset.speed === game.speed));
  });
}
let last = performance.now(),
  lastUI = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  tick(game, dt);
  game.people.forEach((p, i) => {
    const g = residents[i];
    const old = g.position.clone();
    g.position.set(p.x, 0, p.z);
    if (g.position.distanceTo(old) > 0.001)
      g.rotation.y = Math.atan2(p.x - old.x, p.z - old.z);
    const action = p.queue[0];
    g.rotation.x = 0;
    g.position.y =
      action?.phase === "walking" && game.speed
        ? Math.sin(now / 100) * 0.025
        : 0;
    if (action?.phase === "using") {
      if (action.kind === "social") {
        const other = game.people[action.target];
        g.rotation.y = Math.atan2(other.x - p.x, other.z - p.z);
        const partner = residents[action.target];
        partner.rotation.y = Math.atan2(p.x - other.x, p.z - other.z);
      } else {
        const target = game.objects.find((o) => o.id === action.target);
        g.rotation.y = Math.atan2(target.x - p.x, target.z - p.z);
        if (target.type === "bed") {
          g.position.set(target.x, 0.78, target.z + 0.3);
          g.rotation.set(-Math.PI / 2, 0, 0);
        } else {
          g.children[5].rotation.x = -0.5;
          g.children[6].rotation.x = -0.5;
        }
      }
    } else {
      g.children[5].rotation.x = g.children[6].rotation.x = 0;
    }
  });
  ring.position.x = game.people[game.selected].x;
  ring.position.z = game.people[game.selected].z;
  for (const l of labelEls) {
    const v = l.get().project(camera);
    l.el.style.left = `${(v.x * 0.5 + 0.5) * $("world").clientWidth}px`;
    l.el.style.top = `${(-v.y * 0.5 + 0.5) * $("world").clientHeight}px`;
    l.el.style.display = v.z > 1 ? "none" : "";
  }
  if (now - lastUI > 250) {
    ui();
    lastUI = now;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
ui();
cameraUpdate();
requestAnimationFrame(frame);
