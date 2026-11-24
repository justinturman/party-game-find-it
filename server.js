import fs from 'node:fs';

const INVALID_MOVE = 'INVALID_MOVE';

export const config = { minGiveUpMs: 30000, missBaseMs: 1000, missStepMs: 1000, missMaxMs: 5000 };

// A massive pool of native emojis to use as distractors.
const DISTRACTOR_STRING = "🍎🍏🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶🫑🌽🥕🫒🧄🧅🥔🍠🥐🥯🍞🥖🥨🧀🥚🍳🧈🥞🧇🥓🥩🍗🍖🦴🌭🍔🍟🍕🫓🥪🥙🧆🌮🌯🫔🥗🥘🫕🥫🍝🍜🍲🍛🍣🍱🥟🍤🍙🍚🍘🍥🥠🥮🍢🍡🍧🍨🍦🥧🧁🍰🎂🍮🍭🍬🍫🍿🍩🍪🌰🥜🍯🥛🍼🫖☕🍵🧃🥤🧋🍶🍺🍻🥂🍷🥃🍸🍹🧉🍾🐶🐱🐭🐹🐰🦊🐻🐼🐻‍❄️🐨🐯🦁🐮🐷🐽🐸🐵🙈🙉🙊🐒🐔🐧🐦🐤🐣🐥🦆🦅🦉🦇🐺🐗🐴🦄🐝🪱🐛🦋🐌🐞🐜🪰🪲🪳🦟🦗🕷🕸🦂🐢🐍🦎🦖🦕🐙🦑🦐🦞🦀🐡🐠🐟🐬🐳🐋🦈🐊🐅🐆🦓🦍🦧🐘🦛🦏🐪🐫🦒🦘🐃🐂🐄🐎🐖🐏🐑🦙🐐🦌🐕🐩🦮🐕‍🦺🐈🐈‍⬛🪶🐓🦃🦤🦚🦜🦢🦩🕊🐇🦝🦨🦡🦫🦦🦥🐁🐀🐿🦔🐾🐉🐲🌵🎄🌲🌳🌴🪵🌱🌿☘️🍀🎍🪴🎋🍃🍂🍁🍄🐚🪨🌾💐🌷🌹🥀🌺🌸🌼🌻🌞🌝🌛🌜🌚🌕🌖🌗🌘🌑🌒🌓🌔🌙🌎🌍🌏🪐💫⭐🌟✨⚡️☄️💥🔥🌪🌈☀️🌤⛅️🌥☁️🌦🌧⛈🌩🌨❄️☃️⛄️🌬💨💧💦☔️☂️🌊🌫🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶🫑🌽🥕🫒🧄🧅🥔🍠🥐🥯🍞🥖🥨🧀🥚🍳🧈🥞🧇🥓🥩🍗🍖🦴🌭🍔🍟🍕🫓🥪🥙🧆🌮🌯🫔🥗🥘🫕🥫🍝🍜🍲🍛🍣🍱🥟🍤🍙🍚🍘🍥🥠🥮🍢🍡🍧🍨🍦🥧🧁🍰🎂🍮🍭🍬🍫🍿🍩🍪🌰🥜🍯🥛🍼🫖☕🍵🧃🥤🧋🍶🍺🍻🥂🍷🥃🍸🍹🧉🍾⚽️🏀🏈⚾️🥎🎾🏐🏉🥏🎱🪀🏓🏸🏒🏑🥍🏏🪃🥅⛳️🪁🏹🎣🤿🥊🥋🎽🛹🛼🛷⛸🥌🎿⛷🏂🪂🏋️‍♀️🤼‍♀️🤸‍♀️⛹️‍♀️🤺🤾‍♀️🏌️‍♀️🏇🧘‍♀️🏄‍♀️🏊‍♀️🤽‍♀️🚣‍♀️🧗‍♀️🚵‍♀️🚴‍♀️🏆🥇🥈🥉🏅🎖🏵🎗🎫🎟🎪🤹‍♀️🎭🩰🎨🎬🎤🎧🎼🎹🥁🪘🎷🎺🪗🎸🪕🎻🎲♟🎯🎳🎮🎰🧩🚗🚕🚙🚌🚎🏎🚓🚑🚒🚐🛻🚚🚛🚜🦯🦽🦼🛴🚲🛵🏍🛺🚨🚔🚍🚘🚖🚡🚠🚟🚃🚋🚞🚝🚄🚅🚈🚂🚆🚇🚊🚉✈️🛫🛬🛩💺🛰🚀🛸🚁🛶⛵️🚤🛥🛳⛴🚢⚓️🪝⛽️🚧🚦🚥🚏🗺🗿🗽🗼🏰🏯🏟🎡🎢🎠⛲️⛱🏖🏝🏜🌋⛰🏔🗻🏕⛺️🛖🏠🏡🏘🏚🏗🏭🏢🏬🏣🏤🏥🏦🏨🏪🏫🏩💒🏛⛪️🕌🕍🛕🕋⛩🛤🛣🗾🎑🏞🌅🌄🌠🎇🎆🌇🌆🏙🌃🌌🌉🌁⌚️📱📲💻⌨️🖥🖨🖱🖲🕹🗜💽💾💿📀📼📷📸📹🎥📽🎞📞☎️📟📠📺📻🎙🎚🎛🧭⏱⏲⏰🕰⌛️⏳📡🔋🔌💡🔦🕯🪔🧯🛢💸💵💴💶💷🪙💰💳💎⚖️🪜🧰🪛🔧🔨⚒🛠⛏🪚🔩⚙️🪤🧱⛓🧲🔫💣🧨🪓🔪🗡⚔️🛡🚬⚰️🪦⚱️🏺🔮📿🧿💈⚗️🔭🔬🕳🩹🩺💊💉🩸🧬🦠🧫🧪🌡🧹🪠🧺🧻🚽🚰🚿🛁🛀🧼🪥🪒🧽🪣🧴🛎🔑🗝🚪🪑🛋🛏🛌🧸🪆🖼🪞🪟🛍🛒🎁🎈🎏🎀🪄🪙🧧📩📨📧💌📥📤📦🏷🪧📪📫📬📭📮📯📜📃📄📑🧾📊📈📉🗒🗓📆📅🗑📇🗃🗳🗄📋📁📂🗂🗞📰📓📔📒📕📗📘📙📚📖🔖🧷🔗📎🖇📐📏🧮📌📍✂️🖊🖋✒️🖌🖍📝✏️🔍🔎🔏🔐🔒🔓❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟☮️✝️☪️🕉☸️✡️🔯🕎☯️☦️🛐⛎♈️♉️♊️♋️♌️♍️♎️♏️♐️♑️♒️♓️🆔⚛️🉑☢️☣️📴📳🈶🈚️🈸🈺🈷️✴️🆚💮🉐㊙️㊗️🈴🈵🈹🈲🅰️🅱️🆎🆑🅾️🆘❌⭕️🛑⛔️📛🚫💯💢♨️🚷🚯🚳🚱🔞📵🚭❗️❕❓❔‼️⁉️🔅🔆〽️⚠️🚸🔱⚜️🔰♻️✅🈯️💹❇️✳️❎🌐💠Ⓜ️🌀💤🏧🚾♿️🅿️🛗🈳🈂️🛂🛃🛄🛅🚹🚺🚼🚻🚮🎦📶🈁🔣ℹ️🔤🔡🔠🆖🆗🆙🆒🆕🆓0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣🔟🔢#️⃣*️⃣⏏️▶️⏸⏯⏹⏺⏭⏮⏩⏪⏫⏬◀️🔼🔽➡️⬅️⬆️⬇️↗️↘️↙️↖️↕️↔️↩️↪️⤴️⤵️🔀🔁🔂🔄🔃🎵🎶➕➖➗✖️🟰♾️💲💱™️©️®️👁️‍🗨️🔚🔙🔛🔝🔜〰️➰➿✔️☑️🔘🔴🟠🟡🟢🔵🟣⚫️⚪️🟤🔺🔻🔸🔹🔶🔷🔳🔲▪️▫️◾️◽️◼️◻️🟥🟧🟨🟩🟦🟪⬛️⬜️🟫🔈🔇🔉🔊🔔🔕📣📢👁️👂👃👅👄🫀🫁🧠🦷🦴👀👤👥🫂👶🧒👦👧🧑👱‍♀️👨🧔👩🧓👴👵🙍‍♂️🙍‍♀️🙎‍♂️🙎‍♀️🙅‍♂️🙅‍♀️🙆‍♂️🙆‍♀️💁‍♂️💁‍♀️🙋‍♂️🙋‍♀️🧏‍♂️🧏‍♀️🙇‍♂️🙇‍♀️🤦‍♂️🤦‍♀️🤷‍♂️🤷‍♀️🧑‍⚕️🧑‍🎓🧑‍🏫🧑‍⚖️🧑‍🌾🧑‍🍳🧑‍🔧🧑‍🏭🧑‍💼🧑‍🔬🧑‍💻🧑‍🎤🧑‍🎨🧑‍✈️🧑‍🚀🧑‍🚒👮‍♂️👮‍♀️🕵️‍♂️🕵️‍♀️💂‍♂️💂‍♀️🥷👷‍♂️👷‍♀️🤴👸👳‍♂️👳‍♀️👲🧕🤵‍♂️🤵‍♀️👰‍♂️👰‍♀️🤰🤱👩‍🍼👨‍🍼🧑‍🍼👼🎅🤶🦸‍♂️🦸‍♀️🦹‍♂️🦹‍♀️🧙‍♂️🧙‍♀️🧚‍♂️🧚‍♀️🧛‍♂️🧛‍♀️🧜‍♂️🧜‍♀️🧝‍♂️🧝‍♀️🧞‍♂️🧞‍♀️🧟‍♂️🧟‍♀️💆‍♂️💆‍♀️💇‍♂️💇‍♀️🚶‍♂️🚶‍♀️🧍‍♂️🧍‍♀️🧎‍♂️🧎‍♀️🏃‍♂️🏃‍♀️💃🕺🕴👯‍♂️👯‍♀️🧖‍♂️🧖‍♀️🧗‍♂️🧗‍♀️🤺🏇⛷🏂🏌️‍♂️🏌️‍♀️🏄‍♂️🏄‍♀️🚣‍♂️🚣‍♀️🏊‍♂️🏊‍♀️⛹️‍♂️⛹️‍♀️🏋️‍♂️🏋️‍♀️🚴‍♂️🚴‍♀️🚵‍♂️🚵‍♀️🤸‍♂️🤸‍♀️🤼‍♂️🤼‍♀️🤽‍♂️🤽‍♀️🤾‍♂️🤾‍♀️🤹‍♂️🤹‍♀️🧘‍♂️🧘‍♀️🛀🛌🧑‍🤝‍🧑👭👫👬💏👩‍❤️‍💋‍👨👨‍❤️‍💋‍👨👩‍❤️‍💋‍👩💑👩‍❤️‍👨👨‍❤️‍👨👩‍❤️‍👩👪👨‍👩‍👦👨‍👩‍👧👨‍👩‍👧‍👦👨‍👩‍👦‍👦👨‍👩‍👧‍👧👨‍👨‍👦👨‍👨‍👧👨‍👨‍👧‍👦👨‍👨‍👦‍👦👨‍👨‍👧‍👧👩‍👩‍👦👩‍👩‍👧👩‍👩‍👧‍👦👩‍👩‍👦‍👦👩‍👩‍👧‍👧👨‍👦👨‍👦‍👦👨‍👧👨‍👧‍👦👨‍👧‍👧👩‍👦👩‍👦‍👦👩‍👧👩‍👧‍👦👩‍👧‍👧🗣👤👥🫂👣🧳🌂☂️🧵🪡🧶🪢👓🕶🥼🦺👔👕👖🧣🧤🧥🧦👗👘🥻🩱🩲🩳👙👚👛👜👝🛍🎒🩴👞👟🥾🥿👠👡🩰👢👑👒🎩🎓🧢🪖⛑📿💄💍💎🔇🔈🔉🔊📢📣📯🔔🔕🎼🎵🎶🎙🎚🎛🎤🎧📻🎷🪗🎸🎹🎺🪕🎻🥁🪘📱📲☎️📞📟📠🔋🪫🔌💻🖥💽💾💿📀🧮🎥🎞📽🎬📺📷📸📹📼🔍🔎🕯💡🔦🏮🪔📔📕📖📗📘📙📚📓📒📃📜📄📰🗞📑🔖🏷💰🪙💴💵💶💷💸💳🧾✉️📧📨📩📤📥📦📫📪📬📭📮🗳✏️✒️🖋🖊🖌🖍📝📁📂🗂📅📆🗒🗓📇📈📉📊📋📌📍📎🖇📏📐✂️🗃🗄🗑🔒🔓🔏🔐🔑🗝🔨🪓⛏⚒🛠🗡⚔️🔫🪃🏹🛡🪚🔧🪛🔩⚙️🗜⚖️🦯🔗⛓🪝🧰🧲🪜⚗️🧪🧫🧬🔭🔬🕳🩹🩺💊💉🩸🧬🦠🧫🧪🌡🧹🪠🧺🧻🚽🚰🚿🛁🛀🧼🪥🪒🧽🪣🧴🛎🔑🗝🚪🪑🛋🛏🛌🧸🪆🖼🪞🪟🛍🛒🎁🎈🎏🎀🪄🪙🧧📩📨📧💌📥📤📦🏷🪧📪📫📬📭📮📯📜📃📄📑🧾📊📈📉🗒🗓📆📅🗑📇🗃🗳🗄📋📁📂🗂🗞📰📓📔📒📕📗📘📙📚📖🔖🧷🔗📎🖇📐📏🧮📌📍✂️🖊🖋✒️🖌🖍📝✏️🔍🔎🔏🔐🔒🔓";
const DISTRACTORS = Array.from(new Set(Array.from(DISTRACTOR_STRING)));

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
    if (typeof s.background !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(s.background)) {
      throw new Error(`${where} (${s.id}): needs a valid "background" hex color`);
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
      if (typeof it.emoji !== 'string' || it.emoji.length === 0) {
        throw new Error(`${label}: needs a valid "emoji" character`);
      }
    });
  });
  return list;
}
export const SCENES = loadScenes();

