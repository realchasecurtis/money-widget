(function () {
  // ---------- DOM ----------
  const moneyEl = document.getElementById('money-total');
  const moneySR = document.getElementById('money-total-sr');
  const chatFeed = document.getElementById('chat-feed');
  const fitBox = document.getElementById('fitBox');

  // ---------- Config ----------
  const CONFIG = {
    startISO: '2025-01-01T00:00:00Z',   // historical start (used for deterministic replay)
    base: 0,                             // base amount before simulated earnings
    seed: 'ultrawealth-v1',              // affects deterministic RNG
    chat: { maxVisible: 5, fadeMs: 400 }
  };

  // Per-tier per-second fire probabilities (Option A: independent, capped to 1 event/sec)
  const PER_SECOND_P = [0.70, 0.35, 0.175, 0.0875];

  // ---------- Default tier config (used until/if messages.json loads) ----------
  let TIERCFG = {
    tiers: [
      { id: 1, weight: 62, min: 1,  max: 5, lines: [
        "Sold a sticker", "Sold a candle", "Charged $1 to press the elevator button",
        "Sold a single pickle slice", "Issued a limited permit to press the elevator button",
        "Licensed a sneeze sound effect", "Sold a 30‑second silent nod"
      ]},
      { id: 2, weight: 28, min: 6,  max: 75, lines: [
        "Flipped an espresso machine", "Auctioned a pressure washer online",
        "Rented a projector to a local event", "Leased a cotton candy machine for the weekend"
      ]},
      { id: 3, weight: 9,  min: 200, max: 5000, lines: [
        "Closed a workshop contract", "Delivered a training workshop", "Closed a data cleanup contract"
      ]},
      { id: 4, weight: 1,  min: 80000, max: 750000, lines: [
        "Auctioned a premium domain", "Signed a regional wholesale deal"
      ]}
    ],
    chat: { cooldownSeconds: 45, noRepeatWindow: 7 }
  };

  // ---------- Utils: number format & auto-fit ----------
  const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function setTotal(n) {
    moneyEl.textContent = fmt.format(n);
    moneySR.textContent = 'Total: ' + fmt.format(n);
    requestAnimationFrame(autoFit);
  }

  // Binary search the largest font size that fits in both width and height
  const autoFit = (() => {
    let rafId = null;
    return function autoFit() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const maxW = Math.max(0, fitBox.clientWidth - 8);
        const maxH = Math.max(0, fitBox.clientHeight - 8);
        if (!maxW || !maxH) return;

        let low = 10, high = 1024; // px
        const original = moneyEl.style.fontSize;
        while (low <= high) {
          const mid = ((low + high) >> 1);
          moneyEl.style.fontSize = mid + 'px';
          const rect = moneyEl.getBoundingClientRect();
          if (rect.width <= maxW && rect.height <= maxH) low = mid + 1;
          else high = mid - 1;
        }
        moneyEl.style.fontSize = Math.max(10, high) + 'px';
      });
    };
  })();
  new ResizeObserver(autoFit).observe(fitBox);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(autoFit);

  // ---------- RNG (deterministic per second) ----------
  function hashString32(s) {
    let h = 5381 >>> 0;
    for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
    return h >>> 0;
  }
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function() {
      t += 0x6D2B79F5; t >>>= 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngForSecond(epochSec) {
    const s = CONFIG.seed + ':' + String(epochSec);
    return mulberry32(hashString32(s));
  }

  // ---------- Chat utilities (no-repeat & fade) ----------
  const lastSeenAt = new Map(); // message -> epochSec last shown
  const recentWindow = [];      // ring buffer of last N messages
  function pushRecent(msg, limit) {
    recentWindow.push(msg);
    if (recentWindow.length > limit) recentWindow.shift();
  }

  function appendChat(text) {
    const maxV = CONFIG.chat.maxVisible || 5;
    const fadeMs = CONFIG.chat.fadeMs || 400;
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
      li.className = `chat-line`;
      li.textContent = text;
      chatFeed.appendChild(li);
    }
  }

  // Build and manage a shuffle-bag for each tier to avoid repeats until exhausted
  const shuffleBags = []; // per-tier: {order:number[], idx:number}
  function rebuildShuffleBags() {
    shuffleBags.length = 0;
    for (let t = 0; t < TIERCFG.tiers.length; t++) {
      const lines = TIERCFG.tiers[t].lines || [];
      const order = Array.from({length: lines.length}, (_, i) => i);
      // Fisher-Yates
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      shuffleBags.push({ order, idx: 0 });
    }
  }

  // Pick a line index for a tier honoring noRepeatWindow and cooldownSeconds
  function pickChatLine(tierIdx, epochSec) {
    const tier = TIERCFG.tiers[tierIdx];
    const lines = tier.lines || [];
    if (!lines.length) return -1;

    const windowN = (TIERCFG.chat && TIERCFG.chat.noRepeatWindow) || 7;
    const cooldown = (TIERCFG.chat && TIERCFG.chat.cooldownSeconds) || 0;

    const bag = shuffleBags[tierIdx];
    const tried = new Set();
    for (let attempts = 0; attempts < lines.length * 2; attempts++) {
      // Pull next from bag; reshuffle if exhausted
      if (!bag || bag.idx >= bag.order.length) {
        rebuildShuffleBags();
      }
      const idx = shuffleBags[tierIdx].order[shuffleBags[tierIdx].idx % shuffleBags[tierIdx].order.length];
      shuffleBags[tierIdx].idx++;

      if (tried.has(idx)) continue;
      tried.add(idx);

      const candidate = lines[idx];
      const last = lastSeenAt.get(candidate) || -1;
      const withinCooldown = cooldown > 0 && last >= 0 && (epochSec - last) < cooldown;
      const inWindow = recentWindow.includes(candidate);

      if (!withinCooldown && !inWindow) {
        lastSeenAt.set(candidate, epochSec);
        pushRecent(candidate, windowN);
        return idx;
      }
    }
    // If everything is recent, allow the least-recent line
    let bestIdx = 0, bestSeen = Infinity;
    for (let i = 0; i < lines.length; i++) {
      const seen = lastSeenAt.has(lines[i]) ? lastSeenAt.get(lines[i]) : -Infinity;
      if (seen < bestSeen) { bestSeen = seen; bestIdx = i; }
    }
    lastSeenAt.set(lines[bestIdx], epochSec);
    pushRecent(lines[bestIdx], windowN);
    return bestIdx;
  }

  // ---------- Event generation (Option A: one-or-zero per second) ----------
  function chooseTierForSecond(rng) {
    // Determine which tiers would have fired independently, then uniformly choose one of that set.
    const fired = [];
    for (let i = 0; i < PER_SECOND_P.length; i++) {
      if (rng() < PER_SECOND_P[i]) fired.push(i);
    }
    if (!fired.length) return -1;
    const pick = fired[Math.floor(rng() * fired.length)];
    return pick;
  }

  function amountForTier(tierIdx, rng) {
    const tier = TIERCFG.tiers[tierIdx];
    const lo = Math.max(0, Math.floor(tier.min || 0));
    const hi = Math.max(lo, Math.floor(tier.max || lo));
    // inclusive integer range
    return lo + Math.floor(rng() * (hi - lo + 1));
  }

  // Sum historical up to "now" (exclusive) deterministically
  let baseHistorical = 0;
  function resyncForNow() {
    baseHistorical = CONFIG.base || 0;
    const startSec = Math.floor(new Date(CONFIG.startISO).getTime() / 1000);
    const nowSec = Math.floor(Date.now() / 1000);
    for (let s = startSec; s < nowSec; s++) {
      const rng = rngForSecond(s);
      const tierIdx = chooseTierForSecond(rng);
      if (tierIdx >= 0) {
        baseHistorical += amountForTier(tierIdx, rng);
      }
    }
    setTotal(baseHistorical);
  }

  // ---------- Tick: align to the next whole second ----------
  function tick() {
    const now = new Date();
    const epochSec = Math.floor(now.getTime() / 1000);
    const rng = rngForSecond(epochSec);
    const tierIdx = chooseTierForSecond(rng);

    if (tierIdx >= 0) {
      const amount = amountForTier(tierIdx, rng);
      baseHistorical += amount;
      setTotal(baseHistorical);

      // Chat: pick a line with no-repeat protection
      const lineIdx = pickChatLine(tierIdx, epochSec);
      const tier = TIERCFG.tiers[tierIdx];
      if (lineIdx >= 0 && tier && tier.lines && tier.lines[lineIdx]) {
        appendChat(tier.lines[lineIdx]);
      }
    }
    const delay = 1000 - (now.getMilliseconds());
    setTimeout(tick, Math.max(10, delay));
  }

  // ---------- Load external messages (optional) ----------
  fetch('messages.json?v=2', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(json => {
      if (json && json.tiers && Array.isArray(json.tiers)) {
        TIERCFG = json;
      }
    })
    .catch(() => { /* keep defaults */ })
    .finally(() => { rebuildShuffleBags(); resyncForNow(); tick(); });
})();
