(function () {
  const el = document.getElementById("money-widget");
  const container = document.getElementById("money-widget-container");
  const chatFeed = document.getElementById("chat-feed");

  const START_TIME = new Date("2025-01-01T00:00:00Z").getTime();
  const BASE_AMOUNT = 0;

  const messagesTier1 = [
    "Sold a haunted couch",
    "Refilled printer ink for crypto",
    "Scanned barcodes at a rave",
    "Resold free hotel shampoo",
    "Sold naming rights to a tamagotchi",
    "Rented out a WiFi password",
    "Microwaved burritos for hedge fund interns",
    "Charged a neighbor to pet their own dog",
    "Won a staring contest on Fiverr"
  ];

  const messagesTier2 = [
    "Sold naming rights to a newborn",
    "Euthanized a dog for science credits",
    "Auctioned off funeral livestream subscriptions",
    "Flipped a meteor fragment on Etsy",
    "Rented out childhood memories as NFTs",
    "Syndicated garage sale content to cable news",
    "Taught a parrot to gamble",
    "Bought a home gym and rented it hourly on Craigslist",
    "Sold fake heirlooms to real heirs"
  ];

  const messagesTier3 = [
    "Outsourced empathy to an AI model",
    "Harvested suburban lawn clippings for profit",
    "Sued myself for tax relief",
    "Developed anti-boredom pills for toddlers",
    "Bribed a municipal drone swarm",
    "Turned HOA complaints into a reality show",
    "Scraped LinkedIn bios for ransom leads",
    "Flipped a decommissioned missile silo",
    "Resold emotional support iguanas"
  ];

  const messagesTier4 = [
    "Crowdfunded a scheme to blot out the sun",
    "Privatized a neighborhood’s oxygen supply",
    "Traded futures on grandma’s lifespan",
    "Euthanized a dog sanctuary for parking space",
    "Bribed gravity",
    "Declared war on a HOA",
    "Bought Greenland and renamed it Dave",
    "Rebranded death as a subscription service",
    "Liquidated the moon for data credits"
  ];

  function formatMoney(amount) {
    return "$" + amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function calculateAmount() {
    let elapsed = Math.floor((Date.now() - START_TIME) / 1000);
    let total = BASE_AMOUNT;
    let seed = 1337;
    for (let i = 0; i < elapsed; i++) {
      if (pseudoRandom(seed + i) < 0.3) {
        const inc = getWeightedRandom(seed * (i + 1));
        total += inc;
      }
    }
    return total;
  }

  function pseudoRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function getWeightedRandom(seed) {
    const r = pseudoRandom(seed);
    if (r < 0.6) return Math.floor(pseudoRandom(seed + 1) * 500) + 1;
    if (r < 0.85) return Math.floor(pseudoRandom(seed + 2) * 9500) + 501;
    if (r < 0.98) return Math.floor(pseudoRandom(seed + 3) * 90000) + 10001;
    return Math.floor(pseudoRandom(seed + 4) * 900000) + 100001;
  }

  function createFloatingNumber(increment) {
    const floatEl = document.createElement("div");
    floatEl.textContent = "+$" + increment.toLocaleString();
    floatEl.className = "floating-number";
    if (increment >= 100000) floatEl.classList.add("gold");

    container.appendChild(floatEl);
    setTimeout(() => floatEl.classList.add("animate"), 10);
    setTimeout(() => floatEl.remove(), 1200);
  }

  function postChatMessage(amount) {
    let pool;
    if (amount <= 500) pool = messagesTier1;
    else if (amount <= 10000) pool = messagesTier2;
    else if (amount <= 100000) pool = messagesTier3;
    else pool = messagesTier4;

    const msg = pool[Math.floor(Math.random() * pool.length)];
    const div = document.createElement("div");
    div.className = "chat-line";
    div.textContent = msg;
    chatFeed.appendChild(div);

    const lines = Array.from(chatFeed.children);
    if (lines.length > 7) lines[0].remove();
    lines.forEach((line, index) => {
      if (index < lines.length - 5) {
        line.classList.add("faded");
      } else {
        line.classList.remove("faded");
      }
    });
  }

  let lastValue = calculateAmount();
  el.textContent = formatMoney(lastValue);

  function updateValue() {
    const newValue = calculateAmount();
    if (newValue > lastValue) {
      const diff = newValue - lastValue;
      createFloatingNumber(diff);
      el.textContent = formatMoney(newValue);
      lastValue = newValue;
      postChatMessage(diff);
    }
    setTimeout(updateValue, 1000);
  }

  updateValue();
})();
