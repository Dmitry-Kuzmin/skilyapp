/**
 * Скрипт для проверки исправления двойного получения наград Duel Pass.
 * Запустите этот скрипт в консоли браузера на странице с открытым модальным окном Duel Pass.
 */

async function verifyDuelPassClaimFix() {
    console.log("🧪 Начинаем проверку исправления двойного клика...");

    // Находим кнопки получения наград
    const claimButtons = Array.from(document.querySelectorAll('button')).filter(b =>
        b.textContent.includes('Получить') || b.textContent.includes('Claim')
    );

    if (claimButtons.length === 0) {
        console.error("❌ Не найдены кнопки получения наград. Откройте модальное окно Duel Pass и убедитесь, что есть доступные награды.");
        return;
    }

    console.log(`Found ${claimButtons.length} claim buttons.`);
    const button = claimButtons[0];

    console.log("Simulating double click on the first claim button...");

    // Monkey-patch fetch to count requests
    const originalFetch = window.fetch;
    let requestCount = 0;
    window.fetch = async (...args) => {
        if (args[0].toString().includes('duel-pass-claim')) {
            requestCount++;
            console.log(`[Fetch Interceptor] duel-pass-claim request #${requestCount}`);
        }
        return originalFetch(...args);
    };

    // Click twice rapidly
    button.click();
    button.click();
    button.click(); // Even triple click

    console.log("Clicked 3 times rapidly.");

    // Wait a bit
    await new Promise(r => setTimeout(r, 2000));

    // Restore fetch
    window.fetch = originalFetch;

    if (requestCount === 1) {
        console.log("✅ SUCCESS: Only 1 request was sent despite multiple clicks!");
    } else if (requestCount === 0) {
        console.log("⚠️ WARNING: No requests sent. Maybe the button was disabled or logic failed?");
    } else {
        console.error(`❌ FAILURE: ${requestCount} requests were sent! Double click fix failed.`);
    }
}

verifyDuelPassClaimFix();
