// Telegram WebApp Mock для разработки
// Загружается только на localhost
(function() {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return;
  }

  // Ждем DOMContentLoaded для правильной инициализации
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMock);
  } else {
    initMock();
  }

  function initMock() {
    // Ждем немного, чтобы реальный Telegram скрипт успел загрузиться
    setTimeout(() => {
      if (!window.Telegram?.WebApp) {
        console.log('[Mock] Real Telegram WebApp not found, initializing mock...');
        window.Telegram = {
          WebApp: {
            ready: () => {
              console.log('[Mock] Telegram WebApp ready');
            },
            expand: () => {
              console.log('[Mock] Telegram WebApp expanded');
            },
            close: () => {
              console.log('[Mock] Telegram WebApp close');
              if (confirm('Закрыть приложение?')) {
                window.close();
              }
            },
            initData: 'mock_init_data',
            initDataUnsafe: {
              user: {
                id: 123456789,
                first_name: 'Тестовый',
                last_name: 'Пользователь',
                username: 'test_user',
                language_code: 'ru',
                photo_url: 'https://via.placeholder.com/150'
              }
            },
            BackButton: {
              show: () => {
                console.log('[Mock] BackButton show');
                window.mockBackButtonVisible = true;
              },
              hide: () => {
                console.log('[Mock] BackButton hide');
                window.mockBackButtonVisible = false;
              },
              onClick: (callback) => {
                console.log('[Mock] BackButton onClick registered');
                window.mockBackButtonCallback = callback;
              },
              offClick: (callback) => {
                console.log('[Mock] BackButton offClick registered');
                window.mockBackButtonCallback = null;
              }
            },
            MainButton: {
              setText: (text) => {
                console.log('[Mock] MainButton setText:', text);
                window.mockMainButtonText = text;
              },
              show: () => {
                console.log('[Mock] MainButton show');
                window.mockMainButtonVisible = true;
              },
              hide: () => {
                console.log('[Mock] MainButton hide');
                window.mockMainButtonVisible = false;
              },
              onClick: (callback) => {
                console.log('[Mock] MainButton onClick registered');
                window.mockMainButtonCallback = callback;
              },
              offClick: (callback) => {
                console.log('[Mock] MainButton offClick registered');
                window.mockMainButtonCallback = null;
              },
              enable: () => {
                console.log('[Mock] MainButton enable');
                window.mockMainButtonEnabled = true;
              },
              disable: () => {
                console.log('[Mock] MainButton disable');
                window.mockMainButtonEnabled = false;
              }
            },
            HapticFeedback: {
              impactOccurred: (style) => {
                console.log('[Mock] HapticFeedback impactOccurred:', style);
              },
              notificationOccurred: (type) => {
                console.log('[Mock] HapticFeedback notificationOccurred:', type);
              },
              selectionChanged: () => {
                console.log('[Mock] HapticFeedback selectionChanged');
              }
            },
            isVersionAtLeast: (version) => {
              console.log('[Mock] isVersionAtLeast:', version);
              return true;
            },
            openTelegramLink: (url) => {
              console.log('[Mock] Open Telegram link:', url);
              window.open(url, '_blank');
            },
            version: '6.0',
            platform: 'web',
            colorScheme: 'light',
            themeParams: {
              bg_color: '#ffffff',
              text_color: '#000000',
              hint_color: '#999999',
              link_color: '#2481cc',
              button_color: '#2481cc',
              button_text_color: '#ffffff'
            }
          }
        };
        console.log('[Mock] Telegram WebApp Mock initialized for localhost');
      } else {
        console.log('[Mock] Real Telegram WebApp detected, mock not needed');
      }
    }, 100);
  }
})();




