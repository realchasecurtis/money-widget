(function () {
  const el = document.getElementById("money-widget");
  const container = document.getElementById("money-widget-container");

  const START_TIME = new Date("2025-01-01T00:00:00Z").getTime();
  const BASE_AMOUNT = 0;

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
    setTimeout(() => {
      floatEl.classList.add("animate");
    }, 10);
    setTimeout(() => {
      floatEl.remove();
    }, 1200);
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
    }
    setTimeout(updateValue, 1000);
  }

  updateValue();
})();
