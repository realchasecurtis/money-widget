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
    buckets: { size: 2, extrasMax: 16, perSecondCap: 3 }, // faster pacing
    tierWeights: null,
    chat: { maxVisible: 5, fadeMs: 400 }
  };

  let TIERCFG = { tiers: [], chat: { cooldownSeconds: 45, noRepeatWindow: 7 } };

  const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function setTotal(n) { moneyEl.textContent = fmt.format(n); moneySR.textContent = 'Total: ' + fmt.format(n); requestAnimationFrame(autoFit); }

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
          if (rect.width <= maxW && rect.height <= maxH) low = mid; else high = mid - 1;
        }
        moneyEl.style.fontSize = low + 'px';
      });
    };
  })();
  const ro = new ResizeObserver(autoFit); ro.observe(fitBox); window.addEventListener('resize', autoFit);
  document.fonts && document.fonts.ready && document.fonts.ready.then(autoFit);

  // Server time sync
  let serverOffsetMs = 0;
  async function syncServerTime() {
    try { const r = await fetch(location.href, { method: 'HEAD', cache: 'no-store' });
      const ds = r.headers.get('Date'); if (ds) { const serverNow = new Date(ds).getTime(); serverOffsetMs = serverNow - Date.now(); } } catch (e) {}
  }
  function nowMs() { return Date.now() + serverOffsetMs; }

  // RNG
  function hashString32(s) { let h=5381>>>0; for (let i=0;i<s.length;i++) h=(((h<<5)+h)+s.charCodeAt(i))>>>0; return h>>>0; }
  function mulberry32(seed){ let t=seed>>>0; return function(){ t+=0x6D2B79F5; t=t>>>0; let x=Math.imul(t^(t>>>15),1|t); x^=x+Math.imul(x^(x>>>7),61|x); return ((x^(x>>>14))>>>0)/4294967296; }; }
  const START_MS = Date.parse(CONFIG.startISO);
  const SEED_BASE = hashString32(CONFIG.seed);
  function minutePRNG(minuteIndex) { return mulberry32(SEED_BASE ^ (minuteIndex>>>0)); }
  function weightedPick(rng, weights){ const total=weights.reduce((a,b)=>a+b,0); let x=rng()*total,acc=0; for (let i=0;i<weights.length;i++){ acc+=weights[i]; if (x<acc) return i; } return weights.length-1; }
  function randInt(rng,min,max){ return Math.floor(rng()*(max-min+1))+min; }

  // Faster schedule with 2s buckets + extras
  function eventsForMinute(minuteIndex) {
    const rng = minutePRNG(minuteIndex);
    const tiers = TIERCFG.tiers;
    const weights = (CONFIG.tierWeights || tiers.map(t=>t.weight));
    const bucketSize = CONFIG.buckets.size || 2;
    const bucketCount = Math.floor(60 / bucketSize);
    const perSecondCap = CONFIG.buckets.perSecondCap || 3;
    const countsPerSec = new Array(60).fill(0);
    const events = []; let sum = 0;

    // guarantee 1 per bucket
    for (let b = 0; b < bucketCount; b++) {
      const sec = b * bucketSize + randInt(rng, 0, bucketSize - 1);
      const tIdx = weightedPick(rng, weights);
      const t = tiers[tIdx];
      const amount = randInt(rng, t.min, t.max);
      const lineIdx = t.lines.length ? randInt(rng, 0, t.lines.length - 1) : -1;
      events.push({ sec, tierIdx: tIdx, amount, lineIdx });
      countsPerSec[sec]++; sum += amount;
    }

    // extras
    const extrasMax = CONFIG.buckets.extrasMax ?? 16;
    const extras = randInt(rng, 0, Math.floor(extrasMax/2)) + randInt(rng, 0, Math.ceil(extrasMax/2));
    for (let i = 0; i < extras; i++) {
      let sec = randInt(rng, 0, 59), guard = 0;
      while (countsPerSec[sec] >= perSecondCap && guard < 60) { sec = (sec + 1 + randInt(rng,0,4)) % 60; guard++; }
      countsPerSec[sec]++;
      const tIdx = weightedPick(rng, weights);
      const t = tiers[tIdx];
      const amount = randInt(rng, t.min, t.max);
      const lineIdx = t.lines.length ? randInt(rng, 0, t.lines.length - 1) : -1;
      events.push({ sec, tierIdx: tIdx, amount, lineIdx });
      sum += amount;
    }

    events.sort((a,b)=>a.sec-b.sec);
    return { sum, events, k: events.length };
  }

  function appendChat(tierIdx, text) {
    const maxV = CONFIG.chat.maxVisible || 5;
    const fadeMs = CONFIG.chat.fadeMs || 400;
    if (chatFeed.children.length >= maxV) {
      const oldest = chatFeed.firstElementChild;
      if (oldest) { oldest.classList.add('fade-out'); oldest.style.height = oldest.offsetHeight + 'px'; oldest.style.overflow = 'hidden';
        setTimeout(() => { oldest.remove(); doAppend(); }, fadeMs); return; }
    }
    doAppend();
    function doAppend() { const li = document.createElement('li'); li.className = `chat-line t${tierIdx+1}`; li.textContent = text; chatFeed.appendChild(li); }
  }

  function floater(amount, tierIdx) {
    const chip = document.createElement('div');
    chip.className = 'floater show ' + (tierIdx === 3 ? 'gold' : 'white');
    chip.textContent = `+${fmt.format(amount)}`;
    const numberRect = moneyEl.getBoundingClientRect();
    const containerRect = counterArea.getBoundingClientRect();
    const x = (numberRect.right - containerRect.left) - 6;
    const y = (numberRect.top - containerRect.top) - 8;
    chip.style.left = x + 'px'; chip.style.top = y + 'px';
    counterArea.appendChild(chip);
    setTimeout(()=>chip.remove(), 1300);
  }

  let minuteIndex = 0, baseHistorical = 0, currentMinuteEvents = [], firedCount = 0;

  function historicalSumUpTo(minuteIndexExclusive) {
    let total = CONFIG.base;
    for (let m=0; m<minuteIndexExclusive; m++) total += eventsForMinute(m).sum;
    return total;
  }

  function resyncForNow() {
    const now = nowMs();
    minuteIndex = Math.max(0, Math.floor((now - START_MS) / 60000));
    baseHistorical = historicalSumUpTo(minuteIndex);
    currentMinuteEvents = eventsForMinute(minuteIndex).events;
    firedCount = 0;
    setTotal(baseHistorical);
  }

  function tick() {
    const now = new Date(nowMs());
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

  async function boot() {
    await syncServerTime();
    await fetch('messages.json?v=3', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) { TIERCFG = json; if (!CONFIG.tierWeights) CONFIG.tierWeights = json.tiers.map(t=>t.weight); } })
      .catch(()=>{});
    resyncForNow(); tick();
  }
  boot();
})();