import { game, SCENES } from './server.js';

let failures = 0;
const check = (label, ok) => {
  console.log(ok ? 'PASS' : 'FAIL', label);
  if (!ok) failures++;
};
const REJECT = 'INVALID_MOVE';
const random = { Shuffle: (a) => [...a].sort(() => Math.random() - 0.5) };

// ---- The real scenes file ----
check('scenes.json has at least one scene', SCENES.length >= 1);
check(
  'every scene has a picture and items with positions inside it',
  SCENES.every((s) => s.image && s.items.length > 0 && s.items.every((it) => it.x >= 0 && it.x <= 1 && it.y >= 0 && it.y <= 1 && it.r > 0))
);

// The rules below use small scenes of our own, so the numbers are predictable
const demo = (id) => ({
  id,
  image: 'scenes/demo.jpg',
  width: 1000,
  height: 500,
  items: [
    { name: 'Alpha', x: 0.2, y: 0.2, r: 0.05 },
    { name: 'Beta', x: 0.8, y: 0.2, r: 0.05 },
    { name: 'Gamma', x: 0.5, y: 0.8, r: 0.05 },
    { name: 'Delta', x: 0.52, y: 0.8, r: 0.05 }, // overlaps Gamma
  ],
});
SCENES.splice(0, SCENES.length, demo('demo'));

function newGame() {
  const ctx = { numPlayers: 16, currentPlayer: '0' };
  const G = game.setup({ ctx, random });
  const g = {
    G,
    play: (name, id, ...args) => game.moves[name].move({ G, ctx, playerID: id, random }, ...args),
    view: (id) => game.playerView({ G, ctx, playerID: id }),
  };
  g.tap = (id, x, y) => g.play('tap', id, (G.seqs[id] || 0) + 1, x, y);
  return g;
}

// ---- Setup and privacy ----
{
  const g = newGame();
  check('a game starts straight away, on round 0', g.G.phase === 'playing' && g.G.round === 0);
  check('everyone sees the item names', g.view(null).items.join(',') === 'Alpha,Beta,Gamma,Delta');
  check('nobody receives any item position', ['0', '1', null].every((id) => !JSON.stringify(g.view(id)).includes('"x"')));
  check('nobody receives the unfound items before the end', g.view(null).missed.length === 0);
}

// ---- Tapping ----
{
  const g = newGame();
  check('a spectator cannot tap', g.play('tap', null, 1, 0.2, 0.2) === REJECT);
  check('a wrong sequence number is rejected', g.play('tap', '1', 5, 0.2, 0.2) === REJECT);
  g.tap('1', 'x', 'y');
  check('nonsense coordinates are ignored but counted', g.G.seqs['1'] === 1 && Object.keys(g.G.found).length === 0 && !g.G.misses['1']);
  g.tap('1', 0.2, 0.2);
  check('tapping an item finds it', g.G.found[0] && g.G.found[0].by === '1');
  check('everyone now sees where it was', g.view(null).found[0].x === 0.2 && g.view('2').found[0].by === '1');
  check('the item counts for its finder', g.view(null).counts['1'] === 1);
  check('a repeated move is rejected', g.play('tap', '1', 1, 0.8, 0.2) === REJECT);
  g.tap('2', 0.2, 0.2);
  check('tapping an item someone has just found costs nothing', !g.G.misses['2'] && g.view('2').cool === 0);
  g.tap('2', 0.5, 0.2);
  check('a wrong tap starts a pause', g.G.misses['2'].until > Date.now() && g.view('2').cool > 0);
  check('only the player who missed is paused', g.view('1').cool === 0);
  g.tap('2', 0.8, 0.2);
  check('taps during the pause are ignored', !g.G.found[1]);
  check('...but still counted, so the numbering stays in step', g.G.seqs['2'] === 3);
  g.G.misses['2'].until = 0;
  g.tap('2', 0.8, 0.2);
  check('after the pause the player can find items again', g.G.found[1] && g.G.found[1].by === '2');
  check('finding an item clears the miss streak', g.G.misses['2'].streak === 0);
}

// ---- The pause grows ----
{
  const g = newGame();
  g.tap('1', 0.5, 0.2);
  const first = g.G.misses['1'].until - Date.now();
  g.G.misses['1'].until = 0;
  g.tap('1', 0.5, 0.2);
  const second = g.G.misses['1'].until - Date.now();
  check('a first miss pauses for about 1 second', first > 900 && first <= 1000);
  check('a second miss in a row pauses for about 2 seconds', second > 1900 && second <= 2000);
  for (let i = 0; i < 6; i++) {
    g.G.misses['1'].until = 0;
    g.tap('1', 0.5, 0.2);
  }
  check('the pause never exceeds 5 seconds', g.G.misses['1'].until - Date.now() <= 5000);
}

