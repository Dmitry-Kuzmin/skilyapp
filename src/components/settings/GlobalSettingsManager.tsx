/**
 * Global Settings Manager
 * 
 * Рендерит UnifiedSettingsDrawer на уровне приложения.
 * Добавляется один раз в App.tsx или AppProviders.
 */

import { UnifiedSettingsDrawer } from './UnifiedSettingsDrawer';

export const GlobalSettingsManager: React.FC = () => {
    return <UnifiedSettingsDrawer />;
};

export default GlobalSettingsManager;
