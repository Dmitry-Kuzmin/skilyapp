// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { getFingerprint } from "@/lib/fingerprint";

export default function PartnerLinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleRedirect();
  }, [code]);

  const handleRedirect = async () => {
    if (!code) {
      navigate('/');
      return;
    }

    try {
      // Получить информацию о ссылке (автоматически инкрементит clicks_count)
      const { data, error } = await supabase.rpc('get_partner_link_info', {
        p_link_code: code.toUpperCase()
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const linkInfo = data[0];

        if (!linkInfo.success) {
          setError('Ссылка не найдена или истекла');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Записать клик в воронку конверсий
        const sessionId = localStorage.getItem('partner_session_id') || crypto.randomUUID();
        localStorage.setItem('partner_session_id', sessionId);
        localStorage.setItem('partner_code', linkInfo.partner_code);
        localStorage.setItem('partner_utm_campaign', linkInfo.utm_campaign || '');

        // Получаем fingerprint параллельно (не блокируем редирект)
        const fingerprintPromise = getFingerprint();

        // Трекинг клика (не ждем ответа, редиректим сразу)
        // Получаем fingerprint и передаем в track_partner_conversion
        fingerprintPromise.then((fingerprintHash) => {
        supabase.rpc('track_partner_conversion', {
          p_partner_code: linkInfo.partner_code,
          p_event_type: 'click',
          p_session_id: sessionId,
          p_utm_campaign: linkInfo.utm_campaign,
          p_landing_page: linkInfo.destination,
            p_fingerprint_hash: fingerprintHash, // Передаем fingerprint hash
        }).then(() => {
            console.log('[PartnerLink] Click tracked with fingerprint:', fingerprintHash ? 'yes' : 'no');
          }).catch((err) => {
            console.error('[PartnerLink] Track error:', err);
          });
        }).catch((err) => {
          console.error('[PartnerLink] Fingerprint error:', err);
          // Если fingerprint не получен, все равно трекаем клик без него
          supabase.rpc('track_partner_conversion', {
            p_partner_code: linkInfo.partner_code,
            p_event_type: 'click',
            p_session_id: sessionId,
            p_utm_campaign: linkInfo.utm_campaign,
            p_landing_page: linkInfo.destination,
            p_fingerprint_hash: null,
          }).catch((err) => {
            console.error('[PartnerLink] Track error (no fingerprint):', err);
          });
        });

        // Редиректнуть на destination
        const destinationMap: Record<string, string> = {
          'home': '/',
          'premium': '/premium', // Или где у вас страница Premium
          'test-essential': '/tests?category=essential',
          'test-priority': '/tests?category=priority',
          'payment': '/premium', // Или страница оплаты
        };

        const targetUrl = destinationMap[linkInfo.destination] || '/';
        
        // Небольшая задержка для записи клика
        setTimeout(() => {
          navigate(targetUrl);
        }, 500);

      } else {
        setError('Ссылка не найдена');
        setTimeout(() => navigate('/'), 3000);
      }
    } catch (error: any) {
      console.error('[PartnerLinkRedirect] Error:', error);
      setError('Ошибка обработки ссылки');
      setTimeout(() => navigate('/'), 3000);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️</div>
          <p className="text-white mb-2">{error}</p>
          <p className="text-slate-400 text-sm">Перенаправление на главную...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
        <p className="text-white">Обработка партнерской ссылки...</p>
        <p className="text-slate-400 text-sm mt-2">Перенаправление через секунду...</p>
      </div>
    </div>
  );
}

