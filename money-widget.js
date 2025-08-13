(function() {
  const el = document.getElementById("money-widget");

  const START_TIME = new Date("2024-01-01T00:00:00Z").getTime();
  const START_AMOUNT = 50000;
  const GROWTH_PER_SECOND = 1.50;

  function formatMoney(amount) {
    return "$" + amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function updateValue() {
    const now = Date.now();
    const elapsedSeconds = Math.max(0, (now - START_TIME) / 1000);
    const value = START_AMOUNT + elapsedSeconds * GROWTH_PER_SECOND;
    el.textContent = formatMoney(value);
    requestAnimationFrame(updateValue);
  }

  updateValue();
})();
