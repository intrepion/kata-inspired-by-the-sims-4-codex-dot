export const NEEDS = [
  "hunger",
  "energy",
  "bladder",
  "hygiene",
  "fun",
  "social",
];
export const CATALOG = {
  fridge: {
    name: "Mint refrigerator",
    action: "Make a meal",
    need: "hunger",
    rate: 9,
    duration: 9,
    cost: 8,
    color: 0xb5d1be,
  },
  bed: {
    name: "Cloud bed",
    action: "Sleep",
    need: "energy",
    rate: 7,
    duration: 15,
    color: 0xe6b29c,
  },
  toilet: {
    name: "Toilet",
    action: "Use toilet",
    need: "bladder",
    rate: 18,
    duration: 5,
    color: 0xf4f3df,
  },
  shower: {
    name: "Rain shower",
    action: "Take a shower",
    need: "hygiene",
    rate: 12,
    duration: 8,
    color: 0x9bc7ce,
  },
  sofa: {
    name: "Apricot sofa",
    action: "Read a novel",
    need: "fun",
    rate: 10,
    duration: 9,
    color: 0xd88f72,
  },
  plant: {
    name: "Reading nook",
    action: "Daydream",
    need: "fun",
    rate: 6,
    duration: 9,
    price: 90,
    color: 0x71967e,
  },
};
export function createGame() {
  return {
    version: 1,
    time: 480,
    speed: 1,
    selected: 0,
    funds: 420,
    relationship: 18,
    nextId: 1,
    autonomy: true,
    log: ["A quiet morning at Juniper House."],
    objects: [
      { id: "fridge", type: "fridge", x: 1, z: 1 },
      { id: "bed1", type: "bed", x: 9, z: 1 },
      { id: "bed2", type: "bed", x: 10, z: 1 },
      { id: "toilet", type: "toilet", x: 9, z: 6 },
      { id: "shower", type: "shower", x: 10, z: 8 },
      { id: "sofa", type: "sofa", x: 2, z: 7 },
    ],
    people: [
      {
        name: "Mira",
        color: 0xbe775e,
        x: 3,
        z: 4,
        needs: {
          hunger: 43,
          energy: 69,
          bladder: 62,
          hygiene: 58,
          fun: 48,
          social: 50,
        },
        queue: [],
        idle: 0,
      },
      {
        name: "Rowan",
        color: 0x648f93,
        x: 6,
        z: 6,
        needs: {
          hunger: 65,
          energy: 51,
          bladder: 46,
          hygiene: 71,
          fun: 56,
          social: 36,
        },
        queue: [],
        idle: 0,
      },
    ],
  };
}
export function wall(x, z) {
  return (x === 7 && ![3, 7].includes(z)) || (z === 4 && x > 7 && x !== 9);
}
export const DECOR_CELLS = [
  [3, 5],
  [3, 6],
  [2, 0],
  [3, 0],
  [4, 0],
  [5, 0],
  [0, 9],
  [6, 1],
  [11, 5],
];
export function blocked(g, x, z) {
  return (
    x < 0 ||
    x > 11 ||
    z < 0 ||
    z > 9 ||
    wall(x, z) ||
    DECOR_CELLS.some(([a, b]) => a === x && b === z) ||
    g.objects.some((o) => o.x === x && o.z === z)
  );
}
export function path(g, start, goal) {
  const a = { x: Math.round(start.x), z: Math.round(start.z) },
    q = [[a]],
    seen = new Set([`${a.x},${a.z}`]);
  while (q.length) {
    const p = q.shift(),
      v = p.at(-1);
    if (v.x === goal.x && v.z === goal.z) return p.slice(1);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: v.x + dx, z: v.z + dz },
        k = `${n.x},${n.z}`;
      if (!seen.has(k) && !blocked(g, n.x, n.z)) {
        seen.add(k);
        q.push([...p, n]);
      }
    }
  }
  return null;
}
function approach(g, p, target) {
  return [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ]
    .map(([x, z]) => ({
      x: Math.round(target.x) + x,
      z: Math.round(target.z) + z,
    }))
    .filter((v) => !blocked(g, v.x, v.z))
    .map((v) => path(g, p, v))
    .filter(Boolean)
    .sort((a, b) => a.length - b.length)[0];
}
export function note(g, s) {
  g.log = [s, ...g.log].slice(0, 5);
}
export function enqueue(g, person, target, kind = "object", auto = false) {
  const p = g.people[person];
  if (p.queue.length >= 6) return false;
  if (!auto && p.queue[0]?.auto) cancel(g, person, p.queue[0].id);
  const t =
    kind === "social"
      ? g.people[target]
      : kind === "walk"
        ? target
        : g.objects.find((o) => o.id === target);
  if (!t) return false;
  p.queue.push({
    id: g.nextId++,
    kind,
    target,
    auto,
    phase: "queued",
    elapsed: 0,
  });
  return true;
}
export function cancel(g, person, id) {
  g.people[person].queue = g.people[person].queue.filter((a) => a.id !== id);
}
export function mood(p) {
  const low = Math.min(...Object.values(p.needs));
  return low < 22
    ? "Uncomfortable"
    : p.needs.fun > 72 && p.needs.social > 65
      ? "Happy"
      : "Fine";
}
export function tick(g, realSeconds) {
  if (!g.speed) return;
  let remaining = Math.min(realSeconds, 60) * g.speed;
  while (remaining > 0) {
    const dt = Math.min(0.1, remaining);
    step(g, dt);
    remaining -= dt;
  }
}
function step(g, dt) {
  g.time += dt * 2;
  for (let i = 0; i < g.people.length; i++) {
    const p = g.people[i];
    for (const n of NEEDS)
      p.needs[n] = Math.max(
        0,
        p.needs[n] -
          dt *
            {
              hunger: 0.14,
              energy: 0.09,
              bladder: 0.13,
              hygiene: 0.08,
              fun: 0.1,
              social: 0.09,
            }[n],
      );
    const a = p.queue[0];
    const host = g.people.find(
      (other, j) =>
        j !== i &&
        other.queue[0]?.kind === "social" &&
        other.queue[0]?.target === i &&
        other.queue[0]?.phase === "using",
    );
    if (
      host &&
      (!a || (a.kind === "social" && a.target === g.people.indexOf(host)))
    ) {
      p.idle = 0;
      continue;
    }
    if (!a) {
      p.idle += dt;
      if (g.autonomy && p.idle > 3) {
        const low = NEEDS.reduce((a, b) => (p.needs[a] < p.needs[b] ? a : b));
        if (p.needs[low] < 35) {
          if (low === "social") enqueue(g, i, 1 - i, "social", true);
          else {
            const o = g.objects.find((o) => CATALOG[o.type].need === low);
            if (o) enqueue(g, i, o.id, "object", true);
          }
          p.idle = 0;
        }
      }
      continue;
    }
    p.idle = 0;
    const target =
      a.kind === "social"
        ? g.people[a.target]
        : a.kind === "walk"
          ? a.target
          : g.objects.find((o) => o.id === a.target);
    if (!target) {
      p.queue.shift();
      continue;
    }
    if (a.phase === "queued") {
      const route =
        a.kind === "walk" ? path(g, p, target) : approach(g, p, target);
      if (!route) {
        note(g, `${p.name}: cannot reach that spot.`);
        p.queue.shift();
        continue;
      }
      a.path = route;
      a.phase = "walking";
    }
    if (a.phase === "walking") {
      if (a.path.length) {
        const n = a.path[0],
          dx = n.x - p.x,
          dz = n.z - p.z,
          d = Math.hypot(dx, dz),
          s = dt * 2.2;
        if (d <= s) {
          p.x = n.x;
          p.z = n.z;
          a.path.shift();
        } else {
          p.x += (dx / d) * s;
          p.z += (dz / d) * s;
        }
        continue;
      }
      if (a.kind === "walk") {
        p.queue.shift();
        continue;
      }
      if (
        a.kind === "social" &&
        Math.hypot(p.x - target.x, p.z - target.z) > 1.6
      ) {
        a.phase = "queued";
        continue;
      }
      if (a.kind === "social" && target.queue.length) {
        if (
          target.queue[0].kind === "social" &&
          target.queue[0].target === i &&
          i === 0
        ) {
          /* one conversation owns both */
        } else {
          a.phase = "waiting";
          continue;
        }
      }
      if (
        a.kind === "object" &&
        g.people.some(
          (other, j) =>
            j !== i &&
            other.queue[0]?.target === a.target &&
            other.queue[0]?.phase === "using",
        )
      ) {
        a.phase = "waiting";
        continue;
      }
      const cost = a.kind === "object" ? CATALOG[target.type].cost || 0 : 0;
      if (g.funds < cost) {
        note(g, "Not enough household funds for a meal.");
        p.queue.shift();
        continue;
      }
      g.funds -= cost;
      a.phase = "using";
    }
    if (a.phase === "waiting") {
      a.phase = "queued";
      continue;
    }
    if (a.phase === "using") {
      if (a.kind === "social") {
        if (
          Math.hypot(p.x - target.x, p.z - target.z) > 1.6 ||
          (target.queue.length &&
            !(
              target.queue[0].kind === "social" && target.queue[0].target === i
            ))
        ) {
          a.phase = "queued";
          continue;
        }
        p.needs.social = Math.min(100, p.needs.social + dt * 7);
        target.needs.social = Math.min(100, target.needs.social + dt * 7);
        g.relationship = Math.min(100, g.relationship + dt * 1.2);
      } else {
        const def = CATALOG[target.type];
        p.needs[def.need] = Math.min(
          100,
          p.needs[def.need] + dt * def.rate * (mood(p) === "Happy" ? 1.1 : 1),
        );
      }
      a.elapsed += dt;
      const duration = a.kind === "social" ? 8 : CATALOG[target.type].duration;
      if (a.elapsed >= duration) {
        note(
          g,
          a.kind === "social"
            ? `${p.name} and ${target.name} shared a good conversation.`
            : `${p.name} finished: ${CATALOG[target.type].action.toLowerCase()}.`,
        );
        if (
          a.kind === "social" &&
          target.queue[0]?.kind === "social" &&
          target.queue[0]?.target === i
        )
          target.queue.shift();
        p.queue.shift();
      }
    }
  }
}
export function buy(g, x, z) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(z) ||
    blocked(g, x, z) ||
    g.funds < 90 ||
    g.people.some((p) => Math.hypot(p.x - x, p.z - z) < 0.9) ||
    g.people.some((p) => p.queue.length)
  )
    return false;
  const o = { id: `nook${g.nextId++}`, type: "plant", x, z };
  g.objects.push(o);
  const reachable = g.objects.every((t) =>
    g.people.every((p) => approach(g, p, t)),
  );
  if (!reachable) {
    g.objects.pop();
    return false;
  }
  g.funds -= 90;
  return true;
}
export function serialize(g) {
  return JSON.stringify(g);
}
export function restore(raw) {
  try {
    const g = JSON.parse(raw),
      finite = (v, min, max) => Number.isFinite(v) && v >= min && v <= max,
      point = (p) => p && finite(p.x, 0, 11) && finite(p.z, 0, 9);
    if (
      !g ||
      g.version !== 1 ||
      !finite(g.time, 0, 1e9) ||
      ![0, 1, 2, 3].includes(g.speed) ||
      ![0, 1].includes(g.selected) ||
      !finite(g.funds, 0, 1e9) ||
      !finite(g.relationship, 0, 100) ||
      !Number.isSafeInteger(g.nextId) ||
      g.nextId < 1 ||
      typeof g.autonomy !== "boolean" ||
      !Array.isArray(g.people) ||
      g.people.length !== 2 ||
      !Array.isArray(g.objects) ||
      g.objects.length > 100 ||
      !Array.isArray(g.log) ||
      g.log.some((s) => typeof s !== "string")
    )
      throw Error("save");
    const ids = new Set();
    for (const o of g.objects) {
      if (
        !o ||
        !CATALOG[o.type] ||
        typeof o.id !== "string" ||
        ids.has(o.id) ||
        !point(o) ||
        !Number.isInteger(o.x) ||
        !Number.isInteger(o.z) ||
        wall(o.x, o.z)
      )
        throw Error("object");
      ids.add(o.id);
    }
    for (const p of g.people) {
      if (
        !point(p) ||
        typeof p.name !== "string" ||
        p.name.length > 30 ||
        !finite(p.color, 0, 0xffffff) ||
        !finite(p.idle, 0, 1e9) ||
        !p.needs ||
        !NEEDS.every((n) => finite(p.needs[n], 0, 100)) ||
        !Array.isArray(p.queue) ||
        p.queue.length > 6
      )
        throw Error("person");
      for (const a of p.queue) {
        if (
          !a ||
          !Number.isSafeInteger(a.id) ||
          !["object", "social", "walk"].includes(a.kind) ||
          !["queued", "walking", "waiting", "using"].includes(a.phase) ||
          !finite(a.elapsed, 0, 100) ||
          typeof a.auto !== "boolean" ||
          (a.kind === "object" && !ids.has(a.target)) ||
          (a.kind === "social" && ![0, 1].includes(a.target)) ||
          (a.kind === "walk" && !point(a.target)) ||
          (a.phase === "walking" &&
            (!Array.isArray(a.path) ||
              a.path.length > 120 ||
              !a.path.every(point)))
        )
          throw Error("queue");
      }
    }
    return g;
  } catch {
    return createGame();
  }
}
