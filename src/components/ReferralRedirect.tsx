import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';

/**
 * Компонент для обработки реферальных ссылок /join/:code
 * - Если пользователь авторизован → показываем сообщение
 * - Если не авторизован → сохраняем код и редирект на главную с баннером
 */
export function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useUserContext();

  useEffect(() => {
    if (code) {
      if (isAuthenticated) {
        // Если пользователь уже зарегистрирован, просто показываем сообщение
        toast.info('Вы уже зарегистрированы. Поделитесь ссылкой с друзьями!', { duration: 3000 });
        navigate('/');
      } else {
        // Store referral code for new user registration
        sessionStorage.setItem('referral_code', code.toUpperCase());
        toast.success('Регистрируйтесь и получите +50 монет! 🎁', { duration: 5000 });
        navigate('/');
      }
    } else {
      navigate('/');
    }
  }, [code, isAuthenticated, navigate]);

  return null; // This component doesn't render anything
}
