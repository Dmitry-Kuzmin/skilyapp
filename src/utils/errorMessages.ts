/**
 * Преобразует ошибки Edge Function в понятные сообщения для пользователя
 */
export function getHumanReadableError(error: any, context?: string): string {
  // Если ошибка уже в человеко-читаемом формате
  if (typeof error === 'string' && !error.includes('Edge Function') && !error.includes('non-2xx')) {
    return error;
  }

  // Получаем сообщение об ошибке
  const errorMessage = error?.message || error?.error || error?.toString() || 'Неизвестная ошибка';
  
  // Проверяем на различные типы ошибок
  if (errorMessage.includes('non-2xx') || errorMessage.includes('Edge Function')) {
    // Пытаемся извлечь реальное сообщение из error.context или error.data
    const realError = error?.context || error?.data || error;
    const realMessage = realError?.message || realError?.error || '';
    
    if (realMessage) {
      return getHumanReadableError(realMessage, context);
    }
    
    // Общие ошибки Edge Function
    return 'Произошла ошибка при выполнении запроса. Пожалуйста, попробуйте еще раз.';
  }

  // Ошибки связанные с дуэлями
  if (errorMessage.includes('already in this duel') || errorMessage.includes('already joined')) {
    return 'Вы уже участвуете в этой дуэли. Нельзя присоединиться к дуэли дважды.';
  }

  if (errorMessage.includes('not found') || errorMessage.includes('Дуэль не найдена')) {
    if (context === 'join') {
      return 'Дуэль с таким кодом не найдена. Проверьте код и попробуйте снова.';
    }
    return 'Дуэль не найдена. Возможно, она была удалена или истек срок действия.';
  }

  if (errorMessage.includes('already started') || errorMessage.includes('уже началась')) {
    return 'Дуэль уже началась. К сожалению, присоединиться к ней нельзя.';
  }

  if (errorMessage.includes('already finished') || errorMessage.includes('уже завершена')) {
    return 'Дуэль уже завершена. Создайте новую дуэль, чтобы сыграть.';
  }

  if (errorMessage.includes('expired') || errorMessage.includes('истек')) {
    return 'Время ожидания дуэли истекло. Создайте новую дуэль.';
  }

  if (errorMessage.includes('host') && errorMessage.includes('join')) {
    return 'Вы не можете присоединиться к своей же дуэли. Вы уже являетесь хостом этой дуэли.';
  }

  if (errorMessage.includes('Authentication required') || errorMessage.includes('Unauthorized')) {
    return 'Необходима авторизация. Пожалуйста, войдите в систему.';
  }

  if (errorMessage.includes('Profile not found')) {
    return 'Профиль не найден. Пожалуйста, обновите страницу и попробуйте снова.';
  }

  if (errorMessage.includes('Invalid code format')) {
    return 'Неверный формат кода. Код должен содержать от 4 до 6 символов (буквы и цифры).';
  }

  if (errorMessage.includes('No questions found')) {
    return 'Не удалось найти вопросы для дуэли. Пожалуйста, попробуйте позже.';
  }

  // Ошибки сети
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
    return 'Проблема с подключением к интернету. Проверьте соединение и попробуйте снова.';
  }

  // Ошибки таймаута
  if (errorMessage.includes('timeout') || errorMessage.includes('Превышено время ожидания')) {
    return 'Превышено время ожидания ответа. Пожалуйста, попробуйте еще раз.';
  }

  // Если сообщение уже достаточно понятное, возвращаем его
  if (errorMessage.length < 100 && !errorMessage.includes('Error:') && !errorMessage.includes('error:')) {
    return errorMessage;
  }

  // Общая ошибка по умолчанию
  return 'Произошла непредвиденная ошибка. Пожалуйста, попробуйте еще раз или обратитесь в поддержку.';
}

/**
 * Извлекает сообщение об ошибке из ответа Edge Function
 */
export function extractErrorFromResponse(error: any): string {
  // Если ошибка - строка
  if (typeof error === 'string') {
    return error;
  }

  // Пытаемся извлечь сообщение из разных мест
  if (error?.message) {
    return error.message;
  }

  if (error?.error) {
    return typeof error.error === 'string' ? error.error : error.error.message || 'Ошибка';
  }

  if (error?.data?.error) {
    return typeof error.data.error === 'string' ? error.data.error : error.data.error.message || 'Ошибка';
  }

  if (error?.context?.message) {
    return error.context.message;
  }

  return 'Неизвестная ошибка';
}

