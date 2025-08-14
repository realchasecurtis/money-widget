let counter = document.getElementById("moneyCounter");
let chatFeed = document.getElementById("chatFeed");
let floatingContainer = document.getElementById("floatingContainer");
let total = getStoredTotal();

function getStoredTotal() {
  const baseDate = new Date("2025-01-01T00:00:00Z");
  const now = new Date();
  const secondsPassed = Math.floor((now - baseDate) / 1000);
  let amount = 0;
  for (let i = 0; i < secondsPassed; i++) {
    if (Math.random() < 0.5) {
      amount += getRandomGain();
    }
  }
  return amount;
}

function getRandomGain() {
  const rand = Math.random();
  if (rand < 0.6) return Math.floor(Math.random() * 100) + 1;
  if (rand < 0.9) return Math.floor(Math.random() * 9900) + 100;
  return Math.floor(Math.random() * 990000) + 10000;
}

function fetchMessages() {
  return fetch("messages.json").then(res => res.json());
}

function formatMoney(amount) {
  return `$${amount.toLocaleString()}`;
}

function showFloatingNumber(amount) {
  const float = document.createElement("div");
  float.className = "floating-number";
  float.innerText = `+${formatMoney(amount)}`;
  if (amount > 10000) float.classList.add("gold");
  floatingContainer.appendChild(float);
  setTimeout(() => float.remove(), 2000);
}

function updateChat(message) {
  const line = document.createElement("div");
  line.className = "chat-line";
  line.innerText = message;
  chatFeed.appendChild(line);
  const lines = chatFeed.querySelectorAll(".chat-line");
  if (lines.length > 7) lines[0].remove();
}

function selectMessage(amount, messages) {
  if (amount <= 100) return messages.low[Math.floor(Math.random() * messages.low.length)];
  if (amount <= 10000) return messages.mid[Math.floor(Math.random() * messages.mid.length)];
  return messages.high[Math.floor(Math.random() * messages.high.length)];
}

function updateCounter(messages) {
  if (Math.random() < 0.5) {
    const gain = getRandomGain();
    total += gain;
    counter.textContent = formatMoney(total);
    showFloatingNumber(gain);
    updateChat(selectMessage(gain, messages));
  }
}

fetchMessages().then(messages => {
  counter.textContent = formatMoney(total);
  setInterval(() => updateCounter(messages), 1000);
});
