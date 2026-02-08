// Логика промокодов

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('promo-code')) return;

    const promoCodeInput = document.getElementById('promo-code');
    const activateBtn = document.getElementById('activate-btn');
    const promoResult = document.getElementById('promo-result');

    // Обработчик активации промокода
    activateBtn.addEventListener('click', activatePromoCode);

    promoCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            activatePromoCode();
        }
    });

    // Загрузка истории активаций
    loadPromoHistory();
});

async function activatePromoCode() {
    const promoCodeInput = document.getElementById('promo-code');
    const promoResult = document.getElementById('promo-result');
    const code = promoCodeInput.value.trim().toUpperCase();

    if (!code) {
        showResult('Введите промокод', 'error');
        return;
    }

    if (!window.app.userData.uid) {
        showResult('Ошибка авторизации', 'error');
        return;
    }

    activateBtn.disabled = true;
    activateBtn.textContent = 'Активация...';

    try {
        const response = await fetch('/api/promo/activate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uid: window.app.userData.uid,
                code: code
            })
        });

        const data = await response.json();

        if (data.success) {
            // Обновляем баланс
            window.app.userData.balance = data.new_balance;
            window.app.updateUserInfo();

            showResult(`✅ Промокод активирован! +${data.amount} коинов`, 'success');
            promoCodeInput.value = '';
            loadPromoHistory();
        } else {
            showResult(`❌ ${data.error || 'Ошибка активации'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка активации промокода:', error);
        showResult('Ошибка подключения к серверу', 'error');
    } finally {
        activateBtn.disabled = false;
        activateBtn.textContent = 'Активировать';
    }
}

function showResult(message, type) {
    const promoResult = document.getElementById('promo-result');
    promoResult.textContent = message;
    promoResult.className = `result-message ${type}`;
}

async function loadPromoHistory() {
    if (!window.app.userData.uid) return;

    try {
        const response = await fetch(`/api/promo/history?uid=${window.app.userData.uid}`);
        const data = await response.json();

        if (data.success && data.history && data.history.length > 0) {
            displayPromoHistory(data.history);
        }
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}

function displayPromoHistory(history) {
    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');

    if (!historySection || !historyList) return;

    historySection.style.display = 'block';

    const html = history.map(item => {
        const status = item.used ? '✅ Использован' : '⏳ Ожидает';
        return `
            <div class="history-item">
                <strong>${item.code}</strong><br>
                Сумма: ${item.amount} 🪙<br>
                <small>${status}</small>
            </div>
        `;
    }).join('');

    historyList.innerHTML = `<div style="margin-top: 15px;">${html}</div>`;
}