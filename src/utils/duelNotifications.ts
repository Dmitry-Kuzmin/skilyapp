/**
 * Улучшенные уведомления для дуэлей с понятными сообщениями от AI помощника
 */

export interface DuelNotificationMessage {
  title: string;
  description: string;
  mood: 'idle' | 'happy' | 'thinking' | 'encouraging' | 'celebrating';
  variant: 'default' | 'success' | 'error' | 'warning' | 'info';
}

/**
 * Получить понятное сообщение об ошибке для присоединения к дуэли
 */
export function getDuelJoinErrorMessage(error: string): DuelNotificationMessage {
  const errorLower = error.toLowerCase();

  // Неправильный код дуэли
  if (errorLower.includes('not found') || errorLower.includes('дуэль не найдена')) {
    return {
      title: 'Код не найден',
      description: 'Такой код дуэли не существует. Проверьте код и попробуйте снова. Возможно, дуэль уже завершилась или была удалена.',
      mood: 'thinking',
      variant: 'error',
    };
  }

  // Попытка играть самим собой
  if (errorLower.includes('cannot join your own') || errorLower.includes('host') || errorLower.includes('своей же дуэли')) {
    return {
      title: 'Нельзя играть самим собой',
      description: 'Вы не можете присоединиться к своей же дуэли. Вы уже являетесь создателем этой дуэли. Попросите друга присоединиться к вам!',
      mood: 'encouraging',
      variant: 'warning',
    };
  }

  // Уже участвуешь в дуэли
  if (errorLower.includes('already in') || errorLower.includes('already joined') || errorLower.includes('уже участвуете')) {
    return {
      title: 'Вы уже в этой дуэли',
      description: 'Вы уже присоединились к этой дуэли. Нельзя присоединиться дважды. Проверьте свои активные дуэли.',
      mood: 'idle',
      variant: 'info',
    };
  }

  // Недостаточно монет
  if (errorLower.includes('insufficient coins') || errorLower.includes('недостаточно монет') || errorLower.includes('need') && errorLower.includes('coins')) {
    const match = error.match(/need (\d+) coins but only have (\d+)/i);
    if (match) {
      const need = parseInt(match[1]);
      const have = parseInt(match[2]);
      return {
        title: 'Недостаточно монет',
        description: `Для этой дуэли нужно ${need} монет, а у вас только ${have}. Пополните баланс в магазине или создайте дуэль без ставки.`,
        mood: 'encouraging',
        variant: 'warning',
      };
    }
    return {
      title: 'Недостаточно монет',
      description: 'У вас недостаточно монет для участия в этой дуэли. Пополните баланс в магазине или создайте дуэль без ставки.',
      mood: 'encouraging',
      variant: 'warning',
    };
  }

  // Дуэль уже началась
  if (errorLower.includes('already started') || errorLower.includes('уже началась')) {
    return {
      title: 'Дуэль уже началась',
      description: 'К сожалению, эта дуэль уже началась. Присоединиться к ней нельзя. Попросите друга создать новую дуэль или присоединитесь к другой.',
      mood: 'thinking',
      variant: 'error',
    };
  }

  // Дуэль уже завершена
  if (errorLower.includes('already finished') || errorLower.includes('уже завершена')) {
    return {
      title: 'Дуэль уже завершена',
      description: 'Эта дуэль уже закончилась. Создайте новую дуэль, чтобы сыграть. Или попросите друга поделиться кодом активной дуэли.',
      mood: 'idle',
      variant: 'info',
    };
  }

  // Время истекло
  if (errorLower.includes('expired') || errorLower.includes('истек')) {
    return {
      title: 'Время истекло',
      description: 'Время ожидания дуэли истекло. Создайте новую дуэль или попросите друга поделиться свежим кодом.',
      mood: 'thinking',
      variant: 'warning',
    };
  }

  // Неверный формат кода
  if (errorLower.includes('invalid code') || errorLower.includes('must be exactly') || errorLower.includes('формат кода')) {
    return {
      title: 'Неверный формат кода',
      description: 'Код дуэли должен содержать ровно 4 символа (буквы и цифры). Проверьте код и попробуйте снова.',
      mood: 'thinking',
      variant: 'error',
    };
  }

  // Проблемы с сетью
  if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('failed to fetch') || errorLower.includes('подключение')) {
    return {
      title: 'Проблема с подключением',
      description: 'Не удалось подключиться к серверу. Проверьте интернет-соединение и попробуйте снова.',
      mood: 'thinking',
      variant: 'error',
    };
  }

  // Таймаут
  if (errorLower.includes('timeout') || errorLower.includes('превышено время')) {
    return {
      title: 'Превышено время ожидания',
      description: 'Сервер не ответил вовремя. Попробуйте еще раз. Если проблема повторяется, проверьте интернет-соединение.',
      mood: 'thinking',
      variant: 'warning',
    };
  }

  // Профиль не найден
  if (errorLower.includes('profile not found') || errorLower.includes('профиль не найден')) {
    return {
      title: 'Профиль не найден',
      description: 'Не удалось найти ваш профиль. Обновите страницу и попробуйте снова. Если проблема повторяется, обратитесь в поддержку.',
      mood: 'thinking',
      variant: 'error',
    };
  }

  // Общая ошибка
  return {
    title: 'Что-то пошло не так',
    description: 'Произошла непредвиденная ошибка. Попробуйте еще раз или обратитесь в поддержку, если проблема повторяется.',
    mood: 'thinking',
    variant: 'error',
  };
}

