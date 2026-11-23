import fs from 'node:fs';

const INVALID_MOVE = 'INVALID_MOVE';

// Timings. Exported so the tests can inspect them.
export const config = { minGiveUpMs: 30000, missBaseMs: 1000, missStepMs: 1000, missMaxMs: 5000 };

// ---- The scenes ----
// scenes.json lists each picture and where its items are. It stays on the server:
// players only receive an item's position after someone has found it.
function loadScenes() {
  const raw = JSON.parse(fs.readFileSync(new URL('./scenes.json', import.meta.url), 'utf8'));
  const list = raw.scenes;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('scenes.json needs a "scenes" list with at least one scene');
  }
  const ids = new Set();
  list.forEach((s, n) => {
    const where = `scenes.json, scene #${n + 1}`;
    if (typeof s.id !== 'string' || !/^[a-z0-9-]+$/.test(s.id) || ids.has(s.id)) {
      throw new Error(`${where}: "id" must be unique, using lowercase letters, digits and hyphens`);
    }
    ids.add(s.id);
    if (
      typeof s.image !== 'string' ||
      !/^scenes\/[\w.-]+\.(jpg|jpeg|png|webp|svg)$/i.test(s.image) ||
      s.image.includes('..')
    ) {
      throw new Error(`${where} (${s.id}): "image" must look like scenes/name.jpg`);
    }
    if (!(s.width > 0) || !(s.height > 0)) {
      throw new Error(`${where} (${s.id}): needs "width" and "height" in pixels`);
    }
    if (!Array.isArray(s.items) || s.items.length === 0) {
      throw new Error(`${where} (${s.id}): needs at least one item`);
    }
    const seen = new Set();
    s.items.forEach((it, i) => {
      const label = `${where} (${s.id}), item #${i + 1}`;
      const name = typeof it.name === 'string' ? it.name.trim() : '';
      if (!name || name.length > 40) throw new Error(`${label}: needs a name of up to 40 characters`);
      if (seen.has(name.toLowerCase())) throw new Error(`${label}: the name "${name}" is used twice`);
      seen.add(name.toLowerCase());
      it.name = name;
      const okPos = (v) => typeof v === 'number' && v >= 0 && v <= 1;
      if (!okPos(it.x) || !okPos(it.y)) throw new Error(`${label}: "x" and "y" must be between 0 and 1`);
      if (typeof it.r !== 'number' || !(it.r > 0 && it.r <= 0.25)) {
        throw new Error(`${label}: "r" must be a number above 0 and at most 0.25`);
      }
    });
  });
  return list;
}
export const SCENES = loadScenes();

// ---- Helpers ----
const isSeat = (id) => id !== null && id !== undefined && id !== '';
const current = (G) => SCENES[G.order[G.round % G.order.length]];

// Taps carry a sequence number, so a tap that is resent after a lost reply
// is only ever applied once, and always in order.
function takeSeq(G, id, seq) {
  if (seq !== (G.seqs[id] || 0) + 1) return false;
  G.seqs[id] = seq;
  return true;
}

