// Логика рынка карт

let currentPage = 1;
let currentFilter = 'all';
let currentSort = 'newest';
const itemsPerPage = 12;

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('market-grid')) return;

    // Обработчики фильтров
    document.getElementById('type-filter')?.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        currentPage = 1;
        loadMarketItems();
    });

    document.getElementById('sort-filter')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadMarketItems();
    });

    // Обработчики пагинации
    document.getElementById('prev-btn')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadMarketItems();
        }
    });

    document.getElementById('next-btn')?.addEventListener('click', () => {
        currentPage++;
        loadMarketItems();
    });

    // Загрузка лотов
    loadMarketItems();
});

async function loadMarketItems() {
    const marketGrid = document.getElementById('market-grid');
    marketGrid.innerHTML = '<div class="loading">Загрузка...</div>';

    try {
        const response = await fetch(`/api/market/items?page=${currentPage}&filter=${currentFilter}&sort=${currentSort}`);
        const data = await response.json();

        if (data.success && data.items) {
            displayMarketItems(data.items);
            updatePagination(data.total, data.page, data.pages);
        } else {
            marketGrid.innerHTML = '<p style="text-align: center; color: #cccccc;">Нет лотов</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки лотов:', error);
        marketGrid.innerHTML = '<p style="text-align: center; color: #F44336;">Ошибка загрузки</p>';
    }
}

function displayMarketItems(items) {
    const marketGrid = document.getElementById('market-grid');

    if (items.length === 0) {
        marketGrid.innerHTML = '<p style="text-align: center; color: #cccccc;">Нет лотов</p>';
        return;
    }

    const html = items.map(item => {
        const typeColors = {
            'attack': '#FF6B6B',
            'defense': '#4ECDC4',
            'healer': '#45B7D1',
            'legend': '#FFD700',
            'super': '#9B59B6'
        };

        const typeBg = typeColors[item.card_type] || '#666666';
        const priceDisplay = item.sell_type === 'coins' ? `${item.price} 🪙` : 'Обмен';

        return `
            <div class="market-item" data-id="${item.id}">
                <img src="${item.photo_url || '/placeholder.jpg'}" 
                     alt="${item.card_name}" 
                     onerror="this.src='/placeholder.jpg'">
                <div class="item-info">
                    <span class="item-type" style="background-color: ${typeBg}20; color: ${typeBg};">
                        ${item.card_type_title}
                    </span>
                    <div class="item-name">${item.card_name}</div>
                    <div class="item-seller">👤 Продавец: ${item.seller_id}</div>
                    <div class="item-price">
                        <span class="coin-icon">💰</span>
                        <span>${priceDisplay}</span>
                    </div>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" 
                            onclick="viewItemDetails(${item.id})">
                        Подробнее
                    </button>
                </div>
            </div>
        `;
    }).join('');

    marketGrid.innerHTML = html;
}

function updatePagination(total, current, pages) {
    document.getElementById('page-info').textContent = `Страница ${current} из ${pages}`;
    document.getElementById('prev-btn').disabled = current === 1;
    document.getElementById('next-btn').disabled = current === pages;
}

function viewItemDetails(itemId) {
    // Загрузка деталей лота
    loadItemDetails(itemId);
}

async function loadItemDetails(itemId) {
    try {
        const response = await fetch(`/api/market/item/${itemId}`);
        const data = await response.json();

        if (data.success && data.item) {
            displayItemModal(data.item);
        } else {
            window.app.showNotification('Лот не найден', 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки деталей:', error);
        window.app.showNotification('Ошибка загрузки', 'error');
    }
}

function displayItemModal(item) {
    const modalContent = document.getElementById('modal-content');
    if (!modalContent) return;

    const priceDisplay = item.sell_type === 'coins' 
        ? `${item.price} 🪙` 
        : (item.sell_type === 'exchange' ? `Обмен на: ${item.exchange_wants}` : `${item.price} 🪙 + обмен`);

    modalContent.innerHTML = `
        <div style="text-align: center;">
            <img src="${item.photo_url || '/placeholder.jpg'}" 
                 alt="${item.card_name}" 
                 style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px;"
                 onerror="this.src='/placeholder.jpg'">
        </div>
        <h3 style="margin: 20px 0 10px 0;">${item.card_name}</h3>
        <p><strong>Тип:</strong> ${item.card_type_title}</p>
        <p><strong>Продавец:</strong> ${item.seller_id}</p>
        <p><strong>Цена:</strong> ${priceDisplay}</p>
        <p style="color: #cccccc; margin-top: 15px; font-size: 14px;">
            ID лота: #${item.id}
        </p>
    `;

    // Сохраняем ID лота для покупки
    window.app.currentItemId = item.id;
    window.app.currentItemPrice = item.sell_type === 'coins' ? item.price : 0;

    window.app.openModal('item-modal');
}

// Обработчик кнопки покупки
document.getElementById('buy-btn')?.addEventListener('click', async () => {
    if (!window.app.currentItemId) return;

    const buyBtn = document.getElementById('buy-btn');
    buyBtn.disabled = true;
    buyBtn.textContent = 'Покупка...';

    try {
        const response = await fetch('/api/market/buy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uid: window.app.userData.uid,
                item_id: window.app.currentItemId
            })
        });

        const data = await response.json();

        if (data.success) {
            window.app.userData.balance = data.new_balance;
            window.app.updateUserInfo();
            window.app.showNotification(`✅ Покупка успешна!`, 'success');
            window.app.closeModal('item-modal');
            loadMarketItems();
        } else {
            window.app.showNotification(`❌ ${data.error || 'Ошибка покупки'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка покупки:', error);
        window.app.showNotification('Ошибка подключения', 'error');
    } finally {
        buyBtn.disabled = false;
        buyBtn.textContent = 'Купить';
    }
});

// Обработчик кнопки жалобы
document.getElementById('report-btn')?.addEventListener('click', async () => {
    if (!window.app.currentItemId) return;

    try {
        const response = await fetch('/api/market/report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uid: window.app.userData.uid,
                item_id: window.app.currentItemId
            })
        });

        const data = await response.json();

        if (data.success) {
            window.app.showNotification('✅ Жалоба отправлена', 'success');
            window.app.closeModal('item-modal');
        } else {
            window.app.showNotification(`❌ ${data.error || 'Ошибка отправки'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка жалобы:', error);
        window.app.showNotification('Ошибка подключения', 'error');
    }
});