/**
 * Получить сообщение успеха для присоединения к дуэли
 */
export function getDuelJoinSuccessMessage(autoStarted: boolean): DuelNotificationMessage {
  if (autoStarted) {
    return {
      title: 'Дуэль начинается!',
      description: 'Соперник найден, дуэль запускается прямо сейчас. Удачи!',
      mood: 'celebrating',
      variant: 'success',
    };
  }
  
  return {
    title: 'Вы присоединились!',
    description: 'Ожидайте начала дуэли. Как только создатель запустит игру, начнется битва.',
    mood: 'happy',
    variant: 'success',
  };
}

/**
 * Получить сообщение для других сценариев дуэлей
 */
export function getDuelNotificationMessage(type: string, context?: any): DuelNotificationMessage {
  switch (type) {
    case 'opponent_joined':
      return {
        title: 'Соперник найден!',
        description: 'Противник присоединился к дуэли. Можно начинать битву!',
        mood: 'happy',
        variant: 'success',
      };

    case 'opponent_left':
      return {
        title: 'Соперник покинул игру',
        description: 'Ваш соперник покинул дуэль. Дуэль будет завершена автоматически.',
        mood: 'thinking',
        variant: 'warning',
      };

    case 'duel_started':
      return {
        title: 'Дуэль началась!',
        description: 'Битва начинается прямо сейчас. Покажите все свои знания!',
        mood: 'celebrating',
        variant: 'success',
      };

    case 'duel_finished':
      return {
        title: 'Дуэль завершена!',
        description: 'Все вопросы пройдены. Смотрите результаты!',
        mood: 'happy',
        variant: 'success',
      };

    case 'insufficient_coins_create':
      return {
        title: 'Недостаточно монет',
        description: `Для создания дуэли со ставкой ${context?.betAmount || 0} монет нужно больше средств. Пополните баланс или создайте дуэль без ставки.`,
        mood: 'encouraging',
        variant: 'warning',
      };

    case 'code_copied':
      return {
        title: 'Код скопирован!',
        description: 'Код дуэли скопирован в буфер обмена. Отправьте его другу.',
        mood: 'happy',
        variant: 'success',
      };

    default:
      return {
        title: 'Уведомление',
        description: context?.message || 'Произошло событие в дуэли.',
        mood: 'idle',
        variant: 'info',
      };
  }
}

