import React from 'react';
import { cn } from '@/lib/utils';

interface AISphereProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-36 h-36',
    xl: 'w-48 h-48',
};

export const AISphere: React.FC<AISphereProps> = ({ size = 'md', className }) => {
    return (
        <div className={cn("relative flex items-center justify-center transition-transform hover:scale-105 duration-700", sizeMap[size], className)}>
            {/* Outer spinning ring */}
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 opacity-60 border-t-transparent border-b-transparent shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-spin-slow"></div>

            {/* Middle spinning ring (reverse) */}
            <div
                className="absolute inset-[10%] rounded-full border-2 border-purple-500 opacity-60 border-l-transparent border-r-transparent animate-spin-slow"
                style={{ animationDirection: 'reverse', animationDuration: '4s' }}
            ></div>

            {/* Inner static/slow ring */}
            <div className="absolute inset-[20%] rounded-full border border-slate-400 opacity-30 animate-spin-slow" style={{ animationDuration: '10s' }}></div>

            {/* Core glow */}
            <div className="absolute inset-[35%] rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-40 blur-md animate-pulse"></div>
        </div>
    );
};
