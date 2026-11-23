(function () {
  const root = document.getElementById('root');
  const NS = 'http://www.w3.org/2000/svg';

  // Anything players typed (their nicknames) is escaped before it goes into the page
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  const send = (name, ...args) => parent.postMessage({ type: 'move', name, args }, '*');
  const $ = (id) => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // On the TV every player has their own colour. On a phone it is green for you, orange for the rest.
  const PALETTE = ['#ff5252', '#448aff', '#69f0ae', '#ffd740', '#e040fb', '#18ffff', '#ff6e40', '#b2ff59',
                   '#ff80ab', '#b388ff', '#84ffff', '#ffab40', '#ccff90', '#f48fb1', '#80d8ff', '#ea80fc'];
  const colorOf = (id) => PALETTE[Number(id) % PALETTE.length];
  const MINE = '#2ecc71';
  const OTHERS = '#ff9800';

  let last = null; // the most recent message from the platform
  let layoutKey = null; // which screen layout is currently built
  let rs = { round: -1, init: false, coolUntil: 0, giveUpAt: 0, confirm: false }; // what this phone knows about the current game
  let toastUntil = 0;

  const nameOf = (names, id) => esc(names[id] || `Player ${Number(id) + 1}`);

  // ---------------- Reliable taps ----------------
  // A tap carries a sequence number. We send one at a time and resend it until the
  // server's count (mySeq) shows it was accepted, so a tap is never lost or counted twice.
  const rel = { queue: [], inflight: null, sentAt: 0, ack: 0 };
  function relReset() {
    rel.queue = [];
    rel.inflight = null;
  }
  function relSend() {
    const op = rel.inflight;
    if (!op) return;
    op.seq = rel.ack + 1;
    rel.sentAt = Date.now();
    send('tap', op.seq, op.x, op.y);
  }
  function relPump() {
    if (!rel.inflight && rel.queue.length) {
      rel.inflight = rel.queue.shift();
      rel.inflight.base = rel.ack;
      rel.inflight.tries = 0;
      relSend();
    }
  }
  function relAck(ack) {
    rel.ack = ack;
    if (rel.inflight && rel.ack > rel.inflight.base) rel.inflight = null;
    relPump();
  }

  // ---------------- Pan and zoom ----------------
  const vw = { round: null, k: 1, tx: 0, ty: 0 }; // kept between rebuilds, so flipping to the TV view and back keeps your zoom
  let vpEl = null;
  let worldEl = null;
  let W = 1;
  let H = 1;
  let vpW = 1;
  let vpH = 1;
  let kMin = 1;
  let kMax = 8;

  function measure() {
    vpW = vpEl.clientWidth || 1;
    vpH = vpEl.clientHeight || 1;
    kMin = Math.min(vpW / W, vpH / H);
    kMax = Math.max(kMin * 8, 1.2);
  }
  function applyStroke() {
    const g = $('mk');
    if (g) g.setAttribute('stroke-width', String(4 / vw.k)); // circles keep the same thickness on screen at any zoom
  }
  function applyView() {
    const sw = W * vw.k;
    const sh = H * vw.k;
    vw.tx = sw <= vpW ? (vpW - sw) / 2 : clamp(vw.tx, vpW - sw, 0);
    vw.ty = sh <= vpH ? (vpH - sh) / 2 : clamp(vw.ty, vpH - sh, 0);
    worldEl.style.transform = `translate(${vw.tx}px, ${vw.ty}px) scale(${vw.k})`;
    applyStroke();
  }
  function fitView() {
    vw.k = kMin;
    vw.tx = 0;
    vw.ty = 0;
    applyView();
  }
  function zoomAt(cx, cy, factor) {
    const k2 = clamp(vw.k * factor, kMin, kMax);
    const wx = (cx - vw.tx) / vw.k;
    const wy = (cy - vw.ty) / vw.k;
    vw.k = k2;
    vw.tx = cx - wx * k2;
    vw.ty = cy - wy * k2;
    applyView();
  }

  function toast(text, ms) {
    const t = $('toast');
    if (!t) return;
    t.textContent = text;
    t.hidden = false;
    toastUntil = Date.now() + (ms || 1800);
  }

  function ping(wx, wy) {
    const g = $('pings');
    if (!g) return;
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', wx);
    c.setAttribute('cy', wy);
    c.setAttribute('r', 18 / vw.k);
    c.setAttribute('fill', 'none');
    c.setAttribute('stroke', '#ffffff');
    c.setAttribute('stroke-width', 3 / vw.k);
    g.appendChild(c);
    setTimeout(() => c.remove(), 600);
  }

  function onTap(px, py) {
    if (!last || last.view !== 'player') return;
    const S = last.state.G;
    if (S.phase !== 'playing') return;
    const wx = (px - vw.tx) / vw.k;
    const wy = (py - vw.ty) / vw.k;
    if (wx < 0 || wy < 0 || wx > W || wy > H) return;
    ping(wx, wy);
    if (Date.now() < rs.coolUntil) {
      toast('⏳ Wait a moment before tapping again');
      return;
    }
    if (rel.queue.length >= 2) return;
    rel.queue.push({ x: +(wx / W).toFixed(4), y: +(wy / H).toFixed(4) });
    relPump();
  }

  function attachGestures() {
    const ptrs = new Map();
    let g = null;
    const posOf = (e) => {
      const r = vpEl.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const two = () => {
      const [a, b] = [...ptrs.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    };

    vpEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try {
        vpEl.setPointerCapture(e.pointerId);
      } catch (err) {
        /* not needed everywhere */
      }
      ptrs.set(e.pointerId, posOf(e));
      if (ptrs.size === 1) {
        const p = ptrs.values().next().value;
        g = { sx: p.x, sy: p.y, lx: p.x, ly: p.y, t: Date.now(), moved: false, multi: false };
      } else if (ptrs.size === 2 && g) {
        const t = two();
        g.multi = true;
        g.d0 = t.d;
        g.c0 = t.c;
        g.k0 = vw.k;
        g.tx0 = vw.tx;
        g.ty0 = vw.ty;
      }
    });

    vpEl.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId) || !g) return;
      const p = posOf(e);
      ptrs.set(e.pointerId, p);
      if (g.multi && ptrs.size >= 2) {
        const t = two();
        const k2 = clamp((g.k0 * t.d) / g.d0, kMin, kMax);
        const wx = (g.c0.x - g.tx0) / g.k0;
        const wy = (g.c0.y - g.ty0) / g.k0;
        vw.k = k2;
        vw.tx = t.c.x - wx * k2;
        vw.ty = t.c.y - wy * k2;
        applyView();
      } else if (!g.multi && ptrs.size === 1) {
        if (!g.moved && Math.hypot(p.x - g.sx, p.y - g.sy) > 8) g.moved = true;
        if (g.moved) {
          vw.tx += p.x - g.lx;
          vw.ty += p.y - g.ly;
          applyView();
        }
        g.lx = p.x;
        g.ly = p.y;
      }
    });

    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const p = ptrs.get(e.pointerId);
      ptrs.delete(e.pointerId);
      if (ptrs.size === 0 && g) {
        const done = g;
        g = null;
        // A short press that did not travel is a tap; anything else was a pan or a pinch
        if (e.type === 'pointerup' && !done.multi && !done.moved && Date.now() - done.t < 600) onTap(p.x, p.y);
      }
    };
    vpEl.addEventListener('pointerup', up);
    vpEl.addEventListener('pointercancel', up);

    vpEl.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const p = posOf(e);
        zoomAt(p.x, p.y, e.deltaY < 0 ? 1.25 : 0.8);
      },
      { passive: false }
    );
  }

  function setupViewport(S) {
    vpEl = $('vp');
    worldEl = $('world');
    W = S.scene.width;
    H = S.scene.height;
    measure();
    if (vw.round !== S.round) {
      vw.round = S.round;
      fitView();
    } else {
      vw.k = clamp(vw.k, kMin, kMax);
      applyView();
    }
    attachGestures();
    $('zin').onclick = () => zoomAt(vpW / 2, vpH / 2, 1.5);
    $('zout').onclick = () => zoomAt(vpW / 2, vpH / 2, 1 / 1.5);
    $('zfit').onclick = fitView;
  }
  window.onresize = () => {
    if (!vpEl || !vpEl.isConnected) return;
    measure();
    vw.k = clamp(vw.k, kMin, kMax);
    applyView();
  };

  // ---------------- Shared pieces ----------------
  // Builds a screen layout once. Later updates only change the parts inside it,
  // so the picture, your zoom and the buttons are never torn down by other players' finds.
  function layout(key, html, onBuild) {
    if (key === layoutKey) return;
    layoutKey = key;
    root.innerHTML = html;
    if (onBuild) onBuild();
  }

  // Everyone who has joined, with their points. People who left show as "away"
  // (and are hidden if they never scored).
  function rosterOf(msg, S) {
    const names = msg.names;
    const rows = [];
    const seen = new Set();
    if (Array.isArray(msg.players)) {
      msg.players.forEach((p) => {
        const id = String(p.id);
        seen.add(id);
        const count = S.counts[id] || 0;
        if (p.connected || count > 0) rows.push({ id, name: p.name, count, away: !p.connected });
      });
    }
    Object.keys(S.counts).forEach((id) => {
      if (!seen.has(id)) rows.push({ id, name: names[id] || `Player ${Number(id) + 1}`, count: S.counts[id], away: true });
    });
    rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return rows;
  }

  function scoresHTML(rows, colorFor, myId) {
    if (!rows.length) return '<p class="progress">Waiting for players to join…</p>';
    return (
      '<ul class="scores">' +
      rows
        .map(
          (r) => `<li class="${r.away ? 'away' : ''}${r.id === myId ? ' me' : ''}">
            <span class="dot" style="background:${colorFor(r.id)}"></span>
            <span class="pname">${esc(r.name)}${r.away ? ' (away)' : ''}</span><strong>${r.count}</strong></li>`
        )
        .join('') +
      '</ul>'
    );
  }

  function resultHTML(S, names) {
    if (S.winners.length === 0) return '<h2>Nobody found anything this time</h2>';
    const who = S.winners.map((id) => nameOf(names, id)).join(' &amp; ');
    const n = S.counts[S.winners[0]];
    return S.winners.length === 1
      ? `<h2>🏆 ${who} wins with ${n}!</h2>`
      : `<h2>🤝 It's a tie: ${who} (${n} each)</h2>`;
  }

  // The circles drawn over the picture
  function marksSVG(S, colorFor, nonScaling) {
    const w = S.scene.width;
    const h = S.scene.height;
    const ns = nonScaling ? ' vector-effect="non-scaling-stroke"' : '';
    let out = '';
    S.missed.forEach((m) => {
      out += `<circle cx="${m.x * w}" cy="${m.y * h}" r="${m.r * w}" fill="none" stroke="#cfd8dc" stroke-opacity="0.8"${ns}/>`;
    });
    S.found.forEach((f) => {
      const c = colorFor(f.by);
      out += `<circle cx="${f.x * w}" cy="${f.y * h}" r="${f.r * w}" fill="${c}" fill-opacity="0.18" stroke="${c}"${ns}/>`;
    });
    return out;
  }

  // ---------------- TV and spectators ----------------
    function tvScreen(msg) {
    const { names, state } = msg;
    const S = state.G;
    const w = S.scene.width;
    const h = S.scene.height;
    layout(
      `tv:${S.round}`,
      `<div class="tv" style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;align-items:flex-start">
         <div class="scenebox" style="flex:1 1 520px;min-width:0;display:flex;justify-content:center">
           <div class="scene" style="position:relative;width:min(100%, calc((100vh - 24px) * ${w / h}))">
             <img src="${esc(S.scene.image)}" alt="" style="display:block;width:100%;height:auto;border-radius:10px" />
             <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="position:absolute;left:0;top:0;width:100%;height:100%"><g id="mk" stroke-width="5"></g></svg>
           </div>
         </div>
         <div class="side" style="flex:0 1 340px;min-width:260px;text-align:left">
           <h2 id="title"></h2>
           <div id="banner"></div>
           <div id="items"></div>
           <div id="scores"></div>
         </div>
       </div>`
    );
    $('title').textContent = `Find It · Game ${S.round + 1}`;
    $('mk').innerHTML = marksSVG(S, colorOf, true);
    $('banner').innerHTML =
      S.phase === 'done'
        ? resultHTML(S, names) +
          (S.gaveUp ? '<p class="progress">This game was ended early.</p>' : '') +
          '<p class="waiting">Tap “Next game” on any phone.</p>'
        : `<p class="progress">${S.found.length} of ${S.items.length} found</p>`;

    const foundBy = {};
    S.found.forEach((f) => (foundBy[f.i] = f.by));
    const missed = new Set(S.missed.map((m) => m.i));
    $('items').innerHTML =
      '<ul class="items">' +
      S.items
        .map((name, i) => {
          if (foundBy[i] !== undefined) {
            const by = foundBy[i];
            return `<li class="found"><s>${esc(name)}</s><span class="by" style="color:${colorOf(by)}">${nameOf(names, by)}</span></li>`;
          }
          if (missed.has(i)) return `<li class="missed">${esc(name)}<span class="by">not found</span></li>`;
          return `<li>${esc(name)}</li>`;
        })
        .join('') +
      '</ul>';
    $('scores').innerHTML = scoresHTML(rosterOf(msg, S), colorOf, null);
  }

  // ---------------- A player's phone ----------------
  function ensureRound(S, playerID) {
    if (rs.round === S.round && rs.init) return;
    relReset();
    rs = {
      round: S.round,
      init: true,
      mine: new Set(S.found.filter((f) => f.by === playerID).map((f) => f.i)),
      lastSeq: null,
      coolUntil: 0,
      giveUpAt: Date.now() + S.giveUpLeft,
      confirm: false,
    };
  }

    function phoneScreen(msg) {
    const { names, state, playerID } = msg;
    const S = state.G;
    const w = S.scene.width;
    const h = S.scene.height;
    layout(
      `p:${S.round}`,
      `<div class="topline"><span id="me"></span><span id="count"></span></div>
       <div class="vpwrap" style="position:relative;max-width:900px;margin:0 auto">
         <div id="vp" class="viewport" style="position:relative;width:100%;height:clamp(220px,56vh,640px);overflow:hidden;background:#111;border-radius:10px;touch-action:none;user-select:none;-webkit-user-select:none">
           <div id="world" class="world" style="position:absolute;left:0;top:0;transform-origin:0 0;width:${w}px;height:${h}px">
             <img src="${esc(S.scene.image)}" alt="" draggable="false" style="display:block;width:${w}px;height:${h}px;pointer-events:none" />
             <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="position:absolute;left:0;top:0;pointer-events:none"><g id="mk"></g><g id="pings"></g></svg>
           </div>
         </div>
         <div class="zoombtns" style="position:absolute;right:8px;bottom:8px;display:flex;flex-direction:column;gap:6px"><button id="zin">＋</button><button id="zout">－</button><button id="zfit">⤢</button></div>
         <div id="cool" class="cool" hidden></div>
         <div id="toast" class="toast" hidden></div>
       </div>
       <div id="banner"></div>
       <div id="items" class="chips"></div>
       <div id="controls"></div>`,
      () => setupViewport(S)
    );

    // Your finds are green, everyone else's are orange
    $('mk').innerHTML = marksSVG(S, (id) => (id === playerID ? MINE : OTHERS), false);
    applyStroke();

    // Feedback for my own taps
    let gained = 0;
    S.found.forEach((f) => {
      if (f.by === playerID && !rs.mine.has(f.i)) {
        rs.mine.add(f.i);
        gained += 1;
        toast(`✅ ${S.items[f.i]}! +1`);
      }
    });
    if (rs.lastSeq === null) {
      if (S.cool > 0) rs.coolUntil = Date.now() + S.cool;
    } else if (S.mySeq !== rs.lastSeq && gained === 0 && S.cool > 0) {
      rs.coolUntil = Date.now() + S.cool;
      toast(`❌ Not there. Wait ${Math.ceil(S.cool / 1000)}s`);
    }
    rs.lastSeq = S.mySeq;

    const myCount = S.counts[playerID] || 0;
    $('me').textContent = names[playerID] || `Player ${Number(playerID) + 1}`;
    $('count').textContent = `${myCount} found · ${S.found.length}/${S.items.length} total`;
    $('banner').innerHTML =
      S.phase === 'done'
        ? resultHTML(S, names) + (S.gaveUp ? '<p class="progress">This game was ended early.</p>' : '')
        : '';

    const foundBy = {};
    S.found.forEach((f) => (foundBy[f.i] = f.by));
    const missed = new Set(S.missed.map((m) => m.i));
    $('items').innerHTML = S.items
      .map((n, i) => {
        if (foundBy[i] !== undefined) {
          return `<span class="chip ${foundBy[i] === playerID ? 'mine' : 'other'}"><s>${esc(n)}</s></span>`;
        }
        if (missed.has(i)) return `<span class="chip missed">${esc(n)}</span>`;
        return `<span class="chip">${esc(n)}</span>`;
      })
      .join('');

    // Buttons
    const c = $('controls');
    if (S.phase === 'playing') {
      c.innerHTML = rs.confirm
        ? '<p>End this game for everyone?</p><button id="giveyes" class="bad">Yes, end it</button> <button id="giveno" class="secondary">Keep playing</button>'
        : `<p><button id="giveup" class="secondary" ${Date.now() < rs.giveUpAt ? 'disabled' : ''}>Give up</button></p>`;
      const gu = $('giveup');
      if (gu) gu.onclick = () => { rs.confirm = true; phoneScreen(last); };
      const yes = $('giveyes');
      if (yes) {
        yes.onclick = () => {
          yes.disabled = true;
          rs.confirm = false;
          send('endRound', S.round);
        };
      }
      const no = $('giveno');
      if (no) no.onclick = () => { rs.confirm = false; phoneScreen(last); };
    } else {
      c.innerHTML = '<p><button id="next" class="big good">Next game ▶</button></p>';
      const nx = $('next');
      nx.onclick = () => {
        nx.disabled = true;
        send('nextScene', S.round);
        setTimeout(() => {
          if (nx.isConnected) nx.disabled = false; // refused, so let them try again
        }, 2500);
      };
    }
  }

  // ---------------- Render ----------------
  function render(msg) {
    last = msg;
    const S = msg.state.G;
    if (msg.view === 'player') {
      ensureRound(S, msg.playerID);
      relAck(S.mySeq);
      if (S.phase !== 'playing') relReset();
      phoneScreen(msg);
    } else {
      tvScreen(msg);
    }
  }

  // Several times a second: the pause countdown, messages fading, and resending unconfirmed taps
  setInterval(() => {
    const now = Date.now();
    const cool = $('cool');
    if (cool) {
      const left = rs.coolUntil - now;
      cool.hidden = !(left > 0);
      if (left > 0) cool.textContent = `⏳ Wait ${Math.ceil(left / 1000)}s`;
    }
    const t = $('toast');
    if (t && !t.hidden && now > toastUntil) t.hidden = true;
    const gu = $('giveup');
    if (gu && gu.disabled && now >= rs.giveUpAt) gu.disabled = false;
    if (rel.inflight && now - rel.sentAt > 900) {
      rel.inflight.tries += 1;
      if (rel.inflight.tries > 6) {
        rel.inflight = null;
        relPump();
      } else {
        relSend();
      }
    }
  }, 250);

  window.addEventListener('message', (e) => {
    if (e.source === parent && e.data && e.data.type === 'state') render(e.data);
  });
  parent.postMessage({ type: 'ready' }, '*');
})();