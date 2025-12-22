/**
 * SecurityTab - Вкладка "Безопасность"
 * 
 * Email, Passkeys
 */

import React, { useContext } from 'react';
import { Separator } from '@/components/ui/separator';
import { UserContext } from '@/contexts/UserContext';
import { PasskeyManager } from '@/components/auth/PasskeyManager';

// === COMPONENTS ===
const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {title}
    </h3>
);

export const SecurityTab: React.FC = () => {
    const userContext = useContext(UserContext);
    const supabaseUser = userContext?.supabaseUser;

    return (
        <div className="space-y-6">
            {/* Email */}
            <div>
                <SectionTitle title="Email" />
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {supabaseUser?.email || 'Не привязан'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Используется для входа и восстановления
                    </p>
                </div>
            </div>

            <Separator className="bg-slate-200 dark:bg-slate-700" />

            {/* PasskeyManager */}
            <PasskeyManager />
        </div>
    );
};

export default SecurityTab;
