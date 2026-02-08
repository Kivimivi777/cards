const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Получаем данные из URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('uid');
const username = urlParams.get('username') || '—';
const balance = parseInt(urlParams.get('balance')) || 0;
const packs = (urlParams.get('packs') || '').split(',');

document.getElementById('balance').textContent = balance;

// Загружаем актуальные данные с сервера
fetch(`/api/user/${userId}`)
  .then(r => r.json())
  .then(data => {
    // Обновляем UI
    renderShop(data.products);
    renderInventory(data.inventory);
  });

function renderShop(products) {
  const html = Object.entries(products).map(([key, prod]) => `
    <div class="product-card">
      <h3>${prod.title}</h3>
      <p>💰 ${prod.price} коинов</p>
      <button onclick="buyPack('${key}')">Купить</button>
    </div>
  `).join('');
  setContent(html);
}

function buyPack(packKey) {
  fetch('/api/buy', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user_id: userId, pack: packKey})
  })
  .then(r => r.json())
  .then(res => {
    if (res.success) {
      alert(`✅ Куплено! Новый баланс: ${res.new_balance}`);
      location.reload(); // или обновить баланс динамически
    }
  });
}

function showSection(section) {
  // Загрузка нужного раздела через fetch или рендер
}
