import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SyncLogEntry {
    id: string;
    timestamp: string;
    questionId: string;
    status: 'success' | 'error' | 'warning';
    message: string;
}

interface SyncHistoryPanelProps {
    logs: SyncLogEntry[];
    isRunning: boolean;
}

export function SyncHistoryPanel({ logs, isRunning }: SyncHistoryPanelProps) {
    const [stats, setStats] = useState({ success: 0, errors: 0, warnings: 0 });

    useEffect(() => {
        const success = logs.filter(l => l.status === 'success').length;
        const errors = logs.filter(l => l.status === 'error').length;
        const warnings = logs.filter(l => l.status === 'warning').length;
        setStats({ success, errors, warnings });
    }, [logs]);

    if (logs.length === 0 && !isRunning) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Логи синхронизации появятся здесь</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-black/20 rounded-lg border border-white/5">
            {/* Header with stats */}
            <div className="flex items-center justify-between p-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    {isRunning && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
                    <span className="text-sm font-medium text-gray-300">
                        Лог синхронизации
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-400 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {stats.success}
                    </Badge>
                    {stats.errors > 0 && (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-400 text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            {stats.errors}
                        </Badge>
                    )}
                    {stats.warnings > 0 && (
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400 text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {stats.warnings}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Logs scroll area */}
            <ScrollArea className="flex-1 p-3">
                <div className="space-y-1">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="flex items-start gap-2 p-2 rounded-md hover:bg-white/5 transition-colors text-xs"
                        >
                            {/* Icon */}
                            {log.status === 'success' && (
                                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                            )}
                            {log.status === 'error' && (
                                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            )}
                            {log.status === 'warning' && (
                                <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-mono text-gray-500 text-[10px]">
                                        {new Date(log.timestamp).toLocaleTimeString('ru-RU')}
                                    </span>
                                    {log.questionId && (
                                        <code className="text-purple-400 text-[10px] bg-purple-500/10 px-1 rounded">
                                            {log.questionId}
                                        </code>
                                    )}
                                </div>
                                <p className="text-gray-300 leading-relaxed">{log.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
