// Главный файл с общей логикой

let userData = {
    uid: null,
    username: null,
    balance: 0,
    packs: []
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Получаем данные из URL параметров
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('uid');
    const username = urlParams.get('username');
    const balance = urlParams.get('balance');
    const packs = urlParams.get('packs');

    if (uid && balance) {
        userData = {
            uid: parseInt(uid),
            username: username || '—',
            balance: parseInt(balance),
            packs: packs ? packs.split(',') : []
        };

        // Обновляем UI
        updateUserInfo();
        checkAdminAccess();

        // Загружаем историю заказов
        loadOrderHistory();
    } else {
        // Показываем сообщение об ошибке
        showError('Не удалось загрузить данные. Пожалуйста, откройте приложение через бота.');
    }

    // Обработчики кнопок
    setupEventListeners();

    // Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
    }
}

function updateUserInfo() {
    document.getElementById('balance').textContent = userData.balance;
    document.getElementById('username').textContent = userData.username;

    // Обновляем баланс на всех страницах
    const balanceElements = document.querySelectorAll('[id="balance"]');
    balanceElements.forEach(el => {
        el.textContent = userData.balance;
    });
}

function setupEventListeners() {
    // Кнопка обновления баланса
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshBalance);
    }

    // Кнопка модерации
    const moderationBtn = document.getElementById('moderation-btn');
    if (moderationBtn) {
        moderationBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isAdmin()) {
                window.location.href = 'moderation.html';
            } else {
                showNotification('Доступ только для администраторов', 'error');
            }
        });
    }

    // Закрытие модальных окон
    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.closest('.modal').id;
            closeModal(modalId);
        });
    });

    // Закрытие модалки при клике вне
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// Проверка прав администратора
function isAdmin() {
    const adminIds = [8385687624, 1151743423]; // Ваши админские ID
    return adminIds.includes(userData.uid);
}

function checkAdminAccess() {
    const moderationBtn = document.getElementById('moderation-btn');
    if (moderationBtn) {
        if (!isAdmin()) {
            moderationBtn.style.display = 'none';
        }
    }

    // Если на странице модерации и не админ
    if (window.location.pathname.includes('moderation.html') && !isAdmin()) {
        window.location.href = 'index.html';
        showNotification('Доступ запрещён', 'error');
    }
}

// Обновление баланса
async function refreshBalance() {
    if (!userData.uid) return;

    try {
        const response = await fetch(`/api/balance?uid=${userData.uid}`);
        const data = await response.json();

        if (data.success) {
            userData.balance = data.balance;
            updateUserInfo();
            showNotification('Баланс обновлён!', 'success');
        } else {
            throw new Error(data.error || 'Ошибка обновления');
        }
    } catch (error) {
        console.error('Ошибка обновления баланса:', error);
        showNotification('Не удалось обновить баланс', 'error');
    }
}

// Отправка данных в бота
function sendDataToBot(action, data) {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.sendData(JSON.stringify({ action, ...data }));
        return true;
    }
    return false;
}

// Показать уведомление
function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s, fadeOut 0.5s 2.5s forwards;
        `;
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.className = type;

    if (type === 'success') {
        notification.style.background = '#4CAF50';
    } else if (type === 'error') {
        notification.style.background = '#F44336';
    } else if (type === 'warning') {
        notification.style.background = '#FFC107';
        notification.style.color = '#000';
    } else {
        notification.style.background = '#2196F3';
    }
}

// Показать ошибку
function showError(message) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2 style="color: #F44336; margin-bottom: 20px;">❌ Ошибка</h2>
                <p style="color: #cccccc; margin-bottom: 30px;">${message}</p>
                <a href="index.html" class="btn btn-primary" style="text-decoration: none; display: inline-block;">
                    Вернуться на главную
                </a>
            </div>
        `;
    }
}

// Открыть модальное окно
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Закрыть модальное окно
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Загрузка истории заказов
async function loadOrderHistory() {
    if (!userData.uid) return;

    try {
        const response = await fetch(`/api/orders?uid=${userData.uid}`);
        const data = await response.json();

        if (data.success && data.orders) {
            displayOrderHistory(data.orders);
        }
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}

function displayOrderHistory(orders) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (orders.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #cccccc;">Нет заказов</p>';
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

// Экспортируем функции для использования в других файлах
window.app = {
    userData,
    isAdmin,
    sendDataToBot,
    showNotification,
    openModal,
    closeModal,
    refreshBalance
};