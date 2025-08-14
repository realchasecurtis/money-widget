(function () {
  const moneyEl = document.getElementById('money-total');
  const moneySR = document.getElementById('money-total-sr');
  const chatFeed = document.getElementById('chat-feed');
  const counterArea = document.getElementById('counterArea');

  const CONFIG = {
    startISO: '2025-01-01T00:00:00Z',
    base: 0,
    seed: 'ultrawealth-v1',
    eventsPerMinute: { mean: 1.4, max: 4 },
    chat: { maxVisible: 5, fadeMs: 400 }
  };

  let TIERCFG = {
    tiers: [
      { id: 1, weight: 62, min: 1,  max: 5,    lines: ['Sold a sticker', 'Sold a candle']},
      { id: 2, weight: 28, min: 6,  max: 75,   lines: ['Flipped an espresso machine']},
      { id: 3, weight: 9,  min: 200, max: 5000, lines: ['Closed a workshop contract']},
      { id: 4, weight: 1,  min: 80000, max: 750000, lines: ['Auctioned a premium domain']}
    ],
    chat: { cooldownSeconds: 45, noRepeatWindow: 7 }
  };

  const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function setTotal(n) {
    moneyEl.textContent = fmt.format(n);
    moneySR.textContent = 'Total: ' + fmt.format(n);
  }

  function hashString32(s) {
    let h = 5381 >>> 0;
    for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
    return h >>> 0;
  }
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function() {
      t += 0x6D2B79F5; t = t >>> 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  const START_MS = Date.parse(CONFIG.startISO);
  const SEED_BASE = hashString32(CONFIG.seed);
  function minutePRNG(minuteIndex) { return mulberry32(SEED_BASE ^ (minuteIndex >>> 0)); }
  function weightedPick(rng, weights) {
    const total = weights.reduce((a,b)=>a+b,0);
    let x = rng() * total, acc = 0;
    for (let i=0;i<weights.length;i++){ acc += weights[i]; if (x < acc) return i; }
    return weights.length-1;
  }
  function randInt(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }

  function eventsForMinute(minuteIndex) {
    const rng = minutePRNG(minuteIndex);
    const tiers = TIERCFG.tiers;
    const weights = tiers.map(t => t.weight);
    const m = CONFIG.eventsPerMinute.mean, M = CONFIG.eventsPerMinute.max;
    let k = 0; for (let i=0;i<M;i++) if (rng() < (m / M)) k++;
    const usedSecs = new Set(); const events = []; let sum = 0;
    for (let i=0;i<k;i++) {
      let sec = randInt(rng, 0, 59);
      while (usedSecs.has(sec)) { sec = (sec + 1 + Math.floor(rng()*5)) % 60; }
      usedSecs.add(sec);
      const tIdx = weightedPick(rng, weights);
      const t = tiers[tIdx];
      const amount = randInt(rng, t.min, t.max);
      const lineIdx = t.lines.length ? randInt(rng, 0, t.lines.length-1) : -1;
      events.push({ sec, tierIdx: tIdx, amount, lineIdx });
      sum += amount;
    }
    events.sort((a,b)=>a.sec-b.sec);
    return { sum, events, k };
  }

  function appendChat(tierIdx, text) {
    const maxV = CONFIG.chat.maxVisible || 5;
    const fadeMs = CONFIG.chat.fadeMs || 400;
    // If we're at capacity, fade out & remove the oldest FIRST to keep exactly 5 visible
    if (chatFeed.children.length >= maxV) {
      const oldest = chatFeed.firstElementChild;
      if (oldest) {
        oldest.classList.add('fade-out');
        // lock height to avoid jump during fade
        oldest.style.height = oldest.offsetHeight + 'px';
        oldest.style.overflow = 'hidden';
        setTimeout(() => { oldest.remove(); doAppend(); }, fadeMs);
        return;
      }
    }
    doAppend();

    function doAppend() {
      const li = document.createElement('li');
      li.className = `chat-line t${tierIdx+1}`;
      li.textContent = text;
      chatFeed.appendChild(li);
    }
  }

  function floater(amount, tierIdx) {
    const chip = document.createElement('div');
    chip.className = 'floater show ' + (tierIdx === 3 ? 'gold' : 'white'); // tierIdx is 0-based; t4 => idx 3
    chip.textContent = `+${fmt.format(amount)}`;
    counterArea.appendChild(chip);
    setTimeout(()=>chip.remove(), 1300);
  }

  let minuteIndex = 0;
  let baseHistorical = 0;
  let currentMinuteEvents = [];
  let firedCount = 0;

  function historicalSumUpTo(minuteIndexExclusive) {
    let total = CONFIG.base;
    for (let m=0; m<minuteIndexExclusive; m++) total += eventsForMinute(m).sum;
    return total;
  }
  function resyncForNow() {
    const now = Date.now();
    minuteIndex = Math.max(0, Math.floor((now - START_MS) / 60000));
    baseHistorical = historicalSumUpTo(minuteIndex);
    currentMinuteEvents = eventsForMinute(minuteIndex).events;
    firedCount = 0;
    setTotal(baseHistorical);
  }
  function tick() {
    const now = new Date();
    const idx = Math.max(0, Math.floor((now.getTime() - START_MS) / 60000));
    const sec = now.getUTCSeconds();
    if (idx !== minuteIndex) {
      minuteIndex = idx;
      baseHistorical += eventsForMinute(idx-1 >= 0 ? idx-1 : 0).sum;
      currentMinuteEvents = eventsForMinute(minuteIndex).events;
      firedCount = 0;
      setTotal(baseHistorical);
    }
    while (firedCount < currentMinuteEvents.length && currentMinuteEvents[firedCount].sec <= sec) {
      const ev = currentMinuteEvents[firedCount++];
      const tier = TIERCFG.tiers[ev.tierIdx];
      baseHistorical += ev.amount;
      setTotal(baseHistorical);
      floater(ev.amount, ev.tierIdx);
      if (tier && tier.lines && ev.lineIdx >= 0) appendChat(ev.tierIdx, tier.lines[ev.lineIdx]);
    }
    const delay = 1000 - (now.getMilliseconds());
    setTimeout(tick, Math.max(10, delay));
  }

  fetch('messages.json?v=1', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(json => { if (json) TIERCFG = json; })
    .catch(()=>{})
    .finally(() => { resyncForNow(); tick(); });
})();