import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  enqueue,
  cancel,
  tick,
  path,
  blocked,
  buy,
  serialize,
  restore,
  mood,
} from "../src/sim.js";

function game() {
  const g = createGame();
  g.autonomy = false;
  return g;
}
function advance(g, seconds) {
  for (let i = 0; i < seconds * 10; i++) tick(g, 0.1);
}
function until(g, condition, seconds = 60) {
  for (let i = 0; i < seconds * 10 && !condition(); i++) tick(g, 0.1);
  assert.ok(condition(), `Condition not reached within ${seconds} seconds`);
}

test("routes between rooms through doorways without crossing walls or furnishings", () => {
  const g = game(),
    start = { x: 3, z: 4 },
    goal = { x: 10, z: 7 };
  const route = path(g, start, goal);
  assert.ok(route?.length);
  let previous = start;
  for (const cell of route) {
    assert.equal(blocked(g, cell.x, cell.z), false);
    assert.equal(
      Math.abs(cell.x - previous.x) + Math.abs(cell.z - previous.z),
      1,
    );
    previous = cell;
  }
  assert.deepEqual(route.at(-1), goal);
  assert.ok(route.some((cell) => cell.x === 7 && [3, 7].includes(cell.z)));
  assert.equal(path(g, start, { x: 7, z: 5 }), null);
});

test("object commands travel before restoring needs and charge meals only on arrival", () => {
  const g = game(),
    p = g.people[0],
    before = p.needs.hunger,
    funds = g.funds;
  assert.equal(enqueue(g, 0, "fridge"), true);
  tick(g, 0.1);
  assert.equal(p.queue[0].phase, "walking");
  assert.ok(p.needs.hunger < before);
  assert.equal(g.funds, funds);
  until(g, () => p.queue[0]?.phase === "using");
  assert.ok(Math.abs(p.x - 1) + Math.abs(p.z - 1) <= 1.01);
  assert.equal(g.funds, funds - 8);
  advance(g, 2);
  assert.ok(p.needs.hunger > before + 10);
});

for (const [target, need] of [
  ["bed1", "energy"],
  ["toilet", "bladder"],
  ["shower", "hygiene"],
  ["sofa", "fun"],
]) {
  test(`${target} restores ${need} after a reachable interaction`, () => {
    const g = game(),
      p = g.people[0];
    p.needs[need] = 15;
    enqueue(g, 0, target);
    until(g, () => p.queue[0]?.phase === "using");
    const before = p.needs[need];
    advance(g, 2);
    assert.ok(p.needs[need] > before + 8);
    assert.ok(p.needs[need] <= 100);
  });
}

test("queued interactions preserve order and removing a pending action skips it", () => {
  const g = game(),
    p = g.people[0];
  enqueue(g, 0, "fridge");
  enqueue(g, 0, "shower");
  enqueue(g, 0, "bed1");
  assert.deepEqual(
    p.queue.map((a) => a.target),
    ["fridge", "shower", "bed1"],
  );
  cancel(g, 0, p.queue[1].id);
  until(g, () => p.queue[0]?.target === "bed1");
  assert.ok(g.log.some((s) => s.includes("make a meal")));
  assert.ok(p.needs.hygiene < 58);
  assert.equal(p.queue.length, 1);
});

test("canceling active use stops its restoration and permits the next command", () => {
  const g = game(),
    p = g.people[0];
  p.needs.hunger = 15;
  enqueue(g, 0, "fridge");
  enqueue(g, 0, { x: 3, z: 4 }, "walk");
  until(g, () => p.queue[0]?.phase === "using");
  cancel(g, 0, p.queue[0].id);
  const before = p.needs.hunger;
  advance(g, 1);
  assert.ok(p.needs.hunger < before);
  assert.equal(p.queue[0].kind, "walk");
  until(g, () => !p.queue.length);
  assert.equal(p.x, 3);
  assert.equal(p.z, 4);
});