const rand = (min, max) => Math.random() * (max - min) + min;

function generateScene(scene) {
  const placed = [];
  
  // 1. Filter out distractors that match the target items for THIS scene
  const targetEmojis = scene.items.map((it) => it.emoji);
  let availableDistractors = DISTRACTORS.filter((d) => !targetEmojis.includes(d));
  
  // 2. Shuffle and select 300 unique distractors to cover the board
  availableDistractors = availableDistractors
    .sort(() => Math.random() - 0.5)
    .slice(0, 300);

  // 3. Place distractors FIRST (they can overlap each other)
  availableDistractors.forEach((emoji) => {
    // Radius is half the size (0.015 to 0.035)
    const r = rand(0.015, 0.035);
    // Distribute randomly across the whole board
    const x = rand(r + 0.02, 1 - r - 0.02);
    const y = rand(r + 0.02, 1 - r - 0.02);
    
    placed.push({ name: 'Distractor', emoji, x, y, r, isDistractor: true });
  });

  // 4. Place the target items ON TOP of the distractors
  scene.items.forEach((it) => {
    let x, y, overlap;
    let tries = 0;
    
    // Radius is half the size (0.02 to 0.045)
    const r = rand(0.02, 0.045);
    
    do {
      x = rand(r + 0.05, 1 - r - 0.05);
      y = rand(r + 0.05, 1 - r - 0.05);
      
      // Ensure targets don't overlap other targets
      overlap = placed.some((p) => {
        if (p.isDistractor) return false;
        const dist = Math.hypot(p.x - x, p.y - y);
        return dist < (p.r + r) * 1.8; 
      });
      tries++;
      
      if (tries > 50) {
        const cols = 4;
        const rows = 4;
        const col = placed.length % cols;
        const row = Math.floor(placed.length / cols) % rows;
        x = (col + 0.5) / cols;
        y = (row + 0.5) / rows;
        overlap = false;
      }
    } while (overlap);
    
    // Because this is pushed AFTER the distractors, it will render on top
    placed.push({ ...it, x, y, r, isDistractor: false });
  });

  return placed;
}

