import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type LogType = 'info' | 'success' | 'error' | 'loading';

export interface LogEntry {
    id: string;
    timestamp: string;
    message: string;
    type: LogType;
}

interface ActivityLogContextType {
    logs: LogEntry[];
    addLog: (message: string, type?: LogType) => void;
    clearLogs: () => void;
    isProcessing: boolean;
    setIsProcessing: (loading: boolean) => void;
}

const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

export function ActivityLogProvider({ children }: { children: ReactNode }) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const addLog = useCallback((message: string, type: LogType = 'info') => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ru-RU', { hour12: false });

        const newLog: LogEntry = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: timeString,
            message,
            type
        };

        setLogs(prev => [...prev, newLog]);

        // Auto-set processing state based on type if needed, 
        // but explicit control is better for batch jobs.
        if (type === 'loading') setIsProcessing(true);
        if (type === 'success' || type === 'error') {
            // Optional: Auto-turn off processing after a delay if strictly sequential? 
            // Better to let the caller handle processing state for batches.
        }
    }, []);

    const clearLogs = useCallback(() => setLogs([]), []);

    return (
        <ActivityLogContext.Provider value={{ logs, addLog, clearLogs, isProcessing, setIsProcessing }}>
            {children}
        </ActivityLogContext.Provider>
    );
}

export function useActivityLog() {
    const context = useContext(ActivityLogContext);
    if (context === undefined) {
        throw new Error('useActivityLog must be used within an ActivityLogProvider');
    }
    return context;
}