test("canceling travel leaves a resident available and blocked walks fail gracefully", () => {
  const g = game(),
    p = g.people[0];
  enqueue(g, 0, { x: 10, z: 7 }, "walk");
  advance(g, 0.5);
  cancel(g, 0, p.queue[0].id);
  const position = [p.x, p.z];
  advance(g, 1);
  assert.deepEqual([p.x, p.z], position);
  enqueue(g, 0, { x: 7, z: 5 }, "walk");
  tick(g, 0.1);
  assert.equal(p.queue.length, 0);
  assert.ok(g.log[0].includes("cannot reach"));
});

test("pause freezes all household state and fast time advances at the chosen ratio", () => {
  const g = game();
  enqueue(g, 0, "shower");
  g.speed = 0;
  const frozen = serialize(g);
  tick(g, 5);
  assert.equal(serialize(g), frozen);
  const normal = game(),
    fast = game();
  fast.speed = 3;
  tick(normal, 1);
  tick(fast, 1);
  assert.ok(Math.abs(fast.time - 480 - 3 * (normal.time - 480)) < 1e-8);
  assert.ok(
    Math.abs(
      65 -
        fast.people[1].needs.hunger -
        3 * (65 - normal.people[1].needs.hunger),
    ) < 1e-8,
  );
});

test("idle low needs trigger autonomy and player commands interrupt autonomous work", () => {
  const g = game(),
    p = g.people[0];
  g.autonomy = true;
  p.needs.hunger = 10;
  advance(g, 4);
  assert.equal(p.queue.length, 1);
  assert.equal(p.queue[0].target, "fridge");
  assert.equal(p.queue[0].auto, true);
  enqueue(g, 0, "bed1");
  assert.equal(p.queue.length, 1);
  assert.equal(p.queue[0].target, "bed1");
  assert.equal(p.queue[0].auto, false);
});

test("friendly social requires proximity and improves both social needs and relationship", () => {
  const g = game(),
    [a, b] = g.people;
  a.needs.social = b.needs.social = 20;
  const relationship = g.relationship;
  enqueue(g, 0, 1, "social");
  tick(g, 0.1);
  assert.equal(g.relationship, relationship);
  until(g, () => a.queue[0]?.phase === "using");
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) <= 1.6);
  const before = [a.needs.social, b.needs.social];
  advance(g, 2);
  assert.ok(a.needs.social > before[0] + 10);
  assert.ok(b.needs.social > before[1] + 10);
  assert.ok(g.relationship > relationship + 2);
  cancel(g, 0, a.queue[0].id);
  const after = g.relationship;
  advance(g, 1);
  assert.equal(g.relationship, after);
});

test("a single-use object serves one resident at a time and releases after cancellation", () => {
  const g = game();
  enqueue(g, 0, "toilet");
  enqueue(g, 1, "toilet");
  until(g, () => g.people.some((p) => p.queue[0]?.phase === "using"));
  advance(g, 0.5);
  const using = g.people.filter((p) => p.queue[0]?.phase === "using");
  assert.equal(using.length, 1);
  const owner = g.people.indexOf(using[0]),
    other = 1 - owner;
  cancel(g, owner, using[0].queue[0].id);
  until(g, () => g.people[other].queue[0]?.phase === "using");
  until(g, () => !g.people[other].queue.length);
});

test("mood reflects distress and happiness, and happy leisure restores fun faster", () => {
  const g = game(),
    p = g.people[0];
  assert.equal(mood(p), "Fine");
  p.needs.hunger = 10;
  assert.equal(mood(p), "Uncomfortable");
  p.needs.hunger = 60;
  p.needs.fun = 80;
  p.needs.social = 80;
  assert.equal(mood(p), "Happy");
  const normal = game(),
    happy = game();
  for (const h of [normal, happy]) {
    h.people[0].x = 2;
    h.people[0].z = 6;
    enqueue(h, 0, "sofa");
  }
  happy.people[0].needs.fun = 80;
  happy.people[0].needs.social = 80;
  const beforeNormal = normal.people[0].needs.fun,
    beforeHappy = happy.people[0].needs.fun;
  tick(normal, 1);
  tick(happy, 1);
  assert.ok(
    happy.people[0].needs.fun - beforeHappy >
      normal.people[0].needs.fun - beforeNormal,
  );
});