const isSeat = (id) => id !== null && id !== undefined && id !== '';
const current = (G) => SCENES[G.order[G.round % G.order.length]];

function takeSeq(G, id, seq) {
  if (seq !== (G.seqs[id] || 0) + 1) return false;
  G.seqs[id] = seq;
  return true;
}

function newOrder(random, avoid) {
  const order = random.Shuffle(SCENES.map((_, i) => i));
  if (SCENES.length > 1 && order[0] === avoid) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

export const game = {
  name: 'find-it',
  minPlayers: 16,
  maxPlayers: 16,

  turn: { activePlayers: { all: null } },

  setup: ({ random }) => {
    const order = newOrder(random, -1);
    const scene = SCENES[order[0]];
    const layout = generateScene(scene);
    return {
      order,
      round: 0,
      phase: 'playing',
      gaveUp: false,
      startedAt: Date.now(),
      layout,
      found: {},
      misses: {},
      seqs: {},
    };
  },

  moves: {
    tap: {
      client: false,
      move: ({ G, playerID }, seq, x, y) => {
        if (G.phase !== 'playing' || !isSeat(playerID)) return INVALID_MOVE;
        if (!takeSeq(G, playerID, seq)) return INVALID_MOVE;
        if (typeof x !== 'number' || typeof y !== 'number' || !(x >= 0 && x <= 1 && y >= 0 && y <= 1)) return;

        const now = Date.now();
        const m = G.misses[playerID] || { until: 0, streak: 0 };
        if (now < m.until) return;

        let hit = -1;
        let hitDist = Infinity;
        let onFound = false;
        
        // We must check in reverse order so targets (which are at the end of the array) are checked first
        for (let i = G.layout.length - 1; i >= 0; i--) {
          const it = G.layout[i];
          if (it.isDistractor) continue;
          
          const d = Math.hypot((x - it.x) * 1000, (y - it.y) * 1000);
          if (d > it.r * 1000) continue;
          
          if (G.found[i]) {
            onFound = true;
            continue;
          }
          if (d < hitDist) {
            hit = i;
            hitDist = d;
          }
        }

        if (hit >= 0) {
          G.found[hit] = { by: playerID, n: Object.keys(G.found).length + 1 };
          G.misses[playerID] = { until: 0, streak: 0 };
          
          const totalTargets = G.layout.filter((it) => !it.isDistractor).length;
          if (Object.keys(G.found).length === totalTargets) G.phase = 'done';
        } else if (!onFound) {
          const streak = m.streak + 1;
          const pause = Math.min(config.missMaxMs, config.missBaseMs + (streak - 1) * config.missStepMs);
          G.misses[playerID] = { until: now + pause, streak };
        }
      },
    },

    nextScene: {
      client: false,
      move: ({ G, playerID, random }, round) => {
        if (G.phase !== 'done' || !isSeat(playerID) || round !== G.round) return INVALID_MOVE;
        const previous = G.order[G.round % G.order.length];
        G.round += 1;
        if (G.round % G.order.length === 0) G.order = newOrder(random, previous);
        
        const scene = SCENES[G.order[G.round % G.order.length]];
        G.layout = generateScene(scene);
        G.found = {};
        G.misses = {};
        G.gaveUp = false;
        G.startedAt = Date.now();
        G.phase = 'playing';
      },
    },

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

  playerView: ({ G, playerID }) => {
    const scene = current(G);
    const now = Date.now();
    const isPlayer = isSeat(playerID);
    const done = G.phase === 'done';

    const visibleLayout = G.layout.map((it, i) => {
      const isFound = !!G.found[i];
      return {
        i,
        name: it.isDistractor ? 'Distractor' : it.name,
        emoji: it.emoji,
        x: it.x,
        y: it.y,
        r: it.r,
        isDistractor: it.isDistractor,
        foundBy: isFound ? G.found[i].by : null
      };
    });

    const found = Object.keys(G.found)
      .map(Number)
      .sort((a, b) => G.found[a].n - G.found[b].n)
      .map((i) => ({
        i,
        by: G.found[i].by,
        x: G.layout[i].x,
        y: G.layout[i].y,
        r: G.layout[i].r,
      }));

    const counts = {};
    for (const f of found) counts[f.by] = (counts[f.by] || 0) + 1;
    let winners = [];
    if (done) {
      const best = Math.max(0, ...Object.values(counts));
      if (best > 0) winners = Object.keys(counts).filter((id) => counts[id] === best);
    }

    const m = isPlayer ? G.misses[playerID] : null;
    
    const targets = G.layout
      .map((it, i) => ({ i, name: it.name, isDistractor: it.isDistractor }))
      .filter((it) => !it.isDistractor);

    return {
      phase: G.phase,
      round: G.round,
      scene: { 
        id: scene.id, 
        background: scene.background
      },
      layout: visibleLayout,
      items: targets,
      found,
      counts,
      winners,
      gaveUp: G.gaveUp,
      cool: m ? Math.max(0, m.until - now) : 0,
      giveUpLeft: Math.max(0, G.startedAt + config.minGiveUpMs - now),
      mySeq: isPlayer ? G.seqs[playerID] || 0 : 0,
    };
  },
};