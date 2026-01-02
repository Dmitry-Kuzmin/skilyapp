import { useLanguage } from '@/contexts/LanguageContext';
import { LegalLink } from './LegalLink';

export function AuthModalFooter() {
    const { t } = useLanguage();

    return (
        <div className="mt-4 text-center">
            <p className="text-[10px] text-zinc-600/60 leading-relaxed max-w-[280px] mx-auto font-medium">
                {t('auth.legalFooter')}{' '}
                <LegalLink
                    href="/terms"
                    label={t('auth.terms')}
                    title="Пользовательское соглашение"
                />{' '}
                и{' '}
                <LegalLink
                    href="/privacy"
                    label={t('auth.privacy')}
                    title="Политика"
                />
            </p>
        </div>
    );
}
