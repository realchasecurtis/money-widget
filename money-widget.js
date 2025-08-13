(function() {
  const el = document.getElementById("money-widget");

  const START_TIME = new Date("2024-01-01T00:00:00Z").getTime();
  const START_AMOUNT = 20000000; // Start at $20 million
  let currentAmount = START_AMOUNT;

  function formatMoney(amount) {
    return "$" + amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function maybeAddRandomAmount() {
    const willUpdate = Math.random() < 0.3;
    if (willUpdate) {
      const increment = Math.floor(Math.random() * 100000) + 1;
      currentAmount += increment;
      el.textContent = formatMoney(currentAmount);
    }
  }

  function updateValue() {
    maybeAddRandomAmount();
    setTimeout(updateValue, 1000);
  }

  el.textContent = formatMoney(currentAmount);
  updateValue();
})();
