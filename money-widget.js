(function () {
  const el = document.getElementById("money-widget");
  const container = document.getElementById("money-widget-container");

  const START_TIME = new Date("2024-01-01T00:00:00Z").getTime();
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
    let seed = 42;
    for (let i = 0; i < elapsed; i++) {
      if (pseudoRandom(seed + i) < 0.3) {
        const inc = Math.floor(pseudoRandom(seed * (i + 1)) * 100000) + 1;
        total += inc;
      }
    }
    return total;
  }

  function pseudoRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function createFloatingNumber(increment) {
    const floatEl = document.createElement("div");
    floatEl.textContent = "+$" + increment.toLocaleString();
    floatEl.className = "floating-number";
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
