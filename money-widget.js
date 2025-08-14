(function () {
  const moneyEl = document.getElementById('money-total');
  const moneySR = document.getElementById('money-total-sr');
  const chatFeed = document.getElementById('chat-feed');
  const counterArea = document.getElementById('counterArea');
  const fitBox = document.getElementById('fitBox');

  const CONFIG = {
    startISO: '2025-01-01T00:00:00Z',
    base: 0,
    seed: 'ultrawealth-v1',
    eventsPerMinute: { mean: 1.4, max: 4 },
    chat: { maxVisible: 5, fadeMs: 400 }
  };

  // Empty placeholder — will be replaced entirely by messages.json
  let TIERCFG = { tiers: [], chat: { cooldownSeconds: 45, noRepeatWindow: 7 } };

  const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function setTotal(n) {
    moneyEl.textContent = fmt.format(n);
    moneySR.textContent = 'Total: ' + fmt.format(n);
    requestAnimationFrame(autoFit);
  }

  // Auto-fit
  const autoFit = (() => {
    let rafId = null;
    return function autoFit() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const maxW = Math.max(0, fitBox.clientWidth - 8);
        const maxH = Math.max(0, fitBox.clientHeight - 8);
        if (!maxW || !maxH) return;
        let low = 10, high = 1024;
        while (low < high) {
          const mid = Math.floor((low + high + 1) / 2);
          moneyEl.style.fontSize = mid + 'px';
          const rect = moneyEl.getBoundingClientRect();
          if (rect.width <= maxW && rect.height <= maxH) {
            low = mid;
          } else {
            high = mid - 1;
          }
        }
        moneyEl.style.fontSize = low + 'px';
      });
    };
  })();

  const ro = new ResizeObserver(autoFit);
  ro.observe(fitBox);
  window.addEventListener('resize', autoFit);
  document.fonts && document.fonts.ready && document.fonts.ready.then(autoFit);

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

  // No-repeat + cooldown
  let recentMessages = [];
  let lastTierTime = {};
  function appendChat(tierIdx, text) {
    const maxV = CONFIG.chat.maxVisible || 5;
    const fadeMs = CONFIG.chat.fadeMs || 400;
    const noRepeatWindow = TIERCFG.chat?.noRepeatWindow || 0;
    const cooldownSeconds = TIERCFG.chat?.cooldownSeconds || 0;
    const now = Date.now();
    if (cooldownSeconds > 0 && lastTierTime[tierIdx] && now - lastTierTime[tierIdx] < cooldownSeconds * 1000) {
      return;
    }
    if (noRepeatWindow > 0 && recentMessages.includes(text)) {
      return;
    }
    lastTierTime[tierIdx] = now;
    recentMessages.push(text);
    if (recentMessages.length > noRepeatWindow) {
      recentMessages.shift();
    }
    if (chatFeed.children.length >= maxV) {
      const oldest = chatFeed.firstElementChild;
      if (oldest) {
        oldest.classList.add('fade-out');
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
    chip.className = 'floater show ' + (tierIdx === 3 ? 'gold' : 'white');
    chip.textContent = `+${fmt.format(amount)}`;
    const numberRect = moneyEl.getBoundingClientRect();
    const containerRect = counterArea.getBoundingClientRect();
    const x = (numberRect.right - containerRect.left) - 6;
    const y = (numberRect.top - containerRect.top) - 8;
    chip.style.left = x + 'px';
    chip.style.top  = y + 'px';
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
      if (tier && tier.lines && ev.lineIdx >= 0) {
        appendChat(ev.tierIdx, tier.lines[ev.lineIdx]);
      }
    }
    const delay = 1000 - (now.getMilliseconds());
    setTimeout(tick, Math.max(10, delay));
  }

  // ✅ Now we only start after JSON is loaded
  fetch('messages.json?v=1', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(json => {
      if (json) {
        TIERCFG = json;
        resyncForNow();
        tick();
      } else {
        console.error('Failed to load messages.json');
      }
    })
    .catch(err => console.error(err));

})();
