(function() {
  const el = document.getElementById("money-widget");

  // Config: Starting timestamp (Unix epoch) and amount
  const START_TIME = new Date("2024-01-01T00:00:00Z").getTime(); // Global fixed start
  const START_AMOUNT = 50000; // Starting amount in dollars
  const GROWTH_PER_SECOND = 1.50; // Dollars gained per second

  // Gradient CSS
  const gradientStyle = `
    background: linear-gradient(90deg, #00ff00, #00cc66);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: bold;
    font-size: 48px;
  `;

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
    el.innerHTML = `
      <div style="${gradientStyle}">
        ${formatMoney(value)}
      </div>
    `;
    requestAnimationFrame(updateValue);
  }

  updateValue();
})();
