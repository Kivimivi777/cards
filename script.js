const API_ORIGIN = "http://127.0.0.1:8000";

const tg = window.Telegram.WebApp;
tg.ready();

const user = tg.initDataUnsafe?.user;

if (user) {
  document.getElementById("uid").textContent = user.id;
  document.getElementById("uname").textContent =
    user.username || "без ника";
}

// ---------- API helpers ----------
async function apiGet(path) {
  const res = await fetch(API_ORIGIN + path);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(API_ORIGIN + path, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body)
  });
  return res.json();
}

// ---------- Баланс ----------
async function loadBalance() {
  const data = await apiGet(`/api/balance/${user.id}`);
  document.getElementById("balance").textContent = data.balance;
}

// ---------- Магазин ----------
async function openShop() {
  document.getElementById("shop").classList.remove("hidden");
  const prices = await apiGet("/api/prices");

  const list = document.getElementById("shopList");
  list.innerHTML = "";

  for (const key in prices) {
    const item = prices[key];

    const row = document.createElement("div");
    row.className = "shop-item";

    row.innerHTML = `
      <span>${item.title} — ${item.price}</span>
      <button onclick="buy('${key}')">Купить</button>
    `;

    list.appendChild(row);
  }
}

function closeShop() {
  document.getElementById("shop").classList.add("hidden");
}

async function buy(pack) {
  const res = await apiPost("/api/purchase", {
    user_id: user.id,
    pack: pack
  });

  if (res.error) {
    alert("❌ Недостаточно коинов");
    return;
  }

  alert("✅ Покупка успешна");
  loadBalance();
}

// ---------- Игры ----------
function openGames() {
  document.getElementById("games").classList.remove("hidden");
}

function closeGames() {
  document.getElementById("games").classList.add("hidden");
}

async function playCoin() {
  const bet = prompt("Ставка:");
  if (!bet) return;

  const res = await apiPost("/api/game/coin", {
    user_id: user.id,
    amount: Number(bet)
  });

  if (res.error) {
    alert("❌ Ошибка");
    return;
  }

  alert(`Выпало: ${res.result}`);
  loadBalance();
}

// ---------- Close ----------
function closeApp() {
  tg.close();
}

// init
loadBalance();