// ---- Precision ----
{
  const g = newGame();
  g.tap('1', 0.249, 0.2); // 49 px from the centre; the radius is 50 px
  check('a tap just inside the circle hits', !!g.G.found[0]);
  g.tap('2', 0.851, 0.2); // 51 px
  check('a tap just outside the circle misses', !g.G.found[1] && !!g.G.misses['2']);
  g.tap('1', 0.515, 0.8); // 15 px from Gamma, 5 px from Delta
  check('when circles overlap, the nearest item is chosen', !!g.G.found[3] && !g.G.found[2]);
}

// ---- Finishing a game ----
{
  const g = newGame();
  g.tap('1', 0.2, 0.2);
  g.tap('2', 0.8, 0.2);
  g.tap('1', 0.5, 0.8);
  check('the game is still on with an item left', g.G.phase === 'playing');
  g.tap('2', 0.52, 0.8);
  check('the game is over when every item is found', g.G.phase === 'done');
  check('equal scores are a tie', g.view(null).winners.join(',') === '1,2');
  check('tapping after the end is rejected', g.play('tap', '1', 3, 0.2, 0.2) === REJECT);
}
{
  const g = newGame();
  g.tap('1', 0.2, 0.2);
  g.tap('1', 0.8, 0.2);
  g.tap('1', 0.5, 0.8);
  g.tap('2', 0.52, 0.8);
  check('the most items wins', g.view(null).winners.join(',') === '1' && g.view(null).counts['1'] === 3);
}

// ---- Giving up ----
{
  const g = newGame();
  check('giving up is rejected at the start', g.play('endRound', '1', 0) === REJECT);
  g.G.startedAt = Date.now() - 31000;
  check('a spectator cannot end the game', g.play('endRound', null, 0) === REJECT);
  check('the wrong round number is rejected', g.play('endRound', '1', 4) === REJECT);
  g.play('endRound', '1', 0);
  check('a player can end a stuck game after a while', g.G.phase === 'done' && g.G.gaveUp === true);
  const v = g.view(null);
  check('the unfound items are revealed at the end', v.missed.length === 4 && typeof v.missed[0].x === 'number');
  check('nobody wins when nothing was found', v.winners.length === 0);
}

// ---- The next game ----
{
  const g = newGame();
  check('next game is rejected while playing', g.play('nextScene', '1', 0) === REJECT);
  g.tap('1', 0.2, 0.2);
  g.G.startedAt = Date.now() - 31000;
  g.play('endRound', '1', 0);
  check('a spectator cannot start the next game', g.play('nextScene', null, 0) === REJECT);
  check('the wrong round number is rejected', g.play('nextScene', '1', 7) === REJECT);
  g.play('nextScene', '1', 0);
  check('the next game starts fresh', g.G.round === 1 && g.G.phase === 'playing' && Object.keys(g.G.found).length === 0 && g.G.gaveUp === false);
  check('a second press for the same game is ignored', g.play('nextScene', '2', 0) === REJECT);
  g.tap('1', 0.2, 0.2);
  check('points do not carry over, and numbering carries on', g.view(null).counts['1'] === 1 && g.G.seqs['1'] === 2);
}

// ---- Cycling through scenes ----
{
  SCENES.splice(0, SCENES.length, demo('one'), demo('two'));
  const g = newGame();
  const seen = [];
  for (let r = 0; r < 6; r++) {
    seen.push(g.view(null).scene.id);
    g.G.startedAt = Date.now() - 31000;
    g.play('endRound', '1', r);
    g.play('nextScene', '1', r);
  }
  check('every scene gets played', new Set(seen).size === 2);
  check('the same scene never comes up twice in a row', seen.every((s, i) => i === 0 || s !== seen[i - 1]));
  SCENES.splice(0, SCENES.length, demo('solo'));
  const h = newGame();
  h.G.startedAt = Date.now() - 31000;
  h.play('endRound', '1', 0);
  h.play('nextScene', '1', 0);
  check('a single scene can repeat', h.G.round === 1 && h.view(null).scene.id === 'solo');
}

// ---- Joining mid-game ----
{
  SCENES.splice(0, SCENES.length, demo('demo'));
  const g = newGame();
  g.tap('0', 0.2, 0.2);
  g.tap('11', 0.8, 0.2);
  check('a player who joins mid-game can score straight away', g.G.found[1] && g.G.found[1].by === '11');
  check('nobody needs registering first', g.view('11').mySeq === 1 && g.view('3').mySeq === 0);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);