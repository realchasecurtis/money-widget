
const startDate = new Date('2025-01-01T00:00:00Z');
const baseAmount = 20000000;
let currentAmount = calculateCurrentAmount();

const moneyEl = document.getElementById('money');
const floatingValuesEl = document.getElementById('floating-values');
const chatBoxEl = document.getElementById('chat-box');
let messages = {};

fetch('messages.json')
    .then(res => res.json())
    .then(data => {
        messages = data;
        renderMoney();
        setInterval(updateMoney, 1000);
    });

function calculateCurrentAmount() {
    const now = new Date();
    const secondsElapsed = Math.floor((now - startDate) / 1000);
    return baseAmount;
}

function formatMoney(amount) {
    return '$' + amount.toLocaleString();
}

function renderMoney() {
    moneyEl.textContent = formatMoney(currentAmount);
}

function updateMoney() {
    if (Math.random() < 0.6) {
        const increase = getRandomIncrease();
        currentAmount += increase.amount;
        renderMoney();
        showFloatingValue(increase.amount, increase.tier);
        addChatMessage(increase.tier);
    }
}

function getRandomIncrease() {
    const rand = Math.random();
    if (rand < 0.6) return { amount: getRandomInt(1, 5000), tier: "low" };
    if (rand < 0.9) return { amount: getRandomInt(5001, 50000), tier: "medium" };
    return { amount: getRandomInt(50001, 1000000), tier: "high" };
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function showFloatingValue(amount, tier) {
    const floatEl = document.createElement('div');
    floatEl.className = 'floating-text' + (tier === 'high' ? ' gold' : '');
    floatEl.textContent = '+' + formatMoney(amount);
    floatingValuesEl.appendChild(floatEl);
    setTimeout(() => floatEl.remove(), 2000);
}

function addChatMessage(tier) {
    if (!messages[tier]) return;
    const msg = messages[tier][Math.floor(Math.random() * messages[tier].length)];
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message';
    msgEl.textContent = msg;
    chatBoxEl.appendChild(msgEl);

    if (chatBoxEl.children.length > 7) {
        chatBoxEl.removeChild(chatBoxEl.children[0]);
    }
}
