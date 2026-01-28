// Тестирование Rich Push на iPhone
// Запускай эти команды по очереди в консоли браузера Safari на iPhone

console.log('📱 iOS Rich Push Test Suite');

// ✅ Тест 1: Минимальное уведомление (должно работать)
async function test1_minimal() {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Тест 1: Минимум', {
        body: 'Если видишь это — Service Worker работает ✅'
    });
    console.log('✅ Тест 1 отправлен');
}

// ✅ Тест 2: С картинкой (MAIN TEST)
async function test2_withImage() {
    const reg = await navigator.serviceWorker.ready;
    const origin = window.location.origin;
    await reg.showNotification('Тест 2: Картинка 🎨', {
        body: '⚠️ ДОЛГО НАЖМИ на уведомление, чтобы увидеть картинку!',
        image: `${origin}/images/hero-lcp.webp`,
        icon: `${origin}/favicon.ico`,
        badge: `${origin}/favicon.ico`
    });
    console.log('✅ Тест 2 отправлен (проверь размер картинки долгим нажатием)');
}

// ✅ Тест 3: С кнопками
async function test3_withActions() {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Тест 3: Кнопки', {
        body: 'Долго нажми — должны появиться кнопки',
        actions: [
            { action: 'yes', title: 'Да' },
            { action: 'no', title: 'Нет' }
        ]
    });
    console.log('✅ Тест 3 отправлен');
}

// ✅ Тест 4: Всё вместе (Rich Notification)
async function test4_fullRich() {
    const reg = await navigator.serviceWorker.ready;
    const origin = window.location.origin;
    await reg.showNotification('🎉 Тест 4: Rich', {
        body: 'Долго нажми для картинки и кнопок! 📸',
        image: `${origin}/images/hero-lcp.webp`,
        icon: `${origin}/favicon.ico`,
        badge: `${origin}/favicon.ico`,
        actions: [
            { action: 'open', title: 'Открыть' },
            { action: 'close', title: 'Закрыть' }
        ],
        requireInteraction: true,
        tag: 'rich-test-' + Date.now()
    });
    console.log('✅ Тест 4 отправлен (ГЛАВНЫЙ ТЕСТ)');
}

// ⚠️ Тест 5: Внешняя картинка (лёгкая, точно < 1MB)
async function test5_externalImage() {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Тест 5: Внешняя картинка', {
        body: 'Долго нажми — должна быть картинка с picsum',
        image: 'https://picsum.photos/800/400.jpg' // Всегда < 1MB
    });
    console.log('✅ Тест 5 отправлен (внешняя картинка)');
}

// 🔍 Проверка размера вашей картинки
async function checkImageSize() {
    const origin = window.location.origin;
    const imageUrl = `${origin}/images/hero-lcp.webp`;

    try {
        const response = await fetch(imageUrl, { method: 'HEAD' });
        const size = parseInt(response.headers.get('content-length') || '0');
        const sizeMB = (size / 1024 / 1024).toFixed(2);

        console.log('📊 Размер hero-lcp.webp:', size, 'байт =', sizeMB, 'MB');

        if (size > 1048576) {
            console.error('❌ ПРОБЛЕМА: Картинка больше 1MB! iOS не покажет её.');
            console.log('💡 Сожми через tinypng.com или squoosh.app');
        } else {
            console.log('✅ Размер OK для iOS');
        }
    } catch (e) {
        console.error('❌ Не удалось проверить размер:', e);
    }
}

// 🚀 Запуск всех тестов по очереди (с паузами)
async function runAllTests() {
    console.log('🚀 Запуск всех тестов...\n');

    await checkImageSize();
    console.log('\n⏳ Ждём 3 сек...\n');
    await new Promise(r => setTimeout(r, 3000));

    await test1_minimal();
    await new Promise(r => setTimeout(r, 2000));

    await test2_withImage();
    await new Promise(r => setTimeout(r, 2000));

    await test3_withActions();
    await new Promise(r => setTimeout(r, 2000));

    await test4_fullRich();
    await new Promise(r => setTimeout(r, 2000));

    await test5_externalImage();

    console.log('\n✅ Все тесты отправлены! Проверь Центр уведомлений.');
}

// 📖 Инструкция
console.log(`
📖 КАК ИСПОЛЬЗОВАТЬ:

1️⃣  Сначала проверь размер картинки:
    checkImageSize()

2️⃣  Запусти один тест (рекомендую начать с test4_fullRich):
    test4_fullRich()

3️⃣  Или запусти все тесты подряд:
    runAllTests()

4️⃣  ВАЖНО: После появления уведомления — ДОЛГО НАЖМИ на него (Haptic Touch)
    Только так увидишь картинку и кнопки!

⚠️  Если картинка не показывается:
    - Проверь размер через checkImageSize() (должен быть < 1MB)
    - Попробуй test5_externalImage() — там точно лёгкая картинка
`);

// Экспортируем для удобства
window.pushTests = {
    test1_minimal,
    test2_withImage,
    test3_withActions,
    test4_fullRich,
    test5_externalImage,
    checkImageSize,
    runAllTests
};

console.log('\n✅ Тесты готовы! Используй: pushTests.runAllTests()');
