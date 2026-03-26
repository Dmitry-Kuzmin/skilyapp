import { Link } from 'react-router-dom';
import { Sparkles, Zap, Palette, Wrench, ChevronRight, ArrowLeft, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LandingLogo } from '@/components/landing/LandingLogo';
import { Page } from '@/components/Page';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CHANGELOG, ChangeCategory } from '@/data/changelog';

const APP_VERSION = (window as unknown as Record<string, string>)['APP_VERSION'] ?? '—';

const CATEGORY_META: Record<ChangeCategory, { label: string; color: string; icon: React.ReactNode }> = {
    feature: { label: 'Новое', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: <Sparkles className="w-3 h-3" /> },
    design: { label: 'Дизайн', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', icon: <Palette className="w-3 h-3" /> },
    performance: { label: 'Быстрее', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: <Zap className="w-3 h-3" /> },
    fix: { label: 'Исправлено', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: <Wrench className="w-3 h-3" /> },
};

export default function Changelog() {
    return (
        <Page className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/help" className="group flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="hidden sm:inline">Документация</span>
                        </Link>
                        <Link to="/dashboard" style={{ overflow: 'visible', position: 'relative', zIndex: 1 }}>
                            <LandingLogo variant="bold" showText className="scale-90" />
                        </Link>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                {/* Hero */}
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-5">
                        <Rocket className="w-3.5 h-3.5" />
                        Актуальная версия: {APP_VERSION}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-gray-900 dark:text-gray-100 mb-4">
                        История обновлений
                    </h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                        Что нового появилось в Skily — всё важное, понятным языком.
                    </p>
                </div>

                {/* Timeline */}
                <div className="relative">
                    {/* Вертикальная линия */}
                    <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 via-gray-200 to-transparent dark:from-blue-800/60 dark:via-gray-800/60" />

                    <div className="space-y-10">
                        {CHANGELOG.map((release, idx) => (
                            <div key={release.version} className="relative flex gap-6 sm:gap-10">
                                {/* Dot на линии */}
                                <div className="flex-shrink-0 relative z-10 flex flex-col items-center" style={{ width: '48px' }}>
                                    <div className={cn(
                                        'w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border-2',
                                        release.isLatest
                                            ? 'bg-blue-600 border-blue-500 shadow-blue-200/60 dark:shadow-blue-900/60 shadow-md'
                                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
                                    )}>
                                        {release.badge ?? '📦'}
                                    </div>
                                </div>

                                {/* Card */}
                                <div className={cn(
                                    'flex-1 pb-2 rounded-2xl border transition-shadow',
                                    release.isLatest
                                        ? 'bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800/60 shadow-lg shadow-blue-50 dark:shadow-blue-950'
                                        : 'bg-white/70 dark:bg-gray-900/60 border-gray-200/70 dark:border-gray-800/50',
                                )}>
                                    {release.isLatest && (
                                        <div className="px-6 pt-4 pb-0">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wide">
                                                <Sparkles className="w-3 h-3" />
                                                Последнее обновление
                                            </span>
                                        </div>
                                    )}

                                    <div className="px-6 pt-4 pb-5">
                                        {/* Meta */}
                                        <div className="flex flex-wrap items-baseline gap-3 mb-2">
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                {release.title}
                                            </h2>
                                            <time className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                                {release.version}
                                            </time>
                                        </div>
                                        {release.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                                                {release.description}
                                            </p>
                                        )}

                                        {/* Changes */}
                                        <ul className="space-y-2.5">
                                            {release.changes.map((item, i) => {
                                                const meta = CATEGORY_META[item.category];
                                                return (
                                                    <li key={i} className="flex items-start gap-3">
                                                        <span className={cn(
                                                            'flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold mt-0.5',
                                                            meta.color,
                                                        )}>
                                                            {meta.icon}
                                                            {meta.label}
                                                        </span>
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                                                            {item.text}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer note */}
                <div className="mt-16 text-center text-sm text-gray-400 dark:text-gray-500">
                    <p>Обновления выходят непрерывно. Следи за новостями в{' '}
                        <a href="https://t.me/skilyapp_bot" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                            Telegram
                        </a>
                    </p>
                </div>
            </main>
        </Page>
    );
}
