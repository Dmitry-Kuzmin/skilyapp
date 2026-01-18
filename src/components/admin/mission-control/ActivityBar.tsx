import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Loader2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityLog } from '@/contexts/ActivityLogContext';

export function ActivityBar() {
    const { logs, isProcessing, setIsProcessing, addLog } = useActivityLog();
    const [isOpen, setIsOpen] = useState(false);
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when logs update
    useEffect(() => {
        if (scrollRef.current && isOpen) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isOpen]);

    const handleStopProcessing = async () => {
        // Attempt to kill the generation process
        try {
            // Since the batch script is running in background, we signal to server to stop
            await fetch('http://localhost:3030/api/generate/stop', { method: 'POST' });
            addLog('⏹ Generation stopped by user', 'info');
        } catch (e) {
            addLog('⚠️ Could not reach server to stop generation', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col shadow-2xl font-sans">

            {/* 1. DRAWER (Consolidated Log View) */}
            {isOpen && (
                <div
                    ref={scrollRef}
                    className="h-64 bg-[#09090b] border-t border-zinc-800 p-2 overflow-y-auto font-mono text-[11px] text-zinc-400 animate-in slide-in-from-bottom-5 duration-200"
                >
                    {logs.length === 0 && (
                        <div className="flex h-full items-center justify-center text-zinc-700 italic">
                            No recent activity
                        </div>
                    )}
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-3 py-1 border-b border-zinc-900/50 last:border-0 hover:bg-zinc-900 px-2 rounded transition-colors items-start">
                            <span className="opacity-40 min-w-[60px] select-none">[{log.timestamp}]</span>
                            <span className={cn(
                                "font-bold uppercase tracking-wider min-w-[40px] text-center rounded px-1 text-[9px] py-0.5",
                                log.type === 'error' ? 'bg-rose-950/30 text-rose-500' :
                                    log.type === 'success' ? 'bg-emerald-950/30 text-emerald-500' :
                                        log.type === 'loading' ? 'bg-indigo-950/30 text-indigo-400' :
                                            'bg-zinc-800/30 text-zinc-400'
                            )}>
                                {log.type === 'error' ? 'ERR' : log.type === 'success' ? 'OK' : log.type === 'loading' ? 'RUN' : 'INFO'}
                            </span>
                            <span className={cn(
                                "text-zinc-300 break-all",
                                log.type === 'error' && "text-rose-200"
                            )}>{log.message}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* 2. NANO-BAR (Always Visible) */}
            <div
                className="h-7 bg-[#09090b] border-t border-zinc-800 flex items-center px-4 justify-between select-none"
            >
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 text-xs font-medium flex-1 cursor-pointer hover:bg-zinc-900 -mx-2 px-2 rounded transition-colors"
                >
                    {/* Status Indicator */}
                    {isProcessing ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                            <span className="text-indigo-400 text-[10px] uppercase tracking-wider font-bold">Processing</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Ready</span>
                        </div>
                    )}

                    <div className="w-px h-3 bg-zinc-800 mx-1" />

                    {/* Latest Message */}
                    <span className={cn(
                        "text-zinc-400 truncate max-w-[600px] transition-colors font-mono text-[10px]",
                        lastLog?.type === 'error' && "text-rose-400",
                        lastLog?.type === 'success' && "text-emerald-400",
                    )}>
                        {lastLog ? lastLog.message : 'System initialized. Waiting for commands.'}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Stop Button (Visible when processing) */}
                    {isProcessing && (
                        <button
                            onClick={handleStopProcessing}
                            className="flex items-center gap-1 px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 transition-colors text-white text-[10px] font-bold uppercase tracking-wider"
                        >
                            <Square className="h-3 w-3 fill-current" />
                            Stop
                        </button>
                    )}

                    {/* Toggle Icon */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1"
                    >
                        <span className="opacity-0 hover:opacity-100 transition-opacity">View Logs</span>
                        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
