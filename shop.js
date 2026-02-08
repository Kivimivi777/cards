// Логика магазина паков

document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.buy-btn')) return;

    // Обработчики кнопок покупки
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const pack = btn.dataset.pack;
            showPurchaseModal(pack);
        });
    });

    // Обработчики модального окна
    document.getElementById('confirm-purchase')?.addEventListener('click', confirmPurchase);
    document.getElementById('cancel-purchase')?.addEventListener('click', () => {
        window.app.closeModal('purchase-modal');
    });
});

function showPurchaseModal(pack) {
    const prices = {
        'mini': 3300,
        'superheroes': 6500
    };

    const titles = {
        'mini': 'Mini Pack',
        'superheroes': 'Super Heroes'
    };

    const price = prices[pack];
    const title = titles[pack];

    if (!price) {
        window.app.showNotification('Неверный пак', 'error');
        return;
    }

    // Проверяем баланс
    if (window.app.userData.balance < price) {
        window.app.showNotification(`Недостаточно коинов. Нужно ${price}, у вас ${window.app.userData.balance}`, 'error');
        return;
    }

    const purchaseDetails = document.getElementById('purchase-details');
    if (purchaseDetails) {
        purchaseDetails.innerHTML = `
            <p><strong>Пак:</strong> ${title}</p>
            <p><strong>Цена:</strong> ${price} 🪙</p>
            <p><strong>Ваш баланс:</strong> ${window.app.userData.balance} 🪙</p>
            <p style="color: #4CAF50; margin-top: 10px;">
                После покупки останется: ${window.app.userData.balance - price} 🪙
            </p>
        `;
    }

    window.app.openModal('purchase-modal');
    window.app.currentPack = pack;
}

async function confirmPurchase() {
    const pack = window.app.currentPack;
    if (!pack) return;

    const confirmBtn = document.getElementById('confirm-purchase');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Покупка...';

    try {
        const response = await fetch('/api/shop/buy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uid: window.app.userData.uid,
                pack: pack
            })
        });

        const data = await response.json();

        if (data.success) {
            // Обновляем баланс
            window.app.userData.balance = data.new_balance;
            window.app.updateUserInfo();

            window.app.showNotification(`✅ Покупка успешна! Заказ #${data.order_id}`, 'success');
            window.app.closeModal('purchase-modal');

            // Обновляем историю покупок
            loadPurchaseHistory();
        } else {
            window.app.showNotification(`❌ ${data.error || 'Ошибка покупки'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка покупки:', error);
        window.app.showNotification('Ошибка подключения к серверу', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✅ Купить';
    }
}

async function loadPurchaseHistory() {
    if (!window.app.userData.uid) return;

    try {
        const response = await fetch(`/api/shop/history?uid=${window.app.userData.uid}`);
        const data = await response.json();

        if (data.success && data.orders) {
            displayPurchaseHistory(data.orders);
        }
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}

function displayPurchaseHistory(orders) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (orders.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #cccccc;">Нет покупок</p>';
        return;
    }

    const html = orders.map(order => {
        const statusColor = order.status === 'confirmed' ? 'success' : 'pending';
        return `
            <div class="history-item ${statusColor}">
                <strong>Заказ #${order.id}</strong><br>
                ${order.product} - ${order.price} 🪙<br>
                <small>Статус: ${order.status}</small>
            </div>
        `;
    }).join('');

    historyList.innerHTML = html;
}