// A shuffled play order that never starts with the scene that was just played
function newOrder(random, avoid) {
  const order = random.Shuffle(SCENES.map((_, i) => i));
  if (SCENES.length > 1 && order[0] === avoid) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

export const game = {
  name: 'find-it',
  // Players join at any time. All seats are created up front and fill as people arrive.
  minPlayers: 16,
  maxPlayers: 16,

  // Everyone taps at the same time
  turn: { activePlayers: { all: null } },

  setup: ({ random }) => ({
    order: newOrder(random, -1),
    round: 0,
    phase: 'playing', // playing -> done -> (next game) -> playing ...
    gaveUp: false,
    startedAt: Date.now(),
    found: {}, // item index -> { by, n }
    misses: {}, // player id -> { until, streak }
    seqs: {},
  }),

  moves: {
    // A tap. Positions are checked here, so the map never leaves the server.
    tap: {
      client: false,
      move: ({ G, playerID }, seq, x, y) => {
        if (G.phase !== 'playing' || !isSeat(playerID)) return INVALID_MOVE;
        if (!takeSeq(G, playerID, seq)) return INVALID_MOVE;
        if (typeof x !== 'number' || typeof y !== 'number' || !(x >= 0 && x <= 1 && y >= 0 && y <= 1)) return;

        const now = Date.now();
        const m = G.misses[playerID] || { until: 0, streak: 0 };
        if (now < m.until) return; // still paused after a wrong tap

        const scene = current(G);
        let hit = -1;
        let hitDist = Infinity;
        let onFound = false;
        scene.items.forEach((it, i) => {
          const d = Math.hypot((x - it.x) * scene.width, (y - it.y) * scene.height);
          if (d > it.r * scene.width) return;
          if (G.found[i]) {
            onFound = true;
            return;
          }
          if (d < hitDist) {
            hit = i;
            hitDist = d;
          }
        });

        if (hit >= 0) {
          G.found[hit] = { by: playerID, n: Object.keys(G.found).length + 1 };
          G.misses[playerID] = { until: 0, streak: 0 };
          if (Object.keys(G.found).length === scene.items.length) G.phase = 'done';
        } else if (!onFound) {
          // Tapping an item someone has just found costs nothing; anything else is a miss
          const streak = m.streak + 1;
          const pause = Math.min(config.missMaxMs, config.missBaseMs + (streak - 1) * config.missStepMs);
          G.misses[playerID] = { until: now + pause, streak };
        }
      },
    },

    // Any player can start the next picture. The round number stops a late second tap skipping one.
    nextScene: {
      client: false,
      move: ({ G, playerID, random }, round) => {
        if (G.phase !== 'done' || !isSeat(playerID) || round !== G.round) return INVALID_MOVE;
        const previous = G.order[G.round % G.order.length];
        G.round += 1;
        if (G.round % G.order.length === 0) G.order = newOrder(random, previous);
        G.found = {};
        G.misses = {};
        G.gaveUp = false;
        G.startedAt = Date.now();
        G.phase = 'playing';
      },
    },

    // Any player can end a picture that nobody can finish, after a short while
    endRound: {
      client: false,
      move: ({ G, playerID }, round) => {
        if (G.phase !== 'playing' || !isSeat(playerID) || round !== G.round) return INVALID_MOVE;
        if (Date.now() - G.startedAt < config.minGiveUpMs) return INVALID_MOVE;
        G.phase = 'done';
        G.gaveUp = true;
      },
    },
  },

  // THE PRIVACY RULES:
  //  - an item's position is sent only once the item has been found
  //  - unfound items' positions are sent only after the game is over
  //  - everyone gets item NAMES from the start (the TV needs the list)
  //  - a player's pause is sent only to that player
  playerView: ({ G, playerID }) => {
    const scene = current(G);
    const now = Date.now();
    const isPlayer = isSeat(playerID);
    const done = G.phase === 'done';

    const found = Object.keys(G.found)
      .map(Number)
      .sort((a, b) => G.found[a].n - G.found[b].n)
      .map((i) => ({
        i,
        by: G.found[i].by,
        x: scene.items[i].x,
        y: scene.items[i].y,
        r: scene.items[i].r,
      }));
    const missed = done
      ? scene.items
          .map((it, i) => ({ i, x: it.x, y: it.y, r: it.r }))
          .filter((m) => !G.found[m.i])
      : [];

    const counts = {};
    for (const f of found) counts[f.by] = (counts[f.by] || 0) + 1;
    let winners = [];
    if (done) {
      const best = Math.max(0, ...Object.values(counts));
      if (best > 0) winners = Object.keys(counts).filter((id) => counts[id] === best);
    }

    const m = isPlayer ? G.misses[playerID] : null;
    return {
      phase: G.phase,
      round: G.round,
      scene: { id: scene.id, image: scene.image, width: scene.width, height: scene.height },
      items: scene.items.map((it) => it.name),
      found,
      missed,
      counts,
      winners,
      gaveUp: G.gaveUp,
      cool: m ? Math.max(0, m.until - now) : 0,
      giveUpLeft: Math.max(0, G.startedAt + config.minGiveUpMs - now),
      mySeq: isPlayer ? G.seqs[playerID] || 0 : 0,
    };
  },
  // No endIf: the room keeps going, one picture after another
};