test("build validates bounds, funds, occupancy and queues before charging", () => {
  const g = game(),
    funds = g.funds,
    count = g.objects.length;
  for (const [x, z] of [
    [-1, 0],
    [12, 1],
    [7, 5],
    [1, 1],
    [3, 4],
    [2.5, 3],
  ])
    assert.equal(buy(g, x, z), false);
  assert.equal(g.funds, funds);
  assert.equal(g.objects.length, count);
  assert.equal(buy(g, 4, 2), true);
  assert.equal(g.funds, funds - 90);
  assert.equal(g.objects.at(-1).type, "plant");
  assert.equal(buy(g, 4, 2), false);
  enqueue(g, 0, "bed1");
  assert.equal(buy(g, 4, 3), false);
  const poor = game();
  poor.funds = 89;
  assert.equal(buy(poor, 4, 2), false);
  assert.equal(poor.funds, 89);
});

test("save/reload preserves household progress, queued routes, relationships and purchases", () => {
  const g = game();
  buy(g, 4, 2);
  enqueue(g, 0, "shower");
  advance(g, 1);
  g.relationship = 42;
  g.selected = 1;
  const loaded = restore(serialize(g));
  assert.deepEqual(loaded, g);
  advance(loaded, 1);
  assert.ok(loaded.time > g.time);
  assert.notDeepEqual(
    [loaded.people[0].x, loaded.people[0].z],
    [g.people[0].x, g.people[0].z],
  );
});

for (const raw of [
  "invalid json",
  "null",
  "{}",
  '{"version":99}',
  JSON.stringify({ ...createGame(), people: [] }),
]) {
  test(`malformed save recovers a playable household: ${raw.slice(0, 45)}`, () => {
    const g = restore(raw);
    assert.deepEqual(g, createGame());
    assert.doesNotThrow(() => tick(g, 0.1));
  });
}

for (const [label, mutate] of [
  ["missing queue", (g) => delete g.people[0].queue],
  ["invalid object type", (g) => (g.objects[0].type = "unknown")],
  ["out-of-bounds position", (g) => (g.people[0].x = 999)],
  ["invalid speed", (g) => (g.speed = -1)],
  ["out-of-range need", (g) => (g.people[0].needs.hunger = -100)],
]) {
  test(`invalid household save recovers safely: ${label}`, () => {
    const bad = createGame();
    mutate(bad);
    const g = restore(JSON.stringify(bad));
    assert.deepEqual(g, createGame());
    assert.doesNotThrow(() => tick(g, 0.1));
  });
}

test("household queues stay independent and reject overflow without losing actions", () => {
  const g = game();
  for (let i = 0; i < 6; i++) assert.equal(enqueue(g, 0, "sofa"), true);
  const ids = g.people[0].queue.map((a) => a.id);
  assert.equal(enqueue(g, 0, "bed1"), false);
  assert.deepEqual(
    g.people[0].queue.map((a) => a.id),
    ids,
  );
  g.selected = 1;
  enqueue(g, 1, "shower");
  assert.equal(g.people[1].queue[0].target, "shower");
  assert.deepEqual(
    g.people[0].queue.map((a) => a.id),
    ids,
  );
});

test("all six needs decay during idle simulation and never become negative", () => {
  const g = game(),
    p = g.people[0],
    before = { ...p.needs };
  advance(g, 10);
  for (const need of Object.keys(before))
    assert.ok(p.needs[need] < before[need]);
  for (const need of Object.keys(p.needs)) p.needs[need] = 0.01;
  advance(g, 1);
  for (const value of Object.values(p.needs)) assert.equal(value, 0);
});

