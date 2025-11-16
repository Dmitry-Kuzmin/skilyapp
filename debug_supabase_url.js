// Скрипт для проверки URL Supabase
console.log('Проверка переменных окружения:');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('PUBLIC_SUPABASE_URL:', process.env.PUBLIC_SUPABASE_URL);

// Проверка fallback
const fallback = 'https://yffjnqegeiorunyvcxkn.supabase.co';
console.log('Fallback URL:', fallback);

// Итоговый URL
const finalUrl = process.env.VITE_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || fallback;
console.log('Итоговый URL:', finalUrl);
