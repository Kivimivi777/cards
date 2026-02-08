// Логика модерации (только для админов)

let currentTab = 'pending';

document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.tab-btn')) return;

    // Переключение вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Загрузка данных
    loadModerationData();
    loadStats();
});

function switchTab(tabName) {
    // Убираем активный класс со всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Добавляем активный класс к выбранной
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Показываем выбранную
    document.getElementById(`${tabName}-tab`).style.display = 'block';

    currentTab = tabName;

    // Загружаем данные для вкладки
    if (tabName !== 'stats') {
        loadModerationData();
    }
}

async function loadModerationData() {
    const status = currentTab; // pending, approved, rejected

    try {
        const response = await fetch(`/api/moderation/items?status=${status}`);
        const data = await response.json();

        if (data.success && data.items) {
            displayModerationItems(data.items, status);
        } else {
            document.getElementById(`${status}-list`).innerHTML = 
                '<p style="text-align: center; color: #cccccc;">Нет лотов</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        document.getElementById(`${status}-list`).innerHTML = 
            '<p style="text-align: center; color: #F44336;">Ошибка загрузки</p>';
    }
}

function displayModerationItems(items, status) {
    const listElement = document.getElementById(`${status}-list`);

    if (items.length === 0) {
        listElement.innerHTML = '<p style="text-align: center; color: #cccccc;">Нет лотов</p>';
        return;
    }

    const html = items.map(item => {
        return `
            <div class="moderation-item" style="background: rgba(255,255,255,0.05); padding: 15px; margin-bottom: 10px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <strong>ID #${item.id}</strong><br>
                        <strong>${item.card_name}</strong> (${item.card_type_title})<br>
                        <small>👤 Продавец: ${item.seller_id}</small><br>
                        <small>💰 Цена: ${item.price || 'Обмен'} 🪙</small>
                    </div>
                    <button class="btn btn-primary" onclick="viewModerationItem(${item.id})" style="margin-left: 15px;">
                        Просмотреть
                    </button>
                </div>
            </div>
        `;
    }).join('');

    listElement.innerHTML = html;
}

function viewModerationItem(itemId) {
    loadModerationItemDetails(itemId);
}

async function loadModerationItemDetails(itemId) {
    try {
        const response = await fetch(`/api/moderation/item/${itemId}`);
        const data = await response.json();

        if (data.success && data.item) {
            displayModerationModal(data.item);
        } else {
            window.app.showNotification('Лот не найден', 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        window.app.showNotification('Ошибка загрузки', 'error');
    }
}

function displayModerationModal(item) {
    const moderateContent = document.getElementById('moderate-content');
    if (!moderateContent) return;

    moderateContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="${item.photo_url || '/placeholder.jpg'}" 
                 alt="${item.card_name}" 
                 style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px;"
                 onerror="this.src='/placeholder.jpg'">
        </div>
        <h3>${item.card_name}</h3>
        <p><strong>Тип:</strong> ${item.card_type_title}</p>
        <p><strong>Продавец:</strong> ${item.seller_id}</p>
        <p><strong>Цена:</strong> ${item.price || 'Обмен'} 🪙</p>
        <p><strong>Тип продажи:</strong> ${item.sell_type}</p>
        ${item.exchange_wants ? `<p><strong>Обмен на:</strong> ${item.exchange_wants}</p>` : ''}
        <p style="color: #cccccc; margin-top: 15px;">
            ID лота: #${item.id}
        </p>
    `;

    window.app.currentModerationItemId = item.id;
    window.app.openModal('moderate-modal');
}

// Обработчики кнопок модерации
document.getElementById('approve-btn')?.addEventListener('click', () => moderateAction('approve'));
document.getElementById('revision-btn')?.addEventListener('click', () => moderateAction('revision'));
document.getElementById('reject-btn')?.addEventListener('click', () => moderateAction('reject'));

async function moderateAction(action) {
    if (!window.app.currentModerationItemId) return;

    const btn = document.querySelector(`#${action}-btn`);
    btn.disabled = true;
    btn.textContent = 'Обработка...';

    try {
        const response = await fetch('/api/moderation/action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                item_id: window.app.currentModerationItemId,
                action: action,
                admin_id: window.app.userData.uid
            })
        });

        const data = await response.json();

        if (data.success) {
            window.app.showNotification(`✅ Лот ${action === 'approve' ? 'одобрен' : action === 'reject' ? 'отклонен' : 'отправлен на доработку'}`, 'success');
            window.app.closeModal('moderate-modal');
            loadModerationData();
            loadStats();
        } else {
            window.app.showNotification(`❌ ${data.error || 'Ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка модерации:', error);
        window.app.showNotification('Ошибка подключения', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = action === 'approve' ? '✅ Одобрить' : action === 'revision' ? '✍️ На доработку' : '❌ Отклонить';
    }
}

async function loadStats() {
    try {
        const response = await fetch('/api/moderation/stats');
        const data = await response.json();

        if (data.success) {
            document.getElementById('total-items').textContent = data.total || 0;
            document.getElementById('approved-count').textContent = data.approved || 0;
            document.getElementById('rejected-count').textContent = data.rejected || 0;
            document.getElementById('pending-count').textContent = data.pending || 0;
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}