test("reciprocal social commands make progress without deadlocking or double-counting", () => {
  const g = game();
  g.people[0].x = 4;
  g.people[0].z = 5;
  g.people[1].x = 5;
  g.people[1].z = 5;
  enqueue(g, 0, 1, "social");
  enqueue(g, 1, 0, "social");
  const relationship = g.relationship;
  advance(g, 2);
  assert.ok(g.relationship > relationship);
  assert.ok(g.relationship < relationship + 3);
  until(g, () => g.people.every((p) => !p.queue.length), 30);
});

test("an unaffordable meal is rejected on arrival without restoring hunger", () => {
  const g = game(),
    p = g.people[0];
  g.funds = 7;
  p.x = 1;
  p.z = 2;
  p.needs.hunger = 10;
  enqueue(g, 0, "fridge");
  advance(g, 1);
  assert.equal(p.queue.length, 0);
  assert.equal(g.funds, 7);
  assert.ok(p.needs.hunger < 10);
  assert.ok(g.log[0].includes("Not enough"));
});

const fixedFurnishings = [
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
test("routing respects visible coffee table, counters and decorative plant footprints", () => {
  const g = game();
  for (const [x, z] of fixedFurnishings) {
    assert.equal(
      blocked(g, x, z),
      true,
      `Visible furnishing at ${x},${z} must block movement`,
    );
    assert.equal(
      path(g, { x: 4, z: 4 }, { x, z }),
      null,
      `Cannot route onto furnishing ${x},${z}`,
    );
  }
  const route = path(g, { x: 2, z: 5 }, { x: 4, z: 5 });
  assert.ok(route?.length > 2, "Coffee table requires a detour");
  for (const cell of route)
    assert.ok(!fixedFurnishings.some(([x, z]) => cell.x === x && cell.z === z));
});

test("buy cannot overlap fixed furnishings or spend funds on rejected placements", () => {
  const g = game(),
    funds = g.funds,
    count = g.objects.length;
  for (const [x, z] of fixedFurnishings)
    assert.equal(buy(g, x, z), false, `Cannot build over furnishing ${x},${z}`);
  assert.equal(g.funds, funds);
  assert.equal(g.objects.length, count);
});

test("reciprocal social commands complete one shared conversation, not two sequential conversations", () => {
  const g = game();
  g.people[0].x = 4;
  g.people[0].z = 5;
  g.people[1].x = 5;
  g.people[1].z = 5;
  enqueue(g, 0, 1, "social");
  enqueue(g, 1, 0, "social");
  const friendship = g.relationship;
  advance(g, 17);
  assert.ok(g.people.every((p) => p.queue.length === 0));
  assert.equal(
    g.log.filter((s) => s.includes("shared a good conversation")).length,
    1,
  );
  assert.ok(g.relationship - friendship >= 9.5);
  assert.ok(
    g.relationship - friendship <= 10,
    `One conversation gained ${g.relationship - friendship} friendship`,
  );
});

for (const [label, mutate] of [
  ["unknown action kind", (a) => (a.kind = "invalid")],
  ["unknown action phase", (a) => (a.phase = "invalid")],
  ["missing object reference", (a) => (a.target = "missing")],
  ["non-finite action elapsed", (a) => (a.elapsed = null)],
  [
    "missing walking route",
    (a) => {
      a.phase = "walking";
      delete a.path;
    },
  ],
  [
    "out-of-bounds walking route",
    (a) => {
      a.phase = "walking";
      a.path = [{ x: 999, z: 4 }];
    },
  ],
]) {
  test(`malformed queued save recovers safely: ${label}`, () => {
    const bad = createGame();
    enqueue(bad, 0, "fridge");
    mutate(bad.people[0].queue[0]);
    const loaded = restore(JSON.stringify(bad));
    assert.deepEqual(loaded, createGame());
    assert.doesNotThrow(() => tick(loaded, 0.1));
  });
}
