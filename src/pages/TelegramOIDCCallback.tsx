import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * /auth/telegram/callback
 *
 * Этот роут оставлен как registered Redirect URI в BotFather.
 * При SDK-флоу (Telegram.Login.auth) сюда никто не попадает.
 * Если пользователь каким-то образом сюда попал — редиректим на главную.
 */
export default function TelegramOIDCCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/', { replace: true });
    }, [navigate]);

    return (
        <div className="min-h-[100dvh] bg-[#09090b] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm text-zinc-400">Перенаправление…</p>
        </div>
    